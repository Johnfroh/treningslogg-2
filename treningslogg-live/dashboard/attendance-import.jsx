/* Ukentlig oppmøte-opplastning (Spond-rutenett .xlsx) for dashboardet.
   Parser rutenettet (rad 0 = datoer, rad 1 = klasser, rad 2+ = medlemmer med
   1/0 pr. økt) og bygger events som backend matcher mot loggede økter.
   Bruker window.parseXlsxRaw + window.serialToISOimp fra xlsx-import.jsx. */
const { useState: useAi } = React;

function _attGroup(raw){
  const s = String(raw||'').toLowerCase().replace(/\*+\s*$/,'').trim();
  if(s.includes('junior')||s.includes('knøtte')) return 'junior';
  if(s.includes('åpen matte')||s.includes('open mat')) return 'åpen matte';
  if(s.includes('nogi')||s.includes('no-gi')||s.includes('no gi')) return 'nogi';
  return 'gi';
}
function _attLooksLikeTraining(raw){
  const s = String(raw||'').toLowerCase();
  const skip = ['dugnad','krafttak','gulvtrekk','veggmatter','info-møte','infomøte','gradering',
    'leir','sommerleir','klubbcamp','klubbsamling','konkurranse','turnering','stevne','cup'];
  return !skip.some(w => s.includes(w));
}

async function parseAttendanceFile(file){
  const buf = await file.arrayBuffer();
  const rows = await window.parseXlsxRaw(buf);
  if(!rows || rows.length < 3) throw new Error('Fant for få rader — er dette en oppmøte-eksport fra Spond?');
  const dateRow = rows[0], classRow = rows[1];
  let maxC = 0;
  rows.forEach(r => Object.keys(r).forEach(k => { if(k!=='num'){ const n=parseInt(k); if(n>maxC) maxC=n; } }));
  const cols = [];
  for(let c=1; c<=maxC; c++){
    const serial = dateRow.num[c];
    const cls = classRow[c];
    if(serial==null || !cls) continue;
    const ymd = window.serialToISOimp(serial);
    if(!ymd) continue;
    const rawClass = String(cls).replace(/\*+\s*$/,'').trim();
    cols.push({ c, date: ymd, rawClass, group: _attGroup(rawClass), training: _attLooksLikeTraining(rawClass) });
  }
  if(!cols.length) throw new Error('Fant ingen økt-kolonner (forventer datoer i rad 1 og klasser i rad 2).');
  const events = cols.map(col => ({ date: col.date, group: col.group, title: col.rawClass, time: '', training: col.training, attendees: [] }));
  for(let i=2; i<rows.length; i++){
    const r = rows[i];
    const name = String(r[0]||'').trim();
    if(!name) continue;
    cols.forEach((col, ci) => {
      const v = r[col.c];
      if(v==='1' || v===1 || r.num[col.c]===1) events[ci].attendees.push(name);
    });
  }
  return events.filter(e => e.attendees.length > 0);
}

const ATT_GROUPS = ['junior', 'gi', 'nogi', 'åpen matte'];

