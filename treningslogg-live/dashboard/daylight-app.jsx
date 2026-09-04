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

// Inneværende år. Var hardkodet til '2026' på fire steder, som ville begynt å
// vise «+0 i 2026» så snart kalenderen rullet videre.
const AAR_NA = String(new Date().getFullYear());
// Årsaksene i vekst-grafen: fra første år vi har tall for, til i dag.
function aarSerie(kpis){
  const ys = Object.keys({ ...(kpis.signupsPerYear||{}), ...(kpis.deactPerYear||{}) })
    .filter(y => /^\d{4}$/.test(y)).map(Number);
  const slutt = Number(AAR_NA);
  const start = ys.length ? Math.max(Math.min(...ys), slutt-6) : slutt-6;
  const out=[]; for(let y=start; y<=slutt; y++) out.push(String(y));
  return out;
}

function fmtDateTime(v){
  if(!v) return '—';
  const d = new Date(v);
  if(isNaN(d.getTime())) return String(v);
  return d.toLocaleDateString('nb-NO',{day:'numeric',month:'short',year:'numeric'})
    + ', ' + d.toLocaleTimeString('nb-NO',{hour:'2-digit',minute:'2-digit'});
}

// Ferskhet pr. datakilde. Tidligere ble NYESTE av alle importer brukt, slik at
// en fersk økonomiimport gjorde merket grønt selv om medlemslista var måneder
// gammel — altså akkurat den situasjonen merket skal advare om. Nå styrer den
// ELDSTE kilden fargen, og hver kilde vises for seg.
// Grønn ≤7 dager, gul 8–21, rød >21.
const FRESH_KILDER = [
  { key:'rosterImportedAt',     navn:'Medlemmer' },
  { key:'attendanceImportedAt', navn:'Oppmøte'   },
  { key:'okonomiImportedAt',    navn:'Økonomi', styre:true },
  { key:'vippsImportedAt',      navn:'Vipps',   styre:true },
];
function freshLevel(days){ return days==null ? 'old' : days<=7 ? 'fresh' : days<=21 ? 'stale' : 'old'; }
function freshnessSources(meta, isStyre){
  return FRESH_KILDER.filter(k => !k.styre || isStyre).map(k => {
    const t = meta && meta[k.key] ? new Date(meta[k.key]).getTime() : NaN;
    const ts = isNaN(t) ? null : t;
    const days = ts==null ? null : Math.floor((Date.now()-ts)/86400000);
    return { navn:k.navn, ts, days, level:freshLevel(days) };
  });
}
// Eldste kilde som faktisk er importert — den avgjør fargen. En kilde som
// aldri er importert (typisk Vipps) drar ikke merket i rødt av seg selv;
// den står som «aldri» i tooltipen i stedet.
function freshnessInfo(meta, live, kpis, isStyre){
  const kilder = freshnessSources(meta, isStyre);
  const brukt = kilder.filter(k => k.ts != null);
  if(!brukt.length){
    // Ingen import kjørt: fall tilbake på siste loggede økt i trener-appen.
    const t = live && /^\d{4}-\d{2}-\d{2}$/.test(live.maxDate) ? new Date(live.maxDate).getTime() : NaN;
    if(isNaN(t)) return { ts:null, days:null, level:'old', navn:null, kilder, nyeste:null };
    const days = Math.floor((Date.now()-t)/86400000);
    return { ts:t, days, level:freshLevel(days), navn:'Loggede økter', kilder, nyeste:t };
  }
  const eldst = brukt.reduce((a,b)=> b.ts < a.ts ? b : a);
  const nyeste = Math.max(...brukt.map(k=>k.ts));
  return { ts:eldst.ts, days:eldst.days, level:eldst.level, navn:eldst.navn, kilder, nyeste };
}
// Perioden dashboardet faktisk dekker. Var hardkodet «jan 2023 → apr 2026».
function dataPeriode(kpis, live){
  const ISO = /^\d{4}-\d{2}-\d{2}$/;
  const d = Object.keys((kpis && kpis.dailyAttendance) || {}).filter(k=>ISO.test(k)).sort();
  const forste = d[0];
  let siste = d[d.length-1];
  if(live && ISO.test(live.maxDate||'') && (!siste || live.maxDate > siste)) siste = live.maxDate;
  if(!forste || !siste) return '';
  const lbl = s => MND_NO[parseInt(s.slice(5,7),10)-1] + ' ' + s.slice(0,4);
  return lbl(forste) + ' → ' + lbl(siste);
}
function fmtDayMonth(ts){ return new Date(ts).toLocaleDateString('nb-NO',{day:'numeric',month:'numeric'}); }

