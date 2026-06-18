/* Monthly member-register import modal: upload Spond export, preview diff, apply.
   Belts are preserved for matched members. Uses window globals. */
const { useState: useSi } = React;

function ImportModal({ onClose }){
  const { members, actions } = useMembers();
  const [busy, setBusy] = useSi(false);
  const [err, setErr] = useSi('');
  const [parsed, setParsed] = useSi(null);   // { members, format }
  const [diff, setDiff] = useSi(null);
  const [drag, setDrag] = useSi(false);
  const [showAdded, setShowAdded] = useSi(false);
  const [showRemoved, setShowRemoved] = useSi(false);
  const [done, setDone] = useSi(null);

  async function handleFile(file){
    if(!file) return;
    setErr(''); setBusy(true); setParsed(null); setDiff(null);
    try {
      const res = await window.parseMemberFile(file);
      if(!res.members.length) throw new Error('Fant ingen medlemmer i fila.');
      const d = window.diffRoster(members||[], res.members);
      setParsed(res); setDiff(d);
    } catch(e){ setErr(e.message || 'Kunne ikke lese fila.'); }
    setBusy(false);
  }
  function onDrop(e){ e.preventDefault(); setDrag(false); const f=e.dataTransfer.files[0]; handleFile(f); }
  function apply(){
    const summary = actions.importRoster(parsed.members);
    setDone(summary);
  }

  const hasBelt = parsed && /Belte-CSV/.test(parsed.format);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal import-modal" onClick={e=>e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <div className="modal-kicker">Månedlig oppdatering</div>
            <div className="modal-title">Importer medlemsregister</div>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Lukk">✕</button>
        </div>

        {done ? (
          <div className="dlg-body">
            <div className="import-done">
              <div className="big-check">✓</div>
              <div className="modal-title" style={{marginBottom:6}}>Import fullført</div>
              <div className="muted" style={{fontSize:13, lineHeight:1.7}}>
                <strong style={{color:'var(--green)'}}>{done.added}</strong> nye · <strong style={{color:'var(--blue)'}}>{done.updated}</strong> oppdatert · <strong style={{color:'var(--coral)'}}>{done.removed}</strong> fjernet<br/>
                Registeret har nå <strong>{done.total}</strong> medlemmer.
              </div>
            </div>
            <div className="modal-foot"><button className="btn primary" onClick={onClose}>Ferdig</button></div>
          </div>
        ) : !parsed ? (
          <div className="dlg-body">
            <label className={'dropzone'+(drag?' over':'')}
              onDragOver={e=>{e.preventDefault();setDrag(true);}} onDragLeave={()=>setDrag(false)} onDrop={onDrop}>
              <input type="file" accept=".xlsx,.csv" style={{display:'none'}} onChange={e=>handleFile(e.target.files[0])}/>
              <div className="dz-icon">⤓</div>
              <div className="dz-main">{busy? 'Leser fil…' : 'Slipp Spond-eksport her, eller klikk for å velge'}</div>
              <div className="dz-sub">.xlsx eller .csv · medlemsliste fra Spond</div>
            </label>
            {err && <div className="import-err">{err}</div>}
            <div className="import-howto">
              <div className="kv-h">Slik fungerer det</div>
              <ul>
                <li>Last opp den månedlige medlemslista fra Spond.</li>
                <li>Nye medlemmer legges til, utmeldte fjernes, kontaktinfo oppdateres.</li>
                <li><strong>Belter og graderingshistorikk beholdes</strong> for alle som matcher (på e-post eller navn).</li>
              </ul>
            </div>
          </div>
        ) : (
          <div className="dlg-body">
            <div className="import-format"><span className="tag green">{parsed.format}</span><span className="muted">{parsed.members.length} rader lest</span></div>
            <div className="import-stats">
              <div className="ist green"><div className="n">{diff.added.length}</div><div className="l">Nye medlemmer</div></div>
              <div className="ist blue"><div className="n">{diff.matched.length}</div><div className="l">Oppdateres</div></div>
              <div className="ist coral"><div className="n">{diff.removed.length}</div><div className="l">Fjernes</div></div>
            </div>

            {diff.added.length>0 && (
              <div className="import-list">
                <button className="il-head" onClick={()=>setShowAdded(v=>!v)}>{showAdded?'▾':'▸'} Nye ({diff.added.length})</button>
                {showAdded && <div className="il-body">{diff.added.map((m,i)=><span key={i} className="il-name new">{m.navn}</span>)}</div>}
              </div>
            )}
            {diff.removed.length>0 && (
              <div className="import-list">
                <button className="il-head" onClick={()=>setShowRemoved(v=>!v)}>{showRemoved?'▾':'▸'} Fjernes — mister beltehistorikk ({diff.removed.length})</button>
                {showRemoved && <div className="il-body">{diff.removed.map((m,i)=><span key={i} className="il-name gone">{m.navn}</span>)}</div>}
              </div>
            )}

            <div className={'import-note '+(hasBelt?'belt':'')}>
              {hasBelt
                ? <>Denne fila inneholder en <strong>Beltefarge</strong>-kolonne — belter settes fra fila (nyttig for å lese tilbake endringer fra Google Sheets).</>
                : <>Belter og graderingshistorikk <strong>beholdes</strong> for de {diff.matched.length} som matcher. Bare kontakt- og medlemsinfo oppdateres.</>}
            </div>

            <div className="modal-foot">
              <button className="btn ghost" onClick={()=>{ setParsed(null); setDiff(null); }}>Velg en annen fil</button>
              <button className="btn primary" onClick={apply}>Bruk import ({parsed.members.length} medlemmer)</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

window.ImportModal = ImportModal;