function AttendanceImportModal({ onClose }){
  const { actions } = useMembers();
  const [busy, setBusy] = useAi(false);
  const [err, setErr] = useAi('');
  const [events, setEvents] = useAi(null);   // [{date, group, title, training, include, attendees, ...}]
  const [drag, setDrag] = useAi(false);
  const [done, setDone] = useAi(null);

  async function handleFile(file){
    if(!file) return;
    setErr(''); setBusy(true); setEvents(null);
    try {
      const evs = await parseAttendanceFile(file);
      if(!evs.length) throw new Error('Fant ingen oppmøter i fila.');
      // include = importens gjetning (trening tas med, ikke-trening hoppes over) — kan overstyres per økt
      setEvents(evs.map(e => ({ ...e, include: e.training })));
    } catch(e){ setErr(e.message || 'Kunne ikke lese fila.'); }
    setBusy(false);
  }
  function onDrop(e){ e.preventDefault(); setDrag(false); handleFile(e.dataTransfer.files[0]); }

  function setRow(i, patch){ setEvents(evs => evs.map((e,ix) => ix===i ? { ...e, ...patch } : e)); }
  function setAllIncluded(on){ setEvents(evs => evs.map(e => ({ ...e, include: on }))); }

  const selected = events ? events.filter(e => e.include) : [];
  const totalCheckins = selected.reduce((n,e)=>n+e.attendees.length, 0);
  const dates = selected.map(e=>e.date).sort();
  const allIncluded = events ? events.every(e => e.include) : false;

  async function apply(){
    setBusy(true); setErr('');
    try {
      const payload = selected.map(({ training, include, ...e }) => e); // dropp interne flagg
      const res = await actions.importWeekAttendance(payload);
      setDone(res);
    } catch(e){ setErr(e.message || 'Import feilet.'); }
    setBusy(false);
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal import-modal" onClick={e=>e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <div className="modal-kicker">Ukentlig oppmøte</div>
            <div className="modal-title">Importer oppmøte fra Spond</div>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Lukk">✕</button>
        </div>

        {done ? (
          <div className="dlg-body">
            <div className="import-done">
              <div className="big-check">✓</div>
              <div className="modal-title" style={{marginBottom:6}}>Oppmøte importert</div>
              <div className="muted" style={{fontSize:13, lineHeight:1.7}}>
                <strong style={{color:'var(--blue)'}}>{done.matched}</strong> matchet mot loggede økter · <strong style={{color:'var(--green)'}}>{done.created}</strong> nye økter opprettet<br/>
                <strong style={{color:'var(--accent)'}}>{done.checkins}</strong> oppmøter registrert
                {done.unmatchedMembers>0 && <> · <strong style={{color:'var(--coral)'}}>{done.unmatchedMembers}</strong> navn uten kobling (avstem nedenfor)</>}
              </div>
            </div>
            <div className="modal-foot"><button className="btn primary" onClick={onClose}>Ferdig</button></div>
          </div>
        ) : !events ? (
          <div className="dlg-body">
            <label className={'dropzone'+(drag?' over':'')}
              onDragOver={e=>{e.preventDefault();setDrag(true);}} onDragLeave={()=>setDrag(false)} onDrop={onDrop}>
              <input type="file" accept=".xlsx" style={{display:'none'}} onChange={e=>handleFile(e.target.files[0])}/>
              <div className="dz-icon">⤓</div>
              <div className="dz-main">{busy? 'Leser fil…' : 'Slipp Spond-oppmøteeksport her, eller klikk for å velge'}</div>
              <div className="dz-sub">.xlsx · Spond → Oppmøtehistorikk</div>
            </label>
            {err && <div className="import-err">{err}</div>}
            <div className="import-howto">
              <div className="kv-h">Slik fungerer det</div>
              <ul>
                <li>Last opp forrige ukes oppmøte fra Spond.</li>
                <li>Hver økt matches mot en logget økt på <strong>dato + gruppe</strong> — innholdet beholdes.</li>
                <li>Finnes ingen logget økt, opprettes en minimal økt så oppmøtet ikke går tapt.</li>
                <li>Navn som ikke kjennes igjen dukker opp i <strong>avstemmingen</strong> under.</li>
              </ul>
            </div>
          </div>
        ) : (
          <div className="dlg-body">
            <div className="import-stats">
              <div className="ist blue"><div className="n">{selected.length}</div><div className="l">Økter med</div></div>
              <div className="ist green"><div className="n">{totalCheckins}</div><div className="l">Oppmøter</div></div>
              <div className="ist"><div className="n">{dates.length? (dates[0]===dates[dates.length-1]? dates[0] : dates[0]+' → '+dates[dates.length-1]) : '—'}</div><div className="l">Periode</div></div>
            </div>
            <div className="import-note" style={{marginBottom:10}}>
              Kontroller hver økt før import: <strong>gruppe</strong> er gjettet fra klassenavnet og kan endres, og økter som ser ut som dugnad/gradering/konkurranse er forhåndsvalgt bort. Huk av «Med» for det som faktisk skal telles.
            </div>
            <div style={{maxHeight:300, overflowY:'auto', margin:'0 -4px 4px'}}>
              <table className="t">
                <thead>
                  <tr>
                    <th style={{width:34}}>
                      <input type="checkbox" checked={allIncluded} title={allIncluded?'Fjern alle':'Velg alle'} onChange={e=>setAllIncluded(e.target.checked)}/>
                    </th>
                    <th>Dato</th>
                    <th>Klasse (fra Spond)</th>
                    <th>Gruppe</th>
                    <th className="num">Antall</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((e,i)=>(
                    <tr key={i} style={{opacity: e.include?1:0.45}}>
                      <td><input type="checkbox" checked={e.include} onChange={ev=>setRow(i,{include:ev.target.checked})}/></td>
                      <td className="num" style={{textAlign:'left',whiteSpace:'nowrap'}}>{e.date}</td>
                      <td><strong>{e.title}</strong>{!e.training && <span className="tag coral" style={{marginLeft:6}}>ikke-trening</span>}</td>
                      <td>
                        <select className="mini-select" value={e.group} onChange={ev=>setRow(i,{group:ev.target.value})}>
                          {ATT_GROUPS.map(g=><option key={g} value={g}>{g}</option>)}
                        </select>
                      </td>
                      <td className="num">{e.attendees.length}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {err && <div className="import-err">{err}</div>}
            <div className="modal-foot">
              <button className="btn ghost" onClick={()=>{ setEvents(null); setErr(''); }}>Velg en annen fil</button>
              <button className="btn primary" disabled={busy || !selected.length} onClick={apply}>{busy? 'Importerer…' : `Importer ${selected.length} økter`}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

Object.assign(window, { parseAttendanceFile, AttendanceImportModal });