// Grafisk årsrapport — åpnes i eget vindu, skrives ut / lagres som PDF derfra.
// Bygger på LIVE medlems-aggregater (mergeLiveKpis) + live leaderboard der den
// finnes; kun oppmøte-historikk uten live-motstykke kommer fra kpis.json.
function buildAarsrapportHTML(kpis, members, okonomi, isStyre, live){
  const t = kpis.totals || {};
  const year = new Date().getFullYear();
  const ls = liveSince(kpis, live);
  const esc = s => String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

  let grad = 0;
  (members || []).forEach(m => (m.grading.history || []).forEach(e => {
    if(e.kind !== 'innmelding' && String(e.date).slice(0,4) === String(year)) grad++;
  }));

  // Horisontale søylerader (label · track · verdi), skalert mot største verdi.
  const barRows = (entries, color) => {
    const max = Math.max(1, ...entries.map(([,v]) => v));
    return entries.map(([k,v]) =>
      `<div class="brow"><span class="bl">${esc(k)}</span>` +
      `<span class="bt"><span class="bf" style="width:${Math.round(v/max*100)}%;background:${color}"></span></span>` +
      `<span class="bv">${v}</span></div>`).join('');
  };
  const byKat  = Object.entries(kpis.byKategori || {}).sort((a,b)=>b[1]-a[1]);
  const byBelt = Object.entries(kpis.byBelt || {}).sort((a,b)=>b[1]-a[1]);
  const kj = kpis.byKjonn || {};

  // Mest dedikerte: live (register-koblet) foran statisk grunnlag.
  const lb = (live && live.leaderboard && live.leaderboard.length)
    ? live.leaderboard.map(m => ({ navn: m.navn, deltatt: m.deltatt }))
    : (kpis.leaderboard || []);
  const lbRows = lb.slice(0,5).map((m,i) =>
    `<tr><td class="dim">${String(i+1).padStart(2,'0')}</td><td><strong>${esc(m.navn)}</strong></td>` +
    `<td class="num">${fmtN(m.deltatt)}</td></tr>`).join('');

  // Økonomi (kun styre): netto pr. måned i rapportåret som kolonner.
  let okHtml = '';
  if (isStyre && okonomi && okonomi.keys && okonomi.keys.length){
    const ym = okonomi.keys.filter(k => String(k).slice(0,4) === String(year));
    const netto = ym.reduce((s,k)=> s + (okonomi.months[k].netto || 0), 0);
    const maxN = Math.max(1, ...ym.map(k => okonomi.months[k].netto || 0));
    const cols = ym.map(k => {
      const v = okonomi.months[k].netto || 0;
      const mnd = MND_NO[parseInt(String(k).slice(5,7),10)-1];
      return `<div class="col"><div class="cv">${fmtN(Math.round(v/1000))}k</div>` +
        `<div class="ct"><div class="cf" style="height:${Math.round(v/maxN*100)}%"></div></div>` +
        `<div class="cl">${mnd}</div></div>`;
    }).join('');
    okHtml = `<div class="sec"><h2>Økonomi ${year} <small>kun styre · faktiske utbetalinger (Spond)</small></h2>` +
      `<div class="kpis"><div class="kpi"><div class="kv">${fmtN(netto)} kr</div><div class="kl">netto innbetalt · ${ym.length} mnd</div></div>` +
      `<div class="kpi"><div class="kv">${fmtN(t.mrr||0)} kr</div><div class="kl">estimert MRR</div></div>` +
      `<div class="kpi"><div class="kv">${fmtN(t.arr||0)} kr</div><div class="kl">estimert ARR</div></div></div>` +
      (cols ? `<div class="cols">${cols}</div>` : '') + `</div>`;
  }

  return `<!DOCTYPE html><html lang="nb"><head><meta charset="utf-8">
<title>Årsrapport ${year} — Bodø Jiu Jitsu</title>
<style>
  :root{ --accent:#7B6EF6; --green:#34B98C; --coral:#F2825F; --blue:#4F9BEA; --ink:#232136; --mut:#8A86A0; --rule:#ECEAF4; }
  *{ margin:0; padding:0; box-sizing:border-box; }
  body{ font-family:'Plus Jakarta Sans', system-ui, -apple-system, sans-serif; color:var(--ink); padding:44px 52px; max-width:840px; margin:0 auto; }
  header{ display:flex; justify-content:space-between; align-items:flex-end; border-bottom:3px solid var(--accent); padding-bottom:18px; }
  h1{ font-size:30px; letter-spacing:-0.02em; } h1 small{ display:block; font-size:12px; color:var(--mut); font-weight:600; letter-spacing:.14em; text-transform:uppercase; margin-bottom:6px; }
  .gen{ font-size:11px; color:var(--mut); text-align:right; }
  h2{ font-size:15px; margin:0 0 14px; } h2 small{ color:var(--mut); font-weight:500; font-size:11px; margin-left:8px; }
  .sec{ margin-top:30px; page-break-inside:avoid; }
  .kpis{ display:grid; grid-template-columns:repeat(auto-fit,minmax(150px,1fr)); gap:12px; margin-bottom:6px; }
  .kpi{ border:1px solid var(--rule); border-radius:12px; padding:14px 16px; }
  .kv{ font-size:24px; font-weight:800; } .kl{ font-size:10.5px; color:var(--mut); text-transform:uppercase; letter-spacing:.08em; margin-top:4px; }
  .brow{ display:flex; align-items:center; gap:10px; margin:7px 0; font-size:12.5px; }
  .bl{ width:150px; } .bv{ width:40px; text-align:right; font-weight:700; }
  .bt{ flex:1; height:14px; background:#F4F3FB; border-radius:7px; overflow:hidden; }
  .bf{ display:block; height:100%; border-radius:7px; }
  table{ width:100%; border-collapse:collapse; font-size:12.5px; }
  th{ text-align:left; font-size:10px; color:var(--mut); text-transform:uppercase; letter-spacing:.1em; padding:6px 8px; border-bottom:1px solid var(--rule); }
  td{ padding:7px 8px; border-bottom:1px solid var(--rule); } .num{ text-align:right; font-weight:700; } .dim{ color:var(--mut); }
  .cols{ display:flex; align-items:flex-end; gap:8px; height:130px; margin-top:14px; }
  .col{ flex:1; display:flex; flex-direction:column; align-items:center; height:100%; }
  .cv{ font-size:10px; font-weight:700; color:var(--mut); margin-bottom:4px; }
  .ct{ width:100%; max-width:38px; flex:1; background:#F4F3FB; border-radius:6px; display:flex; flex-direction:column; justify-content:flex-end; overflow:hidden; }
  .cf{ background:linear-gradient(180deg,var(--green),#2a9d77); border-radius:6px 6px 0 0; min-height:2px; }
  .cl{ font-size:10px; color:var(--mut); margin-top:5px; }
  .two{ display:grid; grid-template-columns:1fr 1fr; gap:28px; }
  footer{ margin-top:36px; padding-top:12px; border-top:1px solid var(--rule); font-size:10.5px; color:var(--mut); display:flex; justify-content:space-between; }
  .printbtn{ position:fixed; top:16px; right:16px; background:var(--accent); color:#fff; border:none; border-radius:10px; padding:11px 18px; font:700 13px 'Plus Jakarta Sans',system-ui; cursor:pointer; }
  @media print{ .printbtn{ display:none; } body{ padding:10mm 6mm; } }
</style></head><body>
<button class="printbtn" onclick="window.print()">Skriv ut / lagre PDF</button>
<header><h1><small>Årsrapport ${year}</small>Bodø Jiu Jitsu</h1>
  <div class="gen">Generert ${new Date().toLocaleDateString('nb-NO')}<br>løft.app/dashboard</div></header>
<div class="sec"><div class="kpis">
  <div class="kpi"><div class="kv">${fmtN(t.activeMembers||0)}</div><div class="kl">aktive medlemmer</div></div>
  <div class="kpi"><div class="kv">${fmtN(kpis.signupsPerYear && kpis.signupsPerYear[String(year)] || 0)}</div><div class="kl">nye i ${year}</div></div>
  <div class="kpi"><div class="kv">${fmtN(grad)}</div><div class="kl">graderinger i ${year}</div></div>
  <div class="kpi"><div class="kv">${fmtN((t.totalCheckins||0) + ls.total)}</div><div class="kl">check-ins totalt${ls.total>0?' · inkl. live':''}</div></div>
</div></div>
<div class="sec two">
  <div><h2>Medlemstype</h2>${barRows(byKat, 'var(--accent)')}
    <h2 style="margin-top:20px">Kjønn</h2>${barRows([['Mann', kj.Mann||0], ['Kvinne', kj.Kvinne||0]], 'var(--blue)')}</div>
  <div><h2>Belter</h2>${barRows(byBelt, 'var(--green)')}</div>
</div>
<div class="sec"><h2>Mest dedikerte <small>${(live && live.leaderboard && live.leaderboard.length) ? 'nåværende medlemmer · faktiske oppmøte-rader' : 'historisk grunnlag'}</small></h2>
  ${lbRows ? `<table><thead><tr><th>#</th><th>Navn</th><th class="num">Oppmøter</th></tr></thead><tbody>${lbRows}</tbody></table>` : '<p class="dim">Ingen oppmøtedata.</p>'}
</div>
${okHtml}
<footer><span>Bodø Jiu Jitsu · klubbpanel</span><span>Generert av løft.app/dashboard</span></footer>
</body></html>`;
}

function openAarsrapport(kpis, members, okonomi, isStyre, live){
  const w = window.open('', '_blank');
  if (!w) { alert('Nettleseren blokkerte rapport-vinduet — tillat popups for løft.app.'); return; }
  w.document.write(buildAarsrapportHTML(kpis, members, okonomi, isStyre, live));
  w.document.close();
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
// Økter logget ETTER det historiske grunnlaget. Samme kutt som liveSince, men
// på øktnivå: uten dette sto «Økter holdt» fast på 994 uansett hvor mye som
// ble logget eller importert i etterkant.
function liveSessionsSince(kpis, live){
  if(!live || !live.sessionWeekly) return 0;
  const cut = histMaxWeek(kpis);
  return Object.keys(live.sessionWeekly).reduce((s,wk)=> wk > cut ? s + live.sessionWeekly[wk] : s, 0);
}
// Snitt deltagere pr. økt pr. gruppe, kun for uker etter det historiske
// grunnlaget. Holdes adskilt fra den historiske klassepopulariteten: Spond-
// eksporten er gruppert på klassenavn, trener-appen på gruppe — å slå dem
// sammen ville gitt tall som ikke betyr det samme.
function liveGruppeStats(kpis, live){
  if(!live || !live.gruppeWeekly) return [];
  const cut = histMaxWeek(kpis);
  return Object.keys(live.gruppeWeekly).map(grp => {
    const uker = live.gruppeWeekly[grp];
    let okter=0, oppmote=0;
    Object.keys(uker).forEach(wk => { if(wk > cut){ okter += uker[wk].okter; oppmote += uker[wk].oppmote; } });
    return { navn: grp, okter, oppmote, snitt: okter ? oppmote/okter : 0 };
  }).filter(g => g.okter > 0).sort((a,b) => b.snitt - a.snitt);
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
//
// Kategori regnes om fra medlemstypen her, ikke bare ved import: da slår
// rettelser i deriveKategoriImp inn med én gang, uten at hele medlemsfila
// må lastes opp på nytt først.
function mergeLiveKpis(kpis, members, departed){
  if(!kpis) return null;
  if(!members || !members.length) return kpis;
  // Parkerte medlemskap («Ikke aktiv») ligger med i Spond-eksporten, men skal
  // ikke telle som aktive — verken i antall, fordelinger eller MRR.
  const aktive = members.filter(m => !isInactiveTypeImp(m.medlemstype));
  if(!aktive.length) return kpis;
  const byKategori={}, byKjonn={Mann:0,Kvinne:0}, byBelt={}, byAgeBucket={}, byPostnr={};
  const pricing={};
  const cohort={};                 // innmeldingsår → antall som fortsatt trener
  let mrr=0, tenureSum=0, tenureN=0, introN=0;
  const naa=Date.now();
  aktive.forEach(m=>{
    const kat = m.medlemstype ? deriveKategoriImp(m.medlemstype) : (m.kategori||'Annet');
    byKategori[kat]=(byKategori[kat]||0)+1;
    if(kat==='Introkurs') introN++;
    const kj=m.kjonn||'Ukjent'; byKjonn[kj]=(byKjonn[kj]||0)+1;
    const belt=(m.grading&&m.grading.current.belt)||'Hvit'; byBelt[belt]=(byBelt[belt]||0)+1;
    const a=alderNaImp(m);
    const bucket = a==null?'Ukjent' : a<13?'Under 13' : a<18?'13–17' : a<30?'18–29' : a<45?'30–44' : '45+';
    byAgeBucket[bucket]=(byAgeBucket[bucket]||0)+1;
    if(m.postnr) byPostnr[m.postnr]=(byPostnr[m.postnr]||0)+1; // barn er maskert → kun voksne
    const type=m.medlemstype||'Ukjent';
    const p=pricing[type]||(pricing[type]={count:0, monthly:m.prisMnd||0, mrr:0});
    p.count++; if(m.prisMnd) p.monthly=m.prisMnd; p.mrr+=(m.prisMnd||0);
    mrr+=(m.prisMnd||0);
    const innm=m.innmeldingsdato && new Date(m.innmeldingsdato);
    if(innm && !isNaN(innm.getTime())){
      cohort[String(m.innmeldingsdato).slice(0,4)] = (cohort[String(m.innmeldingsdato).slice(0,4)]||0)+1;
      tenureSum += (naa-innm.getTime())/86400000; tenureN++;
    }
  });
  // Registeret inneholder bare NÅVÆRENDE medlemmer. Det kan derfor aldri si
  // hvor mange som meldte seg inn et gitt år — bare hvor mange av dem som
  // fortsatt trener (= kohorten). Der kohorten er større enn det statiske
  // grunnlaget løfter vi innmeldingstallet opp til kohorten: det er et gulv vi
  // vet er sant, og det retter særlig inneværende år, som grunnlaget ble
  // frosset midt inne i. Tidligere år beholder sitt historiske tall.
  const signups={...(kpis.signupsPerYear||{})};
  Object.keys(cohort).forEach(y=>{ if(cohort[y] > (signups[y]||0)) signups[y]=cohort[y]; });
  // Avgang: det statiske grunnlaget stopper der kpis.json ble laget. Alt som er
  // registrert i dash_departed etter det legges oppå. Radene er nøklet på
  // medlems-id, så en ny import teller ikke de samme personene på nytt.
  const deact={...(kpis.deactPerYear||{})};
  const dPer=(departed && departed.perYear) || {};
  Object.keys(dPer).forEach(y=>{ deact[y]=(deact[y]||0)+dPer[y]; });
  const deaktivertTot=(kpis.totals.deactivated||0)+((departed && departed.total)||0);
  return {
    ...kpis,
    byKategori, byKjonn, byBelt, byAgeBucket, byPostnr,
    pricingBreakdown: pricing,
    cohortByYear: cohort,
    signupsPerYear: signups,
    conversion: { ...(kpis.conversion||{}), introTotal: introN },
    deactPerYear: deact,
    totals: { ...kpis.totals, activeMembers: aktive.length, mrr, arr: mrr*12,
      deactivated: deaktivertTot,
      avgTenureDaysActive: tenureN ? Math.round(tenureSum/tenureN) : kpis.totals.avgTenureDaysActive },
  };
}

function App() {
  const [tw, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [tab, setTab] = useState('idag');
  const staticKpis = useKpis();
  const { members, meta, access, okonomi, live, departed } = useMembers();
  const kpis = React.useMemo(() => mergeLiveKpis(staticKpis, members, departed), [staticKpis, members, departed]);
  const charts = deriveCharts(kpis);
  const isStyre = !!(access && access.isStyre);
  // «oppdatert» i overskriften = sist noe faktisk kom inn (nyeste kilde).
  // Ferskhets-merket bruker den ELDSTE — det er to ulike spørsmål.
  const lastUpdated = (() => { const f = freshnessInfo(meta, live, kpis, isStyre); return f.nyeste != null ? f.nyeste : (meta && (meta.rosterImportedAt || meta.okonomiImportedAt)) || null; })();
  const periode = dataPeriode(kpis, live);

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
          {/* Alle fire kildene listes, også de som aldri er importert — det er
              nettopp de som gjør at tall i dashboardet står stille. */}
          {(() => {
            const kilder = freshnessSources(meta, isStyre);
            if(!kilder.some(k => k.ts != null))
              return <div className="muted" style={{marginTop:8, fontSize:11}}>Ingen import kjørt ennå</div>;
            const ekstra = { Medlemmer: meta.rosterCount && `${meta.rosterCount} medl.`,
                             Økonomi: meta.okonomiMonths && `${meta.okonomiMonths} mnd` };
            return (
              <div style={{marginTop:8, fontSize:11, lineHeight:1.5}}>
                {kilder.map(k => (
                  <div key={k.navn} style={k.level==='old' ? {color:'var(--coral)'} : null}>
                    {k.navn}: {k.ts==null ? 'aldri' : fmtDateTime(k.ts)}
                    {k.ts!=null && ekstra[k.navn] ? ` · ${ekstra[k.navn]}` : ''}
                  </div>
                ))}
              </div>
            );
          })()}
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
              const f = freshnessInfo(meta, live, kpis, isStyre);
              const color = f.level==='fresh' ? 'var(--green)' : f.level==='stale' ? 'var(--amber)' : 'var(--coral)';
              const txt = f.ts==null
                ? 'Ingen import ennå'
                : `Eldste: ${f.navn} · ${f.days} ${f.days===1?'dag':'dager'} siden`;
              const weight = f.level==='old' ? 700 : 600;
              const tip = 'Ferskhet pr. datakilde — merket følger den eldste. Grønn ≤7 dager, gul 8–21, rød >21.\n'
                + f.kilder.map(k => `${k.navn}: ${k.ts==null ? 'aldri importert' : fmtDayMonth(k.ts)+' · '+k.days+' dager siden'}`).join('\n');
              return (
                <span className="pill" title={tip} style={{borderColor:color, color, fontWeight:weight}}>
                  <span className="sw" style={{background:color}}/>{txt}
                </span>
              );
            })()}
            <span className="pill" title="Data er kvalitetssikret (konsolidert oppmøtefil) — sier ikke noe om hvor ferske tallene er. Se ferskhets-indikatoren."><span className="sw" style={{background:'var(--green)'}}/>verifisert</span>
            {periode && <span className="pill" title="Perioden oppmøtedataene dekker"><span className="sw" style={{background:'var(--accent)'}}/>{periode}</span>}
            <span className="pill"><span className="sw" style={{background:'var(--blue)'}}/>{fmtN(kpis.totals.totalCheckins)} check-ins</span>
            <button className="btn outline sm" title="Åpne grafisk årsrapport — skriv ut eller lagre som PDF derfra"
              onClick={()=>openAarsrapport(kpis, members, okonomi, isStyre, live)}>
              ⤓ Årsrapport
            </button>
          </div>
        </div>
        {effTab==='idag' && <Today members={members} thresholds={{stilleUker:tw.stilleUker, gradMinOppmote:tw.gradMinOppmote, gradMinMnd:tw.gradMinMnd, introUker:tw.introUker}}/>}
        {effTab==='oversikt' && <Oversikt kpis={kpis} charts={charts} isStyre={isStyre} live={live}/>}
        {effTab==='kalender' && <Kalender/>}
        {effTab==='register' && <Register/>}
        {effTab==='statistikk' && <Medlemmer kpis={kpis} charts={charts}/>}
        {effTab==='oppmote' && <Oppmote kpis={kpis} charts={charts} live={live} isStyre={isStyre} members={members}/>}
        {effTab==='innhold' && <Innhold/>}
        {effTab==='okonomi' && isStyre && <Okonomi kpis={kpis} charts={charts}/>}
        {effTab==='churn' && <Churn kpis={kpis} charts={charts} live={live} isStyre={isStyre} onGotoReconcile={gotoReconcile} departed={departed}/>}
        {effTab!=='register' && effTab!=='idag' && <DataFooter kpis={kpis} live={live} />}
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

function DataFooter({ kpis, live }) {
  const periode = dataPeriode(kpis, live);
  return (
    <footer className="datafoot">
      <div className="ribbon">
        <span className="lbl">Datagrunnlag · oppmote_konsolidert.xlsx</span>
        <span className="muted">Konsolidert oppmøtefil · 6 Spond-eksporter · {fmtN(kpis.totals.totalCheckins)} check-ins · {fmtN(kpis.totals.sessionsTracked)} unike events{periode?` (${periode})`:''}</span>
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
        <KPI label="Aktive medlemmer" value={t.activeMembers} delta={`+${kpis.signupsPerYear[AAR_NA]||0} i ${AAR_NA}`} deltaClass="up" accent="amber"/>
        {isStyre
          ? <KPI label="Estimert MRR" value={fmtN(t.mrr)} unit=" kr" delta={`ARR ≈ ${fmtN(t.arr)} kr`} deltaClass="amber" accent="green"/>
          : <KPI label={`Nye i ${AAR_NA}`} value={kpis.signupsPerYear[AAR_NA]||0} delta="nye medlemskap" accent="green"/>}
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
        <KPI label="Aktive" value={t.activeMembers} delta={`+${kpis.signupsPerYear[AAR_NA]||0} i ${AAR_NA}`} deltaClass="up" accent="amber"/>
        <KPI label="Junior + Knøtte" value={kpis.byKategori['Junior']||0} delta="9–14 år" accent="green"/>
        <KPI label="Voksen + Student" value={(kpis.byKategori['Voksen']||0)+(kpis.byKategori['Student']||0)} delta="16+ år" accent="blue"/>
        <KPI label="Kvinneandel" value={fmtPct(kpis.byKjonn.Kvinne/(kpis.byKjonn.Mann+kpis.byKjonn.Kvinne))} delta={`${kpis.byKjonn.Kvinne} av ${kpis.byKjonn.Mann+kpis.byKjonn.Kvinne}`} accent="coral"/>
      </div>

      <div className="section-h">Beltefordeling<span className="meta">graderingsstatus</span></div>
      <div className="grid-2-1">
        <Tile title="Belter — fordeling" corner="grading">
          {(() => {
            // Skalaen var hardkodet til 93, og teksten under påsto «93 %» uansett
            // hva tallene sa. Begge regnes nå ut av den faktiske fordelingen.
            const rader = [
              {n:'Hvit', c:kpis.byBelt['Hvit']||0, color:'#EFEDF8'},
              {n:'Grå/Hvit', c:kpis.byBelt['Grå/Hvit']||0, color:'#9290A6'},
              {n:'Blå', c:(kpis.byBelt['Blå']||0)+(kpis.byBelt['Blått']||0), color:'#4F9BEA'},
              {n:'Lilla', c:kpis.byBelt['Lilla']||0, color:'#B06FD6'},
              {n:'Brun', c:kpis.byBelt['Brun']||0, color:'#B07A4A'},
              {n:'Sort', c:kpis.byBelt['Sort']||0, color:'#2B2A3C'},
            ];
            const max = Math.max(1, ...rader.map(b=>b.c));
            const sum = Object.values(kpis.byBelt||{}).reduce((a,b)=>a+b,0);
            const hvit = kpis.byBelt['Hvit']||0;
            const farget = sum - hvit;
            return (
              <>
                <div style={{display:'flex', flexDirection:'column', gap:6, marginTop:8}}>
                  {rader.map((b,i)=>(
                    <div key={i} className="bar-row">
                      <div className="name">
                        <span style={{width:10,height:10,background:b.color, border:'1px solid var(--border-strong)'}}/>
                        <span style={{textTransform:'uppercase',fontSize:10,letterSpacing:'.14em'}}>{b.n}</span>
                        <div className="meter"><div style={{width:(b.c/max)*100+'%', background:b.color}}/></div>
                      </div>
                      <span className="tabular" style={{textAlign:'right'}}>{b.c}</span>
                    </div>
                  ))}
                </div>
                <div className="dim" style={{fontSize:11, marginTop:14, lineHeight:1.6}}>
                  {sum
                    ? <>{fmtPct(hvit/sum)} av {sum} graderte medlemmer står fortsatt på hvitt belte
                        — {farget} har farget belte.</>
                    : 'Ingen graderinger registrert ennå.'}
                </div>
              </>
            );
          })()}
        </Tile>
        <Tile title="Vekst over år" corner="trend">
          <div style={{display:'flex', alignItems:'flex-end', gap:6, height: 180, padding: '8px 0'}}>
            {aarSerie(kpis).map(y=>{
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

      <div className="section-h">Geografi<span className="meta">{Object.keys(kpis.byPostnr||{}).length} postnummer · kun voksne (barn er maskert)</span></div>
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
  const [cleanupOpen, setCleanupOpen] = React.useState(false);

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
          <button className="btn ghost" disabled={busy} onClick={()=>setCleanupOpen(true)}
            title="Slett økter oppmøte-importen har opprettet i et datointervall — for å rydde etter en feilimport">Rydd opp i importerte økter…</button>
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
      {cleanupOpen && <CleanupModal onClose={()=>setCleanupOpen(false)} onDone={load}/>}
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

// ── Trend-hjelpere: uke-serier fra live.kategoriWeekly / live.memberWeekly ──
const KAT_COLORS = { 'Junior':'#B06FD6', 'Voksen':'#7B6EF6', 'Student':'#4F9BEA', 'Knøtte':'#F2825F', 'Familie':'#34B98C', 'Introkurs':'#E0B03A' };
function lastMondays(n){
  const t = new Date();
  const d = new Date(t.getFullYear(), t.getMonth(), t.getDate());
  d.setDate(d.getDate() - ((d.getDay()+6)%7)); // denne ukas mandag (lokal tid)
  const out = [];
  for(let i=n-1;i>=0;i--){
    const w = new Date(d); w.setDate(w.getDate()-7*i);
    out.push(`${w.getFullYear()}-${String(w.getMonth()+1).padStart(2,'0')}-${String(w.getDate()).padStart(2,'0')}`);
  }
  return out;
}
const sum4 = (arr, endOffset) => arr.slice(arr.length-endOffset-4, arr.length-endOffset).reduce((s,v)=>s+v,0);
function TrendDelta({ now, prev }){
  const d = now - prev;
  const col = d>0?'var(--green)':d<0?'var(--coral)':'var(--muted)';
  return <span style={{color:col, fontWeight:700, fontSize:12}}>{d>0?`▲ +${d}`:d<0?`▼ ${d}`:'— 0'}</span>;
}

// Trend pr. gruppe (medlemskategori): små ukesserier med 4-ukers endring.
function TrendPerGruppe({ live }){
  const kw = live && live.kategoriWeekly;
  const weeks = React.useMemo(()=>lastMondays(26), []);
  const groups = React.useMemo(()=>{
    if(!kw) return [];
    return Object.keys(kw).map(kat=>{
      const series = weeks.map(w=>kw[kat][w]||0);
      return { kat, series, total: series.reduce((s,v)=>s+v,0), last4: sum4(series,0), prev4: sum4(series,4) };
    }).filter(g=>g.total>0).sort((a,b)=>b.total-a.total);
  }, [kw, weeks]);
  if(!groups.length) return (
    <Tile title="trend pr. gruppe" corner="live">
      <div className="dim" style={{fontSize:12}}>Ingen gruppetrend ennå — krever register-koblede oppmøter (og oppdatert Code.gs-backend).</div>
    </Tile>
  );
  return (
    <div className="grid-3">
      {groups.map(g=>{
        const c = KAT_COLORS[g.kat] || '#7B6EF6';
        return (
          <Tile key={g.kat} title={g.kat.toLowerCase()} corner={`${fmtN(g.total)} oppmøter`}>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:8, fontSize:12}}>
              <span className="dim">siste 4 uker: <strong style={{color:'var(--ink)'}}>{g.last4}</strong> · før: {g.prev4}</span>
              <TrendDelta now={g.last4} prev={g.prev4}/>
            </div>
            <Spark data={g.series} height={64} color={c} fill={hexA(c, 0.12)}/>
          </Tile>
        );
      })}
    </div>
  );
}

// Trend pr. medlem: velg medlem → ukesserie, pluss størst endring opp/ned.
function TrendPerMedlem({ live, members }){
  const mw = live && live.memberWeekly;
  const weeks = React.useMemo(()=>lastMondays(26), []);
  const byId = React.useMemo(()=>{ const m={}; (members||[]).forEach(x=>{ m[x.id]=x; }); return m; }, [members]);
  const rows = React.useMemo(()=>{
    if(!mw) return [];
    return Object.keys(mw).map(id=>{
      const series = weeks.map(w=>mw[id][w]||0);
      const m = byId[id];
      return { id, navn: m ? m.navn : '(ukjent)', kategori: m ? m.kategori : '', series,
        total: series.reduce((s,v)=>s+v,0), last4: sum4(series,0), prev4: sum4(series,4) };
    }).filter(r=>r.total>0).sort((a,b)=>b.total-a.total);
  }, [mw, weeks, byId]);
  const [selId, setSelId] = useState('');
  if(!rows.length) return (
    <Tile title="trend pr. medlem" corner="live">
      <div className="dim" style={{fontSize:12}}>Ingen medlemstrend ennå — krever register-koblede oppmøter (og oppdatert Code.gs-backend).</div>
    </Tile>
  );
  const sel = rows.find(r=>r.id===selId) || rows[0];
  const opp = rows.filter(r=>r.last4>r.prev4).sort((a,b)=>(b.last4-b.prev4)-(a.last4-a.prev4)).slice(0,5);
  const ned = rows.filter(r=>r.last4<r.prev4).sort((a,b)=>(a.last4-a.prev4)-(b.last4-b.prev4)).slice(0,5);
  const moverRow = (r) => (
    <div key={r.id} style={{display:'flex', justifyContent:'space-between', alignItems:'baseline', gap:8, padding:'6px 0', borderBottom:'1px solid var(--border)', fontSize:12.5, cursor:'pointer'}}
      onClick={()=>setSelId(r.id)} title="Vis trend for medlemmet">
      <span><strong>{r.navn}</strong>{r.kategori && <span className="dim" style={{marginLeft:6, fontSize:11}}>{r.kategori}</span>}</span>
      <span style={{whiteSpace:'nowrap'}}><span className="dim" style={{marginRight:8}}>{r.prev4} → {r.last4}</span><TrendDelta now={r.last4} prev={r.prev4}/></span>
    </div>
  );
  return (
    <>
      <Tile title="trend pr. medlem" corner="live">
        <div style={{display:'flex', gap:14, alignItems:'center', marginBottom:12, flexWrap:'wrap'}}>
          <select value={sel.id} onChange={e=>setSelId(e.target.value)}
            style={{padding:'8px 12px', borderRadius:10, border:'1px solid var(--border)', background:'var(--card)', color:'var(--ink)', font:'inherit', fontSize:13}}>
            {rows.map(r=><option key={r.id} value={r.id}>{r.navn} · {r.total} oppmøter</option>)}
          </select>
          <span className="dim" style={{fontSize:12}}>siste 4 uker: <strong style={{color:'var(--ink)'}}>{sel.last4}</strong> · før: {sel.prev4}</span>
          <TrendDelta now={sel.last4} prev={sel.prev4}/>
        </div>
        <Spark data={sel.series} height={90} color="var(--accent)" fill="var(--accent-soft)"/>
      </Tile>
      {(opp.length>0 || ned.length>0) && (
        <div className="grid-2" style={{marginTop:16}}>
          <Tile title="størst fremgang" corner="4 uker vs forrige 4">
            {opp.length ? opp.map(moverRow) : <div className="dim" style={{fontSize:12}}>Ingen med fremgang i perioden.</div>}
          </Tile>
          <Tile title="størst nedgang" corner="4 uker vs forrige 4">
            {ned.length ? ned.map(moverRow) : <div className="dim" style={{fontSize:12}}>Ingen med nedgang i perioden.</div>}
          </Tile>
        </div>
      )}
    </>
  );
}

function Oppmote({ kpis, charts, live, isStyre, members }) {
  const t = kpis.totals;
  const ls = liveSince(kpis, live);
  // «Økter holdt» og «Snitt pr. økt» sto fast på det historiske grunnlaget og
  // rørte seg ikke uansett hvor mye som ble logget eller importert etterpå.
  const lsOkter = liveSessionsSince(kpis, live);
  const okterTot = t.sessionsTracked + lsOkter;
  const checkinsTot = t.totalCheckins + ls.total;
  const gruppeLive = liveGruppeStats(kpis, live);
  const populaer = gruppeLive.length ? gruppeLive[0] : null;
  return (
    <div>
      <div className="grid-4">
        <KPI label="Total check-ins" value={fmtN(checkinsTot)} delta={ls.total>0 ? `historisk + ${fmtN(ls.total)} live` : (dataPeriode(kpis, live) || 'historisk grunnlag')} accent="amber"/>
        <KPI label="Økter holdt" value={fmtN(okterTot)} delta={lsOkter>0 ? `historisk + ${fmtN(lsOkter)} live` : 'historisk grunnlag'} accent="green"/>
        <KPI label="Snitt pr. økt" value={okterTot ? (checkinsTot/okterTot).toFixed(1) : '—'} delta="deltagere" accent="blue"/>
        {populaer
          ? <KPI label="Mest populære" value={populaer.navn} delta={`${populaer.snitt.toFixed(1)} snitt · live`} deltaClass="amber" accent="coral"/>
          : <KPI label="Mest populære" value={charts.classes[0].name} delta={`${charts.classes[0].avg.toFixed(1)} snitt · historisk`} deltaClass="amber" accent="coral"/>}
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

      <div className="section-h">Trend pr. gruppe<span className="meta">live · register-koblede oppmøter · siste 26 uker</span></div>
      <TrendPerGruppe live={live}/>

      <div className="section-h">Trend pr. medlem<span className="meta">live · siste 26 uker · 4-ukers endring</span></div>
      <TrendPerMedlem live={live} members={members}/>

      <div className="section-h">Topp 10 mest dedikerte<span className="meta">nåværende medlemmer · faktiske oppmøte-rader</span></div>
      <Tile title="leaderboard" corner="dedicated">
        <LeaderboardTable live={live} limit={10} medals
          emptyHint="last opp ukesoppmøte i avstemmingen nederst."
          unmatchedHint="Koble dem i avstemmingen nederst."/>
      </Tile>

      {gruppeLive.length > 0 && (
        <>
        <div className="section-h">Populære grupper<span className="meta">live · loggede og importerte økter etter {histMaxWeek(kpis)}</span></div>
        <Tile title="snitt pr. økt" corner="live">
          <HBar data={gruppeLive.map(g=>({label:g.navn+' ('+g.okter+' økter)', value:Math.round(g.snitt*10)/10}))} color="var(--green)" height={20}/>
        </Tile>
        </>
      )}

      <div className="section-h">Klassepopularitet<span className="meta">historisk klassetype (Spond) · frosset grunnlag</span></div>
      <Tile title="ranking" corner="popularity">
        <HBar data={charts.classes.map(c=>({label:c.name+' ('+c.sessions+' økter)', value:Math.round(c.avg*10)/10}))} color="var(--accent)" height={20}/>
        <div className="dim" style={{fontSize:11, marginTop:12}}>
          Spond-eksporten er gruppert på klassenavn, trener-appen på gruppe. De vises hver for seg fordi tallene ikke betyr det samme.
        </div>
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
  const [samletMnd, setSamletMnd] = useState(24);
  // Vipps-utsalg (merch) — lastes separat via samme styre-skjermede rute.
  const [vipps, setVipps] = useState(null);
  const [vImpOpen, setVImpOpen] = useState(false);
  const [vStream, setVStream] = useState('butikk');
  const loadVipps = React.useCallback(() => {
    // Feature-detect: rett etter en deploy kan nettleseren sitte med en eldre
    // cachet api.js enn jsx-ene (script-tag vs. Babel-fetch caches ulikt).
    // Uten denne vakta krasjer hele fanen på DASH_API.fetchVipps is not a function.
    if (typeof DASH_API.fetchVipps !== 'function') { setVipps({ months: [], products: [] }); return; }
    DASH_API.fetchVipps().then(setVipps).catch(()=>setVipps({ months: [], products: [] }));
  }, []);
  useEffect(() => { loadVipps(); }, [loadVipps]);
  const ok = okonomi;
  const latestKey = ok && ok.keys.length ? ok.keys[ok.keys.length-1] : null;
  const latest = latestKey ? ok.months[latestKey] : null;
  const shownKeys = ok ? (trendMonths === 'all' ? ok.keys : ok.keys.slice(-trendMonths)) : [];
  const maxNet = shownKeys.length ? Math.max(1, ...shownKeys.map(k=>ok.months[k].netto)) : 1;
  return (
    <div>
      {(() => {
        // Samlet inntekt: kontingent (Spond) + varesalg (Vipps butikk + diverse).
        // Diverse regnes med i totalen — det er varesalg tilbake i tid (før butikken).
        const vm = (vipps && vipps.months) || [];
        const okM = (ok && ok.months) || {};
        const byYm = {};
        Object.keys(okM).forEach(k => { (byYm[k] = byYm[k] || { kont:0, but:0, div:0 }).kont += okM[k].netto || 0; });
        vm.forEach(m => {
          const b = byYm[m.month] = byYm[m.month] || { kont:0, but:0, div:0 };
          if (m.stream === 'butikk') b.but += m.netto; else b.div += m.netto;
        });
        const keys = Object.keys(byYm).sort();
        if (!keys.length) return null;
        const shown = samletMnd === 'all' ? keys : keys.slice(-samletMnd);
        const totOf = k => byYm[k].kont + byYm[k].but + byYm[k].div;
        const maxT = Math.max(1, ...shown.map(totOf));
        // KPI-ene følger valgt periode (chips), ikke kalenderåret.
        const sumP = f => shown.reduce((s,k)=>s+byYm[k][f],0);
        const kontP = sumP('kont'), butP = sumP('but'), divP = sumP('div');
        const totP = kontP + butP + divP;
        const perLabel = samletMnd === 'all' ? 'hele perioden' : `siste ${samletMnd} mnd`;
        const SEG = [
          { f:'div',  farge:'var(--amber)',  navn:'Diverse (historisk Vipps)' },
          { f:'but',  farge:'var(--accent)', navn:'Butikk (Vipps)' },
          { f:'kont', farge:'var(--green)',  navn:'Kontingent (Spond)' },
        ];
        return (
          <>
            <div className="section-h">Samlet inntekt
              <span className="meta" style={{display:'flex', gap:8, alignItems:'center'}}>
                <span>kontingent + varesalg · netto</span>
                <span className="chips">
                  {[['6','6 mnd'],['12','12 mnd'],['24','24 mnd'],['all','Alt']].map(([v,l])=>(
                    <button key={v} className={'chip'+(String(samletMnd)===v?' active':'')}
                      onClick={()=>setSamletMnd(v==='all'?'all':Number(v))}>{l}</button>
                  ))}
                </span>
              </span>
            </div>
            <div className="grid-4">
              <KPI label="Samlet" value={fmtN(Math.round(totP))} unit=" kr" delta={perLabel} accent="green"/>
              <KPI label="Kontingent" value={fmtN(Math.round(kontP))} unit=" kr" delta={`Spond · ${perLabel}`} accent="blue"/>
              <KPI label="Varesalg" value={fmtN(Math.round(butP+divP))} unit=" kr" delta={`butikk ${fmtN(Math.round(butP))} · diverse ${fmtN(Math.round(divP))}`} accent="coral"/>
              <KPI label="Snitt pr. måned" value={shown.length ? fmtN(Math.round(totP/shown.length)) : '—'} unit=" kr" delta={`${shown.length} mnd med data`} accent="amber"/>
            </div>
            <Tile title="samlet pr. måned" corner="stablet">
              <div className="okbars">
                {shown.map(k=>{
                  const b = byYm[k];
                  const segs = SEG.filter(s=>b[s.f]>0);
                  return (
                    <div key={k} className="okbar">
                      <div className="okbar-v tabular">{fmtN(Math.round(totOf(k)/100)/10)}k</div>
                      <div className="okbar-track">
                        {segs.map((s,i)=>(
                          <div key={s.f} className="okbar-seg" style={{
                            height:(b[s.f]/maxT)*100+'%', background:s.farge,
                            borderRadius: i===0 ? '6px 6px 0 0' : 0,
                          }} title={`${s.navn}: ${fmtN(Math.round(b[s.f]))} kr`}/>
                        ))}
                      </div>
                      <div className="okbar-l" title={monthLabel(k)}>
                        {MND_NO[parseInt(k.slice(5,7),10)-1]}
                        {(k.slice(5,7)==='01' || k===shown[0]) ? ' ’'+k.slice(2,4) : ''}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="oklegend">
                {[...SEG].reverse().map(s=>(
                  <span key={s.f}><i style={{background:s.farge}}/>{s.navn}</span>
                ))}
              </div>
            </Tile>
          </>
        );
      })()}

      <div className="section-h" style={{marginTop:26}}>Faktiske utbetalinger<span className="meta">importert fra Spond · netto etter avgifter</span></div>
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
                <div className="okbar-l" title={monthLabel(k)}>
                  {MND_NO[parseInt(String(k).slice(5,7),10)-1]}
                  {(String(k).slice(5,7)==='01' || k===shownKeys[0]) ? ' ’'+String(k).slice(2,4) : ''}
                </div>
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

      {(() => {
        const vm = (vipps && vipps.months) || [];
        const vp = (vipps && vipps.products) || [];
        const shown = vm.filter(m => m.stream === vStream).sort((a,b)=>a.month.localeCompare(b.month));
        const maxV = shown.length ? Math.max(1, ...shown.map(m=>m.netto)) : 1;
        const yr = String(new Date().getFullYear());
        const iYr = vm.filter(m => m.stream==='butikk' && m.month.startsWith(yr));
        const nettoYr = iYr.reduce((s,m)=>s+m.netto,0);
        const gebyrYr = iYr.reduce((s,m)=>s+m.gebyr,0);
        const antallYr = iYr.reduce((s,m)=>s+m.antall,0);
        const hasDiverse = vm.some(m=>m.stream==='diverse');
        return (
          <>
            <div className="section-h" style={{marginTop:32}}>Utsalg — Vipps
              <span className="meta" style={{display:'flex', gap:8, alignItems:'center'}}>
                {hasDiverse && (
                  <span className="chips">
                    {[['butikk','Butikk'],['diverse','Diverse (historisk)']].map(([v,l])=>(
                      <button key={v} className={'chip'+(vStream===v?' active':'')} onClick={()=>setVStream(v)}>{l}</button>
                    ))}
                  </span>
                )}
                <button className="btn primary sm" onClick={()=>setVImpOpen(true)}>Importer Vipps</button>
              </span>
            </div>
            {vm.length === 0 ? (
              <Tile title="utsalg" corner="vipps">
                <div className="muted" style={{padding:24, fontSize:13, lineHeight:1.7}}>
                  Ingen Vipps-data importert ennå. Last ned <strong>oppgjørsrapport (.csv)</strong> og <strong>salgsrapport (.xlsx)</strong> fra portal.vipps.no for hele perioden, og klikk «Importer Vipps».
                </div>
              </Tile>
            ) : (
              <>
                <div className="grid-4">
                  <KPI label={`Netto butikk · ${yr}`} value={fmtN(Math.round(nettoYr))} unit=" kr" delta={`${antallYr} ordre`} accent="green"/>
                  <KPI label="Vipps-gebyr" value={fmtN(Math.round(gebyrYr))} unit=" kr" delta={`i ${yr}`} deltaClass="down" accent="coral"/>
                  <KPI label="Snitt pr. ordre" value={antallYr ? fmtN(Math.round(nettoYr/antallYr)) : '—'} unit=" kr" accent="blue"/>
                  <KPI label="Netto totalt" value={fmtN(Math.round(vm.filter(m=>m.stream==='butikk').reduce((s,m)=>s+m.netto,0)))} unit=" kr" delta="butikken hele perioden" accent="amber"/>
                </div>
                <Tile title={`netto pr. måned · ${VIPPS_STREAM_LABEL[vStream].toLowerCase()}`} corner="vipps">
                  {shown.length > 0 ? (
                    <div className="okbars">
                      {shown.map(m=>(
                        <div key={m.month} className="okbar">
                          <div className="okbar-v tabular">{fmtN(Math.round(m.netto/100)/10)}k</div>
                          <div className="okbar-track"><div className="okbar-fill" style={{height:(m.netto/maxV)*100+'%'}}/></div>
                          <div className="okbar-l" title={monthLabel(m.month)}>
                            {MND_NO[parseInt(m.month.slice(5,7),10)-1]}
                            {(m.month.slice(5,7)==='01' || m.month===shown[0].month) ? ' ’'+m.month.slice(2,4) : ''}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : <div className="muted" style={{padding:24}}>Ingen måneder i denne strømmen.</div>}
                  {vStream==='diverse' && <div className="dim" style={{fontSize:11, marginTop:12, lineHeight:1.6}}>«Diverse» er den gamle Valgfritt beløp-strømmen — blandet innhold (utstyr, seminar, stevnepåmelding). Butikken tok over i 2026.</div>}
                </Tile>
                {vp.length > 0 && (
                  <>
                    <div className="section-h" style={{marginTop:26}}>Hva selger<span className="meta">vippsbutikken · hele perioden · brutto</span></div>
                    <Tile title="produkttopp" corner="salgsrapport">
                      <HBar data={vp.slice(0,12).map(p=>({label:`${p.navn} · ${p.antall} stk`, value:p.belop}))} color="var(--accent)" height={20}/>
                    </Tile>
                  </>
                )}
              </>
            )}
            {vImpOpen && <VippsImportModal onClose={()=>setVImpOpen(false)} onSaved={loadVipps}/>}
          </>
        );
      })()}

      <div className="section-h" style={{marginTop:32}}>Estimert kontingent<span className="meta">modellert fra medlemstall × pris</span></div>
      <div style={{padding:'14px 16px', borderRadius:'calc(16px * var(--rscale))', background:'var(--accent-bg)', marginBottom:20, fontSize:12, color:'var(--ink-soft)'}}>
        <span className="tag amber" style={{marginRight:10}}>estimat</span>
        Beregnet ut fra antall aktive medlemmer × pris pr. medlemstype. Junior-semesterpris (1500,-) fordelt over 6 mnd. Tar ikke hensyn til intro-kurs, drop-in eller arrangementsinntekter.
      </div>
      <div className="grid-4">
        <KPI label="Estimert MRR" value={fmtN(t.mrr)} unit=" kr" delta="månedlig kontingent" accent="amber"/>
        <KPI label="Estimert ARR" value={fmtN(t.arr)} unit=" kr" delta="× 12" accent="green"/>
        <KPI label="Snitt pr. medlem" value={t.activeMembers ? fmtN(t.mrr/t.activeMembers) : '—'} unit=" kr/mnd" accent="blue"/>
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

function Churn({ kpis, charts, live, isStyre, onGotoReconcile, departed }) {
  const t = kpis.totals;
  const conv = kpis.conversion || {};
  // 0 konverterte av N intro er nesten sikkert join-svikt, ikke virkelighet.
  // Da viser vi ikke en falsk «0 %», men en oppfordring om å koble navn først.
  const convUnreliable = !(conv.converted > 0);
  const unmatched = (live && live.unmatched) ? live.unmatched : 0;
  return (
    <div>
      <div className="grid-4">
        <KPI label="Totalt deaktiverte" value={t.deactivated} delta={departed && departed.total>0 ? `historisk + ${departed.total} sporet` : 'historisk grunnlag'} deltaClass="down" accent="coral"/>
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
          {(() => {
            // Var låst til 2021 og 2025. Plukker nå eldste og fjorårets kohort
            // fra serien, så teksten følger med når årene ruller videre.
            const cs = charts.cohorts.filter(c => c.signups > 0);
            if(!cs.length) return 'Ingen innmeldingsår i grunnlaget ennå.';
            const eldst = cs[0], ifjor = cs.length > 1 ? cs[cs.length-2] : cs[cs.length-1];
            const aar = Number(AAR_NA) - Number(eldst.year);
            return <>Av {eldst.signups} personer som meldte seg inn i {eldst.year} trener {eldst.stillActive} fortsatt
              — det er {fmtPct(eldst.retention)} {aar>0 ? `${aar}-års-retention` : 'retention'}.
              {ifjor.year !== eldst.year && <> Av {ifjor.signups} fra {ifjor.year} er {ifjor.stillActive} fortsatt aktive ({fmtPct(ifjor.retention)}).</>}</>;
          })()}
          {' '}Registeret viser bare dem som fortsatt trener, så inneværende år kan aldri få under 100 % her.
        </div>
      </Tile>

      <div className="section-h">Deaktiveringer pr. år</div>
      <Tile title="churn" corner="annual">
        <HBar data={Object.entries(kpis.deactPerYear).sort((a,b)=>a[0].localeCompare(b[0])).map(([k,v])=>({label:k, value:v}))} color="#C45838" height={22}/>
        <div className="dim" style={{fontSize:11, marginTop:12, lineHeight:1.6}}>
          {departed && departed.fra
            ? <>Fra {fmtDate(departed.fra)} registreres avgang automatisk: hver medlemsimport noterer hvem som er falt ut siden forrige gang. Årene før det kommer fra det historiske grunnlaget.</>
            : <>Avgang før i dag kommer fra det historiske grunnlaget. Fra nå av noterer hver medlemsimport hvem som er falt ut siden forrige import — tallene for inneværende år fylles ut etter hvert.</>}
        </div>
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
