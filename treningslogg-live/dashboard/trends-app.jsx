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

// Nye medlemmer i perioden, pr. måned — én pr. person, datert med FØRSTE
// innmelding (innmeldinger()). Gjeninnmeldte telles ikke på nytt.
function nyeSerie(members, r, departed) {
  const per = {};
  innmeldinger(members, departed).forEach(m => {
    const d = m.innmeldingsdato;
    if (!iRange(d, r)) return;
    const k = String(d).slice(0, 7);
    per[k] = (per[k] || 0) + 1;
  });
  return Object.keys(per).sort().map(k => [k, per[k]]);
}

// Sjekker at snapshots faktisk kan brukes til sammenligning, og sier fra i
// konsollen hvis ikke. Uke-nøkkelen skrives av dashIsoWeek_() i Code.gs og
// leses av isoUkeNokkel() her — matcher de ikke, finner aktiveVed() aldri en
// rad, og kortet ville stille vist «—» uten at noen skjønte hvorfor.
function sjekkSnapshots(snapshots) {
  if (!snapshots) return;                       // ikke lastet ennå
  if (!snapshots.length) {
    console.warn('[dashboard] dashSnapshotsList ga 0 rader — kjør «Ta snapshot nå» under Data, '
      + 'eller _setupSnapshotTrigger i Apps Script.');
    return;
  }
  const ugyldige = snapshots.filter(s => !/^\d{4}-W\d{2}$/.test(String(s.uke || '')));
  if (ugyldige.length) {
    console.warn('[dashboard] snapshots med uke-nøkkel som ikke matcher isoUkeNokkel():',
      ugyldige.map(s => s.uke));
  }
  const naa = isoUkeNokkel(trIso(new Date()));
  const bak = snapshots.filter(s => s.uke <= naa);
  if (!bak.length) {
    console.warn('[dashboard] ingen snapshots til og med denne uka (' + naa + '). Nyeste rad:',
      snapshots[snapshots.length - 1] && snapshots[snapshots.length - 1].uke);
  }
}

