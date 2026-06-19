/**
 * Treningslogg — Apps Script Web App
 * Bodø Jiu Jitsu
 *
 * Knytter en Google Sheet til en HTTPS-endpoint slik at
 * mobil-appen kan lese og skrive økter.
 *
 * Deploy:
 *   1. Åpne Sheets-fila → Extensions → Apps Script
 *   2. Lim inn denne fila som Code.gs
 *   3. Deploy → New deployment → Type: Web app
 *      - Execute as: Me (din konto)
 *      - Who has access: Anyone
 *   4. Kopier Web app URL og lim inn i app/api.js
 */

// ─── Konfigurasjon ─────────────────────────────────────────────────
// Delt token mellom frontend og Apps Script. Må være identisk med
// TOKEN i app/api.js og API_TOKEN i fotball/app-core.js.
// Tokenet er andre forsvarslinje — primærbeskyttelsen er Cloudflare
// Access foran løft.app. (Roadmap: flytt til Cloudflare env-variabel.)
const SHARED_TOKEN = 'bjj-Hk8nQ2wT-2026';

const SHEET_NAMES = {
  sessions: 'sessions',
  planned:  'planned',
  trainers: 'trainers',
  members:  'members',
  attendance: 'attendance',
  // Bygg motoren — fotball-egentreningsapp på /fotball
  bmEntries: 'bm_entries',
  bmSettings: 'bm_settings',
  bmWeekGoals: 'bm_week_goals',
  // Klubbdashboard på /dashboard — eget medlemsregister med gradering + økonomi.
  // Holdt adskilt fra 'members' (oppmøte-matching) i denne fasen; samkjøring
  // av de to medlemslistene er planlagt til en senere fase.
  dashMembers: 'dash_members',
  dashGrading: 'dash_grading',
  dashOkonomi: 'dash_okonomi',
  dashMeta: 'dash_meta',
};

const SESSION_COLS = ['id','date','time','group','trainer','title','content','tags','attendance','createdAt','updatedAt'];
const PLANNED_COLS = ['id','date','time','group','trainer','title'];
const TRAINER_COLS = ['id','name','active'];
const MEMBER_COLS  = ['name','aliases','active'];
const ATTENDANCE_COLS = ['sessionId','memberName','importedAt','memberId'];
// 'user'-kolonnen er tom i single-user-modus, klar for skalering når
// flere brukere kommer på /fotball. 'program'-kolonna noterer hvilket
// program raden tilhører (ungdom/junior/rg). Tom = ungdom (legacy).
const BM_ENTRY_COLS    = ['id','user','program','date','okt','parts','rekord','note','xp','createdAt'];
const BM_SETTINGS_COLS = ['user','program','key','value'];
// Ukemål per uke — låser inn hvilket mål som gjaldt da uka pågikk, så
// streak ikke regnes feil med tilbakevirkende kraft når målet endres.
const BM_WEEKGOAL_COLS = ['user','program','week','goal'];

// ─── Dashboard (/dashboard) ────────────────────────────────────────
// dash_members: medlemsregister. Gjeldende belte denormaliseres hit for
// lesbarhet i Sheets; full historikk ligger i dash_grading.
const DASH_MEMBER_COLS = ['id','fornavn','etternavn','navn','kategori','medlemstype',
  'prisMnd','epost','mobil','kjonn','innmeldingsdato','fodselsdato','alder','adresse',
  'postnr','poststed','minor','beltCurrent','stripesCurrent','beltSince',
  'oppmoteCheckins','oppmotePct','oppmoteSiste','updatedAt'];
// dash_grading: én rad per graderingshendelse.
const DASH_GRADING_COLS = ['memberId','eventId','date','kind','belt','stripes','by','note','seq','createdAt'];
// dash_okonomi: faktiske månedstall fra Spond. byKategori lagres som JSON-streng.
const DASH_OKONOMI_COLS = ['month','netto','brutto','avgifter','antall','byKategori','updatedAt'];
// dash_meta: nøkkel/verdi for import-metadata (sist importert, antall …).
const DASH_META_COLS = ['key','value'];

function bmProgram(p){ var s = String(p || '').trim().toLowerCase(); return s || 'ungdom'; }

// ─── Public entrypoints ────────────────────────────────────────────

function doGet(e) {
  return handle(e, 'GET');
}

function doPost(e) {
  return handle(e, 'POST');
}

function handle(e, method) {
  try {
    const params = (e && e.parameter) || {};
    let body = {};
    if (method === 'POST' && e && e.postData && e.postData.contents) {
      try { body = JSON.parse(e.postData.contents); } catch (err) { body = {}; }
    }
    const action = params.action || body.action;
    const token  = params.token  || body.token;

    if (token !== SHARED_TOKEN) {
      return json({ ok: false, error: 'unauthorized' });
    }

    switch (action) {
      case 'list':            return json({ ok: true, data: listAll() });
      case 'createSession':   return json({ ok: true, data: createSession(body.payload) });
      case 'updateSession':   return json({ ok: true, data: updateSession(body.id, body.payload) });
      case 'deleteSession':   return json({ ok: true, data: deleteRow(SHEET_NAMES.sessions, body.id) });
      case 'createPlanned':   return json({ ok: true, data: createPlanned(body.payload) });
      case 'updatePlanned':   return json({ ok: true, data: updatePlanned(body.id, body.payload) });
      case 'deletePlanned':   return json({ ok: true, data: deleteRow(SHEET_NAMES.planned, body.id) });
      case 'importAttendance':return json({ ok: true, data: importAttendance(body.rows) });
      // Bygg motoren — fotball-egentrening (med program-dimensjon)
      case 'bmList':          return json({ ok: true, data: bmList(params.user || body.user, params.program || body.program) });
      case 'bmCreate':        return json({ ok: true, data: bmCreate(body.payload) });
      case 'bmDelete':        return json({ ok: true, data: deleteRow(SHEET_NAMES.bmEntries, body.id) });
      case 'bmSetSetting':    return json({ ok: true, data: bmSetSetting(body.user, body.program, body.key, body.value) });
      case 'bmSetWeekGoal':   return json({ ok: true, data: bmSetWeekGoal(body.user, body.program, body.week, body.value) });
      // Klubbdashboard (/dashboard)
      case 'dashList':          return json({ ok: true, data: dashList() });
      case 'dashGrade':         return json({ ok: true, data: dashGrade(body.events) });
      case 'dashUndoLast':      return json({ ok: true, data: dashUndoLast(body.memberId) });
      case 'dashImportRoster':  return json({ ok: true, data: dashImportRoster(body.members) });
      case 'rosterLite':        return json({ ok: true, data: rosterLite() });
      case 'reconcileAttendance': return json({ ok: true, data: reconcileAttendance() });
      case 'dashUnmatched':     return json({ ok: true, data: dashUnmatchedAttendance() });
      case 'dashAssignMember':  return json({ ok: true, data: dashAssignMember(body.name, body.memberId) });
      case 'dashImportWeekAttendance': return json({ ok: true, data: dashImportWeekAttendance(body.events) });
      case 'dashIgnoreName':    return json({ ok: true, data: dashIgnoreName(body.name, body.on) });
      case 'dashThemes':        return json({ ok: true, data: dashThemes() });
      case 'dashCalendar':      return json({ ok: true, data: dashCalendar() });
      // Økonomi — egen handling, skjermes av functions/dashboard/okonomi.js
      case 'dashOkonomiList':   return json({ ok: true, data: { okonomi: { months: dashReadOkonomi() } } });
      case 'dashImportOkonomi': return json({ ok: true, data: dashImportOkonomi(body.months) });

      case 'ping':            return json({ ok: true, data: { now: new Date().toISOString() } });
      default:                return json({ ok: false, error: 'unknown action: ' + action });
    }
  } catch (err) {
    return json({ ok: false, error: String((err && err.message) || err) });
  }
}

// ─── Read ──────────────────────────────────────────────────────────

