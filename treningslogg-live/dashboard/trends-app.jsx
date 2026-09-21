/* Trender — Oversikt + Oppmøte + Kohort & Churn slått sammen til én fane
   der brukeren styrer tiden: periode, sammenligning og gruppe.

   Ingen nye datakilder. Alt bygger på det som allerede finnes:
     kpis.json          historisk ukesoppmøte (frosset grunnlag)
     live.weekly        oppmøte pr. uke fra Sheets (logget + importert)
     live.sessionWeekly økter pr. uke
     live.gruppeWeekly  økter + oppmøte pr. gruppe pr. uke
     dash_snapshots     aktive medlemmer pr. uke (historikk som ellers er tapt)
     dash_members       innmeldingsdato + kategori

   Merk skillet: check-ins finnes for hele historikken (blandet grunnlag),
   mens ØKTER og GRUPPE bare finnes for Sheets-æraen. Et snitt pr. økt måtte
   derfor regnes med teller og nevner fra samme kilde — ellers deler man
   Spond-historikk på Sheets-økter og får tull.

   Bruker globale fra daylight-app.jsx (Tile, KPI, ukeEtikett, …) og
   dashboard-shared.jsx (Spark, DASH_GRUPPER, memberTrendRows, …). */
const { useMemo: useTrMemo } = React;

// Semester: vår = 1. jan–30. jun, høst = 1. aug–31. des. Juli er ferie og
// hører ikke til noe semester — en uke i juli faller utenfor begge, og det
// er med vilje: den skal ikke dra ned et semestersnitt.
const SEM_VAR = { fra: '01-01', til: '06-30', navn: 'vår' };
const SEM_HOST = { fra: '08-01', til: '12-31', navn: 'høst' };

const PERIODER = [
  { id: '4u', navn: '4 uker' },
  { id: 'semester', navn: 'Semester' },
  { id: '12m', navn: '12 mnd' },
  { id: 'alt', navn: 'Alt' },
];
const SAMMENLIGN = [
  { id: 'forrige', navn: 'Forrige periode' },
  { id: 'ifjor', navn: 'Samme periode i fjor' },
  { id: 'ingen', navn: 'Ingen' },
];

