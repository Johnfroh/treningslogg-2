// Treningslogg — felles modul (theme + utils + compute)
// Lastes som vanlig JS før mobile.jsx og desktop.jsx, så alle konstanter
// og hjelpefunksjoner er globalt tilgjengelige.

// ─── Steel-tema ────────────────────────────────────────────────────
const STEEL_FONT = "'Roboto Mono', 'Courier New', monospace";

const M = {
  bg:        '#141210',
  card:      '#1F1C19',
  cardHi:    '#28241F',
  ink:       '#F0EAE0',
  inkSoft:   '#F0EAE0',
  mid:       '#8C8278',
  rule:      '#332E28',
  ruleHi:    '#4A4239',
  accent:    '#CC7A3D',
  accent2:   '#5E9E6E',
  amber:     '#D9933A',
  coral:     '#C46B53',
  copperHi:  '#E89859',
  tabBg:     '#0B0A09',
  shadow:    'none',
  shadowLg:  'none',
};

const M_GROUP = {
  'junior':         M.copperHi,
  'grunnleggende':  M.accent2,
  'erfaren':        M.coral,
  'alle nivåer':    M.mid,
  'åpen matte':     M.amber,
};

const M_TAG_COLOR = {
  position: M.accent2,
  action:   M.coral,
  custom:   M.accent,
};

// ─── Periode-velger (delt mellom mobil og desktop) ─────────────────
const PERIOD_OPTIONS = [
  { id: '7d',     label: '7 d',     days: 7   },
  { id: '30d',    label: '30 d',    days: 30  },
  { id: '90d',    label: '90 d',    days: 90  },
  { id: 'sesong', label: 'sesong',  days: 180 },
];

// ─── Util ──────────────────────────────────────────────────────────
const pad = (n) => String(n).padStart(2, '0');
const ymdM = (d) => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const parseYmdM = (s) => { const [y,m,d] = s.split('-').map(Number); return new Date(y, m-1, d); };
const sameMonth = (a, b) => a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear();

