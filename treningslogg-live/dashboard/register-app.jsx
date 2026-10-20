/* Register tab — searchable member list, inline quick belt edit,
   multi-select bulk grading, CSV export. Uses window globals. */
const { useState: useS, useMemo: useM, useRef: useR } = React;

const KAT_FILTERS = ['Alle','Voksen','Student','Junior','Knøtte','Introkurs','Annet'];

function beltRank(belt){
  const m = beltMeta(belt);
  // Voksenbelter: Hvit=100, Blå=101, Lilla=102, Brun=103, Sort=104, Korall=105.
  if(m.adult) return 100 + m.order;
  // Juniorbelter sorteres OVER hvit, men UNDER blå — egen rekkefølge komprimert
  // inn i intervallet 100–101 (grønn høyest, grå lavest).
  return 100 + 0.001 + m.order * 0.01;
}

// Sorteringsnøkler. Første klikk gir «naturlig» retning (navn A→Å, tall og
// belter høy→lav); neste klikk på samme kolonne snur den.
const SORT_DEFAULT_DIR = { navn:'asc', belte:'desc', sist:'desc', siden:'desc', oppmote:'desc' };

function Register(){
  const { members, actions, live } = useMembers();
  const [q, setQ] = useS('');
  const [kat, setKat] = useS('Alle');
  const [beltFilter, setBeltFilter] = useS('Alle');
  const [sort, setSort] = useS('belte');
  const [dir, setDir] = useS('desc');
  const [sel, setSel] = useS(()=>new Set());
  const [editId, setEditId] = useS(null);
  const [openId, setOpenId] = useS(null);
  const [bulk, setBulk] = useS(false);
  const [exportOpen, setExportOpen] = useS(false);
  const [imp, setImp] = useS(false);

  // Alle hooks må kjøre uansett — tidlig return MÅ derfor stå etter useMemo
  // under (ellers endres antall hooks når members lastes → React error #310).
  const filtered = useM(()=>{
    let r = (members||[]).filter(m=>{
      if(kat!=='Alle' && m.kategori!==kat) return false;
      if(beltFilter==='Farget' && m.grading.current.belt==='Hvit') return false;
      if(beltFilter==='Voksenbelter' && !beltMeta(m.grading.current.belt).adult) return false;
      if(beltFilter==='Juniorbelter' && !beltMeta(m.grading.current.belt).junior) return false;
      if(q.trim()){ const s=q.toLowerCase(); if(!m.navn.toLowerCase().includes(s) && !(m.epost||'').toLowerCase().includes(s)) return false; }
      return true;
    });
    const siden = {};
    if(sort==='siden') r.forEach(m=>{ siden[m.id]=okterSidenGradering(live, m.id, m.grading.current.since); });
    // Stigende sammenligning; retningen snus til slutt. Navn er alltid
    // tie-breaker A→Å, uansett retning.
    const cmp = (a,b)=>{
      if(sort==='navn') return a.navn.localeCompare(b.navn,'nb');
      if(sort==='oppmote') return a.oppmote.checkins-b.oppmote.checkins;
      if(sort==='siden') return siden[a.id]-siden[b.id];
      if(sort==='sist') return (a.grading.current.since||'').localeCompare(b.grading.current.since||'');
      // belte: belte, så striper
      const d = beltRank(a.grading.current.belt)-beltRank(b.grading.current.belt);
      if(d) return d;
      return a.grading.current.stripes-b.grading.current.stripes;
    };
    const sign = dir==='asc' ? 1 : -1;
    r.sort((a,b)=> sign*cmp(a,b) || a.navn.localeCompare(b.navn,'nb'));
    return r;
  },[members,live,q,kat,beltFilter,sort,dir]);

  function sortBy(key){
    if(key===sort) setDir(d=>d==='asc'?'desc':'asc');
    else { setSort(key); setDir(SORT_DEFAULT_DIR[key]); }
  }
  // Klikkbar kolonneoverskrift med pil for aktiv sortering. Kalles som
  // funksjon (ikke <SortTh/>) så React ikke remounter cellen hver render.
  function sortTh(k, children, className, title){
    const on = sort===k;
    return (
      <th key={k} className={'sortable'+(on?' on':'')+(className?' '+className:'')} title={title} onClick={()=>sortBy(k)}>
        {children}<span className="sort-arrow">{on ? (dir==='asc'?'▲':'▼') : '↕'}</span>
      </th>
    );
  }

  // derived header counts
  const stats = useM(()=>{
    const list = members || [];
    const colored = list.filter(m=>m.grading.current.belt!=='Hvit').length;
    const cutoff = new Date(Date.now()-90*86400000).toISOString().slice(0,10);
    let recent=0; for(const m of list) for(const e of m.grading.history) if(e.kind!=='innmelding'&&e.date>=cutoff) recent++;
    const black = list.filter(m=>m.grading.current.belt==='Sort').length;
    return { total:list.length, colored, recent, black };
  },[members]);

  if(!members) return <div style={{padding:30,color:'var(--muted)'}}>Laster medlemmer…</div>;

  const allSelected = filtered.length>0 && filtered.every(m=>sel.has(m.id));
  function toggleAll(){ const n=new Set(sel); if(allSelected) filtered.forEach(m=>n.delete(m.id)); else filtered.forEach(m=>n.add(m.id)); setSel(n); }
  function toggle(id){ const n=new Set(sel); n.has(id)?n.delete(id):n.add(id); setSel(n); }
  const selIds = [...sel];

  const openMember = members.find(m=>m.id===openId);

  return (
    <div>
      {/* KPI strip */}
      <div className="grid-4">
        <KPI label="Medlemmer i register" value={stats.total} delta="aktive" accent="amber"/>
        <KPI label="Fargebelter" value={stats.colored} delta={`av ${stats.total} (${fmtPct(stats.colored/stats.total)})`} accent="green"/>
        <KPI label="Sortbelter" value={stats.black} delta="instruktørnivå" accent="blue"/>
        <KPI label="Graderinger" value={stats.recent} delta="siste 90 dager" deltaClass="up" accent="coral"/>
      </div>

      {/* Toolbar */}
      <div className="reg-toolbar">
        <div className="reg-search">
          <span className="mag">⌕</span>
          <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Søk navn eller e-post…"/>
          {q && <button className="clr" onClick={()=>setQ('')}>✕</button>}
        </div>
        <div className="chips">
          {KAT_FILTERS.map(k=>(
            <button key={k} className={'chip'+(kat===k?' active':'')} onClick={()=>setKat(k)}>{k}</button>
          ))}
        </div>
        <div className="reg-right">
          <select className="mini-select" value={beltFilter} onChange={e=>setBeltFilter(e.target.value)}>
            <option value="Alle">Alle belter</option>
            <option value="Farget">Kun fargebelter</option>
            <option value="Voksenbelter">Voksenbelter</option>
            <option value="Juniorbelter">Juniorbelter</option>
          </select>
          <select className="mini-select" value={sort} onChange={e=>{ setSort(e.target.value); setDir(SORT_DEFAULT_DIR[e.target.value]); }}>
            <option value="belte">Sorter: Belte</option>
            <option value="navn">Sorter: Navn</option>
            <option value="sist">Sorter: Sist gradert</option>
            <option value="siden">Sorter: Siden gradering</option>
            <option value="oppmote">Sorter: Oppmøter</option>
          </select>
          <button className="btn outline sm" title="Snu sorteringsrekkefølgen" onClick={()=>setDir(d=>d==='asc'?'desc':'asc')}>
            {dir==='asc' ? '↑ Lav → høy' : '↓ Høy → lav'}
          </button>
          <div className="export-wrap">
            <button className="btn outline sm" onClick={()=>setExportOpen(v=>!v)}>Eksporter ▾</button>
            {exportOpen && (
              <div className="export-menu" onMouseLeave={()=>setExportOpen(false)}>
                <button onClick={()=>{ downloadText('bodojj_medlemmer.csv', membersToCSV(members)); setExportOpen(false); }}>Medlemsliste (CSV)</button>
                <button onClick={()=>{ downloadText('bodojj_graderingslogg.csv', gradingLogToCSV(members)); setExportOpen(false); }}>Graderingslogg (CSV)</button>
                <div className="export-note">Åpnes direkte i Google Sheets / Excel. Endringer lagres lokalt i nettleseren.</div>
                {actions.overridesCount()>0 && <button className="danger" onClick={()=>{ if(confirm('Tilbakestille alle belteendringer?')) actions.resetAll(); setExportOpen(false); }}>Tilbakestill alle endringer ({actions.overridesCount()})</button>}
              </div>
            )}
          </div>
          <button className="btn primary sm" onClick={()=>setImp(true)}>Importer</button>
        </div>
      </div>

      {/* Table */}
      <div className="tile" style={{padding:'8px 8px 4px'}}>
        <table className="t reg-table">
          <thead>
            <tr>
              <th style={{width:34}}><input type="checkbox" checked={allSelected} onChange={toggleAll}/></th>
              {sortTh('navn','Navn')}
              {sortTh('belte','Belte')}
              {sortTh('sist','Sist gradert')}
              {sortTh('siden','Siden gradering','num','Oppmøter registrert etter forrige gradering — samme tall som «I dag» og rapporten bruker')}
              {sortTh('oppmote','Oppmøter','num')}
              <th style={{width:40}}></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(m=>{
              const g=m.grading.current;
              const isEdit = editId===m.id;
              return (
                <tr key={m.id} className={sel.has(m.id)?'rowsel':''}>
                  <td onClick={e=>e.stopPropagation()}><input type="checkbox" checked={sel.has(m.id)} onChange={()=>toggle(m.id)}/></td>
                  <td onClick={()=>setOpenId(m.id)} style={{cursor:'pointer'}}>
                    <strong>{m.navn}</strong>
                    {actions.isEdited(m.id) && <span className="dot-edit" title="Endret"/>}
                    <div className="sub">{m.kategori}{m.alder!=null?` · ${m.alder} år`:''}</div>
                  </td>
                  <td>
                    {isEdit
                      ? <InlineEdit member={m} onDone={()=>setEditId(null)}/>
                      : <div className="belt-cell" onClick={()=>setOpenId(m.id)}>
                          <BeltGraphic belt={g.belt} stripes={g.stripes} height={20} width={64}/>
                          <span className="bc-name">{g.belt}</span>
                          {g.stripes>0 && <span className="bc-str">{g.stripes}★</span>}
                        </div>}
                  </td>
                  <td className="muted" onClick={()=>setOpenId(m.id)} style={{cursor:'pointer'}}>{fmtDate(g.since)}</td>
                  <td className="num" onClick={()=>setOpenId(m.id)} style={{cursor:'pointer'}}>
                    <span style={{fontWeight:600}}>{fmtN(okterSidenGradering(live, m.id, g.since))}</span>
                  </td>
                  {/* Nøytral farge: aksentfarge på et tall leses som «dette er
                      en lenke», og den var det ikke. */}
                  <td className="num" onClick={()=>setOpenId(m.id)} style={{cursor:'pointer'}}>{fmtN(m.oppmote.checkins)}</td>
                  <td>
                    {!isEdit && <button className="pencil" title="Rask endring" onClick={()=>setEditId(m.id)}>✎</button>}
                  </td>
                </tr>
              );
            })}
            {filtered.length===0 && <tr><td colSpan={7} style={{textAlign:'center',padding:30,color:'var(--muted)'}}>Ingen treff</td></tr>}
          </tbody>
        </table>
      </div>
      <div className="muted" style={{fontSize:11,marginTop:8}}>{filtered.length} av {members.length} medlemmer</div>

      {/* Bulk action bar */}
      {selIds.length>0 && (
        <div className="selectbar">
          <span><strong>{selIds.length}</strong> valgt</span>
          <button className="btn primary sm" onClick={()=>setBulk(true)}>Gradér valgte</button>
          <button className="btn ghost sm" onClick={()=>setSel(new Set())}>Tøm valg</button>
        </div>
      )}

      {openMember && <MemberProfile member={openMember} onClose={()=>setOpenId(null)}/>}
      {bulk && <GradeDialog targets={selIds} single={false} initialMode="stripe" onClose={()=>{ setBulk(false); setSel(new Set()); }}/>}
      {imp && <ImportModal onClose={()=>setImp(false)}/>}
    </div>
  );
}

/* Inline quick belt/stripe edit inside a table cell */
function InlineEdit({ member, onDone }){
  const { actions } = useMembers();
  const g = member.grading.current;
  const [belt,setBelt] = useS(g.belt);
  const [stripes,setStripes] = useS(g.stripes);
  const [date,setDate] = useS(todayP()); // lokal dato — toISOString() er UTC og «i går» før kl. 01/02
  function save(){ actions.setCurrent(member.id,{belt,stripes,date}); onDone(); }
  return (
    <div className="inline-edit" onClick={e=>e.stopPropagation()}>
      <select value={belt} onChange={e=>{ setBelt(e.target.value); }}>
        <optgroup label="Voksen">{ADULT_BELTS.map(b=><option key={b} value={b}>{b}</option>)}</optgroup>
        <optgroup label="Junior">{JUNIOR_BELTS.map(b=><option key={b} value={b}>{b}</option>)}</optgroup>
      </select>
      <Stepper value={stripes} onChange={setStripes}/>
      <input type="date" value={date} max={todayP()} onChange={e=>setDate(e.target.value)}/>
      <button className="btn primary xs" onClick={save}>Lagre</button>
      <button className="btn ghost xs" onClick={onDone}>✕</button>
    </div>
  );
}

window.Register = Register;
