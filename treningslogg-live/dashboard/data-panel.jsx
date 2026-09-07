/* Data-panelet — ett sted for alle importer og eksporter.

   Bakgrunn: de ni import/eksport-handlingene lå spredt over fire faner, og
   oppmøte-importen lå nederst under en overskrift som het noe helt annet.
   Panelet samler dem. De kontekstuelle knappene står igjen der de er — det er
   praktisk å importere økonomi mens man står i Økonomi-fanen — så dette er
   ikke en erstatning, men stedet man finner alt når man ikke husker hvor det lå.

   Ingen ny fane: dashboardet har allerede ni, og import/eksport er noe man
   GJØR, ikke et sted man ser på. */
const { useState: useDp, useEffect: useDpEffect } = React;

// Importkildene, i den rekkefølgen de henger sammen i praksis.
const DP_KILDER = [
  { key:'roster',  navn:'Medlemmer',    meta:'rosterImportedAt',
    fil:'Spond-eksport (.xlsx / .csv)', teller:m=>m.rosterCount && m.rosterCount+' medl.' },
  { key:'oppmote', navn:'Oppmøte',      meta:'attendanceImportedAt',
    fil:'Spond ukesoppmøte (.xlsx)', teller:()=>'' },
  { key:'okonomi', navn:'Økonomi',      meta:'okonomiImportedAt', styre:true,
    fil:'Spond betalinger (.xlsx)', teller:m=>m.okonomiMonths && m.okonomiMonths+' mnd' },
  { key:'vipps',   navn:'Vipps-utsalg', meta:'vippsImportedAt', styre:true,
    fil:'Vipps oppgjør + salgsrapport', teller:()=>'' },
];

function dpDager(v){
  const t=v? new Date(v).getTime() : NaN;
  return isNaN(t)? null : Math.floor((Date.now()-t)/86400000);
}
function dpNivaa(d){ return d==null? 'old' : d<=7? 'fresh' : d<=21? 'stale' : 'old'; }
function dpFarge(n){ return n==='fresh'? 'var(--green)' : n==='stale'? 'var(--amber)' : 'var(--coral)'; }

function DataPanel({ onClose, members, live, departed, meta, okonomi, kpis, isStyre, terskler }){
  const [fane, setFane]=useDp('eksport');
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e=>e.stopPropagation()} style={{width:720, maxWidth:'100%'}}>
        <div className="modal-head">
          <div><div className="modal-kicker">Data</div>
            <div className="modal-title">Import og eksport</div></div>
          <button className="icon-btn" onClick={onClose} aria-label="Lukk">✕</button>
        </div>
        <div style={{display:'flex', gap:6, marginBottom:16}}>
          {[['eksport','Eksporter'],['import','Importer']].map(([id,l])=>(
            <button key={id} className={'chip'+(fane===id?' active':'')} onClick={()=>setFane(id)}>{l}</button>
          ))}
        </div>
        {fane==='import'
          ? <ImportOversikt meta={meta} isStyre={isStyre}/>
          : <Rapportbygger members={members} live={live} departed={departed} okonomi={okonomi}
              kpis={kpis} isStyre={isStyre} terskler={terskler}/>}
      </div>
    </div>
  );
}