// ── Dato-hjelpere (lokal tid — toISOString() er UTC og bommer på «i dag») ──
function trIso(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function trDato(iso) { return new Date(iso + 'T00:00:00'); }
function trPlussDager(iso, n) { const d = trDato(iso); d.setDate(d.getDate() + n); return trIso(d); }
function trPlussAar(iso, n) { const d = trDato(iso); d.setFullYear(d.getFullYear() + n); return trIso(d); }
function trDagerMellom(fra, til) {
  return Math.round((trDato(til) - trDato(fra)) / 86400000);
}

// Semesteret en dato hører til, eller null (juli).
function semesterFor(iso) {
  const md = iso.slice(5);
  const aar = iso.slice(0, 4);
  if (md >= SEM_VAR.fra && md <= SEM_VAR.til) return { key: aar + 'V', aar, sem: SEM_VAR };
  if (md >= SEM_HOST.fra && md <= SEM_HOST.til) return { key: aar + 'H', aar, sem: SEM_HOST };
  return null;
}
function semesterNavn(key) {
  return (key.slice(4) === 'V' ? 'Vår ' : 'Høst ') + key.slice(0, 4);
}

// Perioden som {fra, til} (begge inklusive). 'alt' har tom fra = alt vi har.
function periodeRange(p, naa) {
  const d = naa || new Date();
  const idag = trIso(d);
  if (p === '4u') return { fra: trPlussDager(idag, -27), til: idag, navn: 'siste 4 uker' };
  if (p === '12m') return { fra: trPlussDager(trPlussAar(idag, -1), 1), til: idag, navn: 'siste 12 måneder' };
  if (p === 'semester') {
    const s = semesterFor(idag);
    // I juli finnes ikke noe pågående semester — da viser vi vårsemesteret
    // som nettopp ble avsluttet, ikke et tomt diagram.
    const bruk = s || { aar: idag.slice(0, 4), sem: SEM_VAR, key: idag.slice(0, 4) + 'V' };
    return {
      fra: bruk.aar + '-' + bruk.sem.fra,
      til: bruk.aar + '-' + bruk.sem.til,
      navn: semesterNavn(bruk.key).toLowerCase(),
      semKey: bruk.key,
    };
  }
  return { fra: '', til: idag, navn: 'hele grunnlaget' };
}

// Sammenligningsperioden. Returnerer null når den ikke gir mening — «Alt» har
// ingen forrige periode, og da skal kortene vise «—», ikke 0.
function sammenlignRange(p, c, r) {
  if (c === 'ingen' || !r.fra) return null;
  if (c === 'ifjor') {
    return { fra: trPlussAar(r.fra, -1), til: trPlussAar(r.til, -1), navn: 'samme periode i fjor' };
  }
  const dager = trDagerMellom(r.fra, r.til);
  const til = trPlussDager(r.fra, -1);
  return { fra: trPlussDager(til, -dager), til: til, navn: 'forrige periode' };
}

const iRange = (dato, r) => !!dato && (!r.fra || dato >= r.fra) && dato <= r.til;

// ── Serier for en periode ──────────────────────────────────────────────
// Check-ins pr. uke. «Alle grupper» bruker det blandede grunnlaget (Spond-
// historikk + Sheets). En enkelt gruppe finnes bare i Sheets-æraen, fordi
// Spond-eksporten er gruppert på klassenavn, ikke gruppe.
function ukeserie(kpis, live, r, gruppe) {
  if (gruppe && gruppe !== 'alle') {
    const gw = (live && live.gruppeWeekly && live.gruppeWeekly[gruppe]) || {};
    return Object.keys(gw).filter(wk => iRange(wk, r)).sort()
      .map(wk => [wk, gw[wk].oppmote]);
  }
  return blendedWeeklyEntries(kpis, live).filter(e => iRange(e[0], r));
}
// Økter og oppmøte fra SAMME kilde, så snittet blir sant. Begge finnes bare
// for økter som ligger i Sheets (logget i appen eller importert).
function oktSerie(live, r, gruppe) {
  const ut = {};
  const gw = (live && live.gruppeWeekly) || {};
  Object.keys(gw).forEach(g => {
    if (gruppe && gruppe !== 'alle' && g !== gruppe) return;
    Object.keys(gw[g]).forEach(wk => {
      if (!iRange(wk, r)) return;
      const c = ut[wk] || (ut[wk] = { okter: 0, oppmote: 0 });
      c.okter += gw[g][wk].okter; c.oppmote += gw[g][wk].oppmote;
    });
  });
  return Object.keys(ut).sort().map(wk => [wk, ut[wk]]);
}
const sumSerie = (serie) => serie.reduce((s, e) => s + e[1], 0);

// Nye medlemskap i perioden, pr. måned. Registeret har bare NÅVÆRENDE
// medlemmer, så tall bakover i tid er et gulv: de som meldte seg inn og
// sluttet igjen er borte. Det står i tooltipen på kortet.
function nyeSerie(members, r) {
  const per = {};
  (members || []).forEach(m => {
    const d = m.innmeldingsdato;
    if (!iRange(d, r)) return;
    const k = String(d).slice(0, 7);
    per[k] = (per[k] || 0) + 1;
  });
  return Object.keys(per).sort().map(k => [k, per[k]]);
}

// Aktive medlemmer på et tidspunkt — fra dash_snapshots. Finner siste
// snapshot til og med datoen. Mangler det, returneres null (kortet viser
// «—»), aldri 0: null betyr «vet ikke», 0 betyr «ingen medlemmer».
function aktiveVed(snapshots, iso) {
  if (!snapshots || !snapshots.length || !iso) return null;
  const maal = isoUkeNokkel(iso);
  let treff = null;
  snapshots.forEach(s => { if (s.uke <= maal && (!treff || s.uke > treff.uke)) treff = s; });
  return treff ? treff.aktive : null;
}
// 'YYYY-Www' for en dato — samme nøkkel som dashIsoWeek_() i Code.gs.
function isoUkeNokkel(iso) {
  const d = trDato(iso);
  if (isNaN(d.getTime())) return '';
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  t.setUTCDate(t.getUTCDate() + 4 - (t.getUTCDay() || 7));
  const aar = t.getUTCFullYear();
  const nyttaar = new Date(Date.UTC(aar, 0, 1));
  return aar + '-W' + String(Math.ceil(((t - nyttaar) / 86400000 + 1) / 7)).padStart(2, '0');
}

/* ---------- Kontrollstripe ---------- */
function Kontrollstripe({ q, onEndre }) {
  const smal = useSmal();
  const grupper = [{ id: 'alle', navn: 'Alle grupper' }]
    .concat(DASH_GRUPPER.map(g => ({ id: g, navn: DASH_GRUPPE_LABEL[g] || g })));
  const felt = [
    { key: 'p', label: 'Periode', valg: PERIODER },
    { key: 'c', label: 'Sammenlign med', valg: SAMMENLIGN },
    { key: 'g', label: 'Gruppe', valg: grupper },
  ];
  return (
    <div className="kstripe">
      {felt.map(f => (
        <div className="kstripe-felt" key={f.key}>
          <span className="kstripe-lbl">{f.label}</span>
          {smal ? (
            <select value={q[f.key]} onChange={e => onEndre(f.key, e.target.value)}>
              {f.valg.map(v => <option key={v.id} value={v.id}>{v.navn}</option>)}
            </select>
          ) : (
            <span className="chips">
              {f.valg.map(v => (
                <button key={v.id} className={'chip' + (q[f.key] === v.id ? ' active' : '')}
                  onClick={() => onEndre(f.key, v.id)}>{v.navn}</button>
              ))}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

/* ---------- KPI-kort med sammenligning ---------- */
// verdi/for: null betyr «vet ikke» og vises som «—». 0 er et ekte nulltall.
function TrendKort({ label, verdi, forrige, format, enhet, serie, farge, hint, onKlikk }) {
  const vis = verdi == null ? '—' : (format ? format(verdi) : fmtN(verdi));
  const harDelta = verdi != null && forrige != null && forrige !== 0;
  const d = harDelta ? verdi - forrige : null;
  const pst = harDelta ? (d / Math.abs(forrige)) * 100 : null;
  const opp = d > 0, ned = d < 0;
  return (
    <div className={'kpi-tile ' + (farge || 'amber') + (onKlikk ? ' klikkbar' : '')}
      onClick={onKlikk} title={hint || ''} role={onKlikk ? 'button' : undefined}>
      <div className="label">{label}</div>
      <div className="value">{vis}{enhet && verdi != null && <span className="unit">{enhet}</span>}</div>
      <div className="delta" style={{ color: opp ? 'var(--green)' : ned ? 'var(--coral)' : 'var(--muted)' }}>
        {harDelta
          ? `${opp ? '▲ +' : ned ? '▼ ' : '— '}${format ? format(d) : fmtN(d)}${pst != null && isFinite(pst) ? ` (${pst > 0 ? '+' : ''}${pst.toFixed(0)} %)` : ''}`
          : <span className="dim">ingen sammenligning</span>}
      </div>
      {serie && serie.length > 1 && (
        <div style={{ marginTop: 8, opacity: .9 }}>
          <Spark data={serie} accessor={d2 => d2[1]} height={28}
            color={`var(--${farge || 'amber'})`} labelAccessor={d2 => ukeEtikett(d2[0])} />
        </div>
      )}
    </div>
  );
}

/* ---------- Semester-overlay ---------- */
// Én linje pr. semester, x = uke nummer N i semesteret. Gjør det mulig å se
// om høsten i år ligger over eller under høsten i fjor på samme tidspunkt —
// noe en vanlig tidsakse skjuler, fordi semestrene ligger etter hverandre.
function SemesterOverlay({ entries, naaKey }) {
  const sem = {};
  entries.forEach(([wk, v]) => {
    const s = semesterFor(wk);
    if (!s) return;                       // juli hører ikke til noe semester
    (sem[s.key] || (sem[s.key] = [])).push([wk, v]);
  });
  const keys = Object.keys(sem).sort();
  if (keys.length < 2) {
    return (
      <div className="dim" style={{ fontSize: 12 }}>
        Trenger minst to semestre med oppmøte for å legge dem oppå hverandre.
        {keys.length === 1 && ` Har foreløpig bare ${semesterNavn(keys[0]).toLowerCase()}.`}
      </div>
    );
  }
  const serier = keys.map(k => ({ key: k, verdier: sem[k].sort((a, b) => a[0].localeCompare(b[0])).map(e => e[1]) }));
  const maxN = Math.max(...serier.map(s => s.verdier.length));
  const maxV = Math.max(1, ...serier.map(s => Math.max(...s.verdier)));
  const w = 100, h = 42;                  // viewBox-enheter, skaleres av CSS
  const punkt = (v, i) => [
    maxN > 1 ? (i / (maxN - 1)) * w : 0,
    h - (v / maxV) * h,
  ];
  // Eldre semestre tones ned; det inneværende skal være det man ser først.
  const farger = ['#C0BED2', '#A6A3BD', '#8A86A0', '#4F9BEA', '#34B98C'];
  return (
    <>
      <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none"
        style={{ display: 'block', width: '100%', height: 170 }}>
        {serier.map((s, i) => {
          const naa = s.key === naaKey;
          const d = s.verdier.map((v, k) => (k === 0 ? 'M' : 'L') + punkt(v, k).map(n => n.toFixed(2)).join(' ')).join(' ');
          return <path key={s.key} d={d} fill="none" vectorEffect="non-scaling-stroke"
            stroke={naa ? 'var(--accent)' : farger[i % farger.length]}
            strokeWidth={naa ? 2.2 : 1} opacity={naa ? 1 : .55} />;
        })}
      </svg>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--muted)', marginTop: 4 }}>
        <span>uke 1</span><span>uke {maxN}</span>
      </div>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 10, fontSize: 11 }}>
        {serier.map((s, i) => (
          <span key={s.key} style={{ color: s.key === naaKey ? 'var(--ink)' : 'var(--muted)', fontWeight: s.key === naaKey ? 700 : 500 }}>
            <span style={{ display: 'inline-block', width: 10, height: 2, marginRight: 5, verticalAlign: 'middle',
              background: s.key === naaKey ? 'var(--accent)' : farger[i % farger.length] }} />
            {semesterNavn(s.key)} <span className="dim">· {fmtN(s.verdier.reduce((a, b) => a + b, 0))}</span>
          </span>
        ))}
      </div>
    </>
  );
}

/* ---------- Fanen ---------- */
function Trender({ kpis, charts, live, members, events, snapshots, isStyre, departed, onGotoReconcile, q, onEndreQ }) {
  const gruppe = q.g || 'alle';
  const r = useTrMemo(() => periodeRange(q.p || '4u'), [q.p]);
  const rc = useTrMemo(() => sammenlignRange(q.p || '4u', q.c || 'forrige', r), [q.p, q.c, r]);

  const serie = useTrMemo(() => ukeserie(kpis, live, r, gruppe), [kpis, live, r, gruppe]);
  const serieC = useTrMemo(() => (rc ? ukeserie(kpis, live, rc, gruppe) : null), [kpis, live, rc, gruppe]);
  const okt = useTrMemo(() => oktSerie(live, r, gruppe), [live, r, gruppe]);
  const oktC = useTrMemo(() => (rc ? oktSerie(live, rc, gruppe) : null), [live, rc, gruppe]);
  const nye = useTrMemo(() => nyeSerie(members, r), [members, r]);
  const nyeC = useTrMemo(() => (rc ? nyeSerie(members, rc) : null), [members, rc]);

  const sumOkt = s => s.reduce((a, e) => a + e[1].okter, 0);
  const sumOpp = s => s.reduce((a, e) => a + e[1].oppmote, 0);
  const snitt = s => (sumOkt(s) ? sumOpp(s) / sumOkt(s) : null);

  // Aktive medlemmer: fra snapshots, aldri gjettet.
  const forsteSnap = snapshots && snapshots.length ? snapshots[0] : null;
  const aktiveNa = aktiveVed(snapshots, r.til);
  const aktiveFor = rc ? aktiveVed(snapshots, rc.til) : null;
  const snapHint = forsteSnap
    ? `Fra ukentlige snapshots. Historikken starter ${semesterNavnFraUke(forsteSnap.uke)}.`
    : 'Ingen snapshots ennå — kjør «Ta snapshot nå» under Data.';

  // Intro → fast: av dem som meldte seg inn i perioden, hvor mange står med
  // fast (ikke-intro) medlemskap i dag. Spond oppretter nytt medlemskap når
  // en introdeltaker fortsetter, så dette er et gulv — ikke en fasit.
  const introAndel = (rr) => {
    if (!rr) return null;
    const inn = (members || []).filter(m => iRange(m.innmeldingsdato, rr));
    if (!inn.length) return null;
    return inn.filter(m => m.kategori !== 'Introkurs').length / inn.length;
  };

  const til = (id) => () => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const gruppeNavn = gruppe === 'alle' ? 'alle grupper' : (DASH_GRUPPE_LABEL[gruppe] || gruppe);
  const kunSheets = gruppe !== 'alle';

  return (
    <div>
      <Kontrollstripe q={{ p: q.p || '4u', c: q.c || 'forrige', g: gruppe }} onEndre={onEndreQ} />

      <div className="dim" style={{ fontSize: 11.5, margin: '2px 2px 14px', lineHeight: 1.6 }}>
        Viser <strong>{r.navn}</strong>{r.fra ? ` (${r.fra} → ${r.til})` : ''} for {gruppeNavn}
        {rc ? <> — sammenlignet med <strong>{rc.navn}</strong> ({rc.fra} → {rc.til}).</> : ' — uten sammenligning.'}
        {kunSheets && ' Gruppefiltrering finnes bare for økter som ligger i Sheets (logget i appen eller importert) — Spond-historikken er gruppert på klassenavn, ikke gruppe.'}
      </div>

      <div className="grid-5">
        <TrendKort label="Aktive medlemmer" verdi={aktiveNa} forrige={aktiveFor} farge="amber"
          hint={snapHint} onKlikk={til('tr-kohort')}
          serie={snapshots && snapshots.length > 1
            ? snapshots.filter(s => !r.fra || s.uke >= isoUkeNokkel(r.fra)).map(s => [s.uke, s.aktive]) : null} />
        <TrendKort label="Snitt pr. økt" verdi={snitt(okt)} forrige={oktC ? snitt(oktC) : null} farge="blue"
          format={v => (Math.round(v * 10) / 10).toString().replace('.', ',')} enhet=" stk"
          hint="Deltagere pr. økt. Teller og nevner fra samme kilde (økter i Sheets), så snittet ikke blander Spond-historikk med loggede økter."
          onKlikk={til('tr-puls')}
          serie={okt.map(e => [e[0], e[1].okter ? Math.round((e[1].oppmote / e[1].okter) * 10) / 10 : 0])} />
        <TrendKort label="Økter holdt" verdi={okt.length ? sumOkt(okt) : null} forrige={oktC && oktC.length ? sumOkt(oktC) : null}
          farge="green" hint="Økter logget i trener-appen eller importert fra Spond-oppmøte. Finnes bare for Sheets-æraen."
          onKlikk={til('tr-gruppe')} serie={okt.map(e => [e[0], e[1].okter])} />
        <TrendKort label="Nye medlemskap" verdi={nye.length ? sumSerie(nye) : (r.fra ? 0 : null)}
          forrige={nyeC ? sumSerie(nyeC) : null} farge="coral"
          hint="Innmeldingsdato i registeret. Registeret har bare nåværende medlemmer, så tall bakover i tid er et gulv — de som meldte seg inn og sluttet igjen er ikke med."
          onKlikk={til('tr-kohort')} serie={nye} />
        <TrendKort label="Intro → fast" verdi={introAndel(r)} forrige={introAndel(rc)} farge="green"
          format={v => Math.round(v * 100) + ' %'}
          hint="Av dem som meldte seg inn i perioden, andelen som i dag står med fast medlemskap. Spond oppretter nytt medlemskap når en introdeltaker fortsetter, så dette er et gulv — ikke en ekte konverteringsrate."
          onKlikk={til('tr-funnel')} />
      </div>

      <div className="section-h" id="tr-puls" style={{ scrollMarginTop: 80 }}>Klubbens puls
        <span className="meta">oppmøte pr. uke · {gruppeNavn}</span></div>
      <Tile title="oppmøte pr. uke" corner={r.navn}>
        {serie.length ? (
          <>
            <Spark data={serie} accessor={d => d[1]} height={150} showAxis
              labelAccessor={d => ukeEtikett(d[0])} markers={events} dateAccessor={d => d[0]}
              color="var(--accent)" fill="var(--accent-soft)" />
            <HendelseTegnforklaring events={events} />
            <div className="dim" style={{ fontSize: 11.5, marginTop: 10, lineHeight: 1.6 }}>
              {fmtN(sumSerie(serie))} check-ins i perioden
              {serieC && (serieC.length
                ? <> · {fmtN(sumSerie(serieC))} i {rc.navn}</>
                : <> · ingen tall for {rc.navn}</>)}
            </div>
          </>
        ) : <div className="dim" style={{ fontSize: 12 }}>Ingen oppmøte registrert i perioden for {gruppeNavn}.</div>}
      </Tile>

      <div className="section-h">Semester mot semester<span className="meta">oppmøte pr. semesteruke · hele grunnlaget</span></div>
      <Tile title="semester-overlay" corner="uke 1 → N">
        <SemesterOverlay entries={ukeserie(kpis, live, { fra: '', til: trIso(new Date()) }, gruppe)}
          naaKey={periodeRange('semester').semKey} />
      </Tile>

      <div className="section-h" id="tr-gruppe" style={{ scrollMarginTop: 80 }}>Grupper
        <span className="meta">snitt deltagere pr. økt · {r.navn}</span></div>
      <Tile title="snitt pr. økt" corner="grupper">
        {(() => {
          const rader = DASH_GRUPPER.concat(['ukjent']).map(g => {
            const s = oktSerie(live, r, g);
            return { navn: DASH_GRUPPE_LABEL[g] || g, okter: sumOkt(s), snitt: sumOkt(s) ? sumOpp(s) / sumOkt(s) : 0 };
          }).filter(g => g.okter > 0).sort((a, b) => b.snitt - a.snitt);
          if (!rader.length) return <div className="dim" style={{ fontSize: 12 }}>Ingen økter i perioden.</div>;
          return <HBar data={rader.map(g => ({ label: `${g.navn} (${g.okter} økter)`, value: Math.round(g.snitt * 10) / 10 }))}
            color="var(--green)" height={20} />;
        })()}
      </Tile>

      <div className="section-h">Trend per medlemskategori<span className="meta">live · siste 26 uker · uavhengig av periodevalget</span></div>
      <TrendPerGruppe live={live} />

      <div className="section-h" id="tr-topp" style={{ scrollMarginTop: 80 }}>Mest dedikerte
        <span className="meta">nåværende medlemmer · hele oppmøtehistorikken</span></div>
      <Tile title="toppliste" corner="topp 10">
        <LeaderboardTable live={live} limit={10} medals
          emptyHint="last opp ukesoppmøte under Data."
          unmatchedHint="Koble dem i avstemmingen under Data." />
      </Tile>

      <div className="section-h">Trend per medlem<span className="meta">live · siste 26 uker · 4-ukers endring</span></div>
      <TrendPerMedlem live={live} members={members} />

      <div className="section-h" id="tr-kohort" style={{ scrollMarginTop: 80 }}>Kohort-retention
        <span className="meta">hvor mange fra hvert år trener fortsatt?</span></div>
      <KohortSeksjon kpis={kpis} charts={charts} departed={departed} />

      <div className="section-h" id="tr-funnel" style={{ scrollMarginTop: 80 }}>Konverteringsfunnel
        <span className="meta">intro-kurs → fast medlemskap</span></div>
      <Funnel kpis={kpis} live={live} isStyre={isStyre} onGotoReconcile={onGotoReconcile} />
    </div>
  );
}

// «2026-W12» → «uke 12 2026», for tooltipen på aktive-kortet.
function semesterNavnFraUke(uke) {
  const m = String(uke || '').match(/^(\d{4})-W(\d{1,2})$/);
  return m ? `uke ${Number(m[2])} ${m[1]}` : String(uke || '');
}

window.Trender = Trender;
window.periodeRange = periodeRange;
window.sammenlignRange = sammenlignRange;
window.semesterFor = semesterFor;
window.aktiveVed = aktiveVed;
window.isoUkeNokkel = isoUkeNokkel;
window.ukeserie = ukeserie;
window.oktSerie = oktSerie;
window.nyeSerie = nyeSerie;
window.SemesterOverlay = SemesterOverlay;
window.Kontrollstripe = Kontrollstripe;
window.TrendKort = TrendKort;