function listAll() {
  return {
    sessions:   readSheet(SHEET_NAMES.sessions, SESSION_COLS, parseSessionRow),
    planned:    readSheet(SHEET_NAMES.planned,  PLANNED_COLS, parsePlannedRow),
    trainers:   readSheet(SHEET_NAMES.trainers, TRAINER_COLS, parseTrainerRow),
    members:    readSheet(SHEET_NAMES.members,  MEMBER_COLS,  parseMemberRow),
    attendance: readAttendance(),
  };
}

function readAttendance() {
  const sh = sheet(SHEET_NAMES.attendance);
  const lastRow = sh.getLastRow();
  if (lastRow < 2) return [];
  const range = sh.getRange(2, 1, lastRow - 1, ATTENDANCE_COLS.length).getValues();
  return range.map(row => ({
    sessionId: String(row[0] || ''),
    memberName: String(row[1] || ''),
    importedAt: safeIso(row[2]) || (row[2] ? String(row[2]) : null),
    memberId: String(row[3] || ''),
  })).filter(r => r.sessionId && r.memberName);
}

function readSheet(name, cols, parser) {
  const sh = sheet(name);
  const lastRow = sh.getLastRow();
  if (lastRow < 2) return [];
  const range = sh.getRange(2, 1, lastRow - 1, cols.length).getValues();
  return range
    .map(row => parser(rowToObj(row, cols)))
    .filter(x => (x && x.id !== '' && x.id != null) || (x && x.name && !x.id));
}

function parseSessionRow(o) {
  if (!o.id) return null;
  return {
    id: String(o.id),
    date: ymd(o.date),
    time: hm(o.time),
    group: String(o.group || ''),
    trainer: String(o.trainer || ''),
    title: String(o.title || ''),
    content: String(o.content || ''),
    tags: parseTags(o.tags),
    attendance: o.attendance === '' || o.attendance == null ? null : Number(o.attendance),
    createdAt: safeIso(o.createdAt),
    updatedAt: safeIso(o.updatedAt),
  };
}

function parsePlannedRow(o) {
  if (!o.id) return null;
  return {
    id: String(o.id),
    date: ymd(o.date),
    time: hm(o.time),
    group: String(o.group || ''),
    trainer: String(o.trainer || ''),
    title: String(o.title || ''),
  };
}

function parseTrainerRow(o) {
  if (!o.id && !o.name) return null;
  return {
    id: String(o.id || o.name).toLowerCase(),
    name: String(o.name || o.id),
    active: o.active === '' || o.active == null ? true : Boolean(o.active),
  };
}

function parseMemberRow(o) {
  if (!o.name) return null;
  return {
    name: String(o.name),
    aliases: o.aliases ? String(o.aliases).split('|').map(s => s.trim()).filter(Boolean) : [],
    active: o.active === '' || o.active == null ? true : Boolean(o.active),
  };
}

// ─── Write ─────────────────────────────────────────────────────────

function createSession(payload) {
  if (!payload) throw new Error('payload mangler');
  const id = payload.id || ('s-' + Date.now());
  const now = new Date().toISOString();
  const row = {
    id,
    date: payload.date,
    time: payload.time,
    group: payload.group,
    trainer: payload.trainer || '',
    title: payload.title || '',
    content: payload.content || '',
    tags: serializeTags(payload.tags),
    attendance: payload.attendance == null ? '' : payload.attendance,
    createdAt: now,
    updatedAt: now,
  };
  appendRow(SHEET_NAMES.sessions, SESSION_COLS, row);
  return parseSessionRow(row);
}

function updateSession(id, payload) {
  if (!id) throw new Error('id mangler');
  const sh = sheet(SHEET_NAMES.sessions);
  const idx = findRowIndex(sh, id);
  if (idx === -1) throw new Error('session not found: ' + id);
  const current = rowToObj(sh.getRange(idx, 1, 1, SESSION_COLS.length).getValues()[0], SESSION_COLS);
  const merged = Object.assign({}, current, payload, {
    id,
    tags: payload.tags != null ? serializeTags(payload.tags) : current.tags,
    updatedAt: new Date().toISOString(),
  });
  writeRow(sh, idx, SESSION_COLS, merged);
  return parseSessionRow(merged);
}

function createPlanned(payload) {
  if (!payload) throw new Error('payload mangler');
  const id = payload.id || ('p-' + Date.now());
  const row = {
    id,
    date: payload.date,
    time: payload.time,
    group: payload.group,
    trainer: payload.trainer || '',
    title: payload.title || '',
  };
  appendRow(SHEET_NAMES.planned, PLANNED_COLS, row);
  return parsePlannedRow(row);
}

function updatePlanned(id, payload) {
  if (!id) throw new Error('id mangler');
  const sh = sheet(SHEET_NAMES.planned);
  const idx = findRowIndex(sh, id);
  if (idx === -1) throw new Error('planned not found: ' + id);
  const current = rowToObj(sh.getRange(idx, 1, 1, PLANNED_COLS.length).getValues()[0], PLANNED_COLS);
  const merged = Object.assign({}, current, payload, { id });
  writeRow(sh, idx, PLANNED_COLS, merged);
  return parsePlannedRow(merged);
}

function deleteRow(sheetName, id) {
  if (!id) throw new Error('id mangler');
  const sh = sheet(sheetName);
  const idx = findRowIndex(sh, id);
  if (idx === -1) throw new Error('not found: ' + id);
  sh.deleteRow(idx);
  return { id, deleted: true };
}

function importAttendance(rows) {
  if (!Array.isArray(rows)) throw new Error('rows må være array');
  if (rows.length === 0) return { count: 0, newMembers: 0, unmatched: 0 };
  const sh = sheet(SHEET_NAMES.attendance);
  const now = new Date().toISOString();

  // Erstatt eksisterende attendance for de session-id-ene som er i import
  // (idempotent re-import: samme fil kan lastes opp på nytt uten dubletter)
  const sessionIds = new Set(rows.map(r => String(r.sessionId)));
  const lastRow = sh.getLastRow();
  if (lastRow >= 2) {
    const existing = sh.getRange(2, 1, lastRow - 1, ATTENDANCE_COLS.length).getValues();
    const toKeep = existing.filter(row => !sessionIds.has(String(row[0])));
    sh.getRange(2, 1, lastRow - 1, ATTENDANCE_COLS.length).clearContent();
    if (toKeep.length) {
      sh.getRange(2, 1, toKeep.length, ATTENDANCE_COLS.length).setValues(toKeep);
    }
  }

  // Skriv nye rader — knytt hvert oppmøte til et dash_members-id (identitetsbro).
  // Klienten kan sende memberId direkte; ellers slår vi opp navnet i rosteret.
  const idx = dashMemberIndex();
  let unmatched = 0;
  const data = rows.map(r => {
    const memberId = String(r.memberId || '') || dashResolveMemberId(r.memberName, idx);
    if (!memberId) unmatched++;
    return [String(r.sessionId), String(r.memberName), r.importedAt || now, memberId];
  });
  const startRow = sh.getLastRow() + 1;
  sh.getRange(startRow, 1, data.length, ATTENDANCE_COLS.length).setValues(data);

  // Auto-registrer nye navn i members-arket
  const memberSh = sheet(SHEET_NAMES.members);
  const existingNames = memberSh.getLastRow() < 2 ? [] :
    memberSh.getRange(2, 1, memberSh.getLastRow() - 1, 1).getValues().flat().map(v => String(v).trim().toLowerCase());
  const existingSet = new Set(existingNames);
  const seen = new Set();
  const newNames = [];
  rows.forEach(r => {
    const n = String(r.memberName || '').trim();
    if (!n) return;
    const key = n.toLowerCase();
    if (existingSet.has(key) || seen.has(key)) return;
    seen.add(key);
    newNames.push(n);
  });
  if (newNames.length) {
    const memberData = newNames.map(name => [name, '', true]);
    memberSh.getRange(memberSh.getLastRow() + 1, 1, memberData.length, MEMBER_COLS.length).setValues(memberData);
  }

  return { count: data.length, newMembers: newNames.length, unmatched: unmatched };
}