// Lager en tag-id av fri tekst: "Closed Guard" → "closed-guard", "Åpen matte" → "apen-matte"
const slugifyTag = (s) => String(s || '').trim().toLowerCase()
  .replace(/ø/g, 'o').replace(/æ/g, 'ae').replace(/å/g, 'a')
  .normalize('NFKD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

// Telle tag-bruk på tvers av økter
const countTagUse = (sessions) => {
  const c = {};
  (sessions || []).forEach(s => (s.tags || []).forEach(t => { c[t] = (c[t] || 0) + 1; }));
  return c;
};

// Expander recurring planlegging til en liste av YYYY-MM-DD-datoer.
const expandRecurring = (startYmd, untilYmd, dayOfWeeks) => {
  if (!startYmd || !untilYmd || !dayOfWeeks?.length) return [];
  const start = parseYmdM(startYmd);
  const until = parseYmdM(untilYmd);
  if (until < start) return [];
  const dowSet = new Set(dayOfWeeks);
  const out = [];
  const cur = new Date(start);
  for (let i = 0; i < 365 && cur <= until; i++) {
    if (dowSet.has(cur.getDay())) out.push(ymdM(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return out;
};

const NOW = new Date();
const TODAY_M = ymdM(NOW);

const NORWAY_MONTHS = ['januar','februar','mars','april','mai','juni','juli','august','september','oktober','november','desember'];
const NORWAY_DAYS_SHORT = ['søn','man','tir','ons','tor','fre','lør'];
const NORWAY_DAYS_LONG = ['søndag','mandag','tirsdag','onsdag','torsdag','fredag','lørdag'];
const NORWAY_DAYS_INITIAL = ['S','M','T','O','T','F','L'];

// ─── Compute: dashboard-aggregering ────────────────────────────────
// periodDays styrer alle "snitt i periode"-tall (puls, gruppe-trend, tema-balanse).
// Ukedag-statistikken er alltid på 90 dager (uavhengig av periode-velger).
const computeDashboard = (sessions, planned, attendance, periodDays = 30) => {
  const today = new Date();
  const cutoffCur  = new Date(today); cutoffCur.setDate(cutoffCur.getDate() - periodDays);
  const cutoffPrev = new Date(today); cutoffPrev.setDate(cutoffPrev.getDate() - periodDays * 2);
  const cutoff90   = new Date(today); cutoff90.setDate(cutoff90.getDate() - 90);
  const cyCur  = ymdM(cutoffCur);
  const cyPrev = ymdM(cutoffPrev);
  const cy90   = ymdM(cutoff90);
  const todayY = ymdM(today);

  const last = sessions.filter(s => s.date >= cyCur && s.date <= todayY);
  const prev = sessions.filter(s => s.date >= cyPrev && s.date < cyCur);
  const last90 = sessions.filter(s => s.date >= cy90 && s.date <= todayY);

  // Oppmøte: bruk attendance-feltet hvis satt, ellers attendance-rader
  const attMap = {};
  (attendance || []).forEach(a => {
    if (!a.sessionId) return;
    attMap[a.sessionId] = (attMap[a.sessionId] || 0) + 1;
  });
  const attCount = (s) => (s.attendance != null && s.attendance !== '' ? Number(s.attendance) : (attMap[s.id] || 0));
  const avgAtt = (arr) => arr.length ? arr.reduce((sum, s) => sum + attCount(s), 0) / arr.length : 0;

  const avgCur = avgAtt(last);
  const avgPrev = avgAtt(prev);
  const trendPct = avgPrev > 0 ? Math.round(((avgCur - avgPrev) / avgPrev) * 100) : 0;

  const plannedFuture = (planned || []).filter(p => p.date >= todayY);

  // Aktive medlemmer = unike navn med oppmøte i valgt periode
  const activeSet = new Set();
  (attendance || []).forEach(a => {
    const s = sessions.find(x => x.id === a.sessionId);
    if (s && s.date >= cyCur) activeSet.add(a.memberName);
  });

  // Per gruppe: snitt + trend (current vs prev av valgt periode)
  const groupStats = TL_DATA.groups.map(g => {
    const cur = last.filter(s => s.group === g);
    const prv = prev.filter(s => s.group === g);
    const ag = avgAtt(cur);
    const ap = avgAtt(prv);
    const trend = Math.round((ag - ap) * 10) / 10;
    return { g, sessions: cur.length, avg: ag, trend };
  }).filter(s => s.sessions > 0).sort((a, b) => b.avg - a.avg);

  // Tema-balanse: kun core-tags, i valgt periode
  const coreTags = TL_DATA.tags.filter(t => t.core);
  const tagCount = {};
  coreTags.forEach(t => { tagCount[t.id] = 0; });
  last.forEach(s => (s.tags || []).forEach(t => {
    if (tagCount[t] != null) tagCount[t]++;
  }));
  const tagLastDrilled = {};
  coreTags.forEach(t => {
    const sess = sessions.filter(s => (s.tags || []).includes(t.id))
      .sort((a, b) => b.date.localeCompare(a.date))[0];
    tagLastDrilled[t.id] = sess?.date || null;
  });
  const maxTag = Math.max(1, ...Object.values(tagCount));
  const tagBalance = coreTags.map(t => ({
    id: t.id, label: t.label, kind: t.kind,
    count: tagCount[t.id], pct: tagCount[t.id] / maxTag,
    lastDrilled: tagLastDrilled[t.id],
  })).sort((a, b) => b.count - a.count);

  // Per ukedag: snitt 90d (uavhengig av periode-velger)
  const dowStats = [1, 2, 3, 4, 5, 6, 0].map(dow => {
    const matching = last90.filter(s => parseYmdM(s.date).getDay() === dow);
    return { dow, avg: avgAtt(matching), count: matching.length };
  });

  // Hull i planen: planlagte uten tittel
  const gaps = plannedFuture.filter(p => !p.title || !String(p.title).trim())
    .sort((a, b) => a.date.localeCompare(b.date)).slice(0, 6);

  // Forslag: lavest core-tag i valgt periode
  const lowest = [...tagBalance].sort((a, b) => a.count - b.count)[0];
  let suggestion = null;
  if (lowest) {
    const daysSinceTag = lowest.lastDrilled
      ? Math.floor((today - parseYmdM(lowest.lastDrilled)) / 86400000)
      : null;
    suggestion = {
      tagId: lowest.id, tagLabel: lowest.label, tagKind: lowest.kind,
      count: lowest.count,
      reason: lowest.count === 0
        ? `${lowest.label} er ikke drillet siste ${periodDays} dager${daysSinceTag != null ? ` · sist for ${daysSinceTag} dager siden` : ''}`
        : `${lowest.label} er drillet ${lowest.count} ${lowest.count === 1 ? 'gang' : 'ganger'} siste ${periodDays} dager${daysSinceTag != null ? ` · sist ${daysSinceTag}d siden` : ''}`,
      group: groupStats[0]?.g || 'grunnleggende',
    };
  }

  return {
    summary: {
      avgAtt: Math.round(avgCur * 10) / 10,
      trendPct,
      sessionsLogged: last.length,
      sessionsPlanned: plannedFuture.length,
      activeMembers: activeSet.size,
      periodDays,
    },
    groupStats,
    tagBalance,
    dowStats,
    gaps,
    suggestion,
  };
};

// ─── Compute: per-medlem-statistikk med trend + sparkline + frafall ──
// Brukes av både mobil Folk-skjerm og desktop deltaker-liste.
const computeMemberStats = (attendance, sessionsById) => {
  const attendanceMap = {};
  (attendance || []).forEach(a => {
    if (!a.sessionId || !a.memberName) return;
    (attendanceMap[a.sessionId] || (attendanceMap[a.sessionId] = [])).push(a.memberName);
  });
  const memberSet = new Set();
  for (const names of Object.values(attendanceMap)) for (const n of names) memberSet.add(n);

  const cutoff30 = new Date(NOW); cutoff30.setDate(cutoff30.getDate() - 30);
  const cutoff60 = new Date(NOW); cutoff60.setDate(cutoff60.getDate() - 60);
  const cy30 = ymdM(cutoff30);
  const cy60 = ymdM(cutoff60);

  return [...memberSet].map(name => {
    const attended = [];
    for (const [sid, names] of Object.entries(attendanceMap)) {
      if (names.includes(name) && sessionsById[sid]) attended.push(sessionsById[sid]);
    }
    attended.sort((a, b) => b.date.localeCompare(a.date));
    const tagCounts = {};
    attended.forEach(s => (s.tags || []).forEach(t => { tagCounts[t] = (tagCounts[t] || 0) + 1; }));
    const top = Object.entries(tagCounts).sort((a,b) => b[1]-a[1]).slice(0, 3);
    const last30 = attended.filter(s => s.date >= cy30).length;
    const prev30 = attended.filter(s => s.date >= cy60 && s.date < cy30).length;
    const trend = last30 - prev30;
    const weekBuckets = [0, 0, 0, 0, 0, 0];
    attended.forEach(s => {
      const days = Math.floor((NOW - parseYmdM(s.date)) / 86400000);
      if (days < 0 || days >= 42) return;
      const idx = 5 - Math.floor(days / 7);
      if (idx >= 0 && idx < 6) weekBuckets[idx]++;
    });
    const daysSince = attended[0] ? Math.floor((NOW - parseYmdM(attended[0].date)) / 86400000) : 999;
    const status = daysSince <= 14 ? 'aktiv'
      : daysSince <= 28 ? 'stille'
      : daysSince <= 60 ? 'risiko'
      : 'frafall';
    return {
      name, total: attended.length, top,
      lastDate: attended[0]?.date,
      daysSince, status,
      last30, prev30, trend, weekBuckets,
      attended, tagCounts,
    };
  }).sort((a,b) => b.total - a.total);
};
