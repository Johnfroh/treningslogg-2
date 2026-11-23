/* Shared dashboard components and computed data
   Loaded after React. Exports to window. */

const { useState, useEffect, useMemo, useRef } = React;

// =============== DATA HOOK ===============
function useKpis() {
  const [kpis, setKpis] = useState(null);
  useEffect(() => {
    DASH_API.fetchKpis().then(setKpis);
  }, []);
  return kpis;
}

// =============== UTILS ===============
const fmtN = (n) => new Intl.NumberFormat('nb-NO').format(Math.round(n));
const fmtKr = (n) => new Intl.NumberFormat('nb-NO').format(Math.round(n)) + ' kr';
const fmtPct = (n, d=0) => (n*100).toFixed(d) + '%';
const WD = ['Man','Tir','Ons','Tor','Fre','Lør','Søn'];

// =============== GRUPPER (én kilde i dashboardet) ===============
// Treningsgruppene i datamodellen. Speiler M_GROUP i app/shared.js, som er
// trener-appens kilde — dashboardet laster ikke den fila, så dette er
// dashboard-sidens ene liste. CAL_GROUPS (kalenderen) og GROUP_LABEL
// (Innhold-fanen) leser herfra i stedet for å ha hver sin kopi.
// CLAUDE.md: gruppe utledes flere steder — endrer du her, sjekk de andre.
const DASH_GRUPPER = ['junior', 'gi', 'nogi', 'åpen matte', 'taktisk', 'damer'];
const DASH_GRUPPE_LABEL = {
  junior: 'Junior', gi: 'Gi', nogi: 'No-Gi', 'åpen matte': 'Åpen matte',
  taktisk: 'Taktisk grappling', damer: 'BJJ damer', ukjent: 'Ukjent',
};
// Fargene er de samme som M_GROUP bruker (M.purple/accent2/coral/blue/gold/
// rose i app/shared.js) — kalenderen så allerede slik ut, og skal fortsette
// å gjøre det.
const DASH_GRUPPE_FARGE = {
  junior: '#B06FD6', gi: '#34B98C', nogi: '#F2825F', 'åpen matte': '#4F9BEA',
  taktisk: '#D9A22E', damer: '#D96BA0', ukjent: '#A6A3BD',
};

// =============== MOBIL ===============
// Under denne bredden bytter dashboardet til bunnmeny og nedtrekk i stedet
// for sidefelt og knapperader. Samme brekkpunkt som media queries i
// index.html — endrer du her, endre der også.
const SMAL_PX = 760;
function useSmal() {
  const [smal, setSmal] = useState(() => {
    try { return window.matchMedia(`(max-width:${SMAL_PX}px)`).matches; } catch (e) { return false; }
  });
  useEffect(() => {
    let mq;
    try { mq = window.matchMedia(`(max-width:${SMAL_PX}px)`); } catch (e) { return undefined; }
    const paa = e => setSmal(e.matches);
    setSmal(mq.matches);
    mq.addEventListener('change', paa);
    return () => mq.removeEventListener('change', paa);
  }, []);
  return smal;
}

// =============== ÅPEN MEDLEMSPROFIL (global kanal) ===============
// Profil-state bor i App (daylight-app.jsx). Alle navnelister i dashboardet
// henter åpne-funksjonen herfra, slik at ett klikk på et navn gir samme
// medlemsprofil uansett hvilken fane eller tabell man står i.
//   open(id) — åpner profilen. kan(id) — er id-en et medlem vi faktisk har?
// Umatchede rader (oppmøte uten kobling til registeret) får kan() = false og
// rendres som vanlig tekst, ikke som en død klikkflate.
const MemberOpenCtx = React.createContext(null);
function useMemberOpen() {
  return React.useContext(MemberOpenCtx) || { open() {}, kan() { return false; } };
}

// Klikkbart medlemsnavn. Uten gyldig id blir det ren tekst — ingen feil,
// ingen pekermarkør. Hover-hintet (understrek) ligger i .mlink i index.html.
function MemberLink({ id, children, style, title }) {
  const { open, kan } = useMemberOpen();
  if (!id || !kan(id)) return <span style={style}>{children}</span>;
  return (
    <span className="mlink" style={style} title={title || 'Åpne medlemsprofil'}
      onClick={(e) => { e.stopPropagation(); open(id); }}>{children}</span>
  );
}

