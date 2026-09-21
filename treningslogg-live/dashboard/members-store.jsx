/* Members store — Fase 2: leser/skriver mot Google Sheets via DASH_API
   (window.DASH_API). Gradering, månedlig register-import og økonomi-import
   persisteres på backend; ingen localStorage-overrides lenger.
   Provider <MembersProvider> + useMembers(). CSV-eksport beholdt. */

const { createContext, useContext } = React;
const MembersCtx = createContext(null);

const normName = s => (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
// Lokal dato, ikke toISOString(): UTC-datoen er «i går» før kl. 01/02 norsk tid.
const todayISO = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

function blankGrading(since) {
  since = since || todayISO();
  return { current: { belt: 'Hvit', stripes: 0, since }, history: [{ id: 'g_innm', date: since, belt: 'Hvit', stripes: 0, by: null, note: 'Innmeldt', kind: 'innmelding', _seq: 1 }] };
}
function gradingFromBelt(bi, joinISO) {
  const join = joinISO || bi.since || todayISO();
  const hist = [{ id: 'g_innm', date: join, belt: 'Hvit', stripes: 0, by: null, note: 'Innmeldt', kind: 'innmelding', _seq: 1 }];
  if (bi.belt && (bi.belt !== 'Hvit' || bi.stripes > 0)) {
    hist.push({ id: 'g_imp', date: bi.since || join, belt: bi.belt, stripes: bi.stripes || 0, by: null, note: 'Importert', kind: bi.belt !== 'Hvit' ? 'belte' : 'stripe', _seq: 2 });
  }
  const last = hist[hist.length - 1];
  return { current: { belt: last.belt, stripes: last.stripes, since: last.date }, history: hist };
}

// Ren diff for forhåndsvisning. Matcher på id (stabil slug) først, så e-post,
// så normalisert navn — slik at maskerte barn (kun fornavn) fortsatt matches
// på id ved re-import og ikke mister beltehistorikk.
function diffRoster(current, incoming) {
  const byId = {}, byEmail = {}, byName = {};
  for (const m of current) {
    if (m.id) byId[m.id] = m;
    if (m.epost) byEmail[m.epost.toLowerCase()] = m;
    byName[normName(m.navn)] = m;
  }
  const matched = [], added = [];
  const seen = new Set();
  for (const im of incoming) {
    const hit = (im.id && byId[im.id]) || (im.epost && byEmail[im.epost.toLowerCase()]) || byName[normName(im.navn)];
    if (hit && !seen.has(hit.id)) { matched.push({ incoming: im, existing: hit }); seen.add(hit.id); }
    else added.push(im);
  }
  const removed = current.filter(m => !seen.has(m.id));
  return { matched, added, removed };
}

// Vakt mot cache-skjevhet mellom api.js (script-tag) og jsx-ene (Babel-fetch):
// rett etter en deploy kan nettleseren ha den nye jsx-en og den gamle api.js.
// Da finnes ikke de nye DASH_API-metodene, og brukeren skal få vite at det
// holder å laste siden på nytt.
function krevApi(navn) {
  if (typeof DASH_API[navn] === 'function') return Promise.resolve();
  return Promise.reject(new Error(
    'nettleseren kjører en gammel versjon av dashboardet — last siden på nytt (Cmd/Ctrl+Shift+R)'));
}

function MembersProvider({ children }) {
  const [members, setMembers] = React.useState(null);
  const [okonomi, setOkonomi] = React.useState(null);
  const [meta, setMeta] = React.useState({});
  const [live, setLive] = React.useState(null);
  // Avgangshistorikk fra dash_departed — grunnlaget for churn etter at det
  // statiske kpis.json slutter. Eldre backend uten feltet gir null, og da
  // faller dashboardet tilbake på de statiske tallene alene.
  const [departed, setDeparted] = React.useState(null);
  const [access, setAccess] = React.useState({ email: null, isStyre: false, configured: false });
  // Driftsterskler fra dash_settings. null = ikke lastet ennå / Sheets svarte
  // ikke — da brukes DASH_API.SETTING_DEFAULTS og dashboardet sier fra.
  const [settings, setSettings] = React.useState(null);
  const [events, setEvents] = React.useState(null);
  const [followup, setFollowup] = React.useState(null);
  const [loading, setLoading] = React.useState(false);

  const reload = React.useCallback(() => {
    setLoading(true);
    // Robust mot at en gammel cachet api.js mangler fetchWhoami: bruk
    // Promise.resolve(...) så et synkront kast blir en avvist promise som
    // .catch tar — da svartlegges aldri hele appen.
    const whoamiP = Promise.resolve().then(() =>
      (DASH_API.fetchWhoami ? DASH_API.fetchWhoami() : { email: null, isStyre: false }));
    return whoamiP.then(who => {
      setAccess(who);
      // De fire nye handlingene finnes ikke i eldre Code.gs-deployer. Et kall
      // som feiler skal ikke ta med seg resten av dashboardet i fallet, så de
      // får hver sin fallback-verdi.
      const valgfri = (fn, ellers) => Promise.resolve()
        .then(() => (typeof fn === 'function' ? fn() : ellers))
        .catch(() => ellers);
      return Promise.all([
        DASH_API.fetchDash(),
        who.isStyre && DASH_API.fetchOkonomi ? DASH_API.fetchOkonomi().catch(() => ({})) : Promise.resolve({}),
        valgfri(DASH_API.fetchSettings, null),
        valgfri(DASH_API.fetchEvents, []),
        valgfri(DASH_API.fetchFollowup, []),
      ]).then(([dash, months, innst, hendelser, oppfolging]) => {
        setMembers(dash.members);
        setMeta(dash.meta || {});
        setLive(dash.live || null);
        setDeparted(dash.departed || null);
        setOkonomi({ months, keys: Object.keys(months).sort() });
        setSettings(innst);
        setEvents(hendelser || []);
        setFollowup(oppfolging || []);
      });
    })
      .catch(e => {
        console.warn('[dashboard] kunne ikke laste data:', e.message);
        setMembers([]);
        setOkonomi({ months: {}, keys: [] });
      })
      .then(() => setLoading(false));
  }, []);

  React.useEffect(() => { reload(); }, [reload]);

  const byId = React.useMemo(() => {
    const map = {};
    (members || []).forEach(m => { map[m.id] = m; });
    return map;
  }, [members]);

  // Bygg graderingshendelser fra gjeldende state, send til backend, last på nytt.
  function applyGrading(ids, makeEvent) {
    const events = [];
    ids.forEach(id => {
      const m = byId[id];
      if (!m) return;
      const ev = makeEvent(m.grading, m);
      if (!ev) return;
      events.push({ memberId: id, kind: ev.kind, belt: ev.belt, stripes: ev.stripes, date: ev.date, by: ev.by || null, note: ev.note || '' });
    });
    if (!events.length) return Promise.resolve();
    return DASH_API.grade(events).then(reload);
  }

  const actions = {
    awardStripe(ids, { date, by, note }) {
      return applyGrading(ids, (cur) => {
        if (cur.current.stripes >= window.maxStripes) return null;
        return { kind: 'stripe', belt: cur.current.belt, stripes: cur.current.stripes + 1, date, by, note };
      });
    },
    awardBelt(ids, { belt, stripes = 0, date, by, note }) {
      return applyGrading(ids, () => ({ kind: 'belte', belt, stripes, date, by, note }));
    },
    setCurrent(id, { belt, stripes, date, by, note, kind }) {
      return applyGrading([id], (cur) => {
        if (cur.current.belt === belt && cur.current.stripes === stripes) return null;
        const k = kind || (cur.current.belt !== belt ? 'belte' : 'stripe');
        return { kind: k, belt, stripes, date: date || todayISO(), by, note };
      });
    },
    undoLast(id) { return DASH_API.undoLast(id).then(reload); },
    // Backend er kilde til sannhet — ingen lokale «endringer» å markere/angre.
    isEdited() { return false; },
    resetMember() {},
    resetAll() {},
    overridesCount() { return 0; },

    // ---- månedlig register-import ----
    importRoster(incoming) {
      const cur = members || [];
      const { matched, added, removed } = diffRoster(cur, incoming);
      const matchMap = new Map(matched.map(x => [x.incoming, x.existing]));
      const usedIds = new Set();
      const result = [];
      for (const im of incoming) {
        const ex = matchMap.get(im);
        let grading;
        if (im.beltImport) grading = gradingFromBelt(im.beltImport, im.innmeldingsdato);
        else if (ex) grading = ex.grading;
        else grading = blankGrading(im.innmeldingsdato);
        let id = ex ? ex.id : (im.id || 'm');
        let b = id, k = 2;
        while (usedIds.has(id)) { id = b + '-' + k; k++; }
        usedIds.add(id);
        const oppmote = ex ? ex.oppmote : (im.oppmote || { checkins: 0, invitert: null, pct: null, sisteOppmote: null });
        result.push({ ...im, id, grading, oppmote });
      }
      return DASH_API.importRoster(result).then(reload)
        .then(() => ({ added: added.length, updated: matched.length, removed: removed.length, total: result.length }));
    },
    rosterActive() { return true; },
    clearRoster() { return reload(); },

    // ---- oppmøte-avstemming (identitetsbro) ----
    reconcileAttendance() { return DASH_API.reconcileAttendance().then(r => reload().then(() => r)); },
    unmatchedAttendance() { return DASH_API.unmatchedAttendance(); },
    assignMember(name, memberId) { return DASH_API.assignMember(name, memberId).then(r => reload().then(() => r)); },
    ignoreName(name, on) { return DASH_API.ignoreName(name, on).then(r => reload().then(() => r)); },
    importWeekAttendance(events) { return DASH_API.importWeekAttendance(events).then(r => reload().then(() => r)); },
    fetchThemes() { return DASH_API.fetchThemes(); },

    // ---- innstillinger, snapshots, hendelser, oppfølging ----
    // Alle sjekker at metoden finnes før de kaller den: rett etter en deploy
    // kan nettleseren sitte med en eldre cachet api.js enn jsx-ene
    // (script-tag og Babel-fetch caches ulikt). Uten dette blir feilen en
    // rå «is not a function» midt i en klikk-handler i stedet for en beskjed
    // brukeren kan gjøre noe med.
    saveSettings(values) {
      return krevApi('saveSettings')
        .then(() => DASH_API.saveSettings(values, access.email || ''))
        .then(s => { setSettings(s); return s; });
    },
    snapshotNow() { return krevApi('snapshotNow').then(() => DASH_API.snapshotNow()); },
    fetchSnapshots() { return krevApi('fetchSnapshots').then(() => DASH_API.fetchSnapshots()); },
    addEvent(ev) {
      return krevApi('addEvent').then(() => DASH_API.addEvent(ev)).then(rad => {
        setEvents(list => [...(list || []), rad].sort((a, b) => String(a.dato).localeCompare(String(b.dato))));
        return rad;
      });
    },
    deleteEvent(id) {
      return krevApi('deleteEvent').then(() => DASH_API.deleteEvent(id))
        .then(r => { setEvents(list => (list || []).filter(e => e.id !== id)); return r; });
    },
    // Oppfølging er en logg: hver handling legges til, ingenting overskrives.
    addFollowup(row) {
      return krevApi('addFollowup')
        .then(() => DASH_API.addFollowup({ ...row, av: access.email || '' })).then(rad => {
        setFollowup(list => [...(list || []), rad]);
        return rad;
      });
    },
  };

  const okonomiActions = {
    importMonths(mns) {
      const merged = { ...((okonomi && okonomi.months) || {}), ...mns };
      return DASH_API.importOkonomi(mns).then(reload)
        .then(() => ({ added: Object.keys(mns).length, total: Object.keys(merged).length }));
    },
    clear() { return Promise.resolve(); },
    isImported() { return !!(okonomi && okonomi.keys && okonomi.keys.length); },
    importedCount() { return (okonomi && okonomi.keys) ? okonomi.keys.length : 0; },
  };

  return React.createElement(MembersCtx.Provider, { value: { members, byId, actions, okonomi, okonomiActions, meta, live, departed, access, loading,
      settings, events, followup } }, children);
}

function useMembers() { return useContext(MembersCtx); }

// ---------- CSV export (UTF-8 BOM, comma-sep, quoted) ----------
function membersToCSV(members) {
  const cols = ['Fornavn', 'Etternavn', 'Kategori', 'Medlemstype', 'Beltefarge', 'Striper', 'Belte oppnådd',
    'Forrige gradering', 'Antall graderinger', 'E-post', 'Mobil', 'Kjønn', 'Innmeldt', 'Fødselsdato', 'Postnr', 'Poststed', 'Oppmøter'];
  const esc = v => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
  const lines = [cols.map(esc).join(',')];
  for (const m of members) {
    const g = m.grading;
    lines.push([
      m.fornavn, m.etternavn, m.kategori, m.medlemstype,
      g.current.belt, g.current.stripes, g.current.since,
      g.history.length > 1 ? g.history[g.history.length - 2].date : '',
      g.history.length, m.epost, m.mobil, m.kjonn,
      m.innmeldingsdato || '', m.fodselsdato || '', m.postnr, m.poststed, m.oppmote.checkins,
    ].map(esc).join(','));
  }
  return '\ufeff' + lines.join('\r\n');
}
// Long-format grading log: one row per grading event
function gradingLogToCSV(members) {
  const cols = ['Medlem', 'Kategori', 'Dato', 'Hendelse', 'Belte', 'Striper', 'Gradert av', 'Notat'];
  const esc = v => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
  const lines = [cols.map(esc).join(',')];
  for (const m of members) {
    for (const e of m.grading.history) {
      lines.push([m.navn, m.kategori, e.date,
        e.kind === 'innmelding' ? 'Innmeldt' : e.kind === 'belte' ? 'Nytt belte' : e.kind === 'stripe' ? 'Stripe' : 'Justering',
        e.belt, e.stripes, e.by || '', e.note || ''].map(esc).join(','));
    }
  }
  return '\ufeff' + lines.join('\r\n');
}
function downloadText(filename, text, mime = 'text/csv;charset=utf-8') {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; document.body.appendChild(a); a.click();
  setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);
}

Object.assign(window, { MembersProvider, useMembers, membersToCSV, gradingLogToCSV, downloadText, diffRoster });
