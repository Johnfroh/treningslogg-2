/* Kalender + øktlogging i dashboardet (Daylight-tema).
   Full les + logg/rediger/planlegg — skriver via DASH_API mot samme
   backend-handlinger som trener-appen (createSession/updatePlanned osv.).
   Tag-taksonomien speiler trener-appen (app/data.js). */
const { useState: useCs, useEffect: useCe } = React;

const CAL_GROUPS = ['junior', 'gi', 'nogi', 'åpen matte'];
const CAL_GROUP_COLOR = { junior:'#B06FD6', gi:'#34B98C', nogi:'#F2825F', 'åpen matte':'#4F9BEA' };
const CAL_TAGCATS = [
  { kind:'position', label:'Posisjon', color:'#34B98C', tags:['guard','mount','sidekontroll','back','c2c','c2b'] },
  { kind:'action',   label:'Handling', color:'#F2825F', tags:['passing','escapes','submissions','takedowns','sweeps','pins'] },
];
const CAL_NIVAA = ['grunn','erfaren','mix','junior'];
const MND_FULL = ['januar','februar','mars','april','mai','juni','juli','august','september','oktober','november','desember'];
const DAY_HDR = ['man','tir','ons','tor','fre','lør','søn'];

const calSlug = s => String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const calYmd = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const calToday = () => calYmd(new Date());

