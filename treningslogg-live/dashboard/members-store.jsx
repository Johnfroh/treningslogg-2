/* Members store — loads data/members.json, merges localStorage edits,
   exposes grading actions + CSV (Google-Sheets-ready) export.
   Provides <MembersProvider> + useMembers(). Exports to window. */

const { createContext, useContext } = React;
const LS_KEY = 'bjj_register_v2';
const ROSTER_KEY = 'bjj_roster_v1';
const OK_KEY = 'bjj_okonomi_v1';
const MembersCtx = createContext(null);

function loadOverrides(){
  try { return JSON.parse(localStorage.getItem(LS_KEY)) || {}; } catch(e){ return {}; }
}
function saveOverrides(o){
  try { localStorage.setItem(LS_KEY, JSON.stringify(o)); } catch(e){}
}
function loadRoster(){ try { return JSON.parse(localStorage.getItem(ROSTER_KEY)); } catch(e){ return null; } }
function saveRoster(r){ try { localStorage.setItem(ROSTER_KEY, JSON.stringify(r)); } catch(e){} }
const normName = s => (s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim();
function blankGrading(since){ since=since||new Date().toISOString().slice(0,10); return { current:{belt:'Hvit',stripes:0,since}, history:[{id:'g_innm',date:since,belt:'Hvit',stripes:0,by:null,note:'Innmeldt',kind:'innmelding',_seq:1}] }; }
function gradingFromBelt(bi, joinISO){
  const join=joinISO||bi.since||new Date().toISOString().slice(0,10);
  const hist=[{id:'g_innm',date:join,belt:'Hvit',stripes:0,by:null,note:'Innmeldt',kind:'innmelding',_seq:1}];
  if(bi.belt && (bi.belt!=='Hvit' || bi.stripes>0)){
    hist.push({id:'g_imp',date:bi.since||join,belt:bi.belt,stripes:bi.stripes||0,by:null,note:'Importert',kind: bi.belt!=='Hvit'?'belte':'stripe',_seq:2});
  }
  const last=hist[hist.length-1];
  return { current:{belt:last.belt,stripes:last.stripes,since:last.date}, history:hist };
}
// pure diff for preview
function diffRoster(current, incoming){
  const byEmail={}, byName={};
  for(const m of current){ if(m.epost) byEmail[m.epost.toLowerCase()]=m; byName[normName(m.navn)]=m; }
  const matched=[], added=[]; const seen=new Set();
  for(const im of incoming){
    const hit=(im.epost && byEmail[im.epost.toLowerCase()]) || byName[normName(im.navn)];
    if(hit && !seen.has(hit.id)){ matched.push({incoming:im, existing:hit}); seen.add(hit.id); }
    else added.push(im);
  }
  const removed=current.filter(m=>!seen.has(m.id));
  return { matched, added, removed };
}

const uid = () => 'g' + Math.random().toString(36).slice(2,9);
const todayISO = () => new Date().toISOString().slice(0,10);

// recompute current belt/stripes from sorted history
function recompute(history){
  const sorted = [...history].sort((a,b)=> a.date===b.date ? (a._seq||0)-(b._seq||0) : a.date.localeCompare(b.date));
  const last = sorted[sorted.length-1] || { belt:'Hvit', stripes:0, date:todayISO() };
  return { current:{ belt:last.belt, stripes:last.stripes, since:last.date }, history:sorted };
}

function MembersProvider({ children }){
  const [base, setBase] = React.useState(null);
  const [overrides, setOverrides] = React.useState(loadOverrides);
  const [okBase, setOkBase] = React.useState(null);
  const [okOv, setOkOv] = React.useState(()=>{ try { return JSON.parse(localStorage.getItem(OK_KEY))||{}; } catch(e){ return {}; } });

  React.useEffect(()=>{ DASH_API.fetchOkonomi().then(setOkBase).catch(()=>setOkBase({})); },[]);

  React.useEffect(()=>{
    const r = loadRoster();
    if(r && Array.isArray(r) && r.length){ setBase(r); return; }
    DASH_API.fetchMembers().then(setBase);
  },[]);

  // merged members
  const members = React.useMemo(()=>{
    if(!base) return null;
    return base.map(m=>{
      const ov = overrides[m.id];
      if(!ov || !ov.grading) return m;
      return { ...m, grading: ov.grading, _edited:true };
    });
  },[base, overrides]);

  const byId = React.useMemo(()=>{
    const map = {}; if(members) for(const m of members) map[m.id]=m; return map;
  },[members]);

  function commit(next){ setOverrides(next); saveOverrides(next); }

  // ---- økonomi (monthly actuals) ----
  const okonomi = React.useMemo(()=>{
    if(!okBase) return null;
    const months = { ...okBase, ...okOv };
    return { months, keys: Object.keys(months).sort() };
  },[okBase, okOv]);
  const okonomiActions = {
    importMonths(mns){
      const next = { ...okOv, ...mns };
      try { localStorage.setItem(OK_KEY, JSON.stringify(next)); } catch(e){}
      setOkOv(next);
      return { added: Object.keys(mns).length, total: Object.keys({ ...okBase, ...next }).length };
    },
    clear(){ try { localStorage.removeItem(OK_KEY); } catch(e){} setOkOv({}); },
    isImported(){ return Object.keys(okOv).length>0; },
    importedCount(){ return Object.keys(okOv).length; },
  };

  // Apply a grading event to many members at once.
  // ev: { kind:'belte'|'stripe'|'justering', belt?, stripes?, date, by, note }
  function applyGrading(ids, makeEvent){
    const next = { ...overrides };
    for(const id of ids){
      const cur = (next[id] && next[id].grading) || byId[id].grading;
      const ev = makeEvent(cur, byId[id]);
      if(!ev) continue;
      ev.id = ev.id || uid();
      ev._seq = (cur.history.length || 0) + 1;
      const hist = [...cur.history, ev];
      next[id] = { ...(next[id]||{}), grading: recompute(hist) };
    }
    commit(next);
  }

  const actions = {
    // give +1 stripe (no-op past 4) to each id
    awardStripe(ids, { date, by, note }){
      applyGrading(ids, (cur)=>{
        if(cur.current.stripes>=window.maxStripes) return null;
        return { kind:'stripe', belt:cur.current.belt, stripes:cur.current.stripes+1, date, by:by||null, note:note||'' };
      });
    },
    // promote to a belt (stripes reset unless given)
    awardBelt(ids, { belt, stripes=0, date, by, note }){
      applyGrading(ids, ()=> ({ kind:'belte', belt, stripes, date, by:by||null, note:note||'' }));
    },
    // generic set (used by inline quick-edit): records correction/justering today-or-given
    setCurrent(id, { belt, stripes, date, by, note, kind }){
      applyGrading([id], (cur)=>{
        if(cur.current.belt===belt && cur.current.stripes===stripes) return null;
        const k = kind || (cur.current.belt!==belt ? 'belte' : 'stripe');
        return { kind:k, belt, stripes, date:date||todayISO(), by:by||null, note:note||'' };
      });
    },
    // undo the most recent (non-innmelding) event
    undoLast(id){
      const next = { ...overrides };
      const cur = (next[id] && next[id].grading) || byId[id].grading;
      const hist = [...cur.history];
      // find last removable event
      let idx=-1;
      for(let i=hist.length-1;i>=0;i--){ if(hist[i].kind!=='innmelding'){ idx=i; break; } }
      if(idx<0) return;
      hist.splice(idx,1);
      next[id] = { ...(next[id]||{}), grading: recompute(hist) };
      commit(next);
    },
    isEdited(id){ return !!overrides[id]; },
    resetMember(id){ const next={...overrides}; delete next[id]; commit(next); },
    resetAll(){ commit({}); },
    overridesCount(){ return Object.keys(overrides).length; },
    // ---- monthly roster import ----
    importRoster(incoming){
      const cur = members || base || [];
      const { matched, added, removed } = diffRoster(cur, incoming);
      const matchMap = new Map(matched.map(x=>[x.incoming, x.existing]));
      const usedIds=new Set(); const result=[];
      for(const im of incoming){
        const ex=matchMap.get(im);
        let grading;
        if(im.beltImport) grading=gradingFromBelt(im.beltImport, im.innmeldingsdato);
        else if(ex) grading=ex.grading;
        else grading=blankGrading(im.innmeldingsdato);
        let id = ex? ex.id : (im.id||'m');
        let b=id,k=2; while(usedIds.has(id)){id=b+'-'+k;k++;} usedIds.add(id);
        const oppmote = ex? ex.oppmote : (im.oppmote||{checkins:0,invitert:null,pct:null,sisteOppmote:null});
        result.push({ ...im, id, grading, oppmote });
      }
      saveRoster(result); setBase(result); commit({});
      return { added:added.length, updated:matched.length, removed:removed.length, total:result.length };
    },
    rosterActive(){ return !!loadRoster(); },
    clearRoster(){ localStorage.removeItem(ROSTER_KEY); commit({}); DASH_API.fetchMembers().then(setBase); },
  };

  return React.createElement(MembersCtx.Provider, { value:{ members, byId, actions, okonomi, okonomiActions } }, children);
}

function useMembers(){ return useContext(MembersCtx); }

// ---------- CSV export (UTF-8 BOM, comma-sep, quoted) ----------
function membersToCSV(members){
  const cols = ['Fornavn','Etternavn','Kategori','Medlemstype','Beltefarge','Striper','Belte oppnådd',
    'Forrige gradering','Antall graderinger','E-post','Mobil','Kjønn','Innmeldt','Fødselsdato','Postnr','Poststed','Oppmøter'];
  const esc = v => '"' + String(v==null?'':v).replace(/"/g,'""') + '"';
  const lines = [cols.map(esc).join(',')];
  for(const m of members){
    const g = m.grading;
    lines.push([
      m.fornavn, m.etternavn, m.kategori, m.medlemstype,
      g.current.belt, g.current.stripes, g.current.since,
      g.history.length>1 ? g.history[g.history.length-2].date : '',
      g.history.length, m.epost, m.mobil, m.kjonn,
      m.innmeldingsdato||'', m.fodselsdato||'', m.postnr, m.poststed, m.oppmote.checkins
    ].map(esc).join(','));
  }
  return '\ufeff' + lines.join('\r\n');
}
// Long-format grading log: one row per grading event
function gradingLogToCSV(members){
  const cols=['Medlem','Kategori','Dato','Hendelse','Belte','Striper','Gradert av','Notat'];
  const esc=v=>'"'+String(v==null?'':v).replace(/"/g,'""')+'"';
  const lines=[cols.map(esc).join(',')];
  for(const m of members){
    for(const e of m.grading.history){
      lines.push([m.navn,m.kategori,e.date,
        e.kind==='innmelding'?'Innmeldt':e.kind==='belte'?'Nytt belte':e.kind==='stripe'?'Stripe':'Justering',
        e.belt,e.stripes,e.by||'',e.note||''].map(esc).join(','));
    }
  }
  return '\ufeff'+lines.join('\r\n');
}
function downloadText(filename, text, mime='text/csv;charset=utf-8'){
  const blob = new Blob([text], { type:mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href=url; a.download=filename; document.body.appendChild(a); a.click();
  setTimeout(()=>{ document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);
}

Object.assign(window, { MembersProvider, useMembers, membersToCSV, gradingLogToCSV, downloadText, diffRoster });