// ─── Identitetsbro: oppmøte ↔ dash_members ─────────────────────────
// dash_members.id er en slug av navnet, så oppmøte-navn kan slås opp
// deterministisk. Manuelle koblinger lagres som aliaser i dash_meta.
function dashSlug(s) {
  return String(s || '').toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function dashMemberIndex() {
  const rows = dashRows(SHEET_NAMES.dashMembers, DASH_MEMBER_COLS)
    .filter(o => o.id !== '' && o.id != null);
  const byId = {}, bySlug = {}, byNavn = {};
  rows.forEach(o => {
    const id = String(o.id);
    byId[id] = true;
    const navn = String(o.navn || '');
    if (navn) { bySlug[dashSlug(navn)] = id; byNavn[navn.toLowerCase().trim()] = id; }
  });
  let aliases = {};
  try { aliases = JSON.parse(dashGetMeta().attendanceAliases || '{}'); } catch (e) { aliases = {}; }
  let ignored = {};
  try { (JSON.parse(dashGetMeta().attendanceIgnored || '[]') || []).forEach(n => { ignored[String(n).toLowerCase()] = true; }); } catch (e) { ignored = {}; }
  return { byId: byId, bySlug: bySlug, byNavn: byNavn, aliases: aliases, ignored: ignored };
}

function dashResolveMemberId(name, idx) {
  const n = String(name || '').trim();
  if (!n) return '';
  const low = n.toLowerCase();
  if (idx.aliases[low]) return String(idx.aliases[low]);
  const slug = dashSlug(n);
  if (idx.bySlug[slug]) return idx.bySlug[slug];
  if (idx.byNavn[low]) return idx.byNavn[low];
  if (idx.byId[low]) return low; // navnet ER allerede en id
  return '';
}

// Lett roster for trener-appens oppmøte-velger (Fase 2) og avstemming.
function rosterLite() {
  return dashRows(SHEET_NAMES.dashMembers, DASH_MEMBER_COLS)
    .filter(o => o.id !== '' && o.id != null)
    .map(o => ({
      id: String(o.id),
      navn: String(o.navn || ''),
      kategori: String(o.kategori || ''),
      minor: o.minor === true || o.minor === 'true' || o.minor === 1,
    }));
}

// Backfill memberId på alle eksisterende oppmøte-rader. Kjøres manuelt én
// gang fra editoren etter deploy (og igjen ved behov). Idempotent.
function reconcileAttendance() {
  const sh = sheet(SHEET_NAMES.attendance);
  sh.getRange(1, 1, 1, ATTENDANCE_COLS.length).setValues([ATTENDANCE_COLS]); // sikre header
  const last = sh.getLastRow();
  if (last < 2) return { total: 0, matched: 0, unmatched: 0, unmatchedNames: [] };
  const idx = dashMemberIndex();
  const rng = sh.getRange(2, 1, last - 1, ATTENDANCE_COLS.length);
  const vals = rng.getValues();
  let matched = 0, unmatched = 0;
  const unmatchedSet = {};
  vals.forEach(row => {
    const name = String(row[1] || '');
    let id = String(row[3] || '');
    if (!id) id = dashResolveMemberId(name, idx);
    if (id) { row[3] = id; matched++; }
    else { unmatched++; if (name) unmatchedSet[name] = (unmatchedSet[name] || 0) + 1; }
  });
  rng.setValues(vals);
  const unmatchedNames = Object.keys(unmatchedSet)
    .map(n => ({ name: n, count: unmatchedSet[n] }))
    .sort((a, b) => b.count - a.count);
  return { total: vals.length, matched: matched, unmatched: unmatched, unmatchedNames: unmatchedNames };
}

// Liste over oppmøte-navn som ikke matcher et medlem (for avstemmings-UI).
// Navn merket som «tidligere medlem» (sluttet) holdes utenfor.
function dashUnmatchedAttendance() {
  const idx = dashMemberIndex();
  const set = {};
  readAttendance().forEach(r => {
    const id = r.memberId || dashResolveMemberId(r.memberName, idx);
    if (id || !r.memberName) return;
    if (idx.ignored[r.memberName.toLowerCase().trim()]) return;
    set[r.memberName] = (set[r.memberName] || 0) + 1;
  });
  return Object.keys(set)
    .map(n => ({ name: n, count: set[n] }))
    .sort((a, b) => b.count - a.count);
}

// Merk et umatchet oppmøte-navn som tidligere medlem (sluttet) — eller angre.
// Da forsvinner det fra avstemmingen uten å kobles til noen i registeret.
function dashIgnoreName(name, on) {
  const low = String(name || '').trim().toLowerCase();
  if (!low) throw new Error('name kreves');
  let list = [];
  try { list = JSON.parse(dashGetMeta().attendanceIgnored || '[]') || []; } catch (e) { list = []; }
  const setL = {};
  list.forEach(n => { setL[String(n).toLowerCase()] = true; });
  if (on === false) delete setL[low]; else setL[low] = true;
  dashSetMeta({ attendanceIgnored: JSON.stringify(Object.keys(setL)) });
  return { ignored: on !== false };
}

// Manuell kobling: bind et oppmøte-navn til et medlem. Lagrer alias (så
// framtidige importer treffer) og oppdaterer eksisterende rader.
function dashAssignMember(name, memberId) {
  const low = String(name || '').trim().toLowerCase();
  if (!low || !memberId) throw new Error('name og memberId kreves');
  let aliases = {};
  try { aliases = JSON.parse(dashGetMeta().attendanceAliases || '{}'); } catch (e) { aliases = {}; }
  aliases[low] = String(memberId);
  dashSetMeta({ attendanceAliases: JSON.stringify(aliases) });
  const sh = sheet(SHEET_NAMES.attendance);
  const last = sh.getLastRow();
  let updated = 0;
  if (last >= 2) {
    const rng = sh.getRange(2, 1, last - 1, ATTENDANCE_COLS.length);
    const vals = rng.getValues();
    vals.forEach(row => {
      if (String(row[1] || '').trim().toLowerCase() === low) { row[3] = String(memberId); updated++; }
    });
    rng.setValues(vals);
  }
  return { updated: updated };
}

// Engangs-oppsett etter deploy: legg til memberId-kolonna + backfill.
function _setupAttendanceMemberId() {
  return reconcileAttendance();
}

// ─── Dashboard (/dashboard) ────────────────────────────────────────

function dashList() {
  return { members: dashReadMembers(), meta: dashGetMeta(), live: dashLiveOppmote() };
}

// Per-medlem deltagelse fra attendance↔sessions, nøklet på memberId.
// Brukes til å vise oppmøte + siste økter (med innhold) på medlemsprofilen.
function dashAttendanceByMember() {
  const sessions = readSheet(SHEET_NAMES.sessions, SESSION_COLS, parseSessionRow);
  const sById = {};
  sessions.forEach(s => { sById[s.id] = s; });
  const idx = dashMemberIndex();
  const byId = {};
  readAttendance().forEach(a => {
    const id = a.memberId || dashResolveMemberId(a.memberName, idx);
    if (!id) return;
    const s = sById[a.sessionId];
    const date = s ? s.date : '';
    const e = byId[id] || (byId[id] = { checkins: 0, sist: '', _s: [] });
    e.checkins++;
    if (date > e.sist) e.sist = date;
    if (s) e._s.push({ date: s.date, group: s.group, title: s.title });
  });
  Object.keys(byId).forEach(id => {
    const e = byId[id];
    e.recent = e._s.sort((a, b) => String(b.date).localeCompare(String(a.date))).slice(0, 12);
    delete e._s;
  });
  return byId;
}

// Ukentlig oppmøte-opplastning (Spond) — matcher mot loggede økter på
// dato+gruppe (beholder innholdet), oppretter minimal økt der ingen finnes,
// og skriver attendance-rader koblet til dash_members. Idempotent pr. økt.
// events: [{ date:'YYYY-MM-DD', time, group, title, attendees:[navn] }]
function dashImportWeekAttendance(events) {
  if (!Array.isArray(events)) throw new Error('events må være array');
  const sessions = readSheet(SHEET_NAMES.sessions, SESSION_COLS, parseSessionRow);
  const byKey = {};
  sessions.forEach(s => {
    const k = s.date + '|' + s.group;
    (byKey[k] || (byKey[k] = [])).push(s);
  });
  let matched = 0, created = 0;
  const rows = [];
  events.forEach((ev, i) => {
    const attendees = (ev.attendees || []).filter(Boolean);
    if (!ev.date || !ev.group) return;
    const k = ev.date + '|' + ev.group;
    let sess = (byKey[k] && byKey[k][0]) || null;
    if (sess) {
      matched++;
      // Oppdater oppmøtetallet på den loggede økta (innholdet røres ikke).
      updateSession(sess.id, { attendance: attendees.length });
    } else if (attendees.length) {
      sess = createSession({
        id: 's-' + Date.now() + '-' + i, // unik id selv ved flere i samme ms
        date: ev.date, time: ev.time || '', group: ev.group, trainer: '',
        title: ev.title || '', content: '', tags: [], attendance: attendees.length,
      });
      created++;
      (byKey[k] || (byKey[k] = [])).push(sess);
    } else {
      return;
    }
    attendees.forEach(name => rows.push({ sessionId: sess.id, memberName: name }));
  });
  const res = rows.length ? importAttendance(rows) : { count: 0, unmatched: 0 };
  return { matched: matched, created: created, checkins: res.count, unmatchedMembers: res.unmatched || 0 };
}

// Kalenderdata for dashboardet: loggede + planlagte økter + trenere.
// Skriving går via de eksisterende create/update/deleteSession|Planned.
function dashCalendar() {
  return {
    sessions: readSheet(SHEET_NAMES.sessions, SESSION_COLS, parseSessionRow),
    planned: readSheet(SHEET_NAMES.planned, PLANNED_COLS, parsePlannedRow),
    trainers: readSheet(SHEET_NAMES.trainers, TRAINER_COLS, parseTrainerRow),
  };
}

// Tema-balanse: fordeling av loggede økter på grupper og temaer (tags),
// for hele perioden og siste 90 dager — så trenerne ser hva som er over-
// eller underdekket. Kun økter med innhold (tittel/tags) teller som logget.
function dashThemes() {
  const sessions = readSheet(SHEET_NAMES.sessions, SESSION_COLS, parseSessionRow);
  const cutoff = new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 10);
  const groups = {}, tagsAll = {}, tagsRecent = {};
  let logged = 0, recentLogged = 0;
  sessions.forEach(s => {
    if (!s.date) return;
    const recent = s.date >= cutoff;
    const g = s.group || 'ukjent';
    const gg = groups[g] || (groups[g] = { group: g, sessions: 0, recent: 0, checkins: 0 });
    gg.sessions++;
    if (recent) gg.recent++;
    if (s.attendance != null && s.attendance !== '') gg.checkins += Number(s.attendance);
    const hasContent = (s.tags && s.tags.length) || s.title;
    if (hasContent) { logged++; if (recent) recentLogged++; }
    (s.tags || []).forEach(t => {
      tagsAll[t] = (tagsAll[t] || 0) + 1;
      if (recent) tagsRecent[t] = (tagsRecent[t] || 0) + 1;
    });
  });
  const toArr = (o) => Object.keys(o).map(k => ({ tag: k, sessions: o[k] })).sort((a, b) => b.sessions - a.sessions);
  return {
    groups: Object.keys(groups).map(k => groups[k]).sort((a, b) => b.sessions - a.sessions),
    tags: toArr(tagsAll),
    tagsRecent: toArr(tagsRecent),
    totalSessions: sessions.length, logged: logged, recentLogged: recentLogged, since: cutoff,
  };
}

