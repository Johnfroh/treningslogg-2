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

// Uke-nøklene er mandager, og en uke hører til en periode når mandagen
// ligger i den. Dette er mandagen på eller etter en dato.
function forsteMandag(iso) {
  const m = isoMandag(iso);
  return m < iso ? trPlussDager(m, 7) : m;
}
// Antall uker (mandager) i en periode.
function antallUker(r) {
  if (!r || !r.fra) return 0;
  const f = forsteMandag(r.fra), t = isoMandag(r.til);
  return t < f ? 0 : Math.round(trDagerMellom(f, t) / 7) + 1;
}
function semesterSpenn(key) {
  const aar = key.slice(0, 4), sem = key.slice(4) === 'V' ? SEM_VAR : SEM_HOST;
  return { fra: aar + '-' + sem.fra, til: aar + '-' + sem.til };
}
function forrigeSemester(key) {
  const aar = Number(key.slice(0, 4));
  return key.slice(4) === 'V' ? (aar - 1) + 'H' : aar + 'V';
}

// Perioden som {fra, til} (begge inklusive). 'alt' har tom fra = alt vi har.
//
// Alle perioder består av HELE uker og slutter på søndagen i siste hele uke
// med oppmøtedata (`sisteMandag`, fra sisteHeleUke()). Før sluttet de på
// dagens dato: da ble den påbegynte uka talt som en hel uke, og «siste 4
// uker» var i praksis 3–4 uker målt mot 4 hele — nedgang nesten hver gang.
function periodeRange(p, sisteMandag, naa) {
  const idag = trIso(naa || new Date());
  const sm = sisteMandag || trPlussDager(isoMandag(idag), -7);
  const son = trPlussDager(sm, 6);
  if (p === '4u') return { fra: trPlussDager(sm, -21), til: son, navn: 'siste 4 uker' };
  if (p === '12m') return { fra: trPlussDager(sm, -51 * 7), til: son, navn: 'siste 12 måneder' };
  if (p === 'semester') {
    const s = semesterFor(idag);
    // I juli finnes ikke noe pågående semester — da viser vi vårsemesteret
    // som nettopp ble avsluttet, ikke et tomt diagram.
    const key = s ? s.key : idag.slice(0, 4) + 'V';
    const sp = semesterSpenn(key);
    // Semesteret HITTIL — ikke til semesterslutt. Sammenligningen henter
    // like mange uker fra semesteret det måles mot (sammenlignRange).
    let til = son < sp.til ? son : sp.til;
    // Har ikke semesteret rukket en hel uke ennå, vises det som finnes.
    if (til < sp.fra) til = idag < sp.til ? idag : sp.til;
    return { fra: sp.fra, til, navn: semesterNavn(key).toLowerCase(), semKey: key };
  }
  return { fra: '', til: son, navn: 'hele grunnlaget' };
}