/* ---------- Logg/rediger-modal ---------- */
function LogSessionModal({ initial, dateDefault, defaultType, trainers, onClose, onSaved }){
  const ex = initial || null;                     // { id, kind:'logged'|'planned', ...felt }
  const [type, setType] = useCs(ex ? ex.kind : (defaultType || 'logged'));
  const [date, setDate] = useCs(ex ? ex.date : (dateDefault || calToday()));
  const [time, setTime] = useCs(ex ? (ex.time || '18:00') : '18:00');
  const [group, setGroup] = useCs(ex ? ex.group : 'gi');
  const [trainer, setTrainer] = useCs(ex ? (ex.trainer || '') : '');
  const [title, setTitle] = useCs(ex ? (ex.title || '') : '');
  const [content, setContent] = useCs(ex ? (ex.content || '') : '');
  const [tags, setTags] = useCs(ex && ex.tags ? ex.tags.slice() : []);
  const [custom, setCustom] = useCs('');
  const [busy, setBusy] = useCs(false);
  const [err, setErr] = useCs('');
  const [confirmDel, setConfirmDel] = useCs(false);

  const trainerNames = (trainers && trainers.length ? trainers.filter(t=>t.active!==false).map(t=>t.name) : (window.INSTRUKTORER||[]));

  function toggleTag(t){ setTags(ts => ts.includes(t) ? ts.filter(x=>x!==t) : ts.concat(t)); }
  function addCustom(){ const s = calSlug(custom); if(s && !tags.includes(s)) setTags(ts=>ts.concat(s)); setCustom(''); }

  async function save(){
    if(!date){ setErr('Dato mangler.'); return; }
    if(!title.trim()){ setErr('Tittel mangler.'); return; }
    setBusy(true); setErr('');
    try {
      if(type==='planned'){
        const payload = { date, time, group, trainer, title: title.trim() };
        if(ex && ex.kind==='planned') await DASH_API.updatePlanned(ex.id, payload);
        else await DASH_API.createPlanned(payload);
      } else {
        const payload = { date, time, group, trainer, title: title.trim(), content, tags, attendance: ex && ex.attendance!=null ? ex.attendance : null };
        if(ex && ex.kind==='logged') await DASH_API.updateSession(ex.id, payload);
        else await DASH_API.createSession(payload);
      }
      onSaved();
    } catch(e){ setErr(e.message || 'Lagring feilet.'); setBusy(false); }
  }
  async function del(){
    if(!ex){ return; }
    setBusy(true); setErr('');
    try {
      if(ex.kind==='planned') await DASH_API.deletePlanned(ex.id);
      else await DASH_API.deleteSession(ex.id);
      onSaved();
    } catch(e){ setErr(e.message || 'Sletting feilet.'); setBusy(false); }
  }

  const tagSugg = CAL_NIVAA.filter(n=>!tags.includes(n));
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal import-modal" onClick={e=>e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <div className="modal-kicker">{ex ? 'Rediger økt' : 'Ny økt'}</div>
            <div className="modal-title">{type==='planned' ? 'Planlagt økt' : 'Logget økt'}</div>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Lukk">✕</button>
        </div>

        <div className="dlg-body">
          <div className="seg" style={{marginBottom:14}}>
            <button className={type==='logged'?'on':''} onClick={()=>setType('logged')}>Logget</button>
            <button className={type==='planned'?'on':''} onClick={()=>setType('planned')}>Planlagt</button>
          </div>

          <div className="dlg-grid2">
            <label className="fld"><span>Dato</span><input type="date" value={date} onChange={e=>setDate(e.target.value)}/></label>
            <label className="fld"><span>Tid</span><input type="time" value={time} onChange={e=>setTime(e.target.value)}/></label>
          </div>

          <div className="fld">
            <span>Gruppe</span>
            <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
              {CAL_GROUPS.map(g=>(
                <button key={g} type="button" onClick={()=>setGroup(g)}
                  className="btn sm" style={{textTransform:'capitalize',
                    background: group===g ? CAL_GROUP_COLOR[g] : 'transparent',
                    color: group===g ? '#fff' : 'var(--ink)',
                    borderColor: CAL_GROUP_COLOR[g]}}>{g}</button>
              ))}
            </div>
          </div>

          <div className="dlg-grid2">
            <label className="fld"><span>Tittel</span><input type="text" placeholder="f.eks. closed guard — kimura" value={title} onChange={e=>setTitle(e.target.value)}/></label>
            <label className="fld"><span>Trener</span>
              <select value={trainer} onChange={e=>setTrainer(e.target.value)}>
                <option value="">— ingen —</option>
                {trainerNames.map(n=><option key={n} value={n}>{n}</option>)}
              </select>
            </label>
          </div>

          {type==='logged' && (
            <>
              <label className="fld"><span>Innhold <em className="opt">(valgfritt)</em></span>
                <textarea rows={3} placeholder="hva ble trent — teknikker, drillinger, sparring …" value={content} onChange={e=>setContent(e.target.value)} style={{resize:'vertical'}}/>
              </label>
              {CAL_TAGCATS.map(cat=>(
                <div className="fld" key={cat.kind}>
                  <span>{cat.label}</span>
                  <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                    {cat.tags.map(t=>(
                      <button key={t} type="button" onClick={()=>toggleTag(t)} className="btn sm"
                        style={{textTransform:'uppercase',fontSize:10,letterSpacing:'.08em',
                          background: tags.includes(t)?cat.color:'transparent', color: tags.includes(t)?'#fff':'var(--ink)', borderColor:cat.color}}>{t}</button>
                    ))}
                  </div>
                </div>
              ))}
              <div className="fld">
                <span>Nivå / egne temaer</span>
                <div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:8}}>
                  {tagSugg.map(t=>(
                    <button key={t} type="button" onClick={()=>toggleTag(t)} className="btn sm" style={{textTransform:'uppercase',fontSize:10}}>+ {t}</button>
                  ))}
                </div>
                <div style={{display:'flex',gap:6}}>
                  <input type="text" placeholder="eget tema…" value={custom} onChange={e=>setCustom(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();addCustom();}}}/>
                  <button type="button" className="btn ghost sm" onClick={addCustom}>Legg til</button>
                </div>
                {tags.length>0 && (
                  <div style={{display:'flex',gap:6,flexWrap:'wrap',marginTop:8}}>
                    {tags.map(t=>(
                      <span key={t} className="tag" style={{cursor:'pointer'}} onClick={()=>toggleTag(t)} title="klikk for å fjerne">{t} ✕</span>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {err && <div className="import-err">{err}</div>}
          <div className="modal-foot" style={{justifyContent:'space-between'}}>
            <div>
              {ex && (confirmDel
                ? <button className="btn ghost sm" disabled={busy} style={{color:'var(--coral)'}} onClick={del}>Bekreft slett</button>
                : <button className="btn ghost sm" disabled={busy} onClick={()=>setConfirmDel(true)}>Slett</button>)}
            </div>
            <div style={{display:'flex',gap:8}}>
              <button className="btn ghost" onClick={onClose}>Avbryt</button>
              <button className="btn primary" disabled={busy} onClick={save}>{busy?'Lagrer…':(ex?'Lagre':'Opprett')}</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- Kalender ---------- */
function Kalender(){
  const [data, setData] = useCs(null);
  const [err, setErr] = useCs('');
  const [cursor, setCursor] = useCs(() => { const d=new Date(); return { y:d.getFullYear(), m:d.getMonth() }; });
  const [selected, setSelected] = useCs(calToday());
  const [modal, setModal] = useCs(null); // {initial} | {dateDefault} | null

  function load(){
    DASH_API.fetchCalendar().then(setData).catch(e=>setErr(e.message||'feil'));
  }
  useCe(() => { load(); }, []);

  const byDate = React.useMemo(() => {
    const map = {};
    if(data){
      (data.sessions||[]).forEach(s=> (map[s.date]||(map[s.date]=[])).push({ ...s, kind:'logged' }));
      (data.planned||[]).forEach(p=> (map[p.date]||(map[p.date]=[])).push({ ...p, kind:'planned' }));
    }
    return map;
  }, [data]);

  if(err) return <div className="dim" style={{padding:20}}>Kunne ikke laste kalender: {err}</div>;
  if(!data) return <div className="dim" style={{padding:20}}>Laster kalender…</div>;

  const { y, m } = cursor;
  const first = new Date(y, m, 1);
  const startDow = (first.getDay() + 6) % 7; // mandag = 0
  const daysInMonth = new Date(y, m+1, 0).getDate();
  const cells = [];
  for(let i=0;i<startDow;i++) cells.push(null);
  for(let d=1; d<=daysInMonth; d++) cells.push(calYmd(new Date(y, m, d)));

  const selItems = (byDate[selected] || []).slice().sort((a,b)=>String(a.time||'').localeCompare(String(b.time||'')));
  const onSaved = () => { setModal(null); load(); };

  return (
    <div>
      <div className="section-h" style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <span>{MND_FULL[m]} {y}</span>
        <span style={{display:'flex',gap:6}}>
          <button className="btn ghost sm" onClick={()=>setCursor(c=>{const nm=c.m-1; return nm<0?{y:c.y-1,m:11}:{y:c.y,m:nm};})}>←</button>
          <button className="btn ghost sm" onClick={()=>{const d=new Date(); setCursor({y:d.getFullYear(),m:d.getMonth()}); setSelected(calToday());}}>I dag</button>
          <button className="btn ghost sm" onClick={()=>setCursor(c=>{const nm=c.m+1; return nm>11?{y:c.y+1,m:0}:{y:c.y,m:nm};})}>→</button>
        </span>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'2fr 1fr',gap:16,alignItems:'start'}}>
        <Tile title="måned" corner="kalender">
          <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:4}}>
            {DAY_HDR.map(d=><div key={d} className="dim" style={{fontSize:10,textTransform:'uppercase',letterSpacing:'.1em',textAlign:'center',padding:'4px 0'}}>{d}</div>)}
            {cells.map((ymd,i)=>{
              if(!ymd) return <div key={'e'+i}/>;
              const items = byDate[ymd] || [];
              const isSel = ymd===selected, isToday = ymd===calToday();
              return (
                <button key={ymd} onClick={()=>setSelected(ymd)} style={{
                  minHeight:64, padding:6, textAlign:'left', cursor:'pointer',
                  border: isSel?'2px solid var(--accent)':'1px solid var(--border)',
                  borderRadius:10, background: isToday?'var(--accent-soft,rgba(123,110,246,.08))':'var(--card,#fff)'}}>
                  <div style={{fontSize:12,fontWeight:isToday?700:500}}>{parseInt(ymd.slice(8),10)}</div>
                  <div style={{display:'flex',gap:3,flexWrap:'wrap',marginTop:4}}>
                    {items.slice(0,4).map((it,j)=>(
                      <span key={j} title={it.title||it.group} style={{width:7,height:7,borderRadius:2,
                        background:CAL_GROUP_COLOR[it.group]||'#999', opacity: it.kind==='planned'?0.45:1}}/>
                    ))}
                    {items.length>4 && <span className="dim" style={{fontSize:9}}>+{items.length-4}</span>}
                  </div>
                </button>
              );
            })}
          </div>
        </Tile>

        <Tile title={fmtDate(selected)} corner="dag">
          <div style={{display:'flex',gap:6,marginBottom:12}}>
            <button className="btn primary sm" onClick={()=>setModal({ dateDefault:selected, type:'logged' })}>+ Logg økt</button>
            <button className="btn outline sm" onClick={()=>setModal({ dateDefault:selected, type:'planned' })}>+ Planlegg</button>
          </div>
          {selItems.length===0 && <div className="dim" style={{fontSize:12}}>Ingen økter denne dagen.</div>}
          {selItems.map((it,i)=>(
            <div key={i} onClick={()=>setModal({ initial: it })} style={{cursor:'pointer',padding:'10px 0',borderTop:i?'1px solid var(--border)':'none'}}>
              <div style={{display:'flex',justifyContent:'space-between',gap:8,alignItems:'center'}}>
                <span style={{fontWeight:600,fontSize:13}}>
                  <span className="tag" style={{marginRight:6,textTransform:'capitalize',background:CAL_GROUP_COLOR[it.group],color:'#fff'}}>{it.group}</span>
                  {it.title || <span className="dim">uten tittel</span>}
                </span>
                <span className="dim" style={{fontSize:11,whiteSpace:'nowrap'}}>{it.time||'—'}{it.kind==='planned'?' · planlagt':''}</span>
              </div>
              {it.content && <div className="dim" style={{fontSize:12,marginTop:4,lineHeight:1.5}}>{it.content}</div>}
              {it.tags && it.tags.length>0 && <div style={{display:'flex',gap:4,flexWrap:'wrap',marginTop:6}}>{it.tags.map(t=><span key={t} className="tag" style={{fontSize:10}}>{t}</span>)}</div>}
              {it.kind==='logged' && it.attendance!=null && <div className="dim" style={{fontSize:11,marginTop:4}}>{it.attendance} oppmøtt</div>}
            </div>
          ))}
        </Tile>
      </div>

      {modal && <LogSessionModal
        initial={modal.initial || null}
        dateDefault={modal.dateDefault}
        defaultType={modal.type}
        trainers={data.trainers}
        onClose={()=>setModal(null)}
        onSaved={onSaved}/>}
    </div>
  );
}

Object.assign(window, { Kalender, LogSessionModal });