/* ---------- Importer ---------- */
function ImportOversikt({ meta, isStyre }){
  const [apen, setApen]=useDp(null);
  const m=meta||{};
  const kilder=DP_KILDER.filter(k => !k.styre || isStyre);
  return (
    <div className="dlg-body">
      <div className="dim" style={{fontSize:12, lineHeight:1.7, marginBottom:14}}>
        Prikken viser hvor ferskt grunnlaget er — grønn under en uke, gul under tre, rød eldre.
        En kilde som henger etter er som regel grunnen til at tall i dashboardet står stille.
      </div>
      <table className="t">
        <tbody>
          {kilder.map(k=>{
            const v=m[k.meta];
            const d=dpDager(v);
            const farge=dpFarge(dpNivaa(d));
            const ant=v? k.teller(m) : '';
            return (
              <tr key={k.key}>
                <td style={{width:22}}>
                  <span style={{display:'inline-block',width:8,height:8,borderRadius:'50%',background:farge}}/>
                </td>
                <td>
                  <strong>{k.navn}</strong>
                  <div className="dim" style={{fontSize:11}}>{k.fil}</div>
                </td>
                <td className="dim" style={{fontSize:11, whiteSpace:'nowrap'}}>
                  {v ? <>{new Date(v).toLocaleDateString('nb-NO',{day:'numeric',month:'short'})}
                        {' · '}{d===0?'i dag':d+' dager siden'}{ant?` · ${ant}`:''}</>
                     : <span style={{color:'var(--coral)'}}>aldri importert</span>}
                </td>
                <td style={{textAlign:'right', whiteSpace:'nowrap'}}>
                  <button className="btn outline sm" onClick={()=>setApen(k.key)}>Importer</button>
                  {k.key==='oppmote' &&
                    <button className="btn ghost sm" style={{marginLeft:6}} onClick={()=>setApen('rydd')}>Rydd opp</button>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="dim" style={{fontSize:11, marginTop:14, lineHeight:1.7}}>
        Knappene finnes fortsatt i sine egne faner også — Medlemmer, Oppmøte og Økonomi.
        Dette er samlesiden, ikke en erstatning.
      </div>
      {apen==='roster'  && <ImportModal onClose={()=>setApen(null)}/>}
      {apen==='oppmote' && <AttendanceImportModal onClose={()=>setApen(null)}/>}
      {apen==='rydd'    && <CleanupModal onClose={()=>setApen(null)} onDone={()=>{}}/>}
      {apen==='okonomi' && <OkonomiImportModal onClose={()=>setApen(null)}/>}
      {apen==='vipps'   && <VippsImportModal onClose={()=>setApen(null)} onSaved={()=>{}}/>}
    </div>
  );
}

/* ---------- Eksporter: rapportbyggeren ---------- */
const DP_PERIODER = [
  ['forrige','Forrige måned'], ['denne','Denne måneden'], ['tre','Siste 3 mnd'],
  ['seks','Siste 6 mnd'], ['iaar','Hittil i år'], ['ifjor','I fjor'], ['egen','Egendefinert'],
];

function Rapportbygger({ members, live, departed, okonomi, kpis, isStyre, terskler }){
  const [preset, setPreset]=useDp('trener');
  const [periode, setPeriode]=useDp('forrige');
  const [egenFra, setEgenFra]=useDp(()=>mrSkyv(new Date().toISOString().slice(0,7), -2));
  const [egenTil, setEgenTil]=useDp(()=>new Date().toISOString().slice(0,7));
  const [valgt, setValgt]=useDp(()=>new Set(RAPPORT_PRESETS[0].seksjoner));
  const [sessions, setSessions]=useDp(null);
  const [vipps, setVipps]=useDp(null);
  const [feil, setFeil]=useDp('');

  // Øktene og Vipps-tallene hentes ikke av useMembers — de er egne ruter.
  useDpEffect(()=>{
    if(typeof DASH_API.fetchCalendar !== 'function'){ setFeil('Kalender-ruten mangler — last siden på nytt (Ctrl/Cmd+F5).'); return; }
    DASH_API.fetchCalendar().then(c => setSessions((c && c.sessions) || []))
      .catch(err => setFeil('Kunne ikke hente øktene: ' + err.message));
  }, []);
  useDpEffect(()=>{
    if(!isStyre || typeof DASH_API.fetchVipps !== 'function'){ setVipps({months:[]}); return; }
    DASH_API.fetchVipps().then(setVipps).catch(()=>setVipps({months:[]}));
  }, [isStyre]);

  function velgPreset(p){
    setPreset(p.key);
    setPeriode(p.periode);
    setValgt(new Set(p.seksjoner));
  }
  function toggle(key){
    setValgt(prev=>{
      const n=new Set(prev);
      if(n.has(key)) n.delete(key); else n.add(key);
      return n;
    });
    setPreset('egen');
  }

  const p=mrPeriode(periode, egenFra, egenTil);
  const gyldig=mrMndListe(p.fra, p.til).length>0;
  const synlige=RAPPORT_SEKSJONER.filter(s => !s.styre || isStyre);
  const periodeSeksjoner=synlige.filter(s => s.periode);
  const naaSeksjoner=synlige.filter(s => !s.periode);
  const antValgt=synlige.filter(s => valgt.has(s.key)).length;

  function byggData(){
    return buildRapportData(p.fra, p.til, {
      members, sessions: sessions||[], live, departed, okonomi, vipps, kpis, terskler,
    });
  }
  function tittel(){
    const pre=RAPPORT_PRESETS.find(x=>x.key===preset);
    return pre? pre.navn : 'Rapport';
  }
  function lag(){ openRapport(byggData(), [...valgt], tittel()); }
  // Samme utvalg, samme periode — men som regneark. Nyttig når tallene skal
  // sorteres eller regnes videre på, ikke leses.
  function lagCSV(){ lastNedRapportCSV(byggData(), [...valgt], tittel()); }

  const rute=(s)=>(
    <label key={s.key} style={{display:'flex', alignItems:'flex-start', gap:8, padding:'5px 0', fontSize:12.5, cursor:'pointer'}}>
      <input type="checkbox" checked={valgt.has(s.key)} onChange={()=>toggle(s.key)} style={{marginTop:2}}/>
      <span>{s.navn}<span className="dim" style={{fontSize:11, marginLeft:6}}>{s.gruppe}</span></span>
    </label>
  );

  return (
    <div className="dlg-body">
      {feil && <div style={{fontSize:12, color:'var(--coral)', marginBottom:12}}>{feil}</div>}

      <div style={{fontSize:11, textTransform:'uppercase', letterSpacing:'.12em', color:'var(--text-mut)', marginBottom:7}}>Forhåndsvalg</div>
      <div style={{display:'flex', gap:8, flexWrap:'wrap', marginBottom:16}}>
        {RAPPORT_PRESETS.map(x=>(
          <button key={x.key} className={'btn '+(preset===x.key?'primary':'outline')+' sm'}
            title={x.hint} onClick={()=>velgPreset(x)}>{x.navn}</button>
        ))}
        {preset==='egen' && <span className="dim" style={{fontSize:11, alignSelf:'center'}}>Egendefinert</span>}
      </div>

      <div style={{fontSize:11, textTransform:'uppercase', letterSpacing:'.12em', color:'var(--text-mut)', marginBottom:7}}>Periode</div>
      <div className="chips" style={{marginBottom:10, flexWrap:'wrap'}}>
        {DP_PERIODER.map(([v,l])=>(
          <button key={v} className={'chip'+(periode===v?' active':'')} onClick={()=>setPeriode(v)}>{l}</button>
        ))}
      </div>
      {periode==='egen' && (
        <div style={{display:'flex', gap:8, alignItems:'center', marginBottom:10, fontSize:12}}>
          <input type="month" value={egenFra} onChange={e=>setEgenFra(e.target.value)} className="mnd-inp"/>
          <span className="dim">til</span>
          <input type="month" value={egenTil} onChange={e=>setEgenTil(e.target.value)} className="mnd-inp"/>
        </div>
      )}
      <div className="dim" style={{fontSize:11, marginBottom:18, lineHeight:1.6}}>
        {gyldig
          ? <>Rapporten dekker <strong>{mrMndNavn(p.fra)}</strong>{p.fra!==p.til && <> til <strong>{mrMndNavn(p.til)}</strong></>}.
              Perioden regnes i hele måneder — økonomi og oppmøte pr. medlem lagres månedsvis, så en dag-presis periode ville gitt tall som ikke summerer opp. Øktlista er dag-eksakt.</>
          : <span style={{color:'var(--coral)'}}>Fra-måneden må være før eller lik til-måneden.</span>}
      </div>

      <div className="two-col" style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:22}}>
        <div>
          <div style={{fontSize:11, textTransform:'uppercase', letterSpacing:'.12em', color:'var(--text-mut)', marginBottom:5}}>Følger perioden</div>
          {periodeSeksjoner.map(rute)}
        </div>
        <div>
          <div style={{fontSize:11, textTransform:'uppercase', letterSpacing:'.12em', color:'var(--text-mut)', marginBottom:5}}>Slik det ser ut i dag</div>
          {naaSeksjoner.map(rute)}
          <div className="dim" style={{fontSize:10.5, marginTop:8, lineHeight:1.6}}>
            Disse er øyeblikksbilder. Registeret overskrives ved hver import, så vi kan ikke vite
            hvordan beltefordelingen så ut i mars — datovalget over gjelder dem ikke.
          </div>
        </div>
      </div>

      <div className="modal-foot" style={{marginTop:20, alignItems:'center', justifyContent:'space-between'}}>
        <span className="dim" style={{fontSize:11}}>
          {sessions===null ? 'Henter økter …' : `${antValgt} ${antValgt===1?'seksjon':'seksjoner'} valgt`}
        </span>
        <span style={{display:'flex', gap:8}}>
          <button className="btn outline" disabled={!gyldig || !antValgt || sessions===null} onClick={lagCSV}
            title="Last ned de valgte seksjonene som regneark (semikolon, UTF-8 — åpner rett i Excel)">
            ⤓ Regneark (CSV)
          </button>
          <button className="btn primary" disabled={!gyldig || !antValgt || sessions===null} onClick={lag}>
            Åpne rapport
          </button>
        </span>
      </div>
    </div>
  );
}

/* Knappen i toppmenyen. Erstatter de to faste rapportknappene. */
function DataKnapp(props){
  const [apen, setApen]=useDp(false);
  return (
    <>
      <button className="btn outline sm" title="Import og eksport — rapporter, medlemsfil, oppmøte, økonomi"
        onClick={()=>setApen(true)}>⤓ Data</button>
      {apen && <DataPanel {...props} onClose={()=>setApen(false)}/>}
    </>
  );
}

Object.assign(window, { DataKnapp, DataPanel, Rapportbygger, ImportOversikt });
