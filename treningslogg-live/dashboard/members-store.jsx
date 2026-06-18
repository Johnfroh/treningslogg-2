/* Members store — Fase 2: leser/skriver mot Google Sheets via DASH_API
   (window.DASH_API). Gradering, månedlig register-import og økonomi-import
   persisteres på backend; ingen localStorage-overrides lenger.
   Provider <MembersProvider> + useMembers(). CSV-eksport beholdt. */

const { createContext, useContext } = React;
const MembersCtx = createContext(null);

const normName = s => (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
const todayISO = () => new Date().toISOString().slice(0, 10);

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

function MembersProvider({ children }) {
  const [members, setMembers] = React.useState(null);
  const [okonomi, setOkonomi] = React.useState(null);
  const [meta, setMeta] = React.useState({});
  const [loading, setLoading] = React.useState(false);

  const reload = React.useCallback(() => {
    setLoading(true);
    return DASH_API.fetchDash()
      .then(({ members, okonomi, meta }) => {
        setMembers(members);
        setOkonomi({ months: okonomi, keys: Object.keys(okonomi).sort() });
        setMeta(meta || {});
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

  return React.createElement(MembersCtx.Provider, { value: { members, byId, actions, okonomi, okonomiActions, meta, loading } }, children);
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
