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
// Mandagsdatoene for de n siste ukene, eldst først.
function lastMondays(n) {
  const t = new Date();
  const d = new Date(t.getFullYear(), t.getMonth(), t.getDate());
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); // denne ukas mandag (lokal tid)
  const out = [];
  for (let i = n - 1; i >= 0; i--) {
    const w = new Date(d); w.setDate(w.getDate() - 7 * i);
    out.push(`${w.getFullYear()}-${String(w.getMonth() + 1).padStart(2, '0')}-${String(w.getDate()).padStart(2, '0')}`);
  }
  return out;
}
// Sum av fire uker som slutter endOffset uker før slutten av serien.
const sum4 = (arr, endOffset) => arr.slice(arr.length - endOffset - 4, arr.length - endOffset).reduce((s, v) => s + v, 0);

// Én kilde for «siste 4 uker vs. forrige 4» pr. medlem. Brukes både av
// Trend pr. medlem (Oppmøte) og Fallende oppmøte (I dag) — tidligere regnet
// bare det ene stedet dette ut, og et nytt sted ville fort ha regnet litt
// annerledes. `medlem` er det maskerte registeret-objektet, eller null for
// oppmøte som ikke er koblet til et medlem.
function memberTrendRows(live, members, weeks) {
  const mw = (live && live.memberWeekly) || null;
  if (!mw) return [];
  const uker = weeks || lastMondays(26);
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

// Sparkline / line chart
// Valgfritt (bakoverkompatibelt): labelAccessor(d, i) gir x-etiketten for et
// punkt — brukes både på x-aksen og i tooltipen. showAxis slår på x-aksen med
// 3–5 etiketter avledet av dataene. Uten dem oppfører grafen seg som før.
//
// markers=[{dato, type, tittel}] tegner tynne loddrette linjer der noe
// skjedde (ferie, gradering, arrangement). Markørene må kunne plasseres på
// tidsaksen, så de krever dateAccessor(d, i) — datoen punktet dekker. Uten
// den ignoreres de, slik at grafer uten tidsakse ikke prøver å tegne dem.
function Spark({ data, height=60, color, fill, accessor=(d)=>d, showAxis=false, labelAccessor=null,
  markers=null, dateAccessor=null }) {
  const ref = useRef(null);
  const [w, setW] = useState(400);
  const [hoverI, setHoverI] = useState(null);
  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(entries => {
      for (const e of entries) setW(e.contentRect.width);
    });
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);

  const rows = data || [];
  const values = rows.map(accessor);
  const h = height;
  const maxV = values.length ? Math.max(...values) : 0;
  const minV = 0;
  const stepX = rows.length > 1 ? w / (rows.length - 1) : 0;
  const yOf = (v) => h - ((v - minV) / (maxV - minV || 1)) * h;
  const points = values.map((v, i) => [i * stepX, yOf(v)]);
  const pathD = points.map((p,i) => (i===0?'M':'L') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
  const fillD = pathD + ` L ${w} ${h} L 0 ${h} Z`;
  const etikett = (i) => (labelAccessor ? labelAccessor(rows[i], i) : String(i + 1));

  // Finger eller mus: nærmeste punkt langs x. touch-action pan-y lar siden
  // fortsatt scrolles vertikalt mens vannrett dragging leser av grafen.
  function pek(e) {
    if (!rows.length) return;
    const r = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - r.left;
    const i = stepX ? Math.round(x / stepX) : 0;
    setHoverI(Math.max(0, Math.min(rows.length - 1, i)));
  }
  // Musepeker: tooltipen forsvinner når pekeren forlater grafen. Finger: den
  // blir stående til neste berøring — et raskt trykk skal rekke å bli lest.
  const slipp = (e) => { if (!e || !e.pointerType || e.pointerType === 'mouse') setHoverI(null); };
  const avbryt = () => setHoverI(null);

  // 3–5 etiketter, jevnt fordelt — flere blir uleselig på mobilbredde.
  const aksePunkter = [];
  if (showAxis && rows.length) {
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

  if (!rows.length) return <div ref={ref} style={{ width:'100%', height: h }} />;

  const hx = hoverI != null ? points[hoverI][0] : 0;
  const hy = hoverI != null ? points[hoverI][1] : 0;
  return (
    <div ref={ref} style={{ width:'100%', position:'relative' }}>
      <svg width={w} height={h} style={{ display:'block', overflow:'visible', touchAction:'pan-y' }}
        onPointerDown={pek} onPointerMove={pek}
        onPointerLeave={slipp} onPointerCancel={avbryt}>
        {markorer.map((mk, k) => {
          const x = mk.i * stepX;
          const f = HENDELSE_FARGE[mk.type] || HENDELSE_FARGE.annet;
          return (
            <g key={k}>
              <line x1={x} y1={0} x2={x} y2={h} stroke={f} strokeWidth={1} opacity={.7} />
              <circle cx={x} cy={0} r={2.5} fill={f} />
              {/* Bred, usynlig treffsone — en 1px-strek er umulig å treffe. */}
              <rect x={x - 5} y={0} width={10} height={h} fill="transparent">
                <title>{mk.tittel ? `${mk.tittel} (${mk.type})` : mk.type}</title>
              </rect>
            </g>
          );
        })}
        {fill && <path d={fillD} fill={fill} />}
        <path d={pathD} fill="none" stroke={color || 'currentColor'} strokeWidth={1.2} />
        {hoverI != null && (
          <g>
            <line x1={hx} y1={0} x2={hx} y2={h} stroke="var(--ink-soft, #5B5870)" strokeWidth={1} strokeDasharray="3 3" opacity={.55} />
            <circle cx={hx} cy={hy} r={3.5} fill={color || 'currentColor'} stroke="var(--card, #fff)" strokeWidth={1.5} />
          </g>
        )}
      </svg>
      {showAxis && (
        <div style={{ position:'relative', height: 14, marginTop: 6 }}>
          {aksePunkter.map((i, k) => (
            <span key={i} style={{
              position:'absolute', left: (i * stepX) + 'px', top: 0,
              transform: k === 0 ? 'none' : k === aksePunkter.length - 1 ? 'translateX(-100%)' : 'translateX(-50%)',
              fontSize: 9.5, color:'var(--muted)', whiteSpace:'nowrap',
            }}>{etikett(i)}</span>
          ))}
        </div>
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
          {centerLabel && <div style={{ fontSize: 10, letterSpacing:'.12em', textTransform:'uppercase', opacity:.7 }}>{centerLabel}</div>}
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
            <div style={{ fontSize:10, opacity:.6 }}>{fmtPct(c.retention)}</div>
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
window.HENDELSE_FARGE = HENDELSE_FARGE;
window.HENDELSE_TYPER = HENDELSE_TYPER;
window.MemberOpenCtx = MemberOpenCtx;
window.useMemberOpen = useMemberOpen;
window.MemberLink = MemberLink;
window.lastMondays = lastMondays;
window.sum4 = sum4;
window.memberTrendRows = memberTrendRows;
window.HBar = HBar;
window.Spark = Spark;
window.Donut = Donut;
window.CohortBar = CohortBar;