// =============== UKESTREND PR. MEDLEM (delt) ===============
// Lokal dato som 'YYYY-MM-DD' — toISOString() er UTC og bommer på «i dag».
function isoLokal(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function isoPluss(iso, n) {
  const d = new Date(iso + 'T00:00:00'); d.setDate(d.getDate() + n); return isoLokal(d);
}
function isoMandag(iso) {
  const d = new Date(iso + 'T00:00:00');
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return isoLokal(d);
}
const ISO_DATO = /^\d{4}-\d{2}-\d{2}$/;

// Siste dato det faktisk er registrert oppmøte for. Eldre backend sender
// ikke attTil — da er siste loggede økt det nærmeste vi kommer.
function oppmoteTil(live) {
  const t = String((live && (live.attTil || live.maxDate)) || '');
  return ISO_DATO.test(t) ? t : '';
}
// Referansedato for «uten oppmøte»: siste dato med registrert oppmøte, men
// aldri senere enn i dag. «Stille», «borte» og intro-oppfølging måles mot
// denne. Uten det blir hele klubben «stille» så snart oppmøte-importen er
// noen uker gammel. Speiles av dashOppmoteRef_() i Code.gs.
function oppmoteRef(live) {
  const idag = isoLokal(new Date());
  const til = oppmoteTil(live);
  return (til && til < idag) ? til : idag;
}
// Hele dager fra `iso` til referansedatoen (aldri negativt). null = ingen dato.
function dagerUtenOppmote(iso, refIso) {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  const r = new Date(refIso || isoLokal(new Date())).getTime();
  if (isNaN(t) || isNaN(r)) return null;
  return Math.max(0, Math.floor((r - t) / 86400000));
}
// Mandagen i siste HELE uke med oppmøtedata: uka før inneværende, eller uka
// oppmøtet sist ble registrert i hvis den er eldre. Inneværende uke er aldri
// med — den er halvferdig, og «siste 4 uker» ville sett ut som et fall hver
// gang man åpnet dashboardet tidlig i uka. Speiles av dashSisteHeleUke_().
function sisteHeleUke(live) {
  const forrige = isoPluss(isoMandag(isoLokal(new Date())), -7);
  const til = oppmoteTil(live);
  const dataUke = til ? isoMandag(til) : '';
  return (dataUke && dataUke < forrige) ? dataUke : forrige;
}
// De n siste mandagene til og med `sisteMandag`, eldst først.
function mandagerTil(n, sisteMandag) {
  const out = [];
  for (let i = n - 1; i >= 0; i--) out.push(isoPluss(sisteMandag, -7 * i));
  return out;
}
// =============== FELLES GRUPPEFILTER ===============
// Hvem som «hører til» en treningsgruppe. Registeret vet bare medlemstype
// (Voksen, Student, Junior …), ikke hvilke partier folk går på — det ser vi
// av oppmøtet. Regelen er bevisst enkel: minst én økt i gruppen de siste 52
// ukene. Et medlem kan høre til flere grupper (gi + no-gi).
// Medlemmer helt uten gruppeoppmøte i perioden plasseres etter medlemstype
// der den er entydig: Junior/Knøtte → junior. Ellers vises de bare under
// «Alle grupper».
// Returnerer null for «alle» (ingen filtrering). `mangler` = backend er for
// gammel til å sende oppmøte pr. gruppe; da filtreres det ikke.
const GRUPPE_UKER_TILBAKE = 52;
function gruppeMedlemmer(live, gruppe) {
  if (!gruppe || gruppe === 'alle') return null;
  const mgw = live && live.memberGruppeWeekly;
  if (!mgw) return { mangler: true, har: () => true };
  const fra = isoPluss(isoMandag(isoLokal(new Date())), -7 * GRUPPE_UKER_TILBAKE);
  const iGruppen = {}, harNoe = {};
  Object.keys(mgw).forEach(id => {
    Object.keys(mgw[id] || {}).forEach(g => {
      if (!Object.keys(mgw[id][g] || {}).some(wk => wk >= fra)) return;
      harNoe[id] = true;
      if (g === gruppe) iGruppen[id] = true;
    });
  });
  const erBarn = m => m.kategori === 'Junior' || m.kategori === 'Knøtte';
  return {
    mangler: false,
    har: m => !!iGruppen[m.id] || (!harNoe[m.id] && gruppe === 'junior' && erBarn(m)),
  };
}
const gruppeNavnAv = g => (!g || g === 'alle' ? 'alle grupper' : (DASH_GRUPPE_LABEL[g] || g));

// Fordelinger for en medlemsliste — kategori, kjønn, belte og alder. Én
// kilde for sidefeltet/Trender (mergeLiveKpis) og for Fordelinger i
// Medlemmer, som regner på det filtrerte utvalget.
function medlemsFordeling(liste) {
  const byKategori = {}, byKjonn = { Mann: 0, Kvinne: 0 }, byBelt = {}, byAgeBucket = {};
  (liste || []).forEach(m => {
    // Kategori regnes om fra medlemstypen, så rettelser i deriveKategoriImp
    // slår inn uten at medlemsfila må lastes opp på nytt.
    const kat = m.medlemstype ? window.deriveKategoriImp(m.medlemstype) : (m.kategori || 'Annet');
    byKategori[kat] = (byKategori[kat] || 0) + 1;
    const kj = m.kjonn || 'Ukjent'; byKjonn[kj] = (byKjonn[kj] || 0) + 1;
    const belt = (m.grading && m.grading.current.belt) || 'Hvit'; byBelt[belt] = (byBelt[belt] || 0) + 1;
    const a = window.alderNaImp(m);
    const bucket = a == null ? 'Ukjent' : a < 13 ? 'Under 13' : a < 18 ? '13–17' : a < 30 ? '18–29' : a < 45 ? '30–44' : '45+';
    byAgeBucket[bucket] = (byAgeBucket[bucket] || 0) + 1;
  });
  return { byKategori, byKjonn, byBelt, byAgeBucket };
}

// Sum av fire uker som slutter endOffset uker før slutten av serien.
const sum4 = (arr, endOffset) => arr.slice(arr.length - endOffset - 4, arr.length - endOffset).reduce((s, v) => s + v, 0);

// Én innmelding pr. PERSON: nåværende medlemmer + de som har sluttet
// (dash_departed), med den FØRSTE innmeldingsdatoen vi kjenner. Spond gir ny
// innmeldingsdato hver gang noen bytter eller fornyer medlemskap, så uten
// dette ble gjeninnmeldte talt som nye. Kategorien er dagens for medlemmer,
// ellers den de hadde da de sluttet. Uten importerte utmeldinger mangler
// de som sluttet før sporingen, så tall langt bakover er da et gulv.
function innmeldinger(members, departed) {
  const per = {};
  const legg = (id, dato, kategori, foretrekk) => {
    if (!id || !/^\d{4}-\d{2}-\d{2}/.test(String(dato || ''))) return;
    const d = String(dato).slice(0, 10);
    const p = per[id];
    if (!p) { per[id] = { id, innmeldingsdato: d, kategori: kategori || '' }; return; }
    if (d < p.innmeldingsdato) p.innmeldingsdato = d;
    if (foretrekk && kategori) p.kategori = kategori;
  };
  ((departed && departed.rows) || []).forEach(r => legg(r.id, r.innmeldingsdato, r.kategori, false));
  (members || []).forEach(m => legg(m.id, m.innmeldingsdato, m.kategori, true));
  return Object.values(per);
}

// «Siste 4 uker mot forrige 4» pr. medlem — brukes av Fallende oppmøte
// (I dag). Serien slutter på siste hele uke med oppmøtedata, så de fire
// siste ukene er fire hele uker. `medlem` er det maskerte register-objektet,
// eller null for oppmøte som ikke er koblet til et medlem.
function memberTrendRows(live, members, weeks) {
  const mw = (live && live.memberWeekly) || null;
  if (!mw) return [];
  const uker = weeks || mandagerTil(26, sisteHeleUke(live));
  const byId = {}; (members || []).forEach(m => { byId[m.id] = m; });
  return Object.keys(mw).map(id => {
    const series = uker.map(w => mw[id][w] || 0);
    const m = byId[id] || null;
    return {
      id, medlem: m, navn: m ? m.navn : '(ukjent)', kategori: m ? m.kategori : '', series,
      total: series.reduce((s, v) => s + v, 0), last4: sum4(series, 0), prev4: sum4(series, 4),
    };
  }).filter(r => r.total > 0).sort((a, b) => b.total - a.total);
}

// Compute derived
function deriveCharts(kpis) {
  if (!kpis) return null;

  // Class popularity: avg attendees per session
  const classes = Object.keys(kpis.classAttendance).map(name => ({
    name,
    total: kpis.classAttendance[name],
    sessions: kpis.classSessions[name],
    avg: kpis.classSessions[name] ? kpis.classAttendance[name] / kpis.classSessions[name] : 0,
  })).sort((a,b) => b.avg - a.avg);

  // Daily timeline (sorted)
  const daily = Object.entries(kpis.dailyAttendance)
    .map(([date, count]) => ({ date, count }))
    .sort((a,b) => a.date.localeCompare(b.date));

  // Monthly aggregate
  const monthly = {};
  for (const d of daily) {
    const m = d.date.slice(0,7);
    monthly[m] = (monthly[m] || 0) + d.count;
  }
  const monthlyArr = Object.entries(monthly).map(([k,v]) => ({m:k, v})).sort((a,b)=>a.m.localeCompare(b.m));

  // Cohort retention: people from year X still active
  const signups = kpis.signupsPerYear;
  const stillActive = kpis.cohortByYear;
  // Årsrekka var hardkodet t.o.m. 2026 — den følger nå dataene og dagens år,
  // slik at kohortgrafen ikke stopper opp ved et årsskifte.
  const naa = new Date().getFullYear();
  const kjenteAar = Object.keys({ ...signups, ...stillActive, ...(kpis.deactPerYear||{}) })
    .filter(y => /^\d{4}$/.test(y)).map(Number);
  const forsteAar = kjenteAar.length ? Math.max(Math.min(...kjenteAar), naa-6) : naa-6;
  const cohortYears = [];
  for (let y = forsteAar; y <= naa; y++) cohortYears.push(String(y));
  const cohorts = cohortYears.map(y => ({
    year: y,
    signups: signups[y] || 0,
    stillActive: stillActive[y] || 0,
    retention: signups[y] ? (stillActive[y] || 0) / signups[y] : 0,
  }));

  // Net member change per year
  const yearly = {};
  for (const y of cohortYears) {
    yearly[y] = {
      signups: signups[y] || 0,
      churn: kpis.deactPerYear[y] || 0,
      net: (signups[y] || 0) - (kpis.deactPerYear[y] || 0),
    };
  }

  // Belt distribution (with extended belts)
  const beltOrder = ['Hvit','Grå/Hvit','Grå','Gul','Oransje','Grønn','Blå','Blått','Lilla','Brun','Sort'];
  const belts = beltOrder
    .filter(b => kpis.byBelt[b])
    .map(b => ({ name: b, count: kpis.byBelt[b] }));

  // Pricing breakdown sorted
  const pricing = Object.entries(kpis.pricingBreakdown)
    .map(([type, info]) => ({ type, ...info }))
    .sort((a,b) => b.mrr - a.mrr);

  return { classes, daily, monthlyArr, cohorts, yearly, belts, pricing };
}

// =============== OPPMØTE SIDEN SIST GRADERING ===============
// Lå i rapport.jsx som mrOkterSiden. «I dag»-lista over graderingsklare
// brukte TOTALT antall oppmøter, rapporten brukte oppmøter siden sist
// gradering — så de to stedene kunne peke på hver sine medlemmer. Nå er det
// én funksjon.
//
// Merk: live.memberMonthly dekker bare økter som ligger i Sheets (logget i
// appen eller importert). Et medlem gradert før den æraen får derfor et lavt
// tall her — men det er samme lave tall i rapporten, og det er poenget.
function okterSidenGradering(live, memberId, fraISO, tilYm) {
  const mm = (live && live.memberMonthly && live.memberMonthly[memberId]) || null;
  if (!mm) return 0;
  const fraYm = /^\d{4}-\d{2}-\d{2}$/.test(String(fraISO || '')) ? String(fraISO).slice(0, 7) : '';
  let n = 0;
  Object.keys(mm).forEach(ym => {
    if (fraYm && ym < fraYm) return;
    if (tilYm && ym > tilYm) return;
    n += mm[ym];
  });
  return n;
}

// =============== GRADERINGSKLAR ===============
// Egne terskler for stripe og belte, og for voksne og barn. Én kilde for
// «I dag» og rapporten; speiles av dashGraderingsKlar_() i Code.gs (ukesnapshot).
// Nøklene ligger i dash_settings — standardverdiene speiles i Code.gs
// (DASH_SETTING_DEFAULTS), api.js og settings-panels.jsx.
const GRAD_TERSKEL_STANDARD = {
  stripeVoksenOppmote: 30, stripeVoksenMnd: 3, belteVoksenOppmote: 100, belteVoksenMnd: 12,
  stripeBarnOppmote: 20, stripeBarnMnd: 3, belteBarnOppmote: 60, belteBarnMnd: 12,
};
// Klubbregel: striper gis på hvitt belte og juniorbelter. Voksne fargebelter
// får ikke striper — der er det bare beltet som teller.
function faarStriper(belt) { return !belt || belt === 'Hvit' || isJuniorBelt(belt); }
// Barn = juniorbelte, eller hvitt belte og mindreårig. Hvitt er felles for
// begge stigene, så der avgjør alder/kategori.
function erBarnGradering(m) {
  const belt = (m && m.grading && m.grading.current && m.grading.current.belt) || 'Hvit';
  if (isJuniorBelt(belt)) return true;
  if (belt !== 'Hvit') return false;
  return m.minor === true || m.kategori === 'Junior' || m.kategori === 'Knøtte'
    || (m.alder != null && m.alder !== '' && Number(m.alder) < 16);
}
// Datoen beltet ble oppnådd: siste beltegradering. Hvitt belte uten
// beltegradering → innmeldingen. Ellers det beste vi har (gjeldende «siden»).
function sisteBeltedato(m) {
  const g = (m && m.grading) || {};
  let best = '';
  (g.history || []).forEach(e => { if (e.kind === 'belte' && ISO_DATO.test(e.date || '') && e.date > best) best = e.date; });
  if (best) return best;
  const cur = g.current || {};
  if ((cur.belt || 'Hvit') === 'Hvit') {
    const innm = (g.history || []).find(e => e.kind === 'innmelding' && ISO_DATO.test(e.date || ''));
    if (innm) return innm.date;
    if (ISO_DATO.test(m.innmeldingsdato || '')) return m.innmeldingsdato;
  }
  return ISO_DATO.test(cur.since || '') ? cur.since : '';
}
function gradDagerSiden(iso) {
  if (!ISO_DATO.test(iso || '')) return null;
  return Math.floor((new Date(isoLokal(new Date()) + 'T00:00:00') - new Date(iso + 'T00:00:00')) / 86400000);
}
// null = ikke klar. Ellers { type: 'belte'|'stripe', barn, okter, dager, fra,
// kravOkter, kravMnd }. Belte går foran stripe: den som er klar for belte,
// står ikke i tillegg som stripekandidat.
function graderingsKlar(m, live, terskler) {
  const g = m && m.grading && m.grading.current;
  if (!g || g.belt === 'Sort') return null;
  const th = Object.assign({}, GRAD_TERSKEL_STANDARD, terskler || {});
  const barn = erBarnGradering(m);
  const hvem = barn ? 'Barn' : 'Voksen';
  const sjekk = (type, fra) => {
    const kravOkter = Number(th[type + hvem + 'Oppmote']), kravMnd = Number(th[type + hvem + 'Mnd']);
    const dager = gradDagerSiden(fra);
    if (dager == null || dager < kravMnd * 30) return null;
    const okter = okterSidenGradering(live, m.id, fra);
    if (okter < kravOkter) return null;
    return { type, barn, okter, dager, fra, kravOkter, kravMnd };
  };
  const belte = sjekk('belte', sisteBeltedato(m));
  if (belte) return belte;
  if (!faarStriper(g.belt) || Number(g.stripes || 0) >= maxStripes) return null;
  return sjekk('stripe', g.since);
}

// =============== TINY CHART PRIMITIVES ===============
// Bar chart (horizontal)
function HBar({ data, valueKey='value', labelKey='label', max, color, showValue=true, height=18, gap=6 }) {
  const m = max || Math.max(...data.map(d => d[valueKey]));
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: gap }}>
      {data.map((d, i) => (
        <div key={i} style={{ display: 'grid', gridTemplateColumns: '120px 1fr 50px', alignItems: 'center', gap: 8, fontSize: 12 }}>
          <div style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{d[labelKey]}</div>
          <div style={{ height, background: 'var(--bar-bg, rgba(0,0,0,.06))', position:'relative' }}>
            <div style={{
              position:'absolute', left:0, top:0, bottom:0,
              width: ((d[valueKey] / m) * 100) + '%',
              background: color || 'var(--accent-dominant)',
            }} />
          </div>
          {showValue && <div style={{ textAlign:'right', fontVariantNumeric:'tabular-nums' }}>{fmtN(d[valueKey])}</div>}
        </div>
      ))}
    </div>
  );
}