// Mandag (ukestart) for en YYYY-MM-DD-dato — samme nøkkelformat som det
// historiske weeklyAttendance, så live-uker kan flettes rett inn.
function dashMonday(ymdStr) {
  const d = new Date(ymdStr + 'T00:00:00Z');
  if (isNaN(d.getTime())) return '';
  const dow = d.getUTCDay();
  d.setUTCDate(d.getUTCDate() + (dow === 0 ? -6 : 1 - dow));
  return d.toISOString().slice(0, 10);
}

// Live oppmøte fra trener-appens loggede økter (sessions + attendance).
// Check-ins pr. økt = session.attendance hvis satt, ellers antall
// attendance-rader. Brukes til å forlenge dashboardets historiske grunnlag.
function dashLiveOppmote() {
  const sessions = readSheet(SHEET_NAMES.sessions, SESSION_COLS, parseSessionRow);
  const attRows = readAttendance();
  const sById = {};
  sessions.forEach(s => { sById[s.id] = s; });
  const namesBySession = {};
  attRows.forEach(a => { (namesBySession[a.sessionId] || (namesBySession[a.sessionId] = [])).push(a.memberName); });

  const weekly = {};
  let total = 0;
  let sessCount = 0;
  let maxDate = '';
  sessions.forEach(s => {
    if (!s.date) return;
    const names = namesBySession[s.id] || [];
    const cnt = (s.attendance != null && s.attendance !== '') ? Number(s.attendance) : names.length;
    if (cnt > 0) sessCount++;
    total += cnt;
    const wk = dashMonday(s.date);
    if (wk) weekly[wk] = (weekly[wk] || 0) + cnt;
    if (s.date > maxDate) maxDate = s.date;
  });

  // Per-medlem leaderboard på memberId (faller tilbake til navn der id mangler).
  // Mindreårige maskeres til fornavn, som ellers i dashboardet.
  const idx = dashMemberIndex();
  const roster = {};
  rosterLite().forEach(m => { roster[m.id] = m; });
  // «Mest dedikerte» = nåværende medlemmer, talt fra faktiske oppmøte-rader.
  // Umatchede navn (typisk tidligere medlemmer) holdes utenfor leaderboarden,
  // men telles som unmatched (med mindre de er merket som sluttet).
  const byMember = {};
  let unmatched = 0;
  attRows.forEach(a => {
    if (!a.memberName) return;
    const s = sById[a.sessionId];
    const date = s ? s.date : '';
    const id = a.memberId || dashResolveMemberId(a.memberName, idx);
    if (!id) {
      if (!idx.ignored[a.memberName.toLowerCase().trim()]) unmatched++;
      return;
    }
    const rm = roster[id];
    let navn = rm ? rm.navn : a.memberName;
    if (rm && rm.minor) navn = String(navn).split(/\s+/)[0] || 'Medlem';
    const e = byMember[id] || (byMember[id] = { id: id, navn: navn, deltatt: 0, sist: '' });
    e.deltatt++;
    if (date > e.sist) e.sist = date;
  });
  const leaderboard = Object.keys(byMember).map(k => byMember[k])
    .sort((a, b) => b.deltatt - a.deltatt).slice(0, 10);

  return { weekly: weekly, total: total, sessions: sessCount, leaderboard: leaderboard, maxDate: maxDate, unmatched: unmatched };
}

// Nøkkel/verdi-metadata (import-tidspunkt o.l.).
function dashGetMeta() {
  const meta = {};
  dashRows(SHEET_NAMES.dashMeta, DASH_META_COLS).forEach(r => {
    if (r.key) meta[String(r.key)] = r.value;
  });
  return meta;
}
function dashSetMeta(pairs) {
  const sh = sheet(SHEET_NAMES.dashMeta);
  const current = dashGetMeta();
  Object.keys(pairs).forEach(k => { current[k] = pairs[k]; });
  dashClear(SHEET_NAMES.dashMeta, DASH_META_COLS);
  const keys = Object.keys(current);
  if (keys.length) {
    sh.getRange(2, 1, keys.length, DASH_META_COLS.length)
      .setValues(keys.map(k => [k, current[k] == null ? '' : String(current[k])]));
  }
}