// Aktive medlemmer på et tidspunkt — fra dash_snapshots. Finner siste
// snapshot til og med datoen. Mangler det, returneres null (kortet viser
// «—»), aldri 0: null betyr «vet ikke», 0 betyr «ingen medlemmer».
// Brukes KUN til sammenligningsperioden: nå-verdien tas fra registeret, så
// kortet alltid viser samme tall som sidefeltet.
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
  // «Alt» har ingen forrige periode — da er sammenligningen av. Valget
  // huskes (vises ikke som aktivt), så det gjelder igjen ved neste periode.
  const utenSammenligning = q.p === 'alt';
  return (
    <div className="kstripe">
      {felt.map(f => {
        const av = f.key === 'c' && utenSammenligning;
        return (
          <div className="kstripe-felt" key={f.key} style={av ? { opacity: 0.45 } : undefined}
            title={av ? 'Velg 4 uker, semester eller 12 mnd for å sammenligne' : undefined}>
            <span className="kstripe-lbl">{f.label}{av && ' — ikke for «Alt»'}</span>
            {smal ? (
              <select value={q[f.key]} disabled={av} onChange={e => onEndre(f.key, e.target.value)}>
                {f.valg.map(v => <option key={v.id} value={v.id}>{v.navn}</option>)}
              </select>
            ) : (
              <span className="chips">
                {f.valg.map(v => (
                  <button key={v.id} className={'chip' + (!av && q[f.key] === v.id ? ' active' : '')}
                    disabled={av} onClick={() => onEndre(f.key, v.id)}>{v.navn}</button>
                ))}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ---------- KPI-kort med sammenligning ---------- */
// verdi/for: null betyr «vet ikke» og vises som «—». 0 er et ekte nulltall.
function TrendKort({ label, verdi, forrige, format, enhet, serie, farge, hint, onKlikk, under }) {
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
      {under && <div className="dim" style={{ fontSize: 10.5, marginTop: 2 }}>{under}</div>}
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
    const s2 = semesterFor(wk);
    if (!s2) return;                       // juli hører ikke til noe semester
    (sem[s2.key] || (sem[s2.key] = [])).push([wk, v]);
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
  const serieAv = k => sem[k].sort((a, b) => a[0].localeCompare(b[0])).map(e => e[1]);
  // Fem-seks like linjer blir garn. To linjer bærer sammenligningen —
  // inneværende semester og samme semester i fjor — og alt eldre legges som
  // et grått min–maks-bånd, som er det historikken faktisk sier: her lå vi før.
  const naa = keys.indexOf(naaKey) >= 0 ? naaKey : keys[keys.length - 1];
  const ifjorKey = (Number(naa.slice(0, 4)) - 1) + naa.slice(4);
  const ifjor = keys.indexOf(ifjorKey) >= 0 ? ifjorKey : null;
  const eldre = keys.filter(k => k !== naa && k !== ifjor);

  const naaS = serieAv(naa);
  const ifjorS = ifjor ? serieAv(ifjor) : null;
  const eldreS = eldre.map(serieAv);
  const maxN = Math.max(naaS.length, ifjorS ? ifjorS.length : 0, ...eldreS.map(a => a.length), 1);
  const maxV = Math.max(1, ...naaS, ...(ifjorS || []), ...eldreS.map(a => Math.max(...a, 0)));
  const w = 100, h = 42;
  const px = i => (maxN > 1 ? (i / (maxN - 1)) * w : 0);
  const py = v => h - (v / maxV) * h;
  const dAv = (arr) => arr.map((v, i) => (i === 0 ? 'M' : 'L') + px(i).toFixed(2) + ' ' + py(v).toFixed(2)).join(' ');

  // Bånd: min og maks pr. semesteruke blant de eldre semestrene.
  let band = '';
  if (eldreS.length) {
    const topp = [], bunn = [];
    for (let i = 0; i < maxN; i++) {
      const verdier = eldreS.map(a => a[i]).filter(v => v != null);
      if (!verdier.length) continue;
      topp.push([i, Math.max(...verdier)]);
      bunn.push([i, Math.min(...verdier)]);
    }
    if (topp.length) {
      band = topp.map((p, i) => (i === 0 ? 'M' : 'L') + px(p[0]).toFixed(2) + ' ' + py(p[1]).toFixed(2)).join(' ')
        + ' ' + bunn.reverse().map(p => 'L' + px(p[0]).toFixed(2) + ' ' + py(p[1]).toFixed(2)).join(' ') + ' Z';
    }
  }
  // Uketall på x-aksen — 1, midt på og siste.
  const akse = maxN > 2 ? [1, Math.round(maxN / 2), maxN] : [1, maxN];

  return (
    <>
      <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none"
        style={{ display: 'block', width: '100%', height: 170 }}>
        {band && <path d={band} fill="var(--line-strong)" opacity={.4} />}
        {ifjorS && <path d={dAv(ifjorS)} fill="none" stroke="var(--muted)" strokeWidth={1.4}
          vectorEffect="non-scaling-stroke" />}
        <path d={dAv(naaS)} fill="none" stroke="var(--accent)" strokeWidth={2.4}
          vectorEffect="non-scaling-stroke" />
      </svg>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--muted)', marginTop: 4 }}>
        {akse.map(u => <span key={u}>uke {u}</span>)}
      </div>
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginTop: 10, fontSize: 11 }}>
        <span style={{ fontWeight: 700 }}>
          <span style={{ display: 'inline-block', width: 14, height: 3, marginRight: 6, verticalAlign: 'middle', background: 'var(--accent)' }} />
          {semesterNavn(naa)} <span className="dim">· {fmtN(naaS.reduce((a, b) => a + b, 0))}</span>
        </span>
        {ifjorS && (
          <span style={{ color: 'var(--muted)' }}>
            <span style={{ display: 'inline-block', width: 14, height: 2, marginRight: 6, verticalAlign: 'middle', background: 'var(--muted)' }} />
            {semesterNavn(ifjor)} <span className="dim">· {fmtN(ifjorS.reduce((a, b) => a + b, 0))}</span>
          </span>
        )}
        {eldreS.length > 0 && (
          <span style={{ color: 'var(--muted)' }}>
            <span style={{ display: 'inline-block', width: 14, height: 8, marginRight: 6, verticalAlign: 'middle',
              background: 'var(--line-strong)', opacity: .6 }} />
            min–maks for {eldre.length} eldre {eldre.length === 1 ? 'semester' : 'semestre'}
          </span>
        )}
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
  const nye = useTrMemo(() => nyeSerie(members, r, departed), [members, r, departed]);
  const nyeC = useTrMemo(() => (rc ? nyeSerie(members, rc, departed) : null), [members, rc, departed]);
  // Hva de nye består av: er de fortsatt på introkurs, eller allerede borte?
  // Uten dette ser tallet høyt ut i introkurs-måneder.
  const nyeSammensetning = useTrMemo(() => {
    const iReg = {}; (members || []).forEach(m => { iReg[m.id] = m; });
    let intro = 0, borte = 0;
    innmeldinger(members, departed).filter(p => iRange(p.innmeldingsdato, r)).forEach(p => {
      const m = iReg[p.id];
      if (!m) borte++;
      else if (m.kategori === 'Introkurs') intro++;
    });
    return { intro, borte };
  }, [members, departed, r]);

  const sumOkt = s => s.reduce((a, e) => a + e[1].okter, 0);
  const sumOpp = s => s.reduce((a, e) => a + e[1].oppmote, 0);
  const snitt = s => (sumOkt(s) ? sumOpp(s) / sumOkt(s) : null);

  // Aktive medlemmer NÅ regnes fra registeret — samme definisjon og samme
  // tall som sidefeltet (mergeLiveKpis filtrerer bort parkerte medlemskap).
  // Snapshots brukes bare bakover i tid, der registeret ikke kan svare.
  React.useEffect(() => { sjekkSnapshots(snapshots); }, [snapshots]);
  const forsteSnap = snapshots && snapshots.length ? snapshots[0] : null;
  const aktiveNa = kpis.totals.activeMembers;
  const aktiveFor = rc ? aktiveVed(snapshots, rc.til) : null;
  const snapHint = 'Aktive medlemmer i dag, regnet fra registeret — samme tall som i sidefeltet. '
    + (rc
      ? (aktiveFor == null
        ? (forsteSnap
          ? `Ingen snapshot for ${rc.til}; historikken starter ${semesterNavnFraUke(forsteSnap.uke)}.`
          : 'Ingen snapshots ennå — kjør «Ta snapshot nå» under Data.')
        : `Sammenligningen er snapshotet for ${rc.til}.`)
      : '');

  // Intro → fast: av dem som meldte seg inn i perioden, hvor mange står med
  // fast (ikke-intro) medlemskap i dag. Spond oppretter nytt medlemskap når
  // en introdeltaker fortsetter, så dette er et gulv — ikke en fasit.
  // Under fem innmeldinger sier en prosent mer enn den vet: 1 av 2 blir
  // «50 %», og det leses som en trend. Da viser vi bare «a av b».
  const INTRO_MIN_FOR_PROSENT = 5;
  const introTall = (rr) => {
    if (!rr) return null;
    // Med dem som har sluttet: en introdeltaker som aldri fortsatte står
    // ikke i registeret lenger, men skal telle i «av».
    const inn = innmeldinger(members, departed).filter(m => iRange(m.innmeldingsdato, rr));
    if (!inn.length) return null;
    return { fast: inn.filter(m => m.kategori !== 'Introkurs').length, av: inn.length };
  };
  const introNa = introTall(r), introFor = introTall(rc);
  const introAndel = (t) => (t && t.av >= INTRO_MIN_FOR_PROSENT ? t.fast / t.av : null);

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
        {rc ? <> — sammenlignet med <strong>{rc.navn}</strong> ({rc.fra} → {rc.til}).</>
          : (q.p || '4u') === 'alt' ? ' — uten sammenligning (velg en kortere periode for å sammenligne).' : ' — uten sammenligning.'}
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
        <TrendKort label="Nye medlemmer" verdi={nye.length ? sumSerie(nye) : (r.fra ? 0 : null)}
          forrige={nyeC ? sumSerie(nyeC) : null} farge="coral"
          hint={'Personer som meldte seg inn for første gang i perioden — én gang pr. person, også om Spond har gitt dem nye medlemskap senere. '
            + (departed && departed.spond ? 'Tar med dem som har sluttet igjen (fra importen av tidligere medlemmer).'
              : 'Uten importerte tidligere medlemmer mangler de som meldte seg inn og sluttet før sporingen startet.')}
          under={(nyeSammensetning.intro || nyeSammensetning.borte)
            ? `${nyeSammensetning.intro} på introkurs nå · ${nyeSammensetning.borte} sluttet igjen` : null}
          onKlikk={til('tr-kohort')} serie={nye} />
        <TrendKort label="Intro → fast"
          verdi={introNa ? introNa.fast : null} forrige={introFor ? introFor.fast : null}
          farge="green" format={v => fmtN(v)}
          enhet={introNa ? ` av ${introNa.av}` : ''}
          under={introNa && introAndel(introNa) != null
            ? `${Math.round(introAndel(introNa) * 100)} % av innmeldingene`
            : introNa ? `for få innmeldinger til å regne prosent (< ${INTRO_MIN_FOR_PROSENT})` : ''}
          hint="Av dem som meldte seg inn i perioden, hvor mange som i dag står med fast medlemskap. Spond oppretter nytt medlemskap når en introdeltaker fortsetter, så dette er et gulv — ikke en ekte konverteringsrate."
          onKlikk={til('tr-funnel')} />
      </div>

      <div className="section-h" id="tr-puls" style={{ scrollMarginTop: 80 }}>Klubbens puls
        <span className="meta">oppmøte pr. uke · {gruppeNavn}</span></div>
      <Tile title="Oppmøte per uke" corner={r.navn}>
        {serie.length ? (
          <>
            <Spark data={serie} accessor={d => d[1]} height={150} showAxis
              labelAccessor={d => ukeEtikett(d[0])} markers={events} dateAccessor={d => d[0]}
              compareData={serieC} color="var(--accent)" fill="var(--accent-soft)" />
            <HendelseTegnforklaring events={events} />
            <div className="dim" style={{ fontSize: 11.5, marginTop: 10, lineHeight: 1.6 }}>
              {fmtN(sumSerie(serie))} check-ins i perioden
              {serieC && (serieC.length
                ? <> · <span style={{color:'var(--muted)'}}>grå skygge: {fmtN(sumSerie(serieC))} i {rc.navn}</span></>
                : <> · ingen tall for {rc.navn}</>)}
            </div>
          </>
        ) : <div className="dim" style={{ fontSize: 12 }}>Ingen oppmøte registrert i perioden for {gruppeNavn}.</div>}
      </Tile>

      <div className="section-h">Semester mot semester<span className="meta">oppmøte pr. semesteruke · hele grunnlaget</span></div>
      <Tile title="Semester mot semester" corner="uke 1 → N">
        <SemesterOverlay entries={ukeserie(kpis, live, { fra: '', til: trIso(new Date()) }, gruppe)}
          naaKey={periodeRange('semester').semKey} />
      </Tile>

      <div className="section-h" id="tr-gruppe" style={{ scrollMarginTop: 80 }}>Grupper
        <span className="meta">snitt deltagere pr. økt · {r.navn}</span></div>
      <Tile title="Snitt per økt" corner="grupper">
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
      <Tile title="Toppliste" corner="topp 10">
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
