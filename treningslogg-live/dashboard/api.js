// dashboard/api.js
// Datalag for klubbdashboardet. ÉN kilde til sannhet for hvor data hentes.
//
// Fase 2: medlemsregister, gradering og økonomi leses/skrives mot Google
//   Sheets via Apps Script (samme /api-proxy og samme Cloudflare Access som
//   trener-appen). De aggregerte KPI-ene (oppmøte-heatmap, kohort,
//   leaderboard) leses fortsatt fra statisk data/kpis.json — oppmøte-
//   konvergering med trener-appen kommer i en senere fase.
//
// Personvern: maskMember() håndheves på lesesiden, slik at mindreårige aldri
// når frontend med annet enn fornavn — uansett hva som ligger lagret.

window.DASH_API = (function () {
  // Samme proxy/token som trener-appen (app/api.js). Proxyen ligger i
  // functions/api.js og forwarder uendret til Apps Script.
  const ENDPOINT = '/api';
  const TOKEN = 'bjj-Hk8nQ2wT-2026';

  async function getJSON(path) {
    const res = await fetch(path, { cache: 'no-store' });
    if (!res.ok) throw new Error(path + ' feilet: ' + res.status);
    return res.json();
  }

  async function get(action, extra) {
    const base = (typeof window !== 'undefined') ? window.location.origin : 'http://localhost';
    const url = new URL(ENDPOINT, base);
    url.searchParams.set('action', action);
    url.searchParams.set('token', TOKEN);
    url.searchParams.set('_ts', Date.now().toString());
    if (extra) Object.entries(extra).forEach(([k, v]) => url.searchParams.set(k, v));
    const res = await fetch(url.toString(), { method: 'GET', cache: 'no-store' });
    if (!res.ok) throw new Error('GET ' + action + ' feilet: ' + res.status);
    const json = await res.json();
    if (!json.ok) throw new Error(json.error || 'ukjent feil');
    return json.data;
  }

  async function post(body) {
    // text/plain unngår CORS-preflight; Apps Script parser body manuelt.
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ ...body, token: TOKEN }),
      cache: 'no-store',
    });
    if (!res.ok) throw new Error('POST ' + body.action + ' feilet: ' + res.status);
    const json = await res.json();
    if (!json.ok) throw new Error(json.error || 'ukjent feil');
    return json.data;
  }

  // Økonomi går via den skjermede ruta /dashboard/okonomi (styre-only).
  // Relativ sti — siden vi alltid står på /dashboard/ blir det riktig.
  const OK_ENDPOINT = 'okonomi';
  async function okGet(action) {
    const res = await fetch(OK_ENDPOINT + '?action=' + encodeURIComponent(action)
      + '&token=' + encodeURIComponent(TOKEN) + '&_ts=' + Date.now(), { cache: 'no-store' });
    if (res.status === 403) throw new Error('forbidden');
    if (!res.ok) throw new Error('GET ' + action + ' feilet: ' + res.status);
    const json = await res.json();
    if (!json.ok) throw new Error(json.error || 'ukjent feil');
    return json.data;
  }
  async function okPost(body) {
    const res = await fetch(OK_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ ...body, token: TOKEN }),
      cache: 'no-store',
    });
    if (res.status === 403) throw new Error('forbidden');
    if (!res.ok) throw new Error('POST ' + body.action + ' feilet: ' + res.status);
    const json = await res.json();
    if (!json.ok) throw new Error(json.error || 'ukjent feil');
    return json.data;
  }

  // ─── Personvern: maskering av mindreårige ──────────────────────────
  // Barn vises kun med fornavn, uten bakgrunnsdata (kontakt, adresse,
  // fødselsdato, foresatte). Belte/gradering og oppmøte beholdes.
  function isMinor(m) {
    return m.minor === true
      || m.kategori === 'Junior' || m.kategori === 'Knøtte'
      || (m.alder != null && m.alder < 16);
  }
  function maskMember(m) {
    if (!isMinor(m)) return { ...m, minor: false };
    const fornavn = m.fornavn || String(m.navn || '').split(/\s+/)[0] || 'Medlem';
    return {
      ...m,
      minor: true,
      fornavn,
      etternavn: '',
      navn: fornavn,
      epost: '',
      mobil: '',
      adresse: '',
      postnr: '',
      poststed: '',
      fodselsdato: null,
      foresatte: [],
    };
  }
  function maskMembers(list) { return (list || []).map(maskMember); }

  return {
    // ── Lesing ──
    // Aggregerte KPI-er (fortsatt statisk i denne fasen).
    fetchKpis() { return getJSON('data/kpis.json'); },
    // Register + meta fra Sheets. Medlemmer alltid maskert. (Økonomi hentes
    // separat via fetchOkonomi, bak styre-skjerming.)
    fetchDash() {
      return get('dashList').then(d => ({
        members: maskMembers(d.members),
        meta: d.meta || {},
        live: d.live || null,
      }));
    },
    // Innlogget identitet + om e-posten er på styre-lista. Robust: feiler den
    // (f.eks. Access ikke aktiv ennå), antar vi ikke-styre → økonomi skjult.
    fetchWhoami() {
      return fetch(OK_ENDPOINT + '?action=whoami&_ts=' + Date.now(), { cache: 'no-store' })
        .then(r => r.ok ? r.json() : { email: null, isStyre: false })
        .then(d => ({ email: d.email || null, isStyre: !!d.isStyre, configured: !!d.configured }))
        .catch(() => ({ email: null, isStyre: false, configured: false }));
    },
    // Faktiske månedstall — kun styre slipper gjennom (ellers kastes 'forbidden').
    fetchOkonomi() {
      return okGet('dashOkonomiList').then(d => (d.okonomi && d.okonomi.months) || {});
    },

    // ── Skriving ──
    // events: [{ memberId, kind, belt, stripes, date, by, note }]
    grade(events) { return post({ action: 'dashGrade', events }); },
    undoLast(memberId) { return post({ action: 'dashUndoLast', memberId }); },
    // members: ferdig sammenslått register (full, umaskert — lagres bak Access).
    importRoster(members) { return post({ action: 'dashImportRoster', members }); },
    // months: { 'YYYY-MM': { netto, brutto, avgifter, antall, byKategori } } — styre-only.
    importOkonomi(months) { return okPost({ action: 'dashImportOkonomi', months }); },

    // Eksponert for import/roster-flyten.
    maskMembers,
    isMinor,
  };
})();