// Les rader fra et ark som objekter (header-styrt), uten parsing/filtrering.
function dashRows(name, cols) {
  const sh = sheet(name);
  const last = sh.getLastRow();
  if (last < 2) return [];
  return sh.getRange(2, 1, last - 1, cols.length).getValues().map(r => rowToObj(r, cols));
}

function dashReadGradingGrouped() {
  const rows = dashRows(SHEET_NAMES.dashGrading, DASH_GRADING_COLS);
  const by = {};
  rows.forEach(r => {
    const id = String(r.memberId || '');
    if (!id) return;
    (by[id] || (by[id] = [])).push(r);
  });
  return by;
}

function dashReadMembers() {
  const grouped = dashReadGradingGrouped();
  const att = dashAttendanceByMember();
  return dashRows(SHEET_NAMES.dashMembers, DASH_MEMBER_COLS)
    .filter(o => o.id !== '' && o.id != null)
    .map(o => dashMemberObj(o, grouped[String(o.id)] || [], att[String(o.id)] || null));
}

function dashMemberObj(o, events, att) {
  let history = events.map(e => ({
    id: String(e.eventId || ''),
    date: ymd(e.date),
    kind: String(e.kind || ''),
    belt: String(e.belt || 'Hvit'),
    stripes: Number(e.stripes || 0),
    by: e.by === '' || e.by == null ? null : String(e.by),
    note: String(e.note || ''),
    _seq: Number(e.seq || 0),
  }));
  if (!history.length) {
    const since = o.innmeldingsdato ? ymd(o.innmeldingsdato) : (o.beltSince ? ymd(o.beltSince) : '');
    history = [{ id: 'g_innm', date: since, kind: 'innmelding', belt: 'Hvit', stripes: 0, by: null, note: 'Innmeldt', _seq: 1 }];
  }
  history.sort((a, b) => a.date === b.date ? (a._seq - b._seq) : String(a.date).localeCompare(String(b.date)));
  const last = history[history.length - 1];
  // Gjeldende belte tas fra den denormaliserte kolonna (settes ved gradering/
  // import), IKKE fra dato-sortert historikk. Da trumfer beltegraden datoen —
  // viktig fordi graderingsdato kan være før innmeldingsdato (Spond-bytte 2019/20).
  const curBelt = o.beltCurrent ? String(o.beltCurrent) : last.belt;
  const curStripes = o.beltCurrent ? Number(o.stripesCurrent || 0) : last.stripes;
  const curSince = o.beltSince ? ymd(o.beltSince) : last.date;
  return {
    id: String(o.id),
    fornavn: String(o.fornavn || ''),
    etternavn: String(o.etternavn || ''),
    navn: String(o.navn || ((o.fornavn || '') + ' ' + (o.etternavn || '')).trim()),
    kategori: String(o.kategori || 'Annet'),
    medlemstype: String(o.medlemstype || ''),
    prisMnd: o.prisMnd === '' || o.prisMnd == null ? 0 : Number(o.prisMnd),
    epost: String(o.epost || ''),
    mobil: String(o.mobil || ''),
    kjonn: String(o.kjonn || 'Ukjent'),
    innmeldingsdato: o.innmeldingsdato ? ymd(o.innmeldingsdato) : null,
    fodselsdato: o.fodselsdato ? ymd(o.fodselsdato) : null,
    alder: o.alder === '' || o.alder == null ? null : Number(o.alder),
    adresse: String(o.adresse || ''),
    postnr: String(o.postnr || ''),
    poststed: String(o.poststed || ''),
    minor: o.minor === true || o.minor === 'true' || o.minor === 1,
    foresatte: [],
    oppmote: (function () {
      // Denormalisert (fra roster-import) vs. faktiske attendance-rader.
      // Bruk den faktiske der den finnes — da stemmer profilen med oppmøtet.
      const denCheckins = o.oppmoteCheckins === '' || o.oppmoteCheckins == null ? 0 : Number(o.oppmoteCheckins);
      const denSiste = o.oppmoteSiste ? ymd(o.oppmoteSiste) : null;
      return {
        checkins: att && att.checkins ? att.checkins : denCheckins,
        pct: o.oppmotePct === '' || o.oppmotePct == null ? null : Number(o.oppmotePct),
        sisteOppmote: att && att.sist ? att.sist : denSiste,
        recent: att && att.recent ? att.recent : [],
      };
    })(),
    grading: { current: { belt: curBelt, stripes: curStripes, since: curSince }, history: history },
  };
}

function dashReadOkonomi() {
  const months = {};
  dashRows(SHEET_NAMES.dashOkonomi, DASH_OKONOMI_COLS).forEach(r => {
    const m = ymKey(r.month);
    if (!m) return;
    let byKat = {};
    try { byKat = r.byKategori ? JSON.parse(r.byKategori) : {}; } catch (e) { byKat = {}; }
    months[m] = {
      netto: Number(r.netto || 0), brutto: Number(r.brutto || 0),
      avgifter: Number(r.avgifter || 0), antall: Number(r.antall || 0), byKategori: byKat,
    };
  });
  return months;
}

// Måned-nøkkel som ren 'YYYY-MM'. Google Sheets tolker gjerne "2021-09" som
// en dato og lagrer den som Date — denne henter måneden tilbake uansett.
function ymKey(v) {
  if (v == null || v === '') return '';
  if (typeof v === 'string' && /^\d{4}-\d{2}$/.test(v)) return v;
  const d = (v instanceof Date) ? v : new Date(v);
  if (!isNaN(d.getTime())) return d.getFullYear() + '-' + pad2(d.getMonth() + 1);
  return String(v);
}

// Tøm dataradene i et ark (behold header).
function dashClear(name, cols) {
  const sh = sheet(name);
  const last = sh.getLastRow();
  if (last >= 2) sh.getRange(2, 1, last - 1, cols.length).clearContent();
}

// Oppdater denormalisert gjeldende belte for ett medlem.
function dashUpdateCurrent(id, cur) {
  const sh = sheet(SHEET_NAMES.dashMembers);
  const idx = findRowIndex(sh, id);
  if (idx === -1) return;
  const obj = rowToObj(sh.getRange(idx, 1, 1, DASH_MEMBER_COLS.length).getValues()[0], DASH_MEMBER_COLS);
  obj.beltCurrent = cur.belt;
  obj.stripesCurrent = cur.stripes;
  obj.beltSince = cur.since;
  obj.updatedAt = new Date().toISOString();
  writeRow(sh, idx, DASH_MEMBER_COLS, obj);
}

// Full overskriving av register + graderingslogg fra klientens sammenslåtte
// liste (klienten har gjort diff/merge og bevart historikk for matchede).
function dashImportRoster(members) {
  if (!Array.isArray(members)) throw new Error('members må være array');
  dashClear(SHEET_NAMES.dashMembers, DASH_MEMBER_COLS);
  dashClear(SHEET_NAMES.dashGrading, DASH_GRADING_COLS);
  const now = new Date().toISOString();
  const mRows = [];
  const gRows = [];
  members.forEach(m => {
    const g = m.grading || {};
    const cur = g.current || { belt: 'Hvit', stripes: 0, since: '' };
    const rowObj = {
      id: m.id, fornavn: m.fornavn || '', etternavn: m.etternavn || '', navn: m.navn || '',
      kategori: m.kategori || '', medlemstype: m.medlemstype || '', prisMnd: m.prisMnd || 0,
      epost: m.epost || '', mobil: m.mobil || '', kjonn: m.kjonn || '',
      innmeldingsdato: m.innmeldingsdato || '', fodselsdato: m.fodselsdato || '',
      alder: m.alder == null ? '' : m.alder, adresse: m.adresse || '',
      postnr: m.postnr || '', poststed: m.poststed || '', minor: m.minor ? true : false,
      beltCurrent: cur.belt || 'Hvit', stripesCurrent: cur.stripes || 0, beltSince: cur.since || '',
      oppmoteCheckins: (m.oppmote && m.oppmote.checkins) || 0,
      oppmotePct: (m.oppmote && m.oppmote.pct != null) ? m.oppmote.pct : '',
      oppmoteSiste: (m.oppmote && m.oppmote.sisteOppmote) || '',
      updatedAt: now,
    };
    mRows.push(DASH_MEMBER_COLS.map(c => objField(rowObj, c)));
    ((g.history) || []).forEach(e => {
      gRows.push([String(m.id), String(e.id || ('g' + Math.random().toString(36).slice(2, 9))),
        ymd(e.date), String(e.kind || ''), String(e.belt || 'Hvit'), Number(e.stripes || 0),
        e.by == null ? '' : String(e.by), String(e.note || ''), Number(e._seq || 0), now]);
    });
  });
  if (mRows.length) sheet(SHEET_NAMES.dashMembers).getRange(2, 1, mRows.length, DASH_MEMBER_COLS.length).setValues(mRows);
  if (gRows.length) sheet(SHEET_NAMES.dashGrading).getRange(2, 1, gRows.length, DASH_GRADING_COLS.length).setValues(gRows);
  dashSetMeta({ rosterImportedAt: now, rosterCount: members.length });
  return { total: members.length, gradingEvents: gRows.length };
}

