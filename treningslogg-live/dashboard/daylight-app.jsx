/* Daylight dashboard — light, soft, rounded */
const { useState, useEffect } = React;

const FONTS = {
  'Plus Jakarta Sans': "'Plus Jakarta Sans', system-ui, sans-serif",
  'Poppins': "'Poppins', system-ui, sans-serif",
  'Figtree': "'Figtree', system-ui, sans-serif",
  'Onest': "'Onest', system-ui, sans-serif",
};
const ACCENTS = ['#7B6EF6', '#F2825F', '#4F9BEA', '#34B98C', '#B06FD6'];
const BG_TONES = { 'Lavendel': '#F4F3FB', 'Krem': '#F8F5F0', 'Kjølig': '#EFF3F8' };

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "font": "Plus Jakarta Sans",
  "accent": "#7B6EF6",
  "bgTone": "Lavendel",
  "radius": 1,
  "stilleUker": 3,
  "gradMinOppmote": 30,
  "gradMinMnd": 6,
  "introUker": 2
}/*EDITMODE-END*/;

function hexA(hex, a) {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0,2),16), g = parseInt(h.slice(2,4),16), b = parseInt(h.slice(4,6),16);
  return `rgba(${r},${g},${b},${a})`;
}

const TABS = [
  { id: 'idag', label: 'I dag' },
  { id: 'oversikt', label: 'Oversikt' },
  { id: 'kalender', label: 'Kalender' },
  { id: 'register', label: 'Medlemmer' },
  { id: 'statistikk', label: 'Medlemsstatistikk' },
  { id: 'oppmote', label: 'Oppmøte' },
  { id: 'innhold', label: 'Innhold' },
  { id: 'okonomi', label: 'Økonomi' },
  { id: 'churn', label: 'Kohort & Churn' },
];

const COLORS = ['#7B6EF6','#34B98C','#F2825F','#4F9BEA','#B06FD6','#A6A3BD'];

function fmtDateTime(v){
  if(!v) return '—';
  const d = new Date(v);
  if(isNaN(d.getTime())) return String(v);
  return d.toLocaleDateString('nb-NO',{day:'numeric',month:'short',year:'numeric'})
    + ', ' + d.toLocaleTimeString('nb-NO',{hour:'2-digit',minute:'2-digit'});
}

// Ferskhet: nyeste av alle importer + siste loggede økt. Avgjør om brukeren
// ser på live eller utdaterte tall. Grønn ≤7 dager, gul 8–21, rød >21.
function freshnessInfo(meta, live, kpis){
  const cands = [];
  if(meta){ ['rosterImportedAt','okonomiImportedAt','attendanceImportedAt'].forEach(k=>{ if(meta[k]) cands.push(meta[k]); }); }
  if(live && live.maxDate) cands.push(live.maxDate);
  if(kpis && kpis.generated) cands.push(kpis.generated);
  const times = cands.map(v=>new Date(v).getTime()).filter(t=>!isNaN(t));
  if(!times.length) return { ts:null, days:null, level:'old' };
  const ts = Math.max(...times);
  const days = Math.floor((Date.now()-ts)/86400000);
  const level = days<=7 ? 'fresh' : days<=21 ? 'stale' : 'old';
  return { ts, days, level };
}
function fmtDayMonth(ts){ return new Date(ts).toLocaleDateString('nb-NO',{day:'numeric',month:'numeric'}); }

// Nedlastbar årsrapport (tekst). Bygger på live medlems-aggregater + statisk
// oppmøtegrunnlag; økonomidelen tas kun med for styre.
function buildAarsrapport(kpis, members, okonomi, isStyre){
  const t = kpis.totals || {};
  const year = new Date().getFullYear();
  const L = [];
  L.push('ÅRSRAPPORT — Bodø Jiu Jitsu');
  L.push('Generert ' + new Date().toLocaleDateString('nb-NO') + ' · rapportår ' + year);
  L.push('');
  L.push('== MEDLEMMER ==');
  L.push('Aktive medlemmer: ' + (t.activeMembers || 0));
  Object.entries(kpis.byKategori || {}).sort((a,b)=>b[1]-a[1]).forEach(([k,v])=> L.push('  ' + k + ': ' + v));
  const kj = kpis.byKjonn || {};
  L.push('Kjønn: Mann ' + (kj.Mann || 0) + ' · Kvinne ' + (kj.Kvinne || 0));
  L.push('');
  L.push('== BELTER ==');
  Object.entries(kpis.byBelt || {}).sort((a,b)=>b[1]-a[1]).forEach(([k,v])=> L.push('  ' + k + ': ' + v));
  let grad = 0;
  (members || []).forEach(m => (m.grading.history || []).forEach(e => {
    if(e.kind !== 'innmelding' && String(e.date).slice(0,4) === String(year)) grad++;
  }));
  L.push('Graderinger i ' + year + ': ' + grad);
  L.push('');
  L.push('== OPPMØTE (historisk Spond-grunnlag) ==');
  L.push('Totale check-ins: ' + fmtN(t.totalCheckins || 0));
  L.push('Økter registrert: ' + fmtN(t.sessionsTracked || 0));
  if(kpis.leaderboard && kpis.leaderboard.length){
    L.push('Mest dedikerte:');
    kpis.leaderboard.slice(0,5).forEach((m,i)=> L.push('  ' + (i+1) + '. ' + m.navn + ' — ' + m.deltatt + ' oppmøter'));
  }
  L.push('');
  if(isStyre && okonomi && okonomi.keys && okonomi.keys.length){
    const ym = okonomi.keys.filter(k => String(k).slice(0,4) === String(year));
    const netto = ym.reduce((s,k)=> s + (okonomi.months[k].netto || 0), 0);
    L.push('== ØKONOMI ' + year + ' (kun styre) ==');
    L.push('Netto innbetalt (' + ym.length + ' mnd registrert): ' + fmtN(netto) + ' kr');
    L.push('Estimert MRR: ' + fmtN(t.mrr || 0) + ' kr · ARR: ' + fmtN(t.arr || 0) + ' kr');
    L.push('');
  }
  L.push('— Generert av løft.app/dashboard —');
  return L.join('\n');
}

// ── Live oppmøte: flett trener-appens loggede økter med historisk grunnlag ──
function histMaxWeek(kpis){
  const ks = Object.keys((kpis && kpis.weeklyAttendance) || {});
  if(!ks.length) return '';
  ks.sort();
  return ks[ks.length - 1];
}
// Live check-ins ETTER det historiske grunnlaget (unngår dobbelttelling).
function liveSince(kpis, live){
  if(!live || !live.weekly) return { total: 0, weekly: {} };
  const cut = histMaxWeek(kpis);
  const weekly = {}; let total = 0;
  Object.keys(live.weekly).forEach(wk => { if(wk > cut){ weekly[wk] = live.weekly[wk]; total += live.weekly[wk]; } });
  return { total, weekly };
}
// Historisk ukestrend + live-uker, sortert — for «Klubbens puls».
function blendedWeeklyEntries(kpis, live){
  const out = { ...((kpis && kpis.weeklyAttendance) || {}) };
  const ls = liveSince(kpis, live).weekly;
  Object.keys(ls).forEach(wk => { out[wk] = (out[wk] || 0) + ls[wk]; });
  return Object.entries(out).sort((a,b) => a[0].localeCompare(b[0]));
}

