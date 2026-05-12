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
// Hemmelig token. Endre til noe ingen vil gjette.
// Frontend må sende samme token i ?token=... eller body.
const SHARED_TOKEN = 'bjj-bodø-2026-bytt-meg';

const SHEET_NAMES = {
  sessions: 'sessions',
  planned:  'planned',
  trainers: 'trainers',
  members:  'members',
  attendance: 'attendance',
};

const SESSION_COLS = ['id','date','time','group','trainer','title','content','tags','attendance','createdAt','updatedAt'];
const PLANNED_COLS = ['id','date','time','group','trainer','title'];
const TRAINER_COLS = ['id','name','active'];
const MEMBER_COLS  = ['name','aliases','active'];
const ATTENDANCE_COLS = ['sessionId','memberName','importedAt'];

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
      case 'ping':            return json({ ok: true, data: { now: new Date().toISOString() } });
      default:                return json({ ok: false, error: 'unknown action: ' + action });
    }
  } catch (err) {
    return json({ ok: false, error: String(err && err.message || err) });
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
    importedAt: row[2] instanceof Date ? row[2].toISOString() : (row[2] ? String(row[2]) : null),
  })).filter(r => r.sessionId && r.memberName);
}

function readSheet(name, cols, parser) {
  const sh = sheet(name);
  const lastRow = sh.getLastRow();
  if (lastRow < 2) return [];
  const range = sh.getRange(2, 1, lastRow - 1, cols.length).getValues();
  return range
    .map(row => parser(rowToObj(row, cols)))
    .filter(x => x && x.id !== '' && x.id != null || (x && x.name && !x.id));
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
    createdAt: o.createdAt ? new Date(o.createdAt).toISOString() : null,
    updatedAt: o.updatedAt ? new Date(o.updatedAt).toISOString() : null,
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
  if (rows.length === 0) return { count: 0, newMembers: 0 };
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

  // Skriv nye rader
  const data = rows.map(r => [String(r.sessionId), String(r.memberName), r.importedAt || now]);
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

  return { count: data.length, newMembers: newNames.length };
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
    date: '2026-05-06', time: '18:00', group: 'grunnleggende', trainer: 'ola',
    title: 'test fra Apps Script', content: 'integrasjonstest',
    tags: ['guard','drill'], attendance: 12,
  });
  Logger.log('Created: ' + JSON.stringify(created));
  const updated = updateSession(created.id, { content: 'oppdatert' });
  Logger.log('Updated: ' + JSON.stringify(updated));
  deleteRow(SHEET_NAMES.sessions, created.id);
  Logger.log('Deleted.');
}