// Legg til graderingshendelser (klienten har resolvert belte/striper pr. medlem).
function dashGrade(events) {
  if (!Array.isArray(events)) throw new Error('events må være array');
  const gsh = sheet(SHEET_NAMES.dashGrading);
  const grouped = dashReadGradingGrouped();
  const now = new Date().toISOString();
  const append = [];
  const updates = {};
  events.forEach(ev => {
    const id = String(ev.memberId || '');
    if (!id) return;
    const existing = grouped[id] || [];
    const pendingForId = append.filter(a => a[0] === id).length;
    const seq = existing.reduce((mx, e) => Math.max(mx, Number(e.seq || 0)), 0) + 1 + pendingForId;
    append.push([id, 'g' + Math.random().toString(36).slice(2, 9), ymd(ev.date) || ymd(now),
      String(ev.kind || ''), String(ev.belt || 'Hvit'), Number(ev.stripes || 0),
      ev.by == null ? '' : String(ev.by), String(ev.note || ''), seq, now]);
    updates[id] = { belt: String(ev.belt || 'Hvit'), stripes: Number(ev.stripes || 0), since: ymd(ev.date) || ymd(now) };
  });
  if (append.length) gsh.getRange(gsh.getLastRow() + 1, 1, append.length, DASH_GRADING_COLS.length).setValues(append);
  Object.keys(updates).forEach(id => dashUpdateCurrent(id, updates[id]));
  return { applied: append.length };
}

// Fjern siste (ikke-innmelding) hendelse for et medlem, rekalkuler gjeldende.
function dashUndoLast(memberId) {
  const id = String(memberId || '');
  if (!id) throw new Error('memberId mangler');
  const gsh = sheet(SHEET_NAMES.dashGrading);
  const last = gsh.getLastRow();
  if (last < 2) return { undone: false };
  const rows = gsh.getRange(2, 1, last - 1, DASH_GRADING_COLS.length).getValues();
  let targetRow = -1;
  let targetSeq = -1;
  for (let i = 0; i < rows.length; i++) {
    if (String(rows[i][0]) === id && String(rows[i][3]) !== 'innmelding') {
      const seq = Number(rows[i][8] || 0);
      if (seq >= targetSeq) { targetSeq = seq; targetRow = i + 2; }
    }
  }
  if (targetRow === -1) return { undone: false };
  gsh.deleteRow(targetRow);
  const grouped = dashReadGradingGrouped();
  const hist = (grouped[id] || []).slice().sort((a, b) =>
    String(a.date) === String(b.date) ? Number(a.seq || 0) - Number(b.seq || 0) : String(a.date).localeCompare(String(b.date)));
  const cur = hist.length ? hist[hist.length - 1] : { belt: 'Hvit', stripes: 0, date: '' };
  dashUpdateCurrent(id, { belt: String(cur.belt || 'Hvit'), stripes: Number(cur.stripes || 0), since: cur.date ? ymd(cur.date) : '' });
  return { undone: true };
}

// Slå sammen importerte måneder med eksisterende (idempotent re-import).
function dashImportOkonomi(months) {
  if (!months || typeof months !== 'object') throw new Error('months mangler');
  const sh = sheet(SHEET_NAMES.dashOkonomi);
  const now = new Date().toISOString();
  const merged = dashReadOkonomi();
  Object.keys(months).forEach(k => { merged[k] = months[k]; });
  dashClear(SHEET_NAMES.dashOkonomi, DASH_OKONOMI_COLS);
  const keys = Object.keys(merged).sort();
  const rows = keys.map(k => {
    const m = merged[k];
    return [k, Number(m.netto || 0), Number(m.brutto || 0), Number(m.avgifter || 0),
      Number(m.antall || 0), JSON.stringify(m.byKategori || {}), now];
  });
  if (rows.length) {
    // Tving måned-kolonna til tekst FØR skriving, ellers omkoder Sheets
    // "2021-09" til en dato.
    sh.getRange(2, 1, rows.length, 1).setNumberFormat('@');
    sh.getRange(2, 1, rows.length, DASH_OKONOMI_COLS.length).setValues(rows);
  }
  dashSetMeta({ okonomiImportedAt: now, okonomiMonths: keys.length, okonomiLatest: keys.length ? keys[keys.length - 1] : '' });
  return { months: keys.length, added: Object.keys(months).length };
}

// Kjør én gang fra editoren for å opprette dashboard-arkene.
function _setupDashSheets() {
  [SHEET_NAMES.dashMembers, SHEET_NAMES.dashGrading, SHEET_NAMES.dashOkonomi, SHEET_NAMES.dashMeta].forEach(n => sheet(n));
  Logger.log('Dashboard-ark opprettet: dash_members, dash_grading, dash_okonomi, dash_meta.');
}

// ─── Helpers ───────────────────────────────────────────────────────

function sheet(name) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    const cols = name === SHEET_NAMES.sessions   ? SESSION_COLS
              : name === SHEET_NAMES.planned    ? PLANNED_COLS
              : name === SHEET_NAMES.trainers   ? TRAINER_COLS
              : name === SHEET_NAMES.members    ? MEMBER_COLS
              : name === SHEET_NAMES.attendance ? ATTENDANCE_COLS
              : name === SHEET_NAMES.bmEntries  ? BM_ENTRY_COLS
              : name === SHEET_NAMES.bmSettings ? BM_SETTINGS_COLS
              : name === SHEET_NAMES.bmWeekGoals ? BM_WEEKGOAL_COLS
              : name === SHEET_NAMES.dashMembers ? DASH_MEMBER_COLS
              : name === SHEET_NAMES.dashGrading ? DASH_GRADING_COLS
              : name === SHEET_NAMES.dashOkonomi ? DASH_OKONOMI_COLS
              : name === SHEET_NAMES.dashMeta    ? DASH_META_COLS
              : [];
    if (cols.length) sh.appendRow(cols);
  }
  return sh;
}

function rowToObj(row, cols) {
  const o = {};
  cols.forEach((c, i) => { o[c] = row[i]; });
  return o;
}

function appendRow(name, cols, obj) {
  const sh = sheet(name);
  const row = cols.map(c => objField(obj, c));
  sh.appendRow(row);
}

function writeRow(sh, idx, cols, obj) {
  const row = cols.map(c => objField(obj, c));
  sh.getRange(idx, 1, 1, cols.length).setValues([row]);
}

function objField(obj, c) {
  const v = obj[c];
  if (c === 'tags' && Array.isArray(v)) return serializeTags(v);
  if (v == null) return '';
  return v;
}

function findRowIndex(sh, id) {
  const lastRow = sh.getLastRow();
  if (lastRow < 2) return -1;
  const ids = sh.getRange(2, 1, lastRow - 1, 1).getValues();
  for (let i = 0; i < ids.length; i++) {
    if (String(ids[i][0]) === String(id)) return i + 2;
  }
  return -1;
}