// Sammenligningsperioden. Returnerer null når den ikke gir mening — «Alt» har
// ingen forrige periode, og da skal kortene vise «—», ikke 0.
//
// Alltid like mange uker som perioden selv. Semester måles mot de samme
// semesterukene (uke 1–N) i forrige semester eller samme semester i fjor —
// ikke mot et helt semester, som et påbegynt semester aldri kan slå.
function sammenlignRange(p, c, r) {
  if (c === 'ingen' || !r.fra) return null;
  if (p === 'semester' && r.semKey) {
    const key = c === 'ifjor'
      ? (Number(r.semKey.slice(0, 4)) - 1) + r.semKey.slice(4) : forrigeSemester(r.semKey);
    const sp = semesterSpenn(key);
    const n = antallUker(r);
    let til = n > 0
      ? trPlussDager(forsteMandag(sp.fra), 7 * (n - 1) + 6)
      : trPlussDager(sp.fra, trDagerMellom(r.fra, r.til));
    if (til > sp.til) til = sp.til;
    return { fra: sp.fra, til, navn: semesterNavn(key).toLowerCase() + ', samme uker' };
  }
  // 52 uker tilbake, ikke ett kalenderår: da er det de samme hele ukene.
  if (c === 'ifjor') {
    return { fra: trPlussDager(r.fra, -364), til: trPlussDager(r.til, -364), navn: 'samme uker i fjor' };
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
// Snitt pr. økt = oppmøte / økter MED registrert oppmøte (medTall). En økt
// som er logget uten oppmøte er ikke en økt med null deltakere.
function oktSerie(live, r, gruppe) {
  const ut = {};
  const gw = (live && live.gruppeWeekly) || {};
  Object.keys(gw).forEach(g => {
    if (gruppe && gruppe !== 'alle' && g !== gruppe) return;
    Object.keys(gw[g]).forEach(wk => {
      if (!iRange(wk, r)) return;
      const c = ut[wk] || (ut[wk] = { okter: 0, oppmote: 0, medTall: 0 });
      const celle = gw[g][wk];
      c.okter += celle.okter; c.oppmote += celle.oppmote;
      // medTall = økter der oppmøtet er registrert — nevneren i snittet.
      // Eldre backend sender den ikke; da regnes alle økter med, som før.
      c.medTall += celle.medTall != null ? celle.medTall : celle.okter;
    });
  });
  return Object.keys(ut).sort().map(wk => [wk, ut[wk]]);
}
const sumSerie = (serie) => serie.reduce((s, e) => s + e[1], 0);

// ── Pr. medlem og pr. kategori — følger periode OG gruppe ──────────────
// Sum av { mandag: n } for ukene i perioden. Samme iRange som resten av
// fanen, så topplisten og kortene alltid teller de samme ukene.
function sumIPeriode(obj, r) {
  if (!obj || !r) return 0;
  return Object.keys(obj).reduce((s, wk) => s + (iRange(wk, r) ? obj[wk] : 0), 0);
}
// Sammenhengende liste med mandager i perioden (også uker uten oppmøte, så
// kurvene ikke hopper over hull). «Alt» starter på første uke vi har data for.
function ukerFor(r, kilder) {
  let fra = r.fra ? isoMandag(r.fra) : '';
  if (r.fra && fra < r.fra) fra = trPlussDager(fra, 7);
  if (!fra) {
    (kilder || []).forEach(src => Object.keys(src || {}).forEach(k => {
      Object.keys(src[k] || {}).forEach(wk => { if (/^\d{4}-\d{2}-\d{2}$/.test(wk) && (!fra || wk < fra)) fra = wk; });
    }));
  }
  const til = isoMandag(r.til);
  if (!fra || fra > til) return [til];
  const ut = [];
  for (let w = fra; w <= til; w = trPlussDager(w, 7)) ut.push(w);
  return ut;
}
// { memberId: { mandag: n } } for valgt gruppe. «Alle grupper» tar med
// Spond-historikken (memberHistWeekly), så tallene stemmer med profilen.
// En enkelt gruppe finnes bare for Sheets-æraen. null = backend for gammel.
function medlemsUker(live, gruppe) {
  if (!live) return {};
  if (gruppe && gruppe !== 'alle') {
    const mgw = live.memberGruppeWeekly;
    if (!mgw) return null;
    const ut = {};
    Object.keys(mgw).forEach(id => { if (mgw[id][gruppe]) ut[id] = mgw[id][gruppe]; });
    return ut;
  }
  const ut = {};
  [live.memberWeekly, live.memberHistWeekly].forEach(src => {
    Object.keys(src || {}).forEach(id => {
      const o = ut[id] || (ut[id] = {});
      Object.keys(src[id]).forEach(wk => { o[wk] = (o[wk] || 0) + src[id][wk]; });
    });
  });
  return ut;
}
// { kategori: { mandag: n } } for valgt gruppe (Sheets-æraen).
function kategoriUker(live, gruppe) {
  if (!live) return {};
  if (gruppe && gruppe !== 'alle') {
    const kgw = live.kategoriGruppeWeekly;
    if (!kgw) return null;
    const ut = {};
    Object.keys(kgw).forEach(k => { if (kgw[k][gruppe]) ut[k] = kgw[k][gruppe]; });
    return ut;
  }
  return live.kategoriWeekly || {};
}
// Topplisten for perioden: nåværende medlemmer, sortert på oppmøter.
function topplisteRader(mu, members, live, r, rc) {
  if (!mu) return [];
  const byId = {}; (members || []).forEach(m => { byId[m.id] = m; });
  const sist = {}; ((live && live.leaderboard) || []).forEach(l => { sist[l.id] = l.sist; });
  return Object.keys(mu).filter(id => byId[id]).map(id => ({
    id, navn: byId[id].navn, deltatt: sumIPeriode(mu[id], r),
    forrige: rc ? sumIPeriode(mu[id], rc) : null, sist: sist[id] || '',
  })).filter(x => x.deltatt > 0).sort((a, b) => b.deltatt - a.deltatt || a.navn.localeCompare(b.navn, 'no'));
}

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

// Hva som har skjedd med dem som meldte seg inn i perioden. ÉN kilde for
// kortene «Nye medlemmer» og «Intro → fast» og for funnelen nederst, så de
// tre aldri kan vise ulike tall.
//   fast    = står i registeret i dag med fast (ikke-intro) medlemskap
//   intro   = står fortsatt på introkurs
//   parkert = står i registeret med «Ikke aktiv»
//   borte   = står ikke i registeret lenger
// Før ble alle uten intro-kategori talt som faste — også de som har sluttet.
// Under fem innmeldinger sier en prosent mer enn den vet: 1 av 2 blir
// «50 %», og det leses som en trend. Da vises bare «a av b».
const INTRO_MIN_FOR_PROSENT = 5;
function innmeldtStatus(members, departed, r) {
  if (!r) return null;
  const iReg = {}; (members || []).forEach(m => { iReg[m.id] = m; });
  const ut = { av: 0, fast: 0, intro: 0, parkert: 0, borte: 0 };
  innmeldinger(members, departed).forEach(p => {
    if (!iRange(p.innmeldingsdato, r)) return;
    ut.av++;
    const m = iReg[p.id];
    if (!m) { ut.borte++; return; }
    // Samme kategori- og aktiv-regel som mergeLiveKpis (sidefeltet).
    if (isInactiveTypeImp(m.medlemstype)) { ut.parkert++; return; }
    const kat = m.medlemstype ? deriveKategoriImp(m.medlemstype) : (m.kategori || 'Annet');
    if (kat === 'Introkurs') ut.intro++; else ut.fast++;
  });
  return ut;
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
function Trender({ kpis, charts, live, members, events, snapshots, departed, q, onEndreQ }) {
  const gruppe = q.g || 'alle';
  // Periodene slutter på siste hele uke med oppmøtedata — se periodeRange.
  const sisteUke = useTrMemo(() => sisteHeleUke(live), [live]);
  const r = useTrMemo(() => periodeRange(q.p || '4u', sisteUke), [q.p, sisteUke]);
  const rc = useTrMemo(() => sammenlignRange(q.p || '4u', q.c || 'forrige', r), [q.p, q.c, r]);

  const serie = useTrMemo(() => ukeserie(kpis, live, r, gruppe), [kpis, live, r, gruppe]);
  const serieC = useTrMemo(() => (rc ? ukeserie(kpis, live, rc, gruppe) : null), [kpis, live, rc, gruppe]);
  const okt = useTrMemo(() => oktSerie(live, r, gruppe), [live, r, gruppe]);
  const oktC = useTrMemo(() => (rc ? oktSerie(live, rc, gruppe) : null), [live, rc, gruppe]);
  const nye = useTrMemo(() => nyeSerie(members, r, departed), [members, r, departed]);
  const nyeC = useTrMemo(() => (rc ? nyeSerie(members, rc, departed) : null), [members, rc, departed]);
  // Hva som har skjedd med de nye: fast, fortsatt intro, parkert eller borte.
  const statNa = useTrMemo(() => innmeldtStatus(members, departed, r), [members, departed, r]);
  const statFor = useTrMemo(() => (rc ? innmeldtStatus(members, departed, rc) : null), [members, departed, rc]);

  const mu = useTrMemo(() => medlemsUker(live, gruppe), [live, gruppe]);
  const katU = useTrMemo(() => kategoriUker(live, gruppe), [live, gruppe]);
  const uker = useTrMemo(() => ukerFor(r, [mu, katU]), [r, mu, katU]);
  const topp = useTrMemo(() => topplisteRader(mu, members, live, r, rc), [mu, members, live, r, rc]);

  const sumOkt = s => s.reduce((a, e) => a + e[1].okter, 0);
  const sumOpp = s => s.reduce((a, e) => a + e[1].oppmote, 0);
  const sumTall = s => s.reduce((a, e) => a + e[1].medTall, 0);
  const snitt = s => (sumTall(s) ? sumOpp(s) / sumTall(s) : null);
  const utenTall = sumOkt(okt) - sumTall(okt);
  // «Grupper»-flisa viser alle gruppene uansett gruppevalg.
  const utenTallAlle = useTrMemo(() => {
    const s = oktSerie(live, r, 'alle');
    return s.reduce((a, e) => a + e[1].okter - e[1].medTall, 0);
  }, [live, r]);

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
  const introNa = statNa && statNa.av ? statNa : null;
  const introFor = statFor && statFor.av ? statFor : null;
  const introAndel = (t) => (t && t.av >= INTRO_MIN_FOR_PROSENT ? t.fast / t.av : null);

  // Er oppmøtet eldre enn forrige uke, slutter periodene der dataene slutter.
  const kalenderForrige = isoPluss(isoMandag(isoLokal(new Date())), -7);
  const dataForsinket = sisteUke < kalenderForrige;

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
        {' '}Periodene består av hele uker — inneværende uke kommer med når den er ferdig.
        {dataForsinket && <strong style={{ color: 'var(--coral)' }}>{' '}Oppmøte er bare registrert til og med {fmtDate(oppmoteTil(live))}, så periodene slutter der.</strong>}
        {kunSheets && ' Gruppefiltrering finnes bare for økter som ligger i Sheets (logget i appen eller importert) — Spond-historikken er gruppert på klassenavn, ikke gruppe.'}
      </div>

      <div className="grid-5">
        <TrendKort label="Aktive medlemmer" verdi={aktiveNa} forrige={aktiveFor} farge="amber"
          hint={snapHint} onKlikk={til('tr-kohort')}
          serie={snapshots && snapshots.length > 1
            ? snapshots.filter(s => !r.fra || s.uke >= isoUkeNokkel(r.fra)).map(s => [s.uke, s.aktive]) : null} />
        <TrendKort label="Snitt pr. økt" verdi={snitt(okt)} forrige={oktC ? snitt(oktC) : null} farge="blue"
          format={v => (Math.round(v * 10) / 10).toString().replace('.', ',')} enhet=" stk"
          hint="Deltagere pr. økt med registrert oppmøte. Økter som er logget uten oppmøte holdes utenfor, som i rapporten. Teller og nevner fra samme kilde (økter i Sheets), så snittet ikke blander Spond-historikk med loggede økter."
          onKlikk={til('tr-puls')}
          serie={okt.map(e => [e[0], e[1].medTall ? Math.round((e[1].oppmote / e[1].medTall) * 10) / 10 : 0])} />
        <TrendKort label="Økter holdt" verdi={okt.length ? sumOkt(okt) : null} forrige={oktC && oktC.length ? sumOkt(oktC) : null}
          farge="green" hint="Økter logget i trener-appen eller importert fra Spond-oppmøte. Finnes bare for Sheets-æraen."
          under={utenTall > 0 ? `${utenTall} uten registrert oppmøte` : null}
          onKlikk={til('tr-gruppe')} serie={okt.map(e => [e[0], e[1].okter])} />
        <TrendKort label="Nye medlemmer" verdi={nye.length ? sumSerie(nye) : (r.fra ? 0 : null)}
          forrige={nyeC ? sumSerie(nyeC) : null} farge="coral"
          hint={'Personer som meldte seg inn for første gang i perioden — én gang pr. person, også om Spond har gitt dem nye medlemskap senere. '
            + (departed && departed.spond ? 'Tar med dem som har sluttet igjen (fra importen av tidligere medlemmer).'
              : 'Uten importerte tidligere medlemmer mangler de som meldte seg inn og sluttet før sporingen startet.')}
          under={statNa && (statNa.intro || statNa.borte)
            ? `${statNa.intro} på introkurs nå · ${statNa.borte} sluttet igjen` : null}
          onKlikk={til('tr-kohort')} serie={nye} />
        <TrendKort label="Intro → fast"
          verdi={introNa ? introNa.fast : null} forrige={introFor ? introFor.fast : null}
          farge="green" format={v => fmtN(v)}
          enhet={introNa ? ` av ${introNa.av}` : ''}
          under={introNa && introAndel(introNa) != null
            ? `${Math.round(introAndel(introNa) * 100)} % av innmeldingene`
            : introNa ? `for få innmeldinger til å regne prosent (< ${INTRO_MIN_FOR_PROSENT})` : ''}
          hint="Av dem som meldte seg inn i perioden, hvor mange som står i registeret i dag med fast medlemskap. De som har sluttet eller er parkert teller ikke som faste. Spond oppretter nytt medlemskap når en introdeltaker fortsetter, så dette er et gulv — ikke en ekte konverteringsrate."
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
        <SemesterOverlay entries={ukeserie(kpis, live, periodeRange('alt', sisteUke), gruppe)}
          naaKey={periodeRange('semester', sisteUke).semKey} />
      </Tile>

      <div className="section-h" id="tr-gruppe" style={{ scrollMarginTop: 80 }}>Grupper
        <span className="meta">snitt deltagere pr. økt · {r.navn}</span></div>
      <Tile title="Snitt per økt" corner="grupper">
        {(() => {
          const rader = DASH_GRUPPER.concat(['ukjent']).map(g => {
            const s = oktSerie(live, r, g);
            return { navn: DASH_GRUPPE_LABEL[g] || g, okter: sumOkt(s), medTall: sumTall(s), snitt: sumTall(s) ? sumOpp(s) / sumTall(s) : 0 };
          }).filter(g => g.medTall > 0).sort((a, b) => b.snitt - a.snitt);
          if (!rader.length) return <div className="dim" style={{ fontSize: 12 }}>Ingen økter med registrert oppmøte i perioden.</div>;
          return (
            <>
              <HBar data={rader.map(g => ({ label: `${g.navn} (${g.medTall} økter)`, value: Math.round(g.snitt * 10) / 10 }))}
                color="var(--green)" height={20} />
              {utenTallAlle > 0 && (
                <div className="dim" style={{ fontSize: 11, marginTop: 10 }}>
                  {utenTallAlle} {utenTallAlle === 1 ? 'økt' : 'økter'} uten registrert oppmøte er holdt utenfor snittet.
                </div>
              )}
            </>
          );
        })()}
      </Tile>

      <div className="section-h">Trend per medlemskategori<span className="meta">{r.navn} · {gruppeNavn}{rc ? ` · mot ${rc.navn}` : ''}</span></div>
      <TrendPerGruppe kat={katU} uker={uker} r={r} rc={rc} />

      <div className="section-h" id="tr-topp" style={{ scrollMarginTop: 80 }}>Mest dedikerte
        <span className="meta">nåværende medlemmer · {r.navn} · {gruppeNavn}</span></div>
      <Tile title="Toppliste" corner="topp 10">
        {mu ? (
          <LeaderboardTable live={live} rows={topp} limit={10} medals forrigeNavn={rc ? rc.navn : null}
            emptyHint={`ingen register-koblede oppmøter for ${gruppeNavn} i perioden.`}
            unmatchedHint="Koble dem i avstemmingen under Data." />
        ) : <div className="dim" style={{ fontSize: 12 }}>Gruppefilteret krever oppdatert Code.gs-backend (ny versjon i Apps Script).</div>}
        {gruppe === 'alle' && live && live.memberWeekly && !live.memberHistWeekly && (
          <div className="dim" style={{ fontSize: 11, marginTop: 8 }}>Spond-historikken er ikke med før Code.gs er oppdatert — tallene kan være lavere enn på profilen.</div>
        )}
      </Tile>

      <div className="section-h">Trend per medlem<span className="meta">{r.navn} · {gruppeNavn}{rc ? ` · mot ${rc.navn}` : ' · siste 4 uker mot forrige 4'}</span></div>
      <TrendPerMedlem mu={mu} members={members} uker={uker} r={r} rc={rc} />

      <div className="section-h" id="tr-kohort" style={{ scrollMarginTop: 80 }}>Kohort-retention
        <span className="meta">hele medlemshistorikken · følger ikke filteret</span></div>
      <KohortSeksjon kpis={kpis} charts={charts} departed={departed} />

      <div className="section-h" id="tr-funnel" style={{ scrollMarginTop: 80 }}>Konverteringsfunnel
        <span className="meta">innmeldt {r.navn} · hva har skjedd siden · gjelder hele klubben</span></div>
      <Funnel na={introNa} forrige={introFor} r={r} rc={rc} />
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
window.sumIPeriode = sumIPeriode;
window.innmeldtStatus = innmeldtStatus;
window.INTRO_MIN_FOR_PROSENT = INTRO_MIN_FOR_PROSENT;
window.ukerFor = ukerFor;
window.medlemsUker = medlemsUker;
window.kategoriUker = kategoriUker;
window.topplisteRader = topplisteRader;
window.SemesterOverlay = SemesterOverlay;
window.Kontrollstripe = Kontrollstripe;
window.TrendKort = TrendKort;