// Slå sammen statiske KPI-er (oppmøte/historikk fra kpis.json) med live
// medlems-aggregater regnet fra registeret. Øyeblikksbilde-feltene
// (antall, kategori, kjønn, belte, alder, pris/MRR) overstyres med live-data
// så de stemmer med registeret; oppmøte- og historikkfelt beholdes statiske.
function mergeLiveKpis(kpis, members){
  if(!kpis) return null;
  if(!members || !members.length) return kpis;
  const byKategori={}, byKjonn={Mann:0,Kvinne:0}, byBelt={}, byAgeBucket={}, byPostnr={};
  const pricing={};
  let mrr=0;
  members.forEach(m=>{
    byKategori[m.kategori||'Annet']=(byKategori[m.kategori||'Annet']||0)+1;
    const kj=m.kjonn||'Ukjent'; byKjonn[kj]=(byKjonn[kj]||0)+1;
    const belt=(m.grading&&m.grading.current.belt)||'Hvit'; byBelt[belt]=(byBelt[belt]||0)+1;
    const a=m.alder;
    const bucket = a==null?'Ukjent' : a<13?'Under 13' : a<18?'13–17' : a<30?'18–29' : a<45?'30–44' : '45+';
    byAgeBucket[bucket]=(byAgeBucket[bucket]||0)+1;
    if(m.postnr) byPostnr[m.postnr]=(byPostnr[m.postnr]||0)+1; // barn er maskert → kun voksne
    const type=m.medlemstype||'Ukjent';
    const p=pricing[type]||(pricing[type]={count:0, monthly:m.prisMnd||0, mrr:0});
    p.count++; if(m.prisMnd) p.monthly=m.prisMnd; p.mrr+=(m.prisMnd||0);
    mrr+=(m.prisMnd||0);
  });
  return {
    ...kpis,
    byKategori, byKjonn, byBelt, byAgeBucket, byPostnr,
    pricingBreakdown: pricing,
    totals: { ...kpis.totals, activeMembers: members.length, mrr, arr: mrr*12 },
  };
}