function ymd(v) {
  if (!v) return '';
  if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  // Aksepter Date-objekt eller hvilken som helst parsable streng
  // (f.eks. "Thu May 07 2026 00:00:00 GMT+0200" hvis cellen er lagret som tekst).
  const d = (v instanceof Date) ? v : new Date(v);
  if (!isNaN(d.getTime())) {
    return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
  }
  return String(v);
}

function hm(v) {
  if (!v) return '';
  if (typeof v === 'string' && /^\d{1,2}:\d{2}/.test(v)) {
    const parts = v.split(':');
    return pad2(parts[0]) + ':' + parts[1].slice(0, 2);
  }
  const d = (v instanceof Date) ? v : new Date(v);
  if (!isNaN(d.getTime())) return pad2(d.getHours()) + ':' + pad2(d.getMinutes());
  return String(v);
}

function pad2(n) { return String(n).padStart(2, '0'); }

// Defensiv ISO-konvertering: returner null hvis verdien ikke kan parses
// som en gyldig dato. Brukes på createdAt/updatedAt der celle-formatet
// kan ha blitt forvirret av Sheets sin auto-deteksjon ved round-trip.
function safeIso(v) {
  if (v == null || v === '') return null;
  if (v instanceof Date) return isNaN(v.getTime()) ? null : v.toISOString();
  var d = new Date(v);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

function parseTags(v) {
  if (!v) return [];
  if (Array.isArray(v)) return v;
  return String(v).split('|').map(s => s.trim()).filter(Boolean);
}

function serializeTags(v) {
  if (!v) return '';
  if (Array.isArray(v)) return v.join('|');
  return String(v);
}

// Apps Script ContentService kan ikke sette HTTP-status — klienten må sjekke payload.ok.
function json(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

// ─── Test (kjør manuelt fra editoren) ──────────────────────────────

function _testSetupSheets() {
  // Kjør én gang for å lage alle ark og skrive inn headers.
  Object.values(SHEET_NAMES).forEach(n => sheet(n));
  Logger.log('Alle ark opprettet med headers.');
}

function _testRoundtrip() {
  const created = createSession({
    date: '2026-05-06', time: '18:00', group: 'gi', trainer: 'ola',
    title: 'test fra Apps Script', content: 'integrasjonstest',
    tags: ['guard','drill','grunn'], attendance: 12,
  });
  Logger.log('Created: ' + JSON.stringify(created));
  const updated = updateSession(created.id, { content: 'oppdatert' });
  Logger.log('Updated: ' + JSON.stringify(updated));
  deleteRow(SHEET_NAMES.sessions, created.id);
  Logger.log('Deleted.');
}

// ─── Migrering til ny gruppemodell ─────────────────────────────────
// Kjøres MANUELT fra Apps Script-editoren én gang. Rekkefølge:
//   1. _migrateBackup()        — kopierer hele arbeidsboka som sikkerhet
//   2. _migrateToNewGroups()   — omklassifiserer gamle gruppenavn
// Begge er idempotente — å kjøre dem flere ganger gjør ingen skade.
// Migrasjons-reglene:
//   junior        → junior (uendret)
//   åpen matte    → åpen matte (uendret)
//   grunnleggende → gi (eller nogi hvis "nogi" i tittel) + tag "grunn"
//   erfaren       → gi (eller nogi hvis "nogi" i tittel) + tag "erfaren"
//   alle nivåer   → gi (eller nogi hvis "nogi" i tittel) + tag "mix"

function _migrateBackup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const tz = ss.getSpreadsheetTimeZone() || 'Europe/Oslo';
  const ts = Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd_HH-mm');
  const backupName = ss.getName() + ' — backup ' + ts;
  const copy = ss.copy(backupName);
  Logger.log('Backup opprettet: ' + backupName);
  Logger.log('URL: ' + copy.getUrl());
  return copy.getUrl();
}

function _migrateToNewGroups() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const now = new Date().toISOString();
  const isNoGi = (title) => {
    const t = String(title || '').toLowerCase();
    return t.indexOf('nogi') >= 0 || t.indexOf('no-gi') >= 0 || t.indexOf('no gi') >= 0;
  };

  // 1. sessions: gruppe + nivå-tag + updatedAt
  const sh = ss.getSheetByName(SHEET_NAMES.sessions);
  if (!sh) throw new Error('Fant ikke sessions-ark');
  const lastRow = sh.getLastRow();
  let migrated = 0, skipped = 0;
  const fordeling = { gi: 0, nogi: 0, junior: 0, 'åpen matte': 0 };

  if (lastRow >= 2) {
    const range = sh.getRange(2, 1, lastRow - 1, SESSION_COLS.length);
    const data = range.getValues();
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const grp = String(row[3] || '').trim().toLowerCase();
      const title = row[5];
      const tagsStr = String(row[7] || '');
      const tags = tagsStr ? tagsStr.split('|').map(t => t.trim()).filter(Boolean) : [];

      let newGroup = null, newTag = null;
      if (grp === 'grunnleggende')     { newGroup = isNoGi(title) ? 'nogi' : 'gi'; newTag = 'grunn'; }
      else if (grp === 'erfaren')       { newGroup = isNoGi(title) ? 'nogi' : 'gi'; newTag = 'erfaren'; }
      else if (grp === 'alle nivåer' || grp === 'alle nivaer') {
        newGroup = isNoGi(title) ? 'nogi' : 'gi'; newTag = 'mix';
      }

      if (!newGroup) { skipped++; continue; }

      data[i][3] = newGroup;
      if (newTag && tags.indexOf(newTag) < 0) {
        tags.push(newTag);
        data[i][7] = tags.join('|');
      }
      data[i][10] = now;
      fordeling[newGroup] = (fordeling[newGroup] || 0) + 1;
      migrated++;
    }
    range.setValues(data);
  }
  Logger.log('Sessions migrert: ' + migrated + ' (hoppet over: ' + skipped + ')');
  Logger.log('Sessions-fordeling: ' + JSON.stringify(fordeling));

  // 2. planned: kun gruppe
  const psh = ss.getSheetByName(SHEET_NAMES.planned);
  let pMigrated = 0;
  if (psh) {
    const pLast = psh.getLastRow();
    if (pLast >= 2) {
      const pRange = psh.getRange(2, 1, pLast - 1, PLANNED_COLS.length);
      const pData = pRange.getValues();
      for (let i = 0; i < pData.length; i++) {
        const grp = String(pData[i][3] || '').trim().toLowerCase();
        const title = pData[i][5];
        if (grp === 'grunnleggende' || grp === 'erfaren' ||
            grp === 'alle nivåer' || grp === 'alle nivaer') {
          pData[i][3] = isNoGi(title) ? 'nogi' : 'gi';
          pMigrated++;
        }
      }
      pRange.setValues(pData);
    }
  }
  Logger.log('Planned migrert: ' + pMigrated);
  Logger.log('Migrering fullført.');
}

// ─── Bygg motoren — fotball-egentrening (løft.app/fotball) ─────────
// Lagrer økt-entries og innstillinger i to nye faner. Forberedt for
// flere brukere via 'user'-kolonne — single-user kan bare bruke '' (tom).

function _setupBmSheets() {
  // Kjør én gang manuelt fra editoren for å opprette fanene.
  sheet(SHEET_NAMES.bmEntries);
  sheet(SHEET_NAMES.bmSettings);
  sheet(SHEET_NAMES.bmWeekGoals);
  Logger.log('bm_entries, bm_settings og bm_week_goals opprettet med headers.');
}

// Alle bm*-funksjoner er program-bevisste. Filtrer på user + program
// (tomme felter aksepteres som "ungdom" for å bevare eksisterende data).
function bmList(userFilter, programFilter) {
  const prog = bmProgram(programFilter);
  return {
    entries:   bmReadEntries(userFilter, prog),
    settings:  bmReadSettings(userFilter, prog),
    weekGoals: bmReadWeekGoals(userFilter, prog),
  };
}