// Farge pr. hendelsestype (dash_events). Brukes av Spark-markørene og av
// hendelseslista i Innstillinger, så en ferie har samme farge begge steder.
const HENDELSE_FARGE = {
  gradering: '#7B6EF6', arrangement: '#F2825F', ferie: '#4F9BEA',
  introkurs: '#34B98C', annet: '#A6A3BD',
};
const HENDELSE_TYPER = ['gradering', 'arrangement', 'ferie', 'introkurs', 'annet'];

// Sparkline / søylediagram.
// Valgfritt (bakoverkompatibelt):
//   labelAccessor(d, i)  x-etikett — brukes på aksen og i tooltipen
//   showAxis             x-akse med 3–5 etiketter + min/maks på y
//   markers              [{dato,type,tittel}] loddrette hendelseslinjer (krever dateAccessor)
//   compareData          sammenligningsperiode, tegnes som grå skygge bak
// Under 10 datapunkter tegnes SØYLER: en linje mellom fire punkter later som
// om det er en kurve mellom dem, og det er det ikke.
const SPARK_SOYLE_GRENSE = 10;

function Spark({ data, height=60, color, fill, accessor=(d)=>d, showAxis=false, labelAccessor=null,
  markers=null, dateAccessor=null, compareData=null }) {
  const ref = useRef(null);
  // Starter på 0, ikke 400: tegner vi før ResizeObserver har målt, hopper
  // grafen synlig når den ekte bredden kommer.
  const [w, setW] = useState(0);
  const [hoverI, setHoverI] = useState(null);
  useEffect(() => {
    if (!ref.current) return undefined;
    const ro = new ResizeObserver(entries => {
      for (const e of entries) setW(e.contentRect.width);
    });
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);

  const rows = data || [];
  const values = rows.map(accessor);
  const cmp = (compareData || []).map(accessor);
  const h = height;
  // Felles skala for begge seriene — ellers ser sammenligningen større ut
  // enn den er bare fordi den har sin egen y-akse.
  const maxV = Math.max(0, ...values, ...cmp);
  const stepX = rows.length > 1 ? w / (rows.length - 1) : 0;
  const yOf = (v) => h - ((v) / (maxV || 1)) * h;
  const points = values.map((v, i) => [i * stepX, yOf(v)]);
  const soyler = rows.length > 0 && rows.length < SPARK_SOYLE_GRENSE;
  const bw = rows.length ? (w / rows.length) : 0;
  const bx = (i) => i * bw + bw * 0.15;
  const bWidth = Math.max(1, bw * 0.7);
  const etikett = (i) => (labelAccessor ? labelAccessor(rows[i], i) : String(i + 1));

  // Finger eller mus: nærmeste punkt langs x. touch-action pan-y lar siden
  // fortsatt scrolles vertikalt mens vannrett dragging leser av grafen.
  function pek(e) {
    if (!rows.length || !w) return;
    const r = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - r.left;
    const i = soyler ? Math.floor(x / (bw || 1)) : (stepX ? Math.round(x / stepX) : 0);
    setHoverI(Math.max(0, Math.min(rows.length - 1, i)));
  }
  // Musepeker: tooltipen forsvinner når pekeren forlater grafen. Finger: den
  // blir stående til neste berøring — et raskt trykk skal rekke å bli lest.
  const slipp = (e) => { if (!e || !e.pointerType || e.pointerType === 'mouse') setHoverI(null); };
  const avbryt = () => setHoverI(null);

  // 3–5 etiketter, jevnt fordelt — flere blir uleselig på mobilbredde.
  const aksePunkter = [];
  if (showAxis && rows.length && w) {
    const antall = Math.min(rows.length, w < 380 ? 3 : w < 640 ? 4 : 5);
    for (let k = 0; k < antall; k++) {
      aksePunkter.push(antall === 1 ? 0 : Math.round(k * (rows.length - 1) / (antall - 1)));
    }
  }

  // Hver markør festes til punktet den hører hjemme i: siste punkt med dato
  // <= hendelsesdatoen. Hendelser utenfor serien tegnes ikke.
  const markorer = [];
  if (markers && markers.length && dateAccessor && rows.length) {
    const datoer = rows.map((d, i) => String(dateAccessor(d, i) || ''));
    markers.forEach(mk => {
      const dato = String((mk && mk.dato) || '');
      if (!dato || dato < datoer[0]) return;
      let i = 0;
      for (let k = 0; k < datoer.length; k++) { if (datoer[k] <= dato) i = k; else break; }
      markorer.push({ i, dato, type: mk.type || 'annet', tittel: mk.tittel || '' });
    });
  }
  const markorerFor = (i) => markorer.filter(mk => mk.i === i);

  // Uten målt bredde tegner vi ingenting — bare boksen som skal måles.
  if (!w || !rows.length) return <div ref={ref} style={{ width:'100%', height: h }} />;

  const mx = soyler ? (i) => bx(i) + bWidth / 2 : (i) => i * stepX;
  const hx = hoverI != null ? mx(hoverI) : 0;
  const hy = hoverI != null ? yOf(values[hoverI]) : 0;
  const linjeD = points.map((p,i) => (i===0?'M':'L') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
  const fyllD = linjeD + ` L ${w} ${h} L 0 ${h} Z`;
  // Sammenligningen legges på samme x-bredde, uansett hvor mange punkter den
  // har — det er formen som skal sammenlignes, ikke antall uker.
  const cmpX = cmp.length > 1 ? w / (cmp.length - 1) : 0;
  const cmpD = cmp.map((v, i) => (i===0?'M':'L') + (i * cmpX).toFixed(1) + ' ' + yOf(v).toFixed(1)).join(' ');

  return (
    <div ref={ref} style={{ width:'100%', position:'relative' }}>
      <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none"
        style={{ display:'block', overflow:'visible', touchAction:'pan-y' }}
        onPointerDown={pek} onPointerMove={pek}
        onPointerLeave={slipp} onPointerCancel={avbryt}>
        {/* Sammenligningsperioden — grå skygge bak hovedserien */}
        {cmp.length > 0 && (soyler
          ? cmp.map((v, i) => {
              const cw = w / cmp.length;
              return <rect key={'c'+i} x={i * cw + cw * 0.15} y={yOf(v)} width={Math.max(1, cw * 0.7)}
                height={Math.max(0, h - yOf(v))} fill="var(--line-strong)" opacity={.45} />;
            })
          : <path d={cmpD + ` L ${w} ${h} L 0 ${h} Z`} fill="var(--line-strong)" opacity={.35} />)}
        {markorer.map((mk, k) => {
          const x = mx(mk.i);
          const f = HENDELSE_FARGE[mk.type] || HENDELSE_FARGE.annet;
          return (
            <g key={k}>
              <line x1={x} y1={0} x2={x} y2={h} stroke={f} strokeWidth={1} opacity={.7} vectorEffect="non-scaling-stroke" />
              <circle cx={x} cy={0} r={2.5} fill={f} />
              <rect x={x - 5} y={0} width={10} height={h} fill="transparent">
                <title>{mk.tittel ? `${mk.tittel} (${mk.type})` : mk.type}</title>
              </rect>
            </g>
          );
        })}
        {soyler
          ? values.map((v, i) => (
              <rect key={i} x={bx(i)} y={yOf(v)} width={bWidth} height={Math.max(0, h - yOf(v))}
                fill={color || 'currentColor'} opacity={hoverI == null || hoverI === i ? 1 : .55} />
            ))
          : <>
              {fill && <path d={fyllD} fill={fill} />}
              <path d={linjeD} fill="none" stroke={color || 'currentColor'} strokeWidth={1.2} vectorEffect="non-scaling-stroke" />
            </>}
        {hoverI != null && !soyler && (
          <g>
            <line x1={hx} y1={0} x2={hx} y2={h} stroke="var(--ink-soft, #5B5870)" strokeWidth={1}
              strokeDasharray="3 3" opacity={.55} vectorEffect="non-scaling-stroke" />
            <circle cx={hx} cy={hy} r={3.5} fill={color || 'currentColor'} stroke="var(--card, #fff)" strokeWidth={1.5} />
          </g>
        )}
      </svg>
      {showAxis && (
        <>
          {/* Min og maks på y — uten dem sier en sparkline ingenting om nivå */}
          <span className="spark-y" style={{ top: 0 }}>{fmtN(maxV)}</span>
          <span className="spark-y" style={{ top: h - 12 }}>0</span>
          <div style={{ position:'relative', height: 14, marginTop: 6 }}>
            {aksePunkter.map((i, k) => (
              <span key={i} style={{
                position:'absolute', left: mx(i) + 'px', top: 0,
                transform: k === 0 ? 'none' : k === aksePunkter.length - 1 ? 'translateX(-100%)' : 'translateX(-50%)',
                fontSize: 11, color:'var(--muted)', whiteSpace:'nowrap',
              }}>{etikett(i)}</span>
            ))}
          </div>
        </>
      )}
      {hoverI != null && (
        <div style={{
          position:'absolute', left: Math.max(0, Math.min(w, hx)) + 'px',
          top: Math.max(-6, hy - 42) + 'px',
          transform: 'translateX(' + (hx < 60 ? '0' : hx > w - 60 ? '-100%' : '-50%') + ')',
          background:'var(--ink, #2B2A3C)', color:'#fff', borderRadius: 8,
          padding:'5px 9px', fontSize: 11, lineHeight: 1.4, whiteSpace:'nowrap',
          pointerEvents:'none', boxShadow:'0 4px 14px rgba(0,0,0,.18)', zIndex: 3,
        }}>
          <div style={{ opacity:.75 }}>{etikett(hoverI)}</div>
          <div style={{ fontWeight:700, fontVariantNumeric:'tabular-nums' }}>{fmtN(values[hoverI])}</div>
          {markorerFor(hoverI).map((mk, k) => (
            <div key={k} style={{ opacity:.85, marginTop: 2 }}>
              <span style={{ display:'inline-block', width:6, height:6, borderRadius:'50%',
                background: HENDELSE_FARGE[mk.type] || HENDELSE_FARGE.annet, marginRight: 5 }}/>
              {mk.tittel || mk.type}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Donut / ring
function Donut({ data, size=140, thickness=22, colors, centerLabel, centerValue }) {
  const total = data.reduce((s,d) => s+d.value, 0);
  const r = (size-thickness)/2;
  const c = 2*Math.PI*r;
  let acc = 0;
  return (
    <div style={{ position:'relative', width:size, height:size }}>
      <svg width={size} height={size}>
        <g transform={`translate(${size/2} ${size/2}) rotate(-90)`}>
          {data.map((d, i) => {
            const dash = (d.value/total) * c;
            const el = (
              <circle key={i} r={r} fill="none"
                stroke={colors[i % colors.length]}
                strokeWidth={thickness}
                strokeDasharray={`${dash} ${c}`}
                strokeDashoffset={-acc}
              />
            );
            acc += dash;
            return el;
          })}
        </g>
      </svg>
      {(centerLabel !== undefined || centerValue !== undefined) && (
        <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', textAlign:'center', lineHeight:1.1 }}>
          {centerValue && <div style={{ fontSize: 22, fontWeight: 700, fontVariantNumeric:'tabular-nums' }}>{centerValue}</div>}
          {centerLabel && <div style={{ fontSize: 11, letterSpacing:'.12em', textTransform:'uppercase', opacity:.7 }}>{centerLabel}</div>}
        </div>
      )}
    </div>
  );
}

// Stacked bar - cohort
function CohortBar({ cohorts, color1, color2 }) {
  const max = Math.max(...cohorts.map(c => c.signups));
  return (
    <div style={{ display:'flex', alignItems:'flex-end', gap: 8, height: 200 }}>
      {cohorts.map(c => {
        const totalH = (c.signups / max) * 180;
        const activeH = c.signups ? totalH * (c.stillActive / c.signups) : 0;
        const churnH = totalH - activeH;
        return (
          <div key={c.year} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap: 4 }}>
            <div style={{ fontSize:11, fontVariantNumeric:'tabular-nums' }}>
              <span style={{ color: color1 }}>{c.stillActive}</span>
              <span style={{ opacity:.4 }}>/{c.signups}</span>
            </div>
            <div style={{ width: '100%', height: 180, position: 'relative', display:'flex', flexDirection:'column', justifyContent:'flex-end' }}>
              <div style={{ width:'100%', height: churnH, background: color2 }}></div>
              <div style={{ width:'100%', height: activeH, background: color1 }}></div>
            </div>
            <div style={{ fontSize:11, fontWeight:700 }}>{c.year}</div>
            <div style={{ fontSize:11, opacity:.6 }}>{fmtPct(c.retention)}</div>
          </div>
        );
      })}
    </div>
  );
}

// Export
window.useKpis = useKpis;
window.deriveCharts = deriveCharts;
window.fmtN = fmtN;
window.fmtKr = fmtKr;
window.fmtPct = fmtPct;
window.WD = WD;
window.DASH_GRUPPER = DASH_GRUPPER;
window.DASH_GRUPPE_LABEL = DASH_GRUPPE_LABEL;
window.DASH_GRUPPE_FARGE = DASH_GRUPPE_FARGE;
window.SMAL_PX = SMAL_PX;
window.useSmal = useSmal;
window.okterSidenGradering = okterSidenGradering;
Object.assign(window, { GRAD_TERSKEL_STANDARD, faarStriper, erBarnGradering, sisteBeltedato, graderingsKlar });
window.SPARK_SOYLE_GRENSE = SPARK_SOYLE_GRENSE;
window.HENDELSE_FARGE = HENDELSE_FARGE;
window.HENDELSE_TYPER = HENDELSE_TYPER;
window.MemberOpenCtx = MemberOpenCtx;
window.useMemberOpen = useMemberOpen;
window.MemberLink = MemberLink;
window.isoLokal = isoLokal;
window.isoPluss = isoPluss;
window.isoMandag = isoMandag;
window.oppmoteTil = oppmoteTil;
window.oppmoteRef = oppmoteRef;
window.dagerUtenOppmote = dagerUtenOppmote;
window.sisteHeleUke = sisteHeleUke;
window.mandagerTil = mandagerTil;
window.gruppeMedlemmer = gruppeMedlemmer;
window.gruppeNavnAv = gruppeNavnAv;
window.medlemsFordeling = medlemsFordeling;
window.GRUPPE_UKER_TILBAKE = GRUPPE_UKER_TILBAKE;
window.sum4 = sum4;
window.innmeldinger = innmeldinger;
window.memberTrendRows = memberTrendRows;
window.HBar = HBar;
window.Spark = Spark;
window.Donut = Donut;
window.CohortBar = CohortBar;
