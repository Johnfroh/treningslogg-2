/* Opprydding etter feilimportert oppmøte.
   Velg datointervall → se øktene → slett de importen laget, eller bare fjern
   oppmøtet fra økter trenerne har logget (innholdet beholdes).
   Destruktivt: ingenting skjer før man har sett lista og bekreftet. */
const { useState: useCu } = React;

function cuToday(){ const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
function cuDaysAgo(n){ const d=new Date(); d.setDate(d.getDate()-n); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }

function CleanupModal({ onClose, onDone }){
  const [from,setFrom]=useCu(cuDaysAgo(30));
  const [to,setTo]=useCu(cuToday());
  const [rows,setRows]=useCu(null);
  const [sel,setSel]=useCu({});        // id -> 'delete' | 'clear' | undefined
  const [busy,setBusy]=useCu(false);
  const [err,setErr]=useCu('');
  const [confirm,setConfirm]=useCu(false);
  const [done,setDone]=useCu(null);

  async function load(){
    setBusy(true); setErr(''); setRows(null); setSel({}); setConfirm(false);
    try {
      const r = await DASH_API.cleanupList(from, to);
      setRows(r);
      // Forhåndsvalg: kun øktene importen selv opprettet — trenernes egne
      // økter må velges bevisst.
      const s={}; r.forEach(x=>{ if(x.autoCreated) s[x.id]='delete'; });
      setSel(s);
    } catch(e){ setErr(e.message||'Kunne ikke hente økter.'); }
    setBusy(false);
  }
  function cycle(row){
    setSel(prev=>{
      const cur=prev[row.id];
      const next = cur===undefined ? (row.autoCreated?'delete':'clear')
                 : cur==='delete' ? 'clear'
                 : cur==='clear' ? undefined : 'delete';
      const o={...prev};
      if(next===undefined) delete o[row.id]; else o[row.id]=next;
      return o;
    });
    setConfirm(false);
  }
  async function apply(){
    setBusy(true); setErr('');
    try {
      const deleteIds = Object.keys(sel).filter(id=>sel[id]==='delete');
      const clearIds  = Object.keys(sel).filter(id=>sel[id]==='clear');
      const res = await DASH_API.cleanupApply(deleteIds, clearIds);
      setDone(res);
    } catch(e){ setErr(e.message||'Opprydding feilet.'); }
    setBusy(false);
  }

  const nDel = Object.values(sel).filter(v=>v==='delete').length;
  const nClr = Object.values(sel).filter(v=>v==='clear').length;
  const cksDel = (rows||[]).filter(r=>sel[r.id]==='delete').reduce((a,r)=>a+r.checkins,0);
  const cksClr = (rows||[]).filter(r=>sel[r.id]==='clear').reduce((a,r)=>a+r.checkins,0);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal import-modal" onClick={e=>e.stopPropagation()}>
        <div className="modal-head">
          <div><div className="modal-kicker">Opprydding</div><div className="modal-title">Rydd opp i importerte økter</div></div>
          <button className="icon-btn" onClick={onClose} aria-label="Lukk">✕</button>
        </div>

        {done ? (
          <div className="dlg-body">
            <div className="import-done"><div className="big-check">✓</div>
              <div className="modal-title" style={{marginBottom:6}}>Ryddet</div>
              <div className="muted" style={{fontSize:13,lineHeight:1.7}}>
                <strong style={{color:'var(--coral)'}}>{done.sessions}</strong> økter slettet · <strong style={{color:'var(--accent)'}}>{done.checkins}</strong> oppmøte-rader fjernet
              </div>
            </div>
            <div className="modal-foot"><button className="btn primary" onClick={()=>{ if(onDone) onDone(); onClose(); }}>Ferdig</button></div>
          </div>
        ) : (
          <div className="dlg-body">
            <div className="dlg-grid2">
              <label className="fld"><span>Fra</span><input type="date" value={from} max={to} onChange={e=>{setFrom(e.target.value); setRows(null);}}/></label>
              <label className="fld"><span>Til</span><input type="date" value={to} min={from} onChange={e=>{setTo(e.target.value); setRows(null);}}/></label>
            </div>
            <button className="btn primary sm" style={{marginTop:10}} disabled={busy} onClick={load}>{busy?'Henter…':'Vis økter i perioden'}</button>
            {err && <div className="import-err">{err}</div>}

            {rows && rows.length===0 && <div className="muted" style={{padding:20,fontSize:13}}>Ingen økter i perioden.</div>}

            {rows && rows.length>0 && (
              <>
                <div className="import-note" style={{marginTop:14}}>
                  Klikk en rad for å bytte: <strong style={{color:'var(--coral)'}}>Slett</strong> → <strong style={{color:'var(--accent)'}}>Fjern oppmøte</strong> → <span className="muted">Behold</span>.
                  Økter importen selv laget er forhåndsvalgt for sletting. Økter med innhold fra trener er merket <span className="tag green">logget</span> og beholdes med mindre du velger noe annet.
                </div>
                <div className="ok-monthlist" style={{maxHeight:300,overflowY:'auto',marginTop:10}}>
                  {rows.map(r=>{
                    const v=sel[r.id];
                    const col = v==='delete' ? 'var(--coral)' : v==='clear' ? 'var(--accent)' : 'var(--muted)';
                    return (
                      <div key={r.id} className="ok-monthrow" style={{cursor:'pointer'}} onClick={()=>cycle(r)}>
                        <span>
                          <span className="tabular">{r.date}</span>
                          {r.time && <span className="muted" style={{marginLeft:6}}>{r.time}</span>}
                          <span style={{marginLeft:8}}>{r.title || <em className="muted">uten tittel</em>}</span>
                          <span className="tag" style={{marginLeft:8}}>{r.group}</span>
                          {!r.autoCreated && <span className="tag green" style={{marginLeft:6}}>logget</span>}
                        </span>
                        <span className="tabular" style={{whiteSpace:'nowrap'}}>
                          <span className="muted" style={{marginRight:10}}>{r.checkins} oppmøter</span>
                          <strong style={{color:col}}>{v==='delete'?'Slett':v==='clear'?'Fjern oppmøte':'Behold'}</strong>
                        </span>
                      </div>
                    );
                  })}
                </div>
                <div className="import-stats" style={{marginTop:12}}>
                  <div className="ist coral"><div className="n">{nDel}</div><div className="l">Slettes ({cksDel} oppmøter)</div></div>
                  <div className="ist blue"><div className="n">{nClr}</div><div className="l">Beholdes, mister oppmøte ({cksClr})</div></div>
                  <div className="ist"><div className="n">{rows.length-nDel-nClr}</div><div className="l">Røres ikke</div></div>
                </div>
                {confirm && (
                  <div className="import-err" style={{background:'var(--coral-bg)',color:'var(--coral)'}}>
                    Dette kan ikke angres. {nDel} økter og {cksDel+cksClr} oppmøte-rader fjernes. Klikk «Ja, rydd nå» for å bekrefte.
                  </div>
                )}
                <div className="modal-foot">
                  <button className="btn ghost" onClick={onClose}>Avbryt</button>
                  {!confirm ? (
                    <button className="btn primary" disabled={busy || (!nDel && !nClr)} onClick={()=>setConfirm(true)}>Rydd opp…</button>
                  ) : (
                    <button className="btn primary" style={{background:'var(--coral)',borderColor:'var(--coral)'}} disabled={busy} onClick={apply}>{busy?'Rydder…':'Ja, rydd nå'}</button>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

Object.assign(window, { CleanupModal });