function bmReadWeekGoals(userFilter, programFilter) {
  const sh = sheet(SHEET_NAMES.bmWeekGoals);
  const lastRow = sh.getLastRow();
  if (lastRow < 2) return {};
  const range = sh.getRange(2, 1, lastRow - 1, BM_WEEKGOAL_COLS.length).getValues();
  const out = {};
  range.forEach(row => {
    const o = rowToObj(row, BM_WEEKGOAL_COLS);
    if (!o.week) return;
    if (userFilter && String(o.user || '') !== String(userFilter)) return;
    if (programFilter && bmProgram(o.program) !== programFilter) return;
    const g = Number(o.goal);
    if (!isNaN(g)) out[String(o.week)] = g;
  });
  return out;
}

function bmSetWeekGoal(user, program, week, value) {
  if (!week) throw new Error('week mangler');
  const userStr = String(user || '');
  const prog    = bmProgram(program);
  const valStr  = value == null ? '' : String(value);
  const sh = sheet(SHEET_NAMES.bmWeekGoals);
  const lastRow = sh.getLastRow();
  if (lastRow >= 2) {
    const data = sh.getRange(2, 1, lastRow - 1, BM_WEEKGOAL_COLS.length).getValues();
    for (let i = 0; i < data.length; i++) {
      const rowUser = String(data[i][0] || '');
      const rowProg = bmProgram(data[i][1]);
      const rowWeek = String(data[i][2] || '');
      if (rowUser === userStr && rowProg === prog && rowWeek === String(week)) {
        sh.getRange(i + 2, 4).setValue(valStr);
        return { user: userStr, program: prog, week: String(week), goal: valStr };
      }
    }
  }
  appendRow(SHEET_NAMES.bmWeekGoals, BM_WEEKGOAL_COLS,
    { user: userStr, program: prog, week: String(week), goal: valStr });
  return { user: userStr, program: prog, week: String(week), goal: valStr };
}

function bmReadEntries(userFilter, programFilter) {
  const sh = sheet(SHEET_NAMES.bmEntries);
  const lastRow = sh.getLastRow();
  if (lastRow < 2) return [];
  const range = sh.getRange(2, 1, lastRow - 1, BM_ENTRY_COLS.length).getValues();
  return range
    .map(row => rowToObj(row, BM_ENTRY_COLS))
    .filter(o => o.id)
    .filter(o => !userFilter || String(o.user || '') === String(userFilter))
    .filter(o => !programFilter || bmProgram(o.program) === programFilter)
    .map(o => ({
      id: String(o.id),
      user: String(o.user || ''),
      program: bmProgram(o.program),
      date: ymd(o.date),
      okt: String(o.okt || ''),
      parts: o.parts ? String(o.parts).split('|').map(s => s === '1') : [],
      rekord: String(o.rekord || ''),
      note: String(o.note || ''),
      xp: o.xp === '' || o.xp == null ? 0 : Number(o.xp),
      createdAt: safeIso(o.createdAt),
    }));
}

function bmReadSettings(userFilter, programFilter) {
  const sh = sheet(SHEET_NAMES.bmSettings);
  const lastRow = sh.getLastRow();
  if (lastRow < 2) return {};
  const range = sh.getRange(2, 1, lastRow - 1, BM_SETTINGS_COLS.length).getValues();
  const out = {};
  range.forEach(row => {
    const o = rowToObj(row, BM_SETTINGS_COLS);
    if (!o.key) return;
    if (userFilter && String(o.user || '') !== String(userFilter)) return;
    if (programFilter && bmProgram(o.program) !== programFilter) return;
    out[String(o.key)] = String(o.value == null ? '' : o.value);
  });
  return out;
}

function bmCreate(payload) {
  if (!payload) throw new Error('payload mangler');
  const id = payload.id || ('bm-' + Date.now());
  const partsStr = Array.isArray(payload.parts)
    ? payload.parts.map(p => p ? '1' : '0').join('|')
    : String(payload.parts || '');
  const row = {
    id,
    user: String(payload.user || ''),
    program: bmProgram(payload.program),
    date: String(payload.date || ''),
    okt: String(payload.okt || ''),
    parts: partsStr,
    rekord: payload.rekord != null ? String(payload.rekord) : '',
    note: String(payload.note || ''),
    xp: payload.xp == null ? 0 : Number(payload.xp),
    createdAt: new Date().toISOString(),
  };
  appendRow(SHEET_NAMES.bmEntries, BM_ENTRY_COLS, row);
  return Object.assign({}, row, {
    parts: Array.isArray(payload.parts) ? payload.parts : [],
  });
}

function bmSetSetting(user, program, key, value) {
  if (!key) throw new Error('key mangler');
  const userStr = String(user || '');
  const prog    = bmProgram(program);
  const valStr  = value == null ? '' : String(value);
  const sh = sheet(SHEET_NAMES.bmSettings);
  const lastRow = sh.getLastRow();
  if (lastRow >= 2) {
    const data = sh.getRange(2, 1, lastRow - 1, BM_SETTINGS_COLS.length).getValues();
    for (let i = 0; i < data.length; i++) {
      const rowUser = String(data[i][0] || '');
      const rowProg = bmProgram(data[i][1]);
      const rowKey  = String(data[i][2] || '');
      if (rowUser === userStr && rowProg === prog && rowKey === String(key)) {
        sh.getRange(i + 2, 4).setValue(valStr);
        return { user: userStr, program: prog, key: String(key), value: valStr };
      }
    }
  }
  appendRow(SHEET_NAMES.bmSettings, BM_SETTINGS_COLS,
    { user: userStr, program: prog, key: String(key), value: valStr });
  return { user: userStr, program: prog, key: String(key), value: valStr };
}

// ─── Migrering: legg til 'program'-kolonne i bm-fanene ─────────────
// Kjøres ÉN gang manuelt fra editoren. Idempotent — kan kjøres flere
// ganger. Setter program='ungdom' på alle eksisterende rader (de er
// alle fra Bygg motoren-tiden før de andre programmene fantes).
//
// Forutsetning: pasted ny Code.gs (med utvidede BM_*_COLS) + kjørt
// _setupBmSheets() slik at headers er oppdatert.
function _migrateBmAddProgram() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  // progColIdx er 0-indeksert i cols-arrayen (program ligger på index 2
  // i bm_entries, index 1 i de to andre). Sheets-API tar 1-indeksert
  // kolonnenummer, så vi gjør +1 ved getRange.
  const targets = [
    { name: SHEET_NAMES.bmEntries,   cols: BM_ENTRY_COLS,    progColIdx: 2 },
    { name: SHEET_NAMES.bmSettings,  cols: BM_SETTINGS_COLS, progColIdx: 1 },
    { name: SHEET_NAMES.bmWeekGoals, cols: BM_WEEKGOAL_COLS, progColIdx: 1 },
  ];
  targets.forEach(t => {
    const sh = ss.getSheetByName(t.name);
    if (!sh) { Logger.log('Hopper over: ' + t.name + ' (finnes ikke)'); return; }
    // Sett header om mangler
    const headerLen = sh.getLastColumn();
    if (headerLen < t.cols.length) {
      sh.getRange(1, 1, 1, t.cols.length).setValues([t.cols]);
    }
    const lastRow = sh.getLastRow();
    if (lastRow < 2) { Logger.log(t.name + ': ingen rader å migrere'); return; }
    const sheetsCol = t.progColIdx + 1;
    const range = sh.getRange(2, sheetsCol, lastRow - 1, 1);
    const vals = range.getValues();
    let filled = 0, alreadySet = 0;
    for (let i = 0; i < vals.length; i++) {
      const cur = vals[i][0];
      if (!cur || String(cur).trim() === '') {
        vals[i][0] = 'ungdom';
        filled++;
      } else {
        alreadySet++;
      }
    }
    range.setValues(vals);
    Logger.log(t.name + ' (kolonne ' + sheetsCol + '): fylte ' + filled +
               ' rader (allerede satt: ' + alreadySet + ')');
  });
  Logger.log('Migrering fullført.');
}