function App() {
  const [tw, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [tab, setTab] = useState('idag');
  const staticKpis = useKpis();
  const { members, meta, access, okonomi, live } = useMembers();
  const kpis = React.useMemo(() => mergeLiveKpis(staticKpis, members), [staticKpis, members]);
  const charts = deriveCharts(kpis);
  const lastUpdated = (() => { const f = freshnessInfo(meta, live, kpis); return f.ts != null ? f.ts : ((meta && (meta.rosterImportedAt || meta.okonomiImportedAt)) || (kpis && kpis.generated)); })();

  useEffect(() => {
    const r = document.documentElement.style;
    r.setProperty('--font', FONTS[tw.font] || FONTS['Plus Jakarta Sans']);
    r.setProperty('--accent', tw.accent);
    r.setProperty('--accent-soft', hexA(tw.accent, 0.16));
    r.setProperty('--accent-bg', hexA(tw.accent, 0.10));
    r.setProperty('--bg', BG_TONES[tw.bgTone] || BG_TONES.Lavendel);
    r.setProperty('--rscale', tw.radius);
  }, [tw]);

  if (!kpis) return <div style={{padding:40, color:'#9290A6'}}>Laster…</div>;
  const isStyre = !!(access && access.isStyre);
  // Identitetsbro: umatchede oppmøter er én rot bak feil i leaderboard, oppmøte
  // OG konvertering. Gjør den til en tydelig inngang, ikke en boks nederst.
  const unmatched = (live && live.unmatched) ? live.unmatched : 0;
  const gotoReconcile = () => {
    setTab('oppmote');
    setTimeout(() => { const el = document.getElementById('avstemming'); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 80);
  };
  const visibleTabs = TABS.filter(x => x.id !== 'okonomi' || isStyre);
  // Ikke-styre skal aldri ende på økonomi-fanen.
  const effTab = (tab === 'okonomi' && !isStyre) ? 'oversikt' : tab;
  const tabLabel = (TABS.find(x=>x.id===effTab) || TABS[0]).label;
  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-badge">BJJ</div>
          <div>
            <div className="brand-title">bodø jiu jitsu</div>
            <div className="brand-meta">klubbpanel · sia 2016</div>
          </div>
        </div>
        <div className="nav">
          {visibleTabs.map(x => (
            <button key={x.id} className={effTab===x.id?'active':''} onClick={()=>setTab(x.id)}>
              <span className="dot"/>{x.label}
            </button>
          ))}
        </div>
        <div className="live">
          <span className="pulse"/><strong>{kpis.totals.activeMembers}</strong> aktive medlemmer
          {meta && meta.rosterImportedAt
            ? <div style={{marginTop:8, fontSize:11, lineHeight:1.5}}>
                <div>Medlemsimport: {fmtDateTime(meta.rosterImportedAt)}{meta.rosterCount?` · ${meta.rosterCount} medl.`:''}</div>
                {isStyre && meta.okonomiImportedAt && <div>Økonomiimport: {fmtDateTime(meta.okonomiImportedAt)}{meta.okonomiMonths?` · ${meta.okonomiMonths} mnd`:''}</div>}
              </div>
            : <div className="muted" style={{marginTop:8, fontSize:11}}>Ingen import kjørt ennå</div>}
        </div>
      </aside>
      <main className="main">
        <div className="topbar">
          <div>
            <div className="crumbs">dashboard / <span className="cur">{tabLabel}</span></div>
            <h1 className="h1">{tabLabel} <small>oppdatert {fmtDateTime(lastUpdated)}</small></h1>
          </div>
          <div className="topbar-pills">
            {isStyre && unmatched>0 && (
              <button className="btn outline sm" onClick={gotoReconcile}
                title="Oppmøter som ikke er koblet til medlemsregisteret. Klikk for å koble dem nå."
                style={{borderColor:'var(--coral)', color:'var(--coral)', fontWeight:700}}>
                ⚠ {unmatched} umatchede — koble nå
              </button>
            )}
            {(() => {
              const f = freshnessInfo(meta, live, kpis);
              const color = f.level==='fresh' ? 'var(--green)' : f.level==='stale' ? 'var(--amber)' : 'var(--coral)';
              const txt = f.ts==null
                ? 'Ingen import ennå'
                : `Siste import: ${fmtDayMonth(f.ts)} · ${f.days} ${f.days===1?'dag':'dager'} siden`;
              const weight = f.level==='old' ? 700 : 600;
              return (
                <span className="pill" title="Ferskhet på data — grønn ≤7 dager, gul 8–21, rød >21 dager"
                  style={{borderColor:color, color, fontWeight:weight}}>
                  <span className="sw" style={{background:color}}/>{txt}
                </span>
              );
            })()}
            <span className="pill" title="Data er kvalitetssikret (konsolidert oppmøtefil) — sier ikke noe om hvor ferske tallene er. Se ferskhets-indikatoren."><span className="sw" style={{background:'var(--green)'}}/>verifisert</span>
            <span className="pill"><span className="sw" style={{background:'var(--accent)'}}/>jan 2023 → apr 2026</span>
            <span className="pill"><span className="sw" style={{background:'var(--blue)'}}/>{fmtN(kpis.totals.totalCheckins)} check-ins</span>
            <button className="btn outline sm" title="Last ned årsrapport (tekst)"
              onClick={()=>downloadText('arsrapport_'+new Date().getFullYear()+'.txt',
                buildAarsrapport(kpis, members, okonomi, isStyre), 'text/plain;charset=utf-8')}>
              ⤓ Årsrapport
            </button>
          </div>
        </div>
        {effTab==='idag' && <Today members={members} thresholds={{stilleUker:tw.stilleUker, gradMinOppmote:tw.gradMinOppmote, gradMinMnd:tw.gradMinMnd, introUker:tw.introUker}}/>}
        {effTab==='oversikt' && <Oversikt kpis={kpis} charts={charts} isStyre={isStyre} live={live}/>}
        {effTab==='kalender' && <Kalender/>}
        {effTab==='register' && <Register/>}
        {effTab==='statistikk' && <Medlemmer kpis={kpis} charts={charts}/>}
        {effTab==='oppmote' && <Oppmote kpis={kpis} charts={charts} live={live} isStyre={isStyre}/>}
        {effTab==='innhold' && <Innhold/>}
        {effTab==='okonomi' && isStyre && <Okonomi kpis={kpis} charts={charts}/>}
        {effTab==='churn' && <Churn kpis={kpis} charts={charts} live={live} isStyre={isStyre} onGotoReconcile={gotoReconcile}/>}
        {effTab!=='register' && effTab!=='idag' && <DataFooter kpis={kpis} />}
      </main>
      <TweaksPanel>
        <TweakSection label="Typografi" />
        <TweakSelect label="Font" value={tw.font} options={Object.keys(FONTS)} onChange={v=>setTweak('font', v)} />
        <TweakSection label="Farge & form" />
        <TweakColor label="Aksentfarge" value={tw.accent} options={ACCENTS} onChange={v=>setTweak('accent', v)} />
        <TweakRadio label="Bakgrunn" value={tw.bgTone} options={Object.keys(BG_TONES)} onChange={v=>setTweak('bgTone', v)} />
        <TweakSlider label="Avrunding" value={tw.radius} min={0.5} max={1.5} step={0.1} onChange={v=>setTweak('radius', v)} />
        <TweakSection label="«I dag»-terskler" />
        <TweakSlider label="Stille etter" value={tw.stilleUker} min={1} max={12} step={1} unit=" uker" onChange={v=>setTweak('stilleUker', v)} />
        <TweakSlider label="Graderingsklar — oppmøter" value={tw.gradMinOppmote} min={5} max={150} step={5} onChange={v=>setTweak('gradMinOppmote', v)} />
        <TweakSlider label="Graderingsklar — måneder" value={tw.gradMinMnd} min={1} max={24} step={1} unit=" mnd" onChange={v=>setTweak('gradMinMnd', v)} />
        <TweakSlider label="Intro-oppfølging etter" value={tw.introUker} min={1} max={8} step={1} unit=" uker" onChange={v=>setTweak('introUker', v)} />
      </TweaksPanel>
    </div>
  );
}

function DataFooter({ kpis }) {
  return (
    <footer className="datafoot">
      <div className="ribbon">
        <span className="lbl">Datagrunnlag · oppmote_konsolidert.xlsx</span>
        <span className="muted">Konsolidert oppmøtefil · 6 Spond-eksporter · {fmtN(kpis.totals.totalCheckins)} check-ins · {fmtN(kpis.totals.sessionsTracked)} unike events (jan 2023 → apr 2026)</span>
      </div>
      <div className="grid">
        <div>
          <div className="h">Kildedata (Spond)</div>
          <ul>
            <li>download__39_.xlsx — søk: nogi</li>
            <li>download__40_.xlsx — søk: basics</li>
            <li>download__44_.xlsx — søk: erfaren</li>
            <li>download__45_.xlsx — søk: viderekommende</li>
            <li>download__46_.xlsx — søk: grunnleggende</li>
            <li>download__47_.xlsx — søk: åpen matte</li>
          </ul>
        </div>
        <div>
          <div className="h">Events pr. nivå</div>
          <ul>
            <li>Åpen matte — 499 events</li>
            <li>Erfaren / Videre — 232 events</li>
            <li>Grunnleggende — 216 events</li>
            <li>Sparring — 37 events</li>
            <li>NoGi (uspes.) — 10 events</li>
          </ul>
        </div>
        <div>
          <div className="h">Nivå-mapping</div>
          <ul>
            <li>Erfaren = Erfaren / Viderekommende / Intermediate</li>
            <li>Grunnleggende = Basics / Grunnleggende</li>
            <li>NoGi (uspes.) = NoGi-titler uten nivå</li>
          </ul>
        </div>
        <div>
          <div className="h">Forbehold</div>
          <ul>
            <li>Hver event talt nøyaktig én gang</li>
            <li>Klokkeslett estimert fra klassetype</li>
            <li>"Invitert"-tall er approksimasjon (Spond aggregerer pr. fil)</li>
          </ul>
        </div>
      </div>
    </footer>
  );
}

function KPI({ label, value, unit, delta, deltaClass, accent='amber', corner }) {
  return (
    <div className={'kpi-tile ' + accent}>
      <div className="label">{label}</div>
      <div className="value">{value}{unit && <span className="unit">{unit}</span>}</div>
      {delta && <div className={'delta '+(deltaClass||'')}>{delta}</div>}
    </div>
  );
}

function Tile({ title, corner, children, style }) {
  return (
    <div className="tile" style={style}>
      <div className="tile-header">
        <div className="tile-title">{title}</div>
        {corner && <div className="tile-corner">{corner}</div>}
      </div>
      {children}
    </div>
  );
}

// Delt «mest dedikerte»-tabell — brukes av Oversikt (topp 5) og Oppmøte
// (topp 10, med 2./3.-merker). Én kilde for kolonner, tomtilstand og
// umatchet-advarselen, så de to visningene ikke driver fra hverandre.
function LeaderboardTable({ live, limit, medals = false, emptyHint, unmatchedHint }) {
  const rows = (live && live.leaderboard) || [];
  return (
    <>
      {rows.length > 0 ? (
        <table className="t">
          <thead><tr><th>#</th><th>Navn</th><th className="num">Oppmøter</th><th className="num">Sist sett</th></tr></thead>
          <tbody>
            {rows.slice(0, limit).map((m, i) => (
              <tr key={m.id || m.navn}>
                <td className="dim tabular">{String(i + 1).padStart(2, '0')}</td>
                <td>
                  <strong>{m.navn}</strong>
                  {i === 0 && <span className="tag amber" style={{marginLeft:8}}>leder</span>}
                  {medals && i === 1 && <span className="tag green" style={{marginLeft:8}}>2.</span>}
                  {medals && i === 2 && <span className="tag coral" style={{marginLeft:8}}>3.</span>}
                </td>
                <td className="num" style={{color:'var(--amber)', fontWeight:700}}>{m.deltatt}</td>
                <td className="num dim">{fmtDate(m.sist)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="dim" style={{fontSize:12}}>Ingen oppmøte-data ennå — {emptyHint}</div>
      )}
      {live && live.unmatched > 0 && (
        <div className="dim" style={{fontSize:11, marginTop:10, color:'var(--coral)'}}>
          ⚠ {live.unmatched} oppmøter er ikke koblet til medlemmer ennå — listen kan være ufullstendig. {unmatchedHint}
        </div>
      )}
    </>
  );
}

function Oversikt({ kpis, charts, isStyre, live }) {
  const t = kpis.totals;
  const liveAdd = liveSince(kpis, live).total;
  return (
    <div>
      <div className="grid-4">
        <KPI label="Aktive medlemmer" value={t.activeMembers} delta={`+${kpis.signupsPerYear['2026']||0} i 2026`} deltaClass="up" accent="amber"/>
        {isStyre
          ? <KPI label="Estimert MRR" value={fmtN(t.mrr)} unit=" kr" delta={`ARR ≈ ${fmtN(t.arr)} kr`} deltaClass="amber" accent="green"/>
          : <KPI label="Nye i 2026" value={kpis.signupsPerYear['2026']||0} delta="nye medlemskap" accent="green"/>}
        <KPI label="Snitt medlemstid" value={(t.avgTenureDaysActive/365).toFixed(1)} unit=" år" delta="aktive medlemmer" accent="blue"/>
        <KPI label="Total check-ins" value={fmtN(t.totalCheckins + liveAdd)} delta={liveAdd>0 ? `historisk + ${fmtN(liveAdd)} live` : `${t.sessionsTracked} events`} accent="coral"/>
      </div>

      <div className="section-h">Klubbens puls<span className="meta">ukentlig oppmøte · historisk + live</span></div>
      <Tile title="oppmøte pr. uke" corner="weekly">
        <Spark
          data={blendedWeeklyEntries(kpis, live)}
          accessor={d => d[1]} height={140}
          color="var(--accent)" fill="var(--accent-soft)"
        />
        <div style={{display:'flex', justifyContent:'space-between', fontSize:10, color:'var(--text-dim)', letterSpacing:'.12em', textTransform:'uppercase', marginTop:8}}>
          <span>2021</span><span>2026</span>
        </div>
      </Tile>

      <div className="section-h">Sammensetning</div>
      <div className="grid-3">
        <Tile title="Medlemstype" corner="kategori">
          <div style={{display:'flex', gap:14, alignItems:'center', marginTop:6}}>
            <Donut
              data={Object.entries(kpis.byKategori).map(([k,v])=>({label:k, value:v}))}
              colors={COLORS} centerValue={t.activeMembers} centerLabel="aktive"
            />
            <div style={{flex:1, fontSize:11}}>
              {Object.entries(kpis.byKategori).map(([k,v],i) => (
                <div key={k} style={{display:'flex', justifyContent:'space-between', padding:'3px 0'}}>
                  <span><span style={{display:'inline-block',width:8,height:8,marginRight:6,background:COLORS[i]}}/>{k}</span>
                  <span className="tabular">{v}</span>
                </div>
              ))}
            </div>
          </div>
        </Tile>
        <Tile title="Aldersfordeling" corner="alder">
          <HBar data={Object.entries(kpis.byAgeBucket).map(([k,v])=>({label:k, value:v}))} color="#5A8DB0" height={18}/>
        </Tile>
        <Tile title="Kjønn" corner="kjonn">
          <div style={{display:'flex', gap:14, alignItems:'center'}}>
            <Donut
              data={Object.entries(kpis.byKjonn).map(([k,v])=>({label:k, value:v}))}
              colors={['#4F9BEA','#F2825F','#C0BED2']}
              centerValue={fmtPct(kpis.byKjonn.Mann/(kpis.byKjonn.Mann+kpis.byKjonn.Kvinne))} centerLabel="menn"
            />
            <div style={{flex:1, fontSize:11}}>
              {Object.entries(kpis.byKjonn).map(([k,v],i)=>(
                <div key={k} style={{padding:'3px 0', display:'flex', justifyContent:'space-between'}}>
                  <span><span style={{display:'inline-block',width:8,height:8,marginRight:6,background:['#4F9BEA','#F2825F','#C0BED2'][i]}}/>{k}</span>
                  <span className="tabular">{v}</span>
                </div>
              ))}
            </div>
          </div>
        </Tile>
      </div>

      <div className="section-h">Klassepopularitet<span className="meta">historisk klassetype (Spond) · snitt deltagere pr. økt</span></div>
      <Tile title="alle klassetyper" corner="ranking">
        <HBar data={charts.classes.map(c=>({label:c.name+' ('+c.sessions+' økter)', value:Math.round(c.avg*10)/10}))} color="var(--accent)" height={20}/>
      </Tile>

      <div className="section-h">Topp 5 mest dedikerte<span className="meta">nåværende medlemmer · faktiske oppmøte-rader</span></div>
      <Tile title="leaderboard" corner="hot">
        <LeaderboardTable live={live} limit={5}
          emptyHint="last opp ukesoppmøte i avstemmingen under Oppmøte-fanen."
          unmatchedHint="Kjør identitetsbroen under Oppmøte."/>
      </Tile>
    </div>
  );
}

function Medlemmer({ kpis, charts }) {
  const t = kpis.totals;
  return (
    <div>
      <div className="grid-4">
        <KPI label="Aktive" value={t.activeMembers} delta={`+${kpis.signupsPerYear['2026']||0} i 2026`} deltaClass="up" accent="amber"/>
        <KPI label="Junior + Knøtte" value={kpis.byKategori['Junior']||0} delta="9–14 år" accent="green"/>
        <KPI label="Voksen + Student" value={(kpis.byKategori['Voksen']||0)+(kpis.byKategori['Student']||0)} delta="16+ år" accent="blue"/>
        <KPI label="Kvinneandel" value={fmtPct(kpis.byKjonn.Kvinne/(kpis.byKjonn.Mann+kpis.byKjonn.Kvinne))} delta={`${kpis.byKjonn.Kvinne} av ${kpis.byKjonn.Mann+kpis.byKjonn.Kvinne}`} accent="coral"/>
      </div>

      <div className="section-h">Beltefordeling<span className="meta">graderingsstatus</span></div>
      <div className="grid-2-1">
        <Tile title="Belter — fordeling" corner="grading">
          <div style={{display:'flex', flexDirection:'column', gap:6, marginTop:8}}>
            {[
              {n:'Hvit', c:kpis.byBelt['Hvit']||0, color:'#EFEDF8'},
              {n:'Grå/Hvit', c:kpis.byBelt['Grå/Hvit']||0, color:'#9290A6'},
              {n:'Blå', c:(kpis.byBelt['Blå']||0)+(kpis.byBelt['Blått']||0), color:'#4F9BEA'},
              {n:'Lilla', c:kpis.byBelt['Lilla']||0, color:'#B06FD6'},
              {n:'Brun', c:kpis.byBelt['Brun']||0, color:'#B07A4A'},
              {n:'Sort', c:kpis.byBelt['Sort']||0, color:'#2B2A3C'},
            ].map((b,i)=>{
              const max = 93;
              return (
                <div key={i} className="bar-row">
                  <div className="name">
                    <span style={{width:10,height:10,background:b.color, border:'1px solid var(--border-strong)'}}/>
                    <span style={{textTransform:'uppercase',fontSize:10,letterSpacing:'.14em'}}>{b.n}</span>
                    <div className="meter"><div style={{width:(b.c/max)*100+'%', background:b.color}}/></div>
                  </div>
                  <span className="tabular" style={{textAlign:'right'}}>{b.c}</span>
                </div>
              );
            })}
          </div>
          <div className="dim" style={{fontSize:11, marginTop:14, lineHeight:1.6}}>
            93% er fortsatt på hvitt belte. En relativt ung medlemsbase — men en synlig pyramide av blå/lilla/sort som gir teknisk dybde til klubben.
          </div>
        </Tile>
        <Tile title="Vekst over år" corner="trend">
          <div style={{display:'flex', alignItems:'flex-end', gap:6, height: 180, padding: '8px 0'}}>
            {['2020','2021','2022','2023','2024','2025','2026'].map(y=>{
              const s = kpis.signupsPerYear[y]||0;
              const c = kpis.deactPerYear[y]||0;
              const max = Math.max(...Object.values(kpis.signupsPerYear));
              return (
                <div key={y} style={{flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:4}}>
                  <div className="dim" style={{fontSize:9}}>+{s}/-{c}</div>
                  <div style={{position:'relative', width:'100%', height: 130, display:'flex', flexDirection:'column', justifyContent:'flex-end'}}>
                    <div style={{height:(s/max)*130, background:'var(--amber)'}}/>
                    <div style={{height:(c/max)*130, background:'var(--coral)', opacity:.7}}/>
                  </div>
                  <div style={{fontSize:10, fontWeight:700}}>{y}</div>
                </div>
              );
            })}
          </div>
          <div style={{display:'flex', gap:12, fontSize:10, color:'var(--text-mut)', textTransform:'uppercase', letterSpacing:'.14em', marginTop:8}}>
            <span><span style={{display:'inline-block',width:8,height:8,background:'var(--amber)',marginRight:5}}/>nye</span>
            <span><span style={{display:'inline-block',width:8,height:8,background:'var(--coral)',marginRight:5}}/>sluttet</span>
          </div>
        </Tile>
      </div>

      <div className="section-h">Geografi<span className="meta">topp 12 postnummer i Bodø</span></div>
      <Tile title="postnumre" corner="map">
        <HBar data={Object.entries(kpis.byPostnr).sort((a,b)=>b[1]-a[1]).map(([k,v])=>({label:k+' · Bodø', value:v}))} color="#5A8DB0" height={14}/>
      </Tile>
    </div>
  );
}

// Oppmøte-avstemming: knytt umatchede oppmøte-navn til medlemmer i registeret.
// Identitetsbroen (memberId) gjør at leaderboard/oppmøteprosent stemmer per medlem.
function Avstemming() {
  const { members, actions, live } = useMembers();
  const [unmatched, setUnmatched] = React.useState(null);
  const [busy, setBusy] = React.useState(false);
  const [msg, setMsg] = React.useState('');
  const [picks, setPicks] = React.useState({});
  const [importOpen, setImportOpen] = React.useState(false);

  const sortedMembers = React.useMemo(
    () => (members || []).slice().sort((a, b) => String(a.navn).localeCompare(String(b.navn), 'no')),
    [members]);

  function load() {
    setBusy(true); setMsg('');
    actions.unmatchedAttendance()
      .then(list => setUnmatched(list || []))
      .catch(e => setMsg('Kunne ikke hente: ' + e.message))
      .then(() => setBusy(false));
  }
  function reconcile() {
    setBusy(true); setMsg('');
    actions.reconcileAttendance()
      .then(r => { setMsg(`Avstemt: ${r.matched} koblet · ${r.unmatched} gjenstår av ${r.total}.`); return actions.unmatchedAttendance(); })
      .then(list => setUnmatched(list || []))
      .catch(e => setMsg('Feil: ' + e.message))
      .then(() => setBusy(false));
  }
  function assign(name) {
    const memberId = picks[name];
    if (!memberId) return;
    setBusy(true);
    actions.assignMember(name, memberId)
      .then(() => { setUnmatched(u => (u || []).filter(x => x.name !== name)); setMsg(`«${name}» koblet.`); })
      .catch(e => setMsg('Feil: ' + e.message))
      .then(() => setBusy(false));
  }
  function ignore(name) {
    setBusy(true);
    actions.ignoreName(name, true)
      .then(() => { setUnmatched(u => (u || []).filter(x => x.name !== name)); setMsg(`«${name}» merket som tidligere medlem.`); })
      .catch(e => setMsg('Feil: ' + e.message))
      .then(() => setBusy(false));
  }

  const liveUnmatched = live && live.unmatched ? live.unmatched : 0;
  return (
    <>
      <div id="avstemming" className="section-h" style={{scrollMarginTop:80}}>Oppmøte-avstemming<span className="meta">styre · knytt oppmøte til medlemsregisteret</span></div>
      <Tile title="identitetsbro" corner="avstemming">
        <div className="dim" style={{fontSize:12, lineHeight:1.6, marginBottom:12}}>
          Ukentlig oppmøte matches mot medlemmer på navn. Navn som ikke treffer kobles her én gang (huskes som alias) — eller merkes «Sluttet» hvis det er et tidligere medlem, så forsvinner det fra lista.
          {liveUnmatched>0 && <> <strong style={{color:'var(--coral)'}}>{liveUnmatched} oppmøter</strong> mangler kobling akkurat nå.</>}
        </div>
        <div style={{display:'flex', gap:8, marginBottom:12, flexWrap:'wrap'}}>
          <button className="btn primary" disabled={busy} onClick={()=>setImportOpen(true)}>⤓ Importer ukesoppmøte</button>
          <button className="btn outline" disabled={busy} onClick={reconcile}>Kjør avstemming</button>
          <button className="btn ghost" disabled={busy} onClick={load}>Vis umatchede</button>
        </div>
        {msg && <div className="dim" style={{fontSize:12, marginBottom:10}}>{msg}</div>}
        {unmatched && unmatched.length === 0 && <div className="dim" style={{fontSize:12}}>Ingen umatchede navn 🎉</div>}
        {unmatched && unmatched.length > 0 && (
          <table className="t">
            <thead><tr><th>Oppmøte-navn</th><th className="num">Antall</th><th>Koble til medlem</th><th/></tr></thead>
            <tbody>
              {unmatched.map(u => (
                <tr key={u.name}>
                  <td><strong>{u.name}</strong></td>
                  <td className="num dim">{u.count}</td>
                  <td>
                    <select value={picks[u.name] || ''} onChange={e => setPicks(p => ({ ...p, [u.name]: e.target.value }))} style={{maxWidth:220}}>
                      <option value="">— velg medlem —</option>
                      {sortedMembers.map(m => <option key={m.id} value={m.id}>{m.navn}</option>)}
                    </select>
                  </td>
                  <td style={{display:'flex',gap:6}}>
                    <button className="btn ghost" disabled={busy || !picks[u.name]} onClick={() => assign(u.name)}>Koble</button>
                    <button className="btn ghost" disabled={busy} title="Skjul — tidligere medlem som har sluttet" onClick={() => ignore(u.name)}>Sluttet</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Tile>
      {importOpen && <AttendanceImportModal onClose={()=>setImportOpen(false)}/>}
    </>
  );
}

// Tema-balanse: hva trenes det på? Fordeling av loggede økter på grupper og
// kjernetemaer (posisjon + handling), med søkelys på hva som er underdekket
// siste 90 dager. Kjernetaksonomien speiler trener-appens tags.
const CORE_POS = ['guard','mount','sidekontroll','back','c2c','c2b'];
const CORE_ACT = ['passing','escapes','submissions','takedowns','sweeps','pins'];
const GROUP_LABEL = { junior:'Junior', gi:'Gi', nogi:'No-Gi', 'åpen matte':'Åpen matte', ukjent:'Ukjent' };

function ThemeBars({ keys, allMap, recentMap, color }){
  const max = Math.max(1, ...keys.map(k => allMap[k] || 0));
  return (
    <div>
      {keys.map(k => {
        const v = allMap[k] || 0, r = recentMap[k] || 0;
        return (
          <div key={k} className="bar-row" style={{display:'grid',gridTemplateColumns:'120px 1fr auto',gap:10,alignItems:'center',padding:'5px 0'}}>
            <span style={{textTransform:'uppercase',fontSize:10,letterSpacing:'.12em'}}>{k}</span>
            <div className="meter" style={{background:'var(--bar-bg)',height:14,borderRadius:7,overflow:'hidden'}}>
              <div style={{width:(v/max)*100+'%',background:color,height:'100%'}}/>
            </div>
            <span className="tabular" style={{fontSize:12,minWidth:64,textAlign:'right'}}>{v} <span className="dim">· {r} siste 90d</span></span>
          </div>
        );
      })}
    </div>
  );
}

function Innhold(){
  const { actions } = useMembers();
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');
  React.useEffect(() => { actions.fetchThemes().then(setData).catch(e => setErr(e.message || 'feil')); }, []);

  if (err) return <div className="dim" style={{padding:20}}>Kunne ikke laste tema-balanse: {err}</div>;
  if (!data) return <div className="dim" style={{padding:20}}>Laster tema-balanse…</div>;

  const allMap = {}; data.tags.forEach(t => { allMap[t.tag] = t.sessions; });
  const recentMap = {}; data.tagsRecent.forEach(t => { recentMap[t.tag] = t.sessions; });
  const underdekket = CORE_POS.concat(CORE_ACT).filter(k => !(recentMap[k] > 0));
  // Rusk-grupper («ukjent») holdes ute av hovedvisningen, men flagges som ryddeoppgave.
  const ukjentGroup = data.groups.find(g => g.group === 'ukjent');
  const groupData = data.groups
    .filter(g => g.group !== 'ukjent')
    .map(g => ({ label: `${GROUP_LABEL[g.group] || g.group} (${g.recent} siste 90d)`, value: g.sessions }));

  return (
    <div>
      <div className="grid-4">
        <KPI label="Økter totalt" value={fmtN(data.totalSessions)} delta="loggede + importerte" accent="blue"/>
        <KPI label="Med innhold" value={fmtN(data.logged)} delta="tittel eller temaer" accent="green"/>
        <KPI label="Siste 90 dager" value={fmtN(data.recentLogged)} delta={`med innhold · etter ${data.since}`} accent="amber"/>
        <KPI label="Underdekket nå" value={fmtN(underdekket.length)} delta="kjernetemaer siste 90d" accent="coral"/>
      </div>

      {underdekket.length > 0 && (
        <>
        <div className="section-h">Underdekket siste 90 dager<span className="meta">kjernetemaer uten økter</span></div>
        <Tile title="bør prioriteres" corner="balanse">
          <div style={{display:'flex',flexWrap:'wrap',gap:8}}>
            {underdekket.map(k => <span key={k} className="tag coral" style={{textTransform:'uppercase',letterSpacing:'.1em'}}>{k}</span>)}
          </div>
          <div className="dim" style={{fontSize:11,marginTop:10}}>Disse kjernetemaene har ingen loggede økter de siste 90 dagene.</div>
        </Tile>
        </>
      )}

      <div className="section-h">Gruppebalanse<span className="meta">økter pr. gruppe · junior / gi / no-gi / åpen matte</span></div>
      <Tile title="grupper" corner="balanse">
        <HBar data={groupData} color="var(--accent)" height={20}/>
        {ukjentGroup && ukjentGroup.sessions > 0 && (
          <div className="dim" style={{fontSize:11, marginTop:10, color:'var(--coral)'}}>
            ⚠ {ukjentGroup.sessions} økter har ukjent/ugyldig gruppe — rydd dem til junior / gi / no-gi / åpen matte i kalenderen.
          </div>
        )}
      </Tile>

      <div className="section-h">Posisjoner<span className="meta">økter pr. tema · totalt og siste 90d</span></div>
      <Tile title="posisjon" corner="position">
        <ThemeBars keys={CORE_POS} allMap={allMap} recentMap={recentMap} color="#34B98C"/>
      </Tile>

      <div className="section-h">Handlinger<span className="meta">økter pr. tema · totalt og siste 90d</span></div>
      <Tile title="handling" corner="action">
        <ThemeBars keys={CORE_ACT} allMap={allMap} recentMap={recentMap} color="#F2825F"/>
      </Tile>
    </div>
  );
}

function Oppmote({ kpis, charts, live, isStyre }) {
  const t = kpis.totals;
  const ls = liveSince(kpis, live);
  function palette(intensity) {
    if (intensity === 0) return 'rgba(255,255,255,.03)';
    return `rgba(123,110,246,${0.1 + intensity * 0.85})`;
  }
  return (
    <div>
      <div className="grid-4">
        <KPI label="Total check-ins" value={fmtN(t.totalCheckins + ls.total)} delta={ls.total>0 ? `historisk + ${fmtN(ls.total)} live` : 'jan 2023 → apr 2026'} accent="amber"/>
        <KPI label="Økter holdt" value={fmtN(t.sessionsTracked)} delta="historisk grunnlag" accent="green"/>
        <KPI label="Snitt pr. økt" value={(t.totalCheckins/t.sessionsTracked).toFixed(1)} delta="deltagere" accent="blue"/>
        <KPI label="Mest populære" value={charts.classes[0].name} delta={`${charts.classes[0].avg.toFixed(1)} snitt`} deltaClass="amber" accent="coral"/>
      </div>

      {live && live.sessions > 0 && (
        <>
        <div className="section-h">Live — logget i appen<span className="meta">oppdateres løpende · etter {histMaxWeek(kpis)}</span></div>
        <div className="grid-4">
          <KPI label="Live check-ins" value={fmtN(ls.total)} delta="nye siden grunnlaget" deltaClass="up" accent="green"/>
          <KPI label="Økter logget" value={fmtN(live.sessions)} delta="i trener-appen" accent="amber"/>
          <KPI label="Siste økt" value={/^\d{4}-\d{2}-\d{2}$/.test(live.maxDate) ? fmtDate(live.maxDate) : '—'} accent="blue"/>
          <KPI label="Totalt m/ live" value={fmtN(t.totalCheckins + ls.total)} delta="historisk + live" accent="coral"/>
        </div>
        </>
      )}

      <div className="section-h">Heatmap<span className="meta">historisk (Spond) · ukedag × time</span></div>
      <Tile title="når trener vi" corner="weekly">
        <Heatmap grid={charts.heatGrid} hours={charts.allHours} max={charts.maxAtt} palette={palette}/>
        <div className="dim" style={{fontSize:11, marginTop:12}}>Sterkeste pulser: torsdag 18 (1 071 estimerte check-ins) og tirsdag 18 (1 033) er klubbens hjerteslag — Erfaren-økter. Helga lever på Åpen Matte: lørdag og søndag 12 (~651 hver). Klokkeslett er estimert fra klassetype.</div>
      </Tile>

      <div className="section-h">Topp 10 mest dedikerte<span className="meta">nåværende medlemmer · faktiske oppmøte-rader</span></div>
      <Tile title="leaderboard" corner="dedicated">
        <LeaderboardTable live={live} limit={10} medals
          emptyHint="last opp ukesoppmøte i avstemmingen nederst."
          unmatchedHint="Koble dem i avstemmingen nederst."/>
      </Tile>

      <div className="section-h">Klassepopularitet<span className="meta">historisk klassetype (Spond) · snitt deltagere pr. økt</span></div>
      <Tile title="ranking" corner="popularity">
        <HBar data={charts.classes.map(c=>({label:c.name+' ('+c.sessions+' økter)', value:Math.round(c.avg*10)/10}))} color="var(--accent)" height={20}/>
      </Tile>

      <div className="section-h">Klubbens puls<span className="meta">ukentlig oppmøte · historisk + live</span></div>
      <Tile title="weekly attendance" corner="long-range">
        <Spark data={blendedWeeklyEntries(kpis, live)} accessor={d=>d[1]} height={140} color="#4D9A6B" fill="rgba(52,185,140,.15)"/>
      </Tile>

      {isStyre && <Avstemming/>}
    </div>
  );
}

function Okonomi({ kpis, charts }) {
  const t = kpis.totals;
  const { okonomi, okonomiActions } = useMembers();
  const [impOpen, setImpOpen] = useState(false);
  const [trendMonths, setTrendMonths] = useState(24);
  const ok = okonomi;
  const latestKey = ok && ok.keys.length ? ok.keys[ok.keys.length-1] : null;
  const latest = latestKey ? ok.months[latestKey] : null;
  const shownKeys = ok ? (trendMonths === 'all' ? ok.keys : ok.keys.slice(-trendMonths)) : [];
  const maxNet = shownKeys.length ? Math.max(1, ...shownKeys.map(k=>ok.months[k].netto)) : 1;
  return (
    <div>
      <div className="section-h">Faktiske utbetalinger<span className="meta">importert fra Spond · netto etter avgifter</span></div>
      {!ok ? <Tile title="laster">…</Tile> : (
      <>
      <div className="grid-4">
        <KPI label={latest? 'Netto · '+monthLabel(latestKey):'Netto'} value={latest?fmtN(latest.netto):'—'} unit=" kr" delta={latest?`${latest.antall} betalinger`:'ingen data'} accent="green"/>
        <KPI label="Brutto" value={latest?fmtN(latest.brutto):'—'} unit=" kr" delta="før avgifter" accent="amber"/>
        <KPI label="Spond-avgifter" value={latest?fmtN(latest.avgifter):'—'} unit=" kr" delta={latest&&latest.brutto?fmtPct(latest.avgifter/latest.brutto,1):''} deltaClass="down" accent="coral"/>
        <KPI label="Måneder i trend" value={ok.keys.length} delta={ok.keys.length>1 ? monthLabel(ok.keys[0])+' → '+monthLabel(latestKey) : 'importer flere for trend'} accent="blue"/>
      </div>

      <div className="section-h" style={{marginTop:26}}>Inntektstrend
        <span className="meta" style={{display:'flex', gap:8, alignItems:'center'}}>
          <span className="chips">
            {[['12','12 mnd'],['24','24 mnd'],['all','Alt']].map(([v,l])=>(
              <button key={v} className={'chip'+(String(trendMonths)===v?' active':'')}
                onClick={()=>setTrendMonths(v==='all'?'all':Number(v))}>{l}</button>
            ))}
          </span>
          <button className="btn primary sm" onClick={()=>setImpOpen(true)}>Importer økonomi</button>
        </span>
      </div>
      <Tile title="netto pr. måned" corner="faktisk">
        {shownKeys.length>0 ? (
          <div className="okbars">
            {shownKeys.map(k=>(
              <div key={k} className="okbar">
                <div className="okbar-v tabular">{fmtN(ok.months[k].netto/1000)}k</div>
                <div className="okbar-track"><div className="okbar-fill" style={{height:(ok.months[k].netto/maxNet)*100+'%'}}/></div>
                <div className="okbar-l" title={monthLabel(k)}>{String(k).slice(5)==='01' ? String(k).slice(0,4) : ''}</div>
              </div>
            ))}
          </div>
        ) : <div className="muted" style={{padding:24}}>Ingen importerte måneder ennå. Klikk «Importer økonomi».</div>}
        {ok.keys.length===1 && <div className="dim" style={{fontSize:11,marginTop:14,lineHeight:1.6}}>Bare én måned importert så langt — last opp flere Spond-eksporter (én pr. måned) for å bygge trenden over tid.</div>}
      </Tile>

      {latest && Object.keys(latest.byKategori).length>0 && (
        <>
        <div className="section-h" style={{marginTop:26}}>Inntekt pr. kategori<span className="meta">{monthLabel(latestKey)} · netto</span></div>
        <Tile title="netto pr. medlemstype" corner="kategori">
          <HBar data={Object.entries(latest.byKategori).sort((a,b)=>b[1]-a[1]).map(([k,v])=>({label:k, value:v}))} color="var(--green)" height={20}/>
        </Tile>
        </>
      )}
      </>
      )}

      <div className="section-h" style={{marginTop:32}}>Estimert kontingent<span className="meta">modellert fra medlemstall × pris</span></div>
      <div style={{padding:'14px 16px', borderRadius:'calc(16px * var(--rscale))', background:'var(--accent-bg)', marginBottom:20, fontSize:12, color:'var(--ink-soft)'}}>
        <span className="tag amber" style={{marginRight:10}}>estimat</span>
        Beregnet ut fra antall aktive medlemmer × pris pr. medlemstype. Junior-semesterpris (1500,-) fordelt over 6 mnd. Tar ikke hensyn til intro-kurs, drop-in eller arrangementsinntekter.
      </div>
      <div className="grid-4">
        <KPI label="Estimert MRR" value={fmtN(t.mrr)} unit=" kr" delta="månedlig kontingent" accent="amber"/>
        <KPI label="Estimert ARR" value={fmtN(t.arr)} unit=" kr" delta="× 12" accent="green"/>
        <KPI label="Snitt pr. medlem" value={fmtN(t.mrr/t.activeMembers)} unit=" kr/mnd" accent="blue"/>
        <KPI label="Betalende medlemmer" value={charts.pricing.filter(p=>p.monthly>0).reduce((s,p)=>s+p.count,0)} delta={`av ${t.activeMembers} aktive`} accent="coral"/>
      </div>
      <div className="section-h">Inntekt pr. medlemstype</div>
      <Tile title="pricing breakdown" corner="mrr">
        <table className="t">
          <thead><tr><th>Medlemstype</th><th className="num">Antall</th><th className="num">Pris/mnd</th><th className="num">MRR</th><th className="num">Andel</th></tr></thead>
          <tbody>
            {charts.pricing.map(p=>(
              <tr key={p.type}>
                <td>{p.type}</td>
                <td className="num">{p.count}</td>
                <td className="num">{p.monthly>0 ? fmtN(p.monthly)+' kr' : <span className="dim">—</span>}</td>
                <td className="num"><strong style={{color:'var(--amber)'}}>{fmtN(p.mrr)} kr</strong></td>
                <td className="num">{fmtPct(p.mrr/t.mrr)}</td>
              </tr>
            ))}
            <tr style={{borderTop:'1px solid var(--amber)'}}>
              <td><strong>Sum</strong></td>
              <td className="num"><strong>{t.activeMembers}</strong></td>
              <td/>
              <td className="num"><strong style={{color:'var(--amber)'}}>{fmtN(t.mrr)} kr</strong></td>
              <td className="num"><strong>100%</strong></td>
            </tr>
          </tbody>
        </table>
      </Tile>

      <div className="section-h">Sammensetning av inntekt</div>
      <div className="grid-1-2">
        <Tile title="MRR-mix" corner="donut">
          <Donut data={charts.pricing.filter(p=>p.mrr>0).map(p=>({label:p.type, value:p.mrr}))}
                 size={220} thickness={32} colors={COLORS}
                 centerValue={fmtN(t.mrr)} centerLabel="kr/mnd"/>
        </Tile>
        <Tile title="MRR pr. tier" corner="ranking">
          <HBar data={charts.pricing.filter(p=>p.mrr>0).map(p=>({label:p.type.split(' ').slice(0,3).join(' '), value:p.mrr}))} color="var(--accent)" height={22}/>
        </Tile>
      </div>
      {impOpen && <OkonomiImportModal onClose={()=>setImpOpen(false)}/>}
    </div>
  );
}

function Churn({ kpis, charts, live, isStyre, onGotoReconcile }) {
  const t = kpis.totals;
  const conv = kpis.conversion || {};
  // 0 konverterte av N intro er nesten sikkert join-svikt, ikke virkelighet.
  // Da viser vi ikke en falsk «0 %», men en oppfordring om å koble navn først.
  const convUnreliable = !(conv.converted > 0);
  const unmatched = (live && live.unmatched) ? live.unmatched : 0;
  return (
    <div>
      <div className="grid-4">
        <KPI label="Totalt deaktiverte" value={t.deactivated} delta="siden 2023" deltaClass="down" accent="coral"/>
        <KPI label="Sluttet — snitt tid" value={(t.avgTenureDaysChurned/30).toFixed(1)} unit=" mnd" accent="amber"/>
        <KPI label="Aktive — snitt tid" value={(t.avgTenureDaysActive/365).toFixed(1)} unit=" år" deltaClass="up" accent="green"/>
        <KPI label="Konv. intro→fast" value={convUnreliable ? '—' : fmtPct(conv.rate)} delta={convUnreliable ? 'ikke beregnet — kjør identitetsbro' : `${conv.converted} / ${conv.introTotal}`} accent="blue"/>
      </div>

      <div className="section-h">Kohort-retention<span className="meta">hvor mange fra hvert år trener fortsatt?</span></div>
      <Tile title="cohort" corner="retention">
        <CohortBar cohorts={charts.cohorts} color1="#34B98C" color2="rgba(242,130,95,.35)"/>
        <div style={{display:'flex', gap:14, fontSize:10, color:'var(--text-mut)', textTransform:'uppercase', letterSpacing:'.14em', marginTop:14}}>
          <span><span style={{display:'inline-block',width:8,height:8,background:'#34B98C',marginRight:6}}/>fortsatt aktive</span>
          <span><span style={{display:'inline-block',width:8,height:8,background:'rgba(242,130,95,.35)',marginRight:6}}/>sluttet</span>
        </div>
        <div className="dim" style={{fontSize:11, marginTop:14, lineHeight:1.6}}>
          Av 51 personer som meldte seg inn i 2021 trener {kpis.cohortByYear['2021']||0} fortsatt — det er {fmtPct((kpis.cohortByYear['2021']||0)/51)} 5-års-retention. Av 78 fra 2025 er {kpis.cohortByYear['2025']||0} fortsatt aktive ({fmtPct((kpis.cohortByYear['2025']||0)/78)}).
        </div>
      </Tile>

      <div className="section-h">Deaktiveringer pr. år</div>
      <Tile title="churn" corner="annual">
        <HBar data={Object.entries(kpis.deactPerYear).sort((a,b)=>a[0].localeCompare(b[0])).map(([k,v])=>({label:k, value:v}))} color="#C45838" height={22}/>
      </Tile>

      <div className="section-h">Konverteringsfunnel<span className="meta">intro-kurs → fast medlemskap</span></div>
      <Tile title="funnel" corner="conversion">
        <div style={{display:'flex', gap:24, padding:'10px 0', alignItems:'center'}}>
          <div style={{flex:1}}>
            <div className="muted" style={{fontSize:10, letterSpacing:'.18em', textTransform:'uppercase'}}>Trinn 1 — intro-kurs</div>
            <div style={{fontSize:36, fontWeight:700}}>{kpis.conversion.introTotal}</div>
            <div className="dim" style={{fontSize:11}}>registrerte intro-deltagere</div>
          </div>
          <div className="dim" style={{fontSize:24}}>→</div>
          <div style={{flex:1}}>
            <div className="muted" style={{fontSize:10, letterSpacing:'.18em', textTransform:'uppercase'}}>Trinn 2 — fast medlem nå</div>
            <div style={{fontSize:36, fontWeight:700, color:'var(--coral)'}}>{convUnreliable ? '—' : conv.converted}</div>
            <div className="dim" style={{fontSize:11}}>{convUnreliable ? 'ikke koblet ennå' : 'fortsatt aktive'}</div>
          </div>
          <div style={{flex:1}}>
            <div className="muted" style={{fontSize:10, letterSpacing:'.18em', textTransform:'uppercase'}}>Konverteringsrate</div>
            {convUnreliable
              ? <><div style={{fontSize:22, fontWeight:700, color:'var(--coral)'}}>Ikke beregnet</div>
                  <div className="dim" style={{fontSize:11}}>avhenger av navnematching</div></>
              : <><div style={{fontSize:36, fontWeight:700, color:'var(--coral)'}}>{fmtPct(conv.rate)}</div>
                  <div className="dim" style={{fontSize:11}}>navn-match-basert</div></>}
          </div>
        </div>
        {convUnreliable ? (
          <div style={{fontSize:12, padding:14, borderTop:'1px solid var(--border)', marginTop:8, lineHeight:1.6}}>
            <strong>{conv.introTotal || 0} introdeltakere</strong>{unmatched>0 && <> · <strong style={{color:'var(--coral)'}}>{unmatched} umatchede oppmøter</strong></>} — konvertering kan ikke beregnes før navnene er koblet til medlemsregisteret.
            {isStyre && <button className="btn primary sm" style={{marginLeft:10}} onClick={onGotoReconcile}>Kjør identitetsbro</button>}
            <div className="dim" style={{fontSize:11, marginTop:8}}>Merk: intro-deltagere som ble fast medlem registreres trolig som <em>nye</em> medlemskap i Spond. Tag intro-kohorter eksplisitt for ekte konverteringstall.</div>
          </div>
        ) : (
          <div className="dim" style={{fontSize:11, padding:14, borderTop:'1px solid var(--border)', marginTop:8}}>
            <strong>Merknad:</strong> intro-deltagere som senere ble fast medlem registreres trolig som <em>nye</em> medlemskap i Spond. Anbefaling: tag intro-kohorter eksplisitt så vi får ekte konverteringstall.
          </div>
        )}
      </Tile>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
window.KPI = KPI;
window.Tile = Tile;
root.render(<MembersProvider><App /></MembersProvider>);
