// Treningslogg — mobil-versjon (Steel-tema: mørk, brutalist, kobber-aksent)
// Bruker samme TL_DATA som desktop. Tre hovedskjermer:
//   home  · I dag + uke-strip + denne uka stats
//   month · full kalender
//   log   · rask logg-modal m/ chip-tags

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

// Sjekker om en ny build er deployet ved å hente ETag/Last-Modified
// fra index.html. Reloader appen hvis den endret seg siden sist.
// Anti-loop: bruk sessionStorage som flagg så vi ikke reloader mer
// enn én gang per session (hindrer iOS PWA-loop hvis snapshot ikke
// blir fornyet ved reload).
const APP_ETAG_KEY = 'tl-app-etag';
const RELOAD_FLAG_KEY = 'tl-just-reloaded';
async function checkForUpdate() {
  try {
    if (sessionStorage.getItem(RELOAD_FLAG_KEY)) return; // allerede reloaded denne session
    const url = './?_v=' + Date.now();
    const res = await fetch(url, { method: 'HEAD', cache: 'no-store' });
    if (!res.ok) return;
    const tag = res.headers.get('etag') || res.headers.get('last-modified');
    if (!tag) return;
    const stored = localStorage.getItem(APP_ETAG_KEY);
    if (stored && stored !== tag) {
      localStorage.setItem(APP_ETAG_KEY, tag);
      sessionStorage.setItem(RELOAD_FLAG_KEY, '1');
      window.location.reload();
      return;
    }
    if (!stored) localStorage.setItem(APP_ETAG_KEY, tag);
  } catch (_) { /* offline, ignorer */ }
}

// Expander recurring planlegging til en liste av YYYY-MM-DD-datoer.
// dayOfWeeks bruker JS-konvensjon: 0=søndag, 1=mandag, …, 6=lørdag.
const expandRecurring = (startYmd, untilYmd, dayOfWeeks) => {
  if (!startYmd || !untilYmd || !dayOfWeeks?.length) return [];
  const start = parseYmdM(startYmd);
  const until = parseYmdM(untilYmd);
  if (until < start) return [];
  const dowSet = new Set(dayOfWeeks);
  const out = [];
  const cur = new Date(start);
  // Vakthund: maks 365 iterasjoner = ~ett år
  for (let i = 0; i < 365 && cur <= until; i++) {
    if (dowSet.has(cur.getDay())) out.push(ymdM(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return out;
};

// Aggregerer rådata til dashboard-tall. Bruker kun core-tags i tema-balanse.
const computeDashboard = (sessions, planned, attendance) => {
  const today = new Date();
  const cutoff30 = new Date(today); cutoff30.setDate(cutoff30.getDate() - 30);
  const cutoff60 = new Date(today); cutoff60.setDate(cutoff60.getDate() - 60);
  const cutoff90 = new Date(today); cutoff90.setDate(cutoff90.getDate() - 90);
  const cy30 = ymdM(cutoff30);
  const cy60 = ymdM(cutoff60);
  const cy90 = ymdM(cutoff90);
  const todayY = ymdM(today);

  const last30 = sessions.filter(s => s.date >= cy30 && s.date <= todayY);
  const prev30 = sessions.filter(s => s.date >= cy60 && s.date < cy30);
  const last90 = sessions.filter(s => s.date >= cy90 && s.date <= todayY);

  // Oppmøte: bruk attendance-feltet hvis satt, ellers attendance-rader
  const attMap = {};
  (attendance || []).forEach(a => {
    if (!a.sessionId) return;
    attMap[a.sessionId] = (attMap[a.sessionId] || 0) + 1;
  });
  const attCount = (s) => (s.attendance != null && s.attendance !== '' ? Number(s.attendance) : (attMap[s.id] || 0));
  const avgAtt = (arr) => arr.length ? arr.reduce((sum, s) => sum + attCount(s), 0) / arr.length : 0;

  const avg30 = avgAtt(last30);
  const avgPrev = avgAtt(prev30);
  const trendPct = avgPrev > 0 ? Math.round(((avg30 - avgPrev) / avgPrev) * 100) : 0;

  const plannedFuture = (planned || []).filter(p => p.date >= todayY);

  // Aktive medlemmer = unike navn med oppmøte siste 30d
  const activeSet = new Set();
  (attendance || []).forEach(a => {
    const s = sessions.find(x => x.id === a.sessionId);
    if (s && s.date >= cy30) activeSet.add(a.memberName);
  });

  // Per gruppe: snitt + trend (siste 30d vs forrige 30d)
  const groupStats = TL_DATA.groups.map(g => {
    const cur = last30.filter(s => s.group === g);
    const prev = prev30.filter(s => s.group === g);
    const avgCur = avgAtt(cur);
    const avgPrev = avgAtt(prev);
    const trend = Math.round((avgCur - avgPrev) * 10) / 10;
    return { g, sessions: cur.length, avg: avgCur, trend };
  }).filter(s => s.sessions > 0).sort((a, b) => b.avg - a.avg);

  // Tema-balanse: kun core-tags
  const coreTags = TL_DATA.tags.filter(t => t.core);
  const tagCount = {};
  coreTags.forEach(t => { tagCount[t.id] = 0; });
  last30.forEach(s => (s.tags || []).forEach(t => {
    if (tagCount[t] != null) tagCount[t]++;
  }));
  // sist drillet (per core-tag)
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

  // Per ukedag: snitt 90d
  const dowStats = [1, 2, 3, 4, 5, 6, 0].map(dow => {
    const matching = last90.filter(s => parseYmdM(s.date).getDay() === dow);
    return { dow, avg: avgAtt(matching), count: matching.length };
  });

  // Hull i planen: planlagte uten tittel
  const gaps = plannedFuture.filter(p => !p.title || !String(p.title).trim())
    .sort((a, b) => a.date.localeCompare(b.date)).slice(0, 6);

  // Forslag: lavest core-tag i siste 30d
  const lowest = [...tagBalance].sort((a, b) => a.count - b.count)[0];
  let suggestion = null;
  if (lowest) {
    const daysSince = lowest.lastDrilled
      ? Math.floor((today - parseYmdM(lowest.lastDrilled)) / 86400000)
      : null;
    suggestion = {
      tagId: lowest.id, tagLabel: lowest.label, tagKind: lowest.kind,
      count: lowest.count,
      reason: lowest.count === 0
        ? `${lowest.label} er ikke drillet siste 30 dager${daysSince != null ? ` · sist for ${daysSince} dager siden` : ''}`
        : `${lowest.label} er drillet ${lowest.count} ${lowest.count === 1 ? 'gang' : 'ganger'} siste 30 dager${daysSince != null ? ` · sist ${daysSince}d siden` : ''}`,
      group: groupStats[0]?.g || 'grunnleggende',
    };
  }

  return {
    summary: {
      avg30: Math.round(avg30 * 10) / 10,
      trendPct,
      sessionsLogged: last30.length,
      sessionsPlanned: plannedFuture.length,
      activeMembers: activeSet.size,
    },
    groupStats,
    tagBalance,
    dowStats,
    gaps,
    suggestion,
  };
};

const NOW = new Date();
const TODAY_M = ymdM(NOW);

const NORWAY_MONTHS = ['januar','februar','mars','april','mai','juni','juli','august','september','oktober','november','desember'];
const NORWAY_DAYS_SHORT = ['søn','man','tir','ons','tor','fre','lør'];
const NORWAY_DAYS_LONG = ['søndag','mandag','tirsdag','onsdag','torsdag','fredag','lørdag'];
const NORWAY_DAYS_INITIAL = ['S','M','T','O','T','F','L']; // mandag-først kalender bruker [M,T,O,T,F,L,S]

// ─── Tweaks defaults ───────────────────────────────────────────────
const MOBIL_TWEAKS = /*EDITMODE-BEGIN*/{
  "accent": "oransje",
  "radius": "rund",
  "showWeekStat": true,
  "density": "komfortabel"
}/*EDITMODE-END*/;

const ACCENT_OPTIONS = {
  'oransje': { primary: '#E0723F', dark: '#C25A28' },
  'grønn':   { primary: '#3F8B5E', dark: '#2E6E47' },
  'dempet':  { primary: '#7A6F5F', dark: '#5C5447' },
  'kobber':  { primary: '#AC7A34', dark: '#8C5F23' },
};

// ─── Persistence: Google Sheets via TL_API ─────────────────────────
// Tidligere brukt localStorage som master. Nå er Sheets master, og
// localStorage kun brukt som lese-cache (se app/api.js).
// CRUD-funksjoner: TL_API.createSession, TL_API.updateSession, etc.

// ─── CSV export ────────────────────────────────────────────────────
function sessionsToCsv(sessions) {
  const cols = ['date','time','group','trainer','title','tags','content','attendance'];
  const esc = (v) => {
    if (v == null) return '';
    const s = String(v);
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  const rows = [cols.join(',')];
  sessions.forEach(s => {
    rows.push(cols.map(c => {
      if (c === 'tags') return esc((s.tags || []).join('|'));
      return esc(s[c]);
    }).join(','));
  });
  return rows.join('\n');
}
function downloadCsv(sessions) {
  const csv = sessionsToCsv(sessions);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `treningslogg-${ymdM(new Date())}.csv`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ─── App ───────────────────────────────────────────────────────────
function MobileApp() {
  const [tweaks, setTweak] = useTweaks(MOBIL_TWEAKS);
  const [screen, setScreen] = React.useState('home'); // home | dash | month | people
  const [logging, setLogging] = React.useState(null); // null or { initial, mode }
  const [sessions, setSessions] = React.useState([]);
  const [planned, setPlanned] = React.useState([]);
  const [trainers, setTrainers] = React.useState(TL_DATA.trainers); // overskrives ved bootstrap
  const [members, setMembers] = React.useState(TL_DATA.members);
  const [attendance, setAttendance] = React.useState([]);
  const [toast, setToast] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [syncError, setSyncError] = React.useState(null);

  // ─── Bootstrap fra Sheets (med cache først for snappy åpning) ─────
  React.useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { initial, refresh } = await window.TL_API.bootstrap();
        if (!alive) return;
        applyData(initial);
        setLoading(false);
        // Vent på fersk data i bakgrunnen og oppdater når den kommer
        refresh.then(fresh => { if (alive) applyData(fresh); }).catch(() => {});
      } catch (err) {
        if (!alive) return;
        console.error('[mobile] bootstrap feilet:', err);
        // Vis den faktiske feilmeldingen så vi kan diagnostisere
        const msg = String(err?.message || err || 'ukjent feil').slice(0, 80);
        setSyncError('bootstrap: ' + msg);
        setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  // Re-hent data når app får fokus (annen trener kan ha logget noe)
  // + sjekk om ny build er deployet og last på nytt om så.
  React.useEffect(() => {
    const onFocus = async () => {
      checkForUpdate(); // ikke await — kan kjøre i bakgrunnen
      try {
        const fresh = await window.TL_API.refresh();
        applyData(fresh);
        setSyncError(null);
      } catch (err) {
        const msg = String(err?.message || err || 'ukjent feil').slice(0, 80);
        setSyncError('refresh: ' + msg);
      }
    };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) onFocus();
    });
    // Sjekk én gang etter mount også (i tilfelle PWA-en sitter åpen)
    checkForUpdate();
    return () => { window.removeEventListener('focus', onFocus); };
  }, []);

  function applyData(d) {
    if (Array.isArray(d.sessions)) setSessions(d.sessions);
    if (Array.isArray(d.planned))  setPlanned(d.planned);
    if (Array.isArray(d.trainers) && d.trainers.length) setTrainers(d.trainers);
    if (Array.isArray(d.members)   && d.members.length) setMembers(d.members);
    if (Array.isArray(d.attendance)) setAttendance(d.attendance);
  }

  const flashToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  };

  const accent = ACCENT_OPTIONS[tweaks.accent] || ACCENT_OPTIONS.oransje;
  const radius = 0; // Steel — skarpe hjørner overalt

  // theme overrides
  const T = {
    ...M,
    accent: accent.primary,
    accentDark: accent.dark,
    radius,
    radiusLg: radius * 1.3,
    radiusSm: Math.max(6, radius * 0.5),
  };

  const openLog = (initial = null, mode = 'new') => setLogging({ initial, mode });

  // Batch-lagring av planlagte økter (recurring). Optimistisk + parallelle server-kall.
  const savePlanBatch = async (payloads) => {
    if (!Array.isArray(payloads) || payloads.length === 0) return;
    const tempIds = payloads.map((_, i) => `tmp-${Date.now()}-${i}`);
    const optimistic = payloads.map((p, i) => ({ ...p, id: tempIds[i] }));
    setPlanned(prev => [...optimistic, ...prev]);
    setLogging(null);
    flashToast(`lagrer ${payloads.length} planlagte …`);

    const results = await Promise.allSettled(
      payloads.map(p => window.TL_API.createPlanned(p))
    );
    const tempToReal = {};
    results.forEach((r, i) => {
      if (r.status === 'fulfilled') tempToReal[tempIds[i]] = r.value;
    });
    setPlanned(prev => prev.map(p => tempToReal[p.id] || p));

    const failed = results.filter(r => r.status === 'rejected').length;
    if (failed === 0) {
      flashToast(`${payloads.length} planlagte lagret`);
      setSyncError(null);
    } else {
      flashToast(`${payloads.length - failed} av ${payloads.length} lagret`);
      setSyncError('noen kunne ikke lagres');
      try { applyData(await window.TL_API.refresh()); } catch (_) {}
    }
  };

  // Optimistisk oppdatering: bytt UI med en gang, rull tilbake hvis serveren feiler
  const saveSession = async (data, opts = {}) => {
    // Batch-flyt: array av planlagte payloads (recurring)
    if (Array.isArray(data)) return savePlanBatch(data);

    const keepOpen = !!opts.keepOpen;
    const isPlanned = opts.type === 'planned';
    const mode = logging?.mode;
    const planId = logging?.initial?.id;
    const tempId = `tmp-${Date.now()}`;

    // 1) UI-respons umiddelbart
    if (mode === 'plan-fill') {
      setPlanned(prev => prev.filter(p => p.id !== planId));
      setSessions(prev => [{ ...data, id: tempId }, ...prev]);
    } else if (mode === 'edit') {
      setSessions(prev => prev.map(s => s.id === planId ? { ...s, ...data } : s));
    } else if (isPlanned) {
      setPlanned(prev => [{ ...data, id: tempId }, ...prev]);
    } else {
      setSessions(prev => [{ ...data, id: tempId }, ...prev]);
    }

    if (keepOpen) {
      setLogging({
        initial: { date: data.date, group: data.group, trainer: data.trainer },
        mode: 'new',
      });
      flashToast(isPlanned ? 'planlagt · ny klar' : 'lagrer · ny økt klar');
    } else {
      setLogging(null);
      flashToast(
        mode === 'edit' ? 'lagrer endringer …' :
        isPlanned ? 'lagrer planlagt …' : 'lagrer økt …'
      );
    }

    // 2) Server-call
    try {
      if (mode === 'edit') {
        const updated = await window.TL_API.updateSession(planId, data);
        setSessions(prev => prev.map(s => s.id === planId ? updated : s));
      } else if (isPlanned) {
        const created = await window.TL_API.createPlanned(data);
        setPlanned(prev => prev.map(p => p.id === tempId ? created : p));
      } else {
        const created = await window.TL_API.createSession(data);
        setSessions(prev => prev.map(s => s.id === tempId ? created : s));
        if (mode === 'plan-fill' && planId) {
          // Rydd opp i serveren også
          window.TL_API.deletePlanned(planId).catch(err => console.warn('deletePlanned feilet:', err));
        }
      }
      setSyncError(null);
      flashToast(
        mode === 'edit' ? 'endringer lagret' :
        isPlanned ? 'planlagt lagret' : 'økt lagret'
      );
    } catch (err) {
      console.error('[mobile] saveSession feilet:', err);
      setSyncError('kunne ikke lagre');
      flashToast('feil — prøv igjen');
      // Rull tilbake (enkleste: re-hent state)
      try {
        const fresh = await window.TL_API.refresh();
        applyData(fresh);
      } catch (_) { /* offline — la lokal state stå */ }
    }
  };

  const deleteSession = async (id) => {
    if (!id) return;
    const original = sessions.find(s => s.id === id);
    setSessions(prev => prev.filter(s => s.id !== id));
    setLogging(null);
    flashToast('sletter økt …');
    try {
      await window.TL_API.deleteSession(id);
      setSyncError(null);
      flashToast('økt slettet');
    } catch (err) {
      console.error('[mobile] deleteSession feilet:', err);
      if (original) setSessions(prev => [original, ...prev]);
      setSyncError('kunne ikke slette');
      flashToast('feil — prøv igjen');
    }
  };

  // Diagnose-funksjon (brukes fra tweaks-panel hvis nødvendig)
  const reloadFromServer = async () => {
    setLoading(true);
    try {
      window.TL_API.clearLocalCache();
      const fresh = await window.TL_API.refresh();
      applyData(fresh);
      setSyncError(null);
      flashToast('synkronisert med Sheets');
    } catch (err) {
      setSyncError('kunne ikke synkronisere');
      flashToast('feil ved synkronisering');
    } finally {
      setLoading(false);
    }
  };

  const totalItems = sessions.length + planned.length;
  return (
    <div style={{
      maxWidth: 480, margin: '0 auto',
      minHeight: '100vh', background: T.bg, color: T.ink,
      fontFamily: STEEL_FONT,
      paddingTop: 'env(safe-area-inset-top)',
      paddingBottom: 'calc(110px + env(safe-area-inset-bottom))', position: 'relative',
    }}>
      <StatusBar T={T} loading={loading} syncError={syncError} totalItems={totalItems} onRetry={reloadFromServer} />
      {screen === 'home' && (
        <HomeScreen
          T={T} tweaks={tweaks}
          sessions={sessions} planned={planned}
          onOpenLog={openLog}
        />
      )}
      {screen === 'dash' && (
        <Dashboard
          T={T}
          sessions={sessions} planned={planned} attendance={attendance}
          onOpenLog={openLog}
        />
      )}
      {screen === 'month' && (
        <MonthScreen
          T={T}
          sessions={sessions} planned={planned}
          onOpenLog={openLog}
        />
      )}
      {screen === 'people' && (
        <PeopleScreen T={T} sessions={sessions} attendance={attendance} members={members} />
      )}

      {logging && (
        <LogModal
          T={T}
          mode={logging.mode}
          initial={logging.initial}
          trainers={trainers}
          sessions={sessions}
          onSave={saveSession}
          onDelete={deleteSession}
          onClose={() => setLogging(null)}
        />
      )}

      <FAB T={T} onClick={() => openLog(null, 'new')} />
      <TabBar T={T} screen={screen} onChange={setScreen} />

      <TweaksPanel title="Tweaks">
        <TweakSection title="utseende">
          <TweakSelect label="aksentfarge" value={tweaks.accent}
            options={Object.keys(ACCENT_OPTIONS)}
            onChange={(v) => setTweak('accent', v)} />
          <TweakRadio label="radius" value={tweaks.radius}
            options={['rund','lett','firkantet']}
            onChange={(v) => setTweak('radius', v)} />
          <TweakRadio label="tetthet" value={tweaks.density}
            options={['komfortabel','tett']}
            onChange={(v) => setTweak('density', v)} />
        </TweakSection>
        <TweakSection title="moduler">
          <TweakToggle label="vis denne uka-bobble" value={tweaks.showWeekStat}
            onChange={(v) => setTweak('showWeekStat', v)} />
        </TweakSection>
        <TweakSection title="hopp til">
          <TweakButton onClick={() => setScreen('home')}>i dag</TweakButton>
          <TweakButton onClick={() => setScreen('dash')}>dashbord</TweakButton>
          <TweakButton onClick={() => setScreen('month')}>kalender</TweakButton>
          <TweakButton onClick={() => setScreen('people')}>deltakere</TweakButton>
          <TweakButton onClick={() => openLog(null, 'new')}>logg-modal</TweakButton>
        </TweakSection>
        <TweakSection title="data">
          <TweakButton onClick={() => downloadCsv(sessions)}>last ned CSV ({sessions.length} økter)</TweakButton>
          <TweakButton onClick={reloadFromServer}>synk fra Sheets</TweakButton>
          {syncError && <div style={{ color: T.coral, fontSize: 11, marginTop: 6 }}>⚠ {syncError}</div>}
        </TweakSection>
      </TweaksPanel>

      {toast && <Toast T={T}>{toast}</Toast>}
    </div>
  );
}

function Toast({ T, children }) {
  return (
    <div style={{
      position: 'fixed', bottom: 'calc(130px + env(safe-area-inset-bottom))', left: '50%', transform: 'translateX(-50%)',
      background: T.card, color: T.ink,
      border: `1px solid ${T.ruleHi}`,
      padding: '10px 18px', borderRadius: 0,
      fontSize: 11, fontWeight: 500, letterSpacing: '0.18em', textTransform: 'uppercase',
      zIndex: 200, pointerEvents: 'none',
      animation: 'tlToastIn 0.18s ease-out',
    }}>{children}</div>
  );
}

// ─── Status-bar (synlig laste-/feilmelding på toppen) ──────────────
function StatusBar({ T, loading, syncError, totalItems, onRetry }) {
  // Vis laster-status i 2 sek først, så kun ved faktisk feil eller tom data
  const [showLoading, setShowLoading] = React.useState(false);
  React.useEffect(() => {
    if (loading) {
      const t = setTimeout(() => setShowLoading(true), 1500);
      return () => clearTimeout(t);
    }
    setShowLoading(false);
  }, [loading]);

  const message = syncError ? `⚠ ${syncError}`
    : (showLoading && loading) ? 'henter data fra Sheets …'
    : (!loading && totalItems === 0) ? 'ingen data — trykk for å hente på nytt'
    : null;
  if (!message) return null;

  const color = syncError ? T.coral : (totalItems === 0 && !loading) ? T.copperHi : T.mid;
  return (
    <div onClick={onRetry} style={{
      padding: '10px 18px',
      background: T.tabBg, borderBottom: `1px solid ${T.rule}`,
      fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase',
      color, fontWeight: 700, cursor: onRetry ? 'pointer' : 'default',
      textAlign: 'center',
    }}>{message}</div>
  );
}

// ─── Topbar (Steel) ─────────────────────────────────────────────────
function Topbar({ T }) {
  return (
    <div style={{
      paddingTop: 14,
      paddingLeft: 18, paddingRight: 18, paddingBottom: 12,
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      borderBottom: `1px solid ${T.rule}`,
      background: T.bg,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <img src="logo.png" alt="" style={{ width: 36, height: 36, objectFit: 'contain' }} />
        <div>
          <div style={{
            fontSize: 11, fontWeight: 700, letterSpacing: '0.16em',
            color: T.ink, textTransform: 'lowercase', lineHeight: 1,
          }}>treningslogg</div>
          <div style={{
            fontSize: 7, letterSpacing: '0.24em',
            color: T.accent, textTransform: 'uppercase', marginTop: 4,
          }}>BODØ BJJ · TRENINGSLOGG</div>
        </div>
      </div>
    </div>
  );
}

// ─── Home screen ────────────────────────────────────────────────────
function HomeScreen({ T, tweaks, sessions, planned, onOpenLog }) {
  const [selectedDate, setSelectedDate] = React.useState(TODAY_M);

  // This week (mandag → søndag)
  const startOfWeek = (() => {
    const d = new Date(NOW);
    const dow = (d.getDay() + 6) % 7;
    d.setDate(d.getDate() - dow);
    return d;
  })();
  const weekDays = Array.from({length: 7}, (_, i) => {
    const d = new Date(startOfWeek);
    d.setDate(startOfWeek.getDate() + i);
    return d;
  });
  const weekStart = ymdM(weekDays[0]);
  const weekEnd = ymdM(weekDays[6]);

  const inWeek = (s) => s.date >= weekStart && s.date <= weekEnd;
  const weekSessions = sessions.filter(inWeek);
  const weekPlanned = planned.filter(inWeek);
  const weekTotal = weekSessions.length + weekPlanned.length;
  const weekPct = weekTotal > 0 ? Math.round((weekSessions.length / weekTotal) * 100) : 0;

  // Selected day
  const selectedDateObj = parseYmdM(selectedDate);
  const isSelectedToday = selectedDate === TODAY_M;
  const selectedItems = [
    ...sessions.filter(s => s.date === selectedDate).map(s => ({ ...s, kind: 'logged' })),
    ...planned.filter(p => p.date === selectedDate).map(p => ({ ...p, kind: 'planned' })),
  ].sort((a, b) => (a.time || '').localeCompare(b.time || ''));

  const recentLogged = sessions
    .filter(s => s.date < TODAY_M)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 3);

  return (
    <div>
      <Topbar T={T} />

      {/* Hero card */}
      <div style={{
        margin: '16px 16px 0', padding: '16px 18px 14px',
        background: `linear-gradient(180deg, ${T.cardHi}, ${T.card})`,
        border: `1px solid ${T.rule}`, borderRadius: 0,
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', top: 0, right: 18, width: 4, height: 32,
          background: T.accent,
        }} />
        <div style={{
          fontSize: 8, letterSpacing: '0.24em', textTransform: 'uppercase',
          color: T.mid, fontWeight: 700,
        }}>
          uke {(() => { const d = new Date(selectedDateObj); const onejan = new Date(d.getFullYear(), 0, 1); const w = Math.ceil(((d - onejan) / 86400000 + onejan.getDay() + 1) / 7); return String(w).padStart(2, '0'); })()} · {NORWAY_DAYS_LONG[selectedDateObj.getDay()]}
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginTop: 8 }}>
          <div style={{ fontSize: 36, fontWeight: 700, color: T.ink, fontVariantNumeric: 'tabular-nums', lineHeight: 1, letterSpacing: '-0.01em' }}>
            {selectedDateObj.getDate()}
          </div>
          <div style={{ fontSize: 13, letterSpacing: '0.20em', textTransform: 'uppercase', color: T.accent, fontWeight: 700 }}>
            {NORWAY_MONTHS[selectedDateObj.getMonth()]}
          </div>
        </div>
        {/* Mini-stats */}
        {tweaks.showWeekStat && (
          <div style={{
            marginTop: 14, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 1, background: T.rule, border: `1px solid ${T.rule}`,
          }}>
            {[
              { label: 'logget', value: weekSessions.length, color: T.accent2 },
              { label: 'plan',   value: weekPlanned.length,  color: T.copperHi },
              { label: 'total',  value: weekTotal,           color: T.accent },
            ].map(s => (
              <div key={s.label} style={{
                background: T.card, padding: '8px 10px',
                display: 'flex', flexDirection: 'column', gap: 4,
              }}>
                <div style={{ fontSize: 7, letterSpacing: '0.24em', textTransform: 'uppercase', color: T.mid }}>
                  {s.label}
                </div>
                <div style={{ fontSize: 16, fontWeight: 700, color: s.color, fontVariantNumeric: 'tabular-nums' }}>
                  {String(s.value).padStart(2, '0')}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Week strip */}
      <div style={{
        margin: '12px 16px 0', padding: 4,
        background: T.card, border: `1px solid ${T.rule}`,
        display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2,
      }}>
        {weekDays.map((d, i) => {
          const ymd = ymdM(d);
          const isToday = ymd === TODAY_M;
          const isSelected = ymd === selectedDate;
          const has = sessions.some(s => s.date === ymd);
          const planThis = planned.some(p => p.date === ymd);
          return (
            <button key={i} onClick={() => setSelectedDate(ymd)} style={{
              padding: '8px 0', textAlign: 'center', borderRadius: 0,
              background: isSelected ? T.accent : 'transparent',
              color: isSelected ? '#0B0A09' : T.ink,
              border: isToday && !isSelected ? `1px solid ${T.accent}` : '1px solid transparent',
              transition: 'background 0.12s',
              fontFamily: 'inherit', cursor: 'pointer',
            }}>
              <div style={{
                fontSize: 8, letterSpacing: '0.20em',
                opacity: isSelected ? 1 : 0.7, textTransform: 'uppercase', fontWeight: 700,
              }}>
                {NORWAY_DAYS_INITIAL[d.getDay()]}
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, marginTop: 4, fontVariantNumeric: 'tabular-nums' }}>
                {String(d.getDate()).padStart(2, '0')}
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 2, marginTop: 4, height: 4 }}>
                {has && <span style={{ width: 4, height: 4, borderRadius: 0, background: isSelected ? '#0B0A09' : T.accent2 }}></span>}
                {planThis && <span style={{ width: 4, height: 4, borderRadius: 0, background: isSelected ? '#0B0A09' : T.copperHi }}></span>}
              </div>
            </button>
          );
        })}
      </div>

      {/* Selected day section */}
      <div style={{ padding: '20px 22px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <div style={{ fontSize: 17, fontWeight: 700 }}>
          {isSelectedToday
            ? 'I dag'
            : `${NORWAY_DAYS_LONG[selectedDateObj.getDay()]} ${selectedDateObj.getDate()}.`}
        </div>
        <div style={{ fontSize: 12, color: T.mid }}>{selectedItems.length} {selectedItems.length === 1 ? 'økt' : 'økter'}</div>
      </div>
      <div style={{ padding: '0 22px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {selectedItems.length === 0 && (
          <div style={{
            background: T.card, borderRadius: T.radius, padding: '20px 18px',
            textAlign: 'center', color: T.mid, fontSize: 13, boxShadow: T.shadow,
          }}>
            {isSelectedToday ? 'ingen økter planlagt i dag.' : 'ingen økter denne dagen.'}
            <div style={{ marginTop: 12 }}>
              <button onClick={() => onOpenLog({ date: selectedDate }, 'new')} style={{
                background: T.accent, color: '#fff', border: 'none',
                padding: '10px 18px', borderRadius: T.radius,
                fontFamily: 'inherit', fontSize: 13, fontWeight: 600, cursor: 'pointer',
              }}>{isSelectedToday ? '+ logg en nå' : '+ ny økt'}</button>
            </div>
          </div>
        )}
        {selectedItems.map((it, i) => (
          <SessionCard key={i} T={T} item={it}
            onClick={() => {
              if (it.kind === 'planned') onOpenLog(it, 'plan-fill');
              else onOpenLog(it, 'edit');
            }} />
        ))}
      </div>

      {/* Recent */}
      {recentLogged.length > 0 && (
        <>
          <div style={{ padding: '24px 22px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <div style={{ fontSize: 17, fontWeight: 700 }}>Nylig</div>
            <div style={{ fontSize: 12, color: T.mid }}>siste 3</div>
          </div>
          <div style={{ padding: '0 22px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {recentLogged.map((s, i) => (
              <SessionCard key={i} T={T} item={{ ...s, kind: 'logged' }}
                onClick={() => onOpenLog(s, 'edit')} compact />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Dashboard ──────────────────────────────────────────────────────
function Dashboard({ T, sessions, planned, attendance, onOpenLog }) {
  const data = React.useMemo(
    () => computeDashboard(sessions, planned, attendance),
    [sessions, planned, attendance]
  );
  const { summary, groupStats, tagBalance, dowStats, gaps, suggestion } = data;
  const dowMax = Math.max(1, ...dowStats.map(d => d.avg));
  const groupMax = Math.max(1, ...groupStats.map(g => g.avg));

  const [groupDrill, setGroupDrill] = React.useState(null); // gruppe-id som er åpnet

  return (
    <div>
      <Topbar T={T} />

      {/* Section: PULS */}
      <div style={{ padding: '14px 18px 8px' }}>
        <div style={{ fontSize: 8, letterSpacing: '0.24em', textTransform: 'uppercase', color: T.mid, fontWeight: 700 }}>
          dashboard · planlegging
        </div>
      </div>

      <div style={{
        margin: '0 16px 14px', padding: '14px 16px',
        background: `linear-gradient(180deg, ${T.cardHi}, ${T.card})`,
        border: `1px solid ${T.rule}`, position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: 0, right: 18, width: 4, height: 32, background: T.accent }} />
        <div style={{ fontSize: 8, letterSpacing: '0.24em', color: T.mid, textTransform: 'uppercase', fontWeight: 700 }}>
          siste 30 dager · puls
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 8 }}>
          <span style={{ fontSize: 32, fontWeight: 700, lineHeight: 1, color: T.ink, fontVariantNumeric: 'tabular-nums' }}>
            {summary.avg30 || '—'}
          </span>
          <span style={{ fontSize: 9, color: T.mid, letterSpacing: '0.2em', textTransform: 'uppercase' }}>
            snitt på matta
          </span>
          {summary.trendPct !== 0 && (
            <span style={{
              marginLeft: 'auto',
              fontSize: 11, fontWeight: 700,
              color: summary.trendPct >= 0 ? T.accent2 : T.coral,
              letterSpacing: '0.08em', fontVariantNumeric: 'tabular-nums',
            }}>
              {summary.trendPct >= 0 ? '▲' : '▼'} {Math.abs(summary.trendPct)}%
            </span>
          )}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 1, marginTop: 14, background: T.rule }}>
          {[
            { n: summary.sessionsLogged, l: 'logget', c: T.accent2 },
            { n: summary.sessionsPlanned, l: 'planlagt', c: T.copperHi },
            { n: summary.activeMembers, l: 'aktive', c: T.ink },
          ].map((s, i) => (
            <div key={i} style={{ background: T.card, padding: '8px 10px' }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: s.c, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
                {String(s.n).padStart(2, '0')}
              </div>
              <div style={{ fontSize: 8, letterSpacing: '0.20em', color: T.mid, textTransform: 'uppercase', marginTop: 4, fontWeight: 700 }}>
                {s.l}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Section: FORSLAG */}
      {suggestion && (
        <>
          <DashSectionHead T={T} left="forslag · neste økt" right="bygd på data" />
          <div style={{ margin: '0 16px 14px' }}>
            <div style={{
              background: T.card, border: `1px solid ${T.accent}`,
              position: 'relative', overflow: 'hidden',
            }}>
              <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: T.accent }} />
              <div style={{ padding: '12px 14px 12px 18px' }}>
                <div style={{ fontSize: 7, letterSpacing: '0.24em', color: T.accent, textTransform: 'uppercase', fontWeight: 700 }}>
                  ↳ {suggestion.group}
                </div>
                <div style={{ fontSize: 14, color: T.ink, marginTop: 6, fontWeight: 500 }}>
                  prioritér <span style={{ color: T.accent, fontWeight: 700 }}>{suggestion.tagLabel}</span>
                </div>
                <div style={{ fontSize: 10, color: T.mid, marginTop: 6, lineHeight: 1.5 }}>
                  {suggestion.reason}
                </div>
              </div>
              <div
                onClick={() => onOpenLog({ group: suggestion.group, tags: [suggestion.tagId] }, 'new')}
                style={{
                  padding: '10px 0', textAlign: 'center',
                  background: T.accent, color: '#0B0A09',
                  fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', fontWeight: 700,
                  borderTop: `1px solid ${T.rule}`, cursor: 'pointer',
                }}
              >
                planlegg denne
              </div>
            </div>
          </div>
        </>
      )}

      {/* Section: PER GRUPPE */}
      {groupStats.length > 0 && (
        <>
          <DashSectionHead T={T} left="oppmøte · per gruppe" right="snitt 30d" />
          <div style={{ margin: '0 16px 14px', display: 'flex', flexDirection: 'column', gap: 4 }}>
            {groupStats.map((s, i) => {
              const w = (s.avg / groupMax) * 100;
              const trendColor = s.trend > 0 ? T.accent2 : s.trend < 0 ? T.coral : T.mid;
              const color = M_GROUP[s.g] || T.mid;
              return (
                <button key={i} onClick={() => setGroupDrill(s.g)} style={{
                  background: T.card, border: `1px solid ${T.rule}`,
                  padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10,
                  position: 'relative', overflow: 'hidden',
                  cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
                  width: '100%',
                }}>
                  <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: color }} />
                  <div style={{ marginLeft: 4, flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                      <span style={{ fontSize: 9, letterSpacing: '0.18em', color: color, textTransform: 'uppercase', fontWeight: 700 }}>
                        {s.g}
                      </span>
                      <span style={{ fontSize: 8, letterSpacing: '0.16em', color: T.mid, textTransform: 'uppercase' }}>
                        {s.sessions} {s.sessions === 1 ? 'økt' : 'økter'}
                      </span>
                    </div>
                    <div style={{ height: 4, background: T.rule, marginTop: 6, position: 'relative' }}>
                      <div style={{ position: 'absolute', inset: 0, width: `${w}%`, background: color }} />
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', minWidth: 52 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: T.ink, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
                      {s.avg.toFixed(1)}
                    </div>
                    <div style={{ fontSize: 8, letterSpacing: '0.12em', color: trendColor, textTransform: 'uppercase', marginTop: 3, fontWeight: 700 }}>
                      {s.trend > 0 ? `▲ +${s.trend}` : s.trend < 0 ? `▼ ${s.trend}` : '— flat'}
                    </div>
                  </div>
                  <span style={{ fontSize: 14, color: T.mid, marginLeft: 4 }}>›</span>
                </button>
              );
            })}
          </div>
        </>
      )}

      {/* Section: TEMA-BALANSE (kun core-tags) */}
      <DashSectionHead T={T} left="tema-balanse" right="↓ trenger fokus" />
      <div style={{ margin: '0 16px 14px' }}>
        <div style={{ background: T.card, border: `1px solid ${T.rule}`, padding: '10px 12px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {tagBalance.map(t => {
              const color = M_TAG_COLOR[t.kind] || T.mid;
              const low = t.count <= 1;
              return (
                <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{
                    fontSize: 10, color: T.ink,
                    minWidth: 90, fontWeight: low ? 700 : 400,
                  }}>{t.label}</span>
                  <div style={{ flex: 1, height: 6, background: T.rule, position: 'relative' }}>
                    <div style={{ position: 'absolute', inset: 0, width: `${Math.max(2, t.pct * 100)}%`, background: color }} />
                  </div>
                  <span style={{
                    fontSize: 10, fontWeight: 700, color: low ? T.accent : T.ink,
                    fontVariantNumeric: 'tabular-nums', minWidth: 18, textAlign: 'right',
                  }}>{t.count}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Section: PER UKEDAG */}
      <DashSectionHead T={T} left="oppmøte · per ukedag" right="snitt 90d" />
      <div style={{ margin: '0 16px 14px' }}>
        <div style={{ background: T.card, border: `1px solid ${T.rule}`, padding: '14px 12px 12px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, alignItems: 'end', height: 80 }}>
            {dowStats.map((d, i) => {
              const empty = d.avg === 0;
              const h = empty ? 8 : (d.avg / dowMax) * 70 + 10;
              const isBest = !empty && d.avg === dowMax;
              return (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, height: '100%', justifyContent: 'flex-end' }}>
                  <div style={{
                    fontSize: 9, fontWeight: 700,
                    color: empty ? T.mid : T.ink,
                    fontVariantNumeric: 'tabular-nums',
                  }}>
                    {empty ? '—' : d.avg.toFixed(1)}
                  </div>
                  <div style={{
                    width: '100%', height: h,
                    background: empty ? T.rule : (isBest ? T.accent : T.cardHi),
                    border: `1px solid ${empty ? T.rule : T.ruleHi}`,
                  }} />
                </div>
              );
            })}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginTop: 6 }}>
            {dowStats.map((d, i) => (
              <div key={i} style={{
                textAlign: 'center', fontSize: 8, letterSpacing: '0.18em',
                color: d.avg === 0 ? T.mid : T.ink, textTransform: 'uppercase', fontWeight: 700,
              }}>{NORWAY_DAYS_INITIAL[d.dow]}</div>
            ))}
          </div>
        </div>
      </div>

      {/* Section: HULL */}
      {gaps.length > 0 && (
        <>
          <DashSectionHead T={T} left="planlagt · uten tema" right={`${gaps.length} hull`} />
          <div style={{ margin: '0 16px 16px', display: 'flex', flexDirection: 'column', gap: 4 }}>
            {gaps.map((g, i) => {
              const d = parseYmdM(g.date);
              const color = M_GROUP[g.group] || T.mid;
              return (
                <div key={i} onClick={() => onOpenLog(g, 'plan-fill')} style={{
                  background: T.card, border: `1px solid ${T.rule}`,
                  padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 12,
                  position: 'relative', overflow: 'hidden', cursor: 'pointer',
                }}>
                  <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: color }} />
                  <div style={{ marginLeft: 4, minWidth: 56 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: T.ink, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
                      {String(d.getDate()).padStart(2, '0')}.{pad(d.getMonth() + 1)}
                    </div>
                    <div style={{ fontSize: 7, letterSpacing: '0.20em', color: T.mid, textTransform: 'uppercase', marginTop: 4, fontWeight: 700 }}>
                      {NORWAY_DAYS_SHORT[d.getDay()]} · {g.time || '—'}
                    </div>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 9, letterSpacing: '0.18em', color: color, textTransform: 'uppercase', fontWeight: 700 }}>
                      {g.group}
                    </div>
                    <div style={{ fontSize: 10, color: T.mid, marginTop: 4, fontStyle: 'italic' }}>
                      mangler tema
                    </div>
                  </div>
                  <div style={{
                    padding: '6px 10px', border: `1px solid ${T.accent}`,
                    color: T.accent, fontSize: 9, letterSpacing: '0.18em',
                    textTransform: 'uppercase', fontWeight: 700,
                  }}>
                    fyll
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {groupDrill && (
        <GroupDrillSheet T={T} groupId={groupDrill} sessions={sessions} onClose={() => setGroupDrill(null)} />
      )}
    </div>
  );
}

// ─── Group drill-down: tag-historikk for én gruppe ─────────────────
// Viser hvilke core-tags gruppen har drillet, sortert etter sist sett.
// Trener bruker dette til å se "hva har grunnleggende vært gjennom?"
function GroupDrillSheet({ T, groupId, sessions, onClose }) {
  const groupSessions = (sessions || [])
    .filter(s => s.group === groupId)
    .sort((a, b) => b.date.localeCompare(a.date));

  // Bygger tag-historikk for kun core-tags
  const coreTags = TL_DATA.tags.filter(t => t.core);
  const tagLastDate = {};
  const tagCount = {};
  groupSessions.forEach(s => (s.tags || []).forEach(t => {
    tagCount[t] = (tagCount[t] || 0) + 1;
    if (!tagLastDate[t]) tagLastDate[t] = s.date;
  }));
  const seenCore = coreTags
    .filter(t => tagCount[t.id])
    .map(t => ({ ...t, count: tagCount[t.id], lastDate: tagLastDate[t.id] }))
    .sort((a, b) => (b.lastDate || '').localeCompare(a.lastDate || ''));

  const fmtAgo = (days) =>
    days === 0 ? 'i dag' :
    days === 1 ? '1 dag siden' :
    days < 7   ? `${days} dager siden` :
    days < 30  ? `${Math.floor(days/7)} uker siden` :
                 `${Math.floor(days/30)} mnd siden`;

  const color = M_GROUP[groupId] || T.mid;

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)',
      zIndex: 100, display: 'flex', alignItems: 'flex-end',
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        width: '100%', maxWidth: 480, margin: '0 auto',
        background: T.bg, borderTop: `1px solid ${T.ruleHi}`,
        maxHeight: '80vh', overflowY: 'auto',
      }}>
        <div style={{ padding: '12px 0 6px', display: 'flex', justifyContent: 'center' }}>
          <div style={{ width: 40, height: 4, background: T.rule }} />
        </div>

        <div style={{ padding: '4px 18px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 8, letterSpacing: '0.24em', color: T.mid, textTransform: 'uppercase', fontWeight: 700 }}>
              gruppe-historikk
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, color, marginTop: 4, textTransform: 'lowercase' }}>
              {groupId}
            </div>
            <div style={{ fontSize: 9, color: T.mid, marginTop: 4, letterSpacing: '0.18em', textTransform: 'uppercase' }}>
              {groupSessions.length} {groupSessions.length === 1 ? 'økt' : 'økter'} totalt
            </div>
          </div>
          <button onClick={onClose} style={{
            width: 28, height: 28, border: `1px solid ${T.rule}`,
            background: T.card, color: T.ink, fontSize: 14, cursor: 'pointer',
            fontFamily: 'inherit', borderRadius: 0,
          }}>✕</button>
        </div>

        {seenCore.length === 0 ? (
          <div style={{
            margin: '8px 16px 24px', padding: '20px',
            background: T.card, border: `1px solid ${T.rule}`,
            color: T.mid, fontSize: 11, textAlign: 'center',
            letterSpacing: '0.14em', textTransform: 'uppercase',
          }}>
            ingen kjernetags registrert ennå
          </div>
        ) : (
          <div style={{ padding: '0 16px 24px', display: 'flex', flexDirection: 'column', gap: 0 }}>
            <div style={{
              fontSize: 8, letterSpacing: '0.24em', color: T.mid, textTransform: 'uppercase', fontWeight: 700,
              marginBottom: 8,
            }}>
              tags drillet · sortert nyeste først
            </div>
            {seenCore.map((t, i) => {
              const days = Math.floor((NOW - parseYmdM(t.lastDate)) / 86400000);
              const tagColor = M_TAG_COLOR[t.kind] || T.mid;
              return (
                <div key={t.id} style={{
                  padding: '10px 0', display: 'grid',
                  gridTemplateColumns: '12px 1fr auto auto', gap: 10, alignItems: 'center',
                  borderBottom: i === seenCore.length - 1 ? 'none' : `1px solid ${T.rule}`,
                }}>
                  <div style={{ width: 8, height: 8, background: tagColor }} />
                  <div style={{ fontSize: 12, color: T.ink, fontWeight: 500 }}>
                    {t.label}
                  </div>
                  <div style={{ fontSize: 9, color: T.mid, letterSpacing: '0.14em', textTransform: 'uppercase', fontVariantNumeric: 'tabular-nums' }}>
                    sist {fmtAgo(days).replace(' siden', '')}
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: T.ink, fontVariantNumeric: 'tabular-nums', minWidth: 24, textAlign: 'right' }}>
                    {t.count}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function DashSectionHead({ T, left, right }) {
  return (
    <div style={{ padding: '20px 18px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
      <div style={{ fontSize: 9, letterSpacing: '0.24em', textTransform: 'uppercase', color: T.ink, fontWeight: 700 }}>
        {left}
      </div>
      <div style={{ fontSize: 8, letterSpacing: '0.20em', textTransform: 'uppercase', color: T.mid }}>
        {right}
      </div>
    </div>
  );
}

// ─── Session card ───────────────────────────────────────────────────
function SessionCard({ T, item, onClick, compact }) {
  const color = M_GROUP[item.group] || T.mid;
  const date = parseYmdM(item.date);
  const dateLabel = item.date === TODAY_M
    ? 'i dag'
    : `${NORWAY_DAYS_SHORT[date.getDay()]} ${date.getDate()}.${pad(date.getMonth()+1)}`;
  // Kort 3-bokstavers gruppe-kode
  const groupShort = (TL_DATA.groupShort && TL_DATA.groupShort[item.group]) || item.group;
  return (
    <div onClick={onClick} style={{
      background: T.card, borderRadius: 0, padding: '10px 12px',
      border: `1px solid ${T.rule}`,
      display: 'flex', alignItems: 'center', gap: 12,
      position: 'relative', overflow: 'hidden', cursor: 'pointer',
    }}>
      {/* Gruppefarge som 3px venstre-strek */}
      <div style={{
        position: 'absolute', left: 0, top: 0, bottom: 0, width: 3,
        background: color,
      }} />
      <div style={{ marginLeft: 4, minWidth: 50 }}>
        <div style={{
          fontSize: 14, fontWeight: 700,
          fontVariantNumeric: 'tabular-nums', color: T.ink, lineHeight: 1,
        }}>
          {item.time || '—'}
        </div>
        <div style={{
          fontSize: 7, letterSpacing: '0.20em', textTransform: 'uppercase',
          color: color, fontWeight: 700, marginTop: 4,
        }}>
          {compact ? dateLabel : groupShort}
        </div>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 11, color: item.title ? T.ink : T.mid,
          fontStyle: item.title ? 'normal' : 'italic', fontWeight: 500,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {item.title || (item.kind === 'planned' ? 'planlagt — uten innhold' : 'uten tittel')}
        </div>
        {(item.tags && item.tags.length > 0) && (
          <div style={{ fontSize: 8, letterSpacing: '0.18em', textTransform: 'uppercase', color: T.mid, marginTop: 4, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {item.tags.slice(0, 3).join(' · ')}
          </div>
        )}
      </div>
      <div style={{
        fontSize: 14,
        color: item.kind === 'logged' ? T.accent2 : T.accent,
      }}>{item.kind === 'logged' ? '●' : '○'}</div>
    </div>
  );
}

// ─── Month screen ───────────────────────────────────────────────────
function MonthScreen({ T, sessions, planned, onOpenLog }) {
  const [month, setMonth] = React.useState(new Date(NOW.getFullYear(), NOW.getMonth(), 1));
  const [selected, setSelected] = React.useState(TODAY_M);

  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const startDow = (first.getDay() + 6) % 7;
  const last = new Date(month.getFullYear(), month.getMonth()+1, 0);

  const cells = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= last.getDate(); d++) cells.push(new Date(month.getFullYear(), month.getMonth(), d));
  while (cells.length % 7) cells.push(null);

  const sessionsByDate = {};
  sessions.forEach(s => (sessionsByDate[s.date] ||= []).push({ ...s, kind: 'logged' }));
  planned.forEach(p => (sessionsByDate[p.date] ||= []).push({ ...p, kind: 'planned' }));

  const selectedItems = sessionsByDate[selected] || [];
  const selectedDate = parseYmdM(selected);

  return (
    <div>
      <Topbar T={T} />

      {/* Month header */}
      <div style={{ padding: '16px 18px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button onClick={() => setMonth(m => new Date(m.getFullYear(), m.getMonth()-1, 1))} style={{
          width: 30, height: 30, borderRadius: 0, border: `1px solid ${T.rule}`,
          background: T.card, fontSize: 14, color: T.ink, cursor: 'pointer', fontFamily: 'inherit',
        }}>‹</button>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span style={{ fontSize: 11, color: T.mid, fontVariantNumeric: 'tabular-nums' }}>{month.getFullYear()}</span>
          <span style={{ fontSize: 22, fontWeight: 700, color: T.accent, textTransform: 'lowercase' }}>
            {NORWAY_MONTHS[month.getMonth()]}
          </span>
        </div>
        <button onClick={() => setMonth(m => new Date(m.getFullYear(), m.getMonth()+1, 1))} style={{
          width: 30, height: 30, borderRadius: 0, border: `1px solid ${T.rule}`,
          background: T.card, fontSize: 14, color: T.ink, cursor: 'pointer', fontFamily: 'inherit',
        }}>›</button>
      </div>

      {/* Calendar */}
      <div style={{
        margin: '0 22px', padding: '12px 8px',
        background: T.card, borderRadius: 0, boxShadow: T.shadow,
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', marginBottom: 8 }}>
          {['M','T','O','T','F','L','S'].map((d, i) => (
            <div key={i} style={{ textAlign: 'center', fontSize: 10, color: T.mid, letterSpacing: 1, padding: '4px 0' }}>{d}</div>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2 }}>
          {cells.map((d, i) => {
            if (!d) return <div key={i} style={{ height: 44 }}></div>;
            const ymd = ymdM(d);
            const isToday = ymd === TODAY_M;
            const isSelected = ymd === selected;
            const items = sessionsByDate[ymd] || [];
            return (
              <div key={i} onClick={() => setSelected(ymd)} style={{
                height: 44, borderRadius: 0, cursor: 'pointer',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                background: isSelected ? T.accent : (isToday ? T.bg : 'transparent'),
                color: isSelected ? '#fff' : T.ink,
                border: isToday && !isSelected ? `1.5px solid ${T.accent}` : 'none',
                position: 'relative',
              }}>
                <div style={{ fontSize: 14, fontWeight: isToday || isSelected ? 700 : 400 }}>
                  {d.getDate()}
                </div>
                {items.length > 0 && (
                  <div style={{ display: 'flex', gap: 2, marginTop: 2, position: 'absolute', bottom: 5 }}>
                    {items.slice(0, 3).map((it, j) => (
                      <span key={j} style={{
                        width: 4, height: 4, borderRadius: '50%',
                        background: isSelected ? '#fff' : (it.kind === 'logged' ? M_GROUP[it.group] : T.mid),
                        opacity: it.kind === 'planned' && !isSelected ? 0.5 : 1,
                      }}></span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected day items */}
      <div style={{ padding: '20px 22px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <div style={{ fontSize: 17, fontWeight: 700, textTransform: 'capitalize' }}>
          {NORWAY_DAYS_LONG[selectedDate.getDay()]} {selectedDate.getDate()}.
        </div>
        <div style={{ fontSize: 12, color: T.mid }}>
          {selectedItems.length} {selectedItems.length === 1 ? 'økt' : 'økter'}
        </div>
      </div>
      <div style={{ padding: '0 22px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {selectedItems.length === 0 && (
          <div style={{
            background: T.card, borderRadius: T.radius, padding: '20px 18px',
            textAlign: 'center', color: T.mid, fontSize: 13, boxShadow: T.shadow,
          }}>
            ingen økter denne dagen.
            <div style={{ marginTop: 12 }}>
              <button onClick={() => onOpenLog({ date: selected }, 'new')} style={{
                background: T.accent, color: '#fff', border: 'none',
                padding: '10px 18px', borderRadius: T.radius,
                fontFamily: 'inherit', fontSize: 13, fontWeight: 600, cursor: 'pointer',
              }}>+ ny økt</button>
            </div>
          </div>
        )}
        {selectedItems.map((it, i) => (
          <SessionCard key={i} T={T} item={it} onClick={() => {
            if (it.kind === 'planned') onOpenLog(it, 'plan-fill');
            else onOpenLog(it, 'edit');
          }} />
        ))}
        {selectedItems.length > 0 && (
          <button onClick={() => onOpenLog({ date: selected }, 'new')} style={{
            background: 'transparent', color: T.mid,
            border: `1.5px dashed ${T.rule}`, borderRadius: T.radius,
            padding: '12px', marginTop: 4,
            fontFamily: 'inherit', fontSize: 13, fontWeight: 500,
            cursor: 'pointer',
          }}>+ ny økt</button>
        )}
      </div>
    </div>
  );
}

// ─── People screen ──────────────────────────────────────────────────
function PeopleScreen({ T, sessions, attendance, members }) {
  const [expanded, setExpanded] = React.useState(null);
  const [query, setQuery] = React.useState('');
  const attendanceMap = React.useMemo(() => {
    const map = {};
    (attendance || []).forEach(a => {
      if (!a.sessionId || !a.memberName) return;
      (map[a.sessionId] || (map[a.sessionId] = [])).push(a.memberName);
    });
    return map;
  }, [attendance]);
  const sessionsById = React.useMemo(() => Object.fromEntries(sessions.map(s => [s.id, s])), [sessions]);

  const memberStats = React.useMemo(() => {
    const memberSet = new Set();
    for (const names of Object.values(attendanceMap)) for (const n of names) memberSet.add(n);
    return [...memberSet].map(name => {
      const attended = [];
      for (const [sid, names] of Object.entries(attendanceMap)) {
        if (names.includes(name) && sessionsById[sid]) attended.push(sessionsById[sid]);
      }
      attended.sort((a, b) => b.date.localeCompare(a.date));
      const tagCounts = {};
      attended.forEach(s => (s.tags || []).forEach(t => { tagCounts[t] = (tagCounts[t] || 0) + 1; }));
      const top = Object.entries(tagCounts).sort((a,b) => b[1]-a[1]).slice(0, 3);
      return {
        name, total: attended.length, top,
        lastDate: attended[0]?.date,
        attended, tagCounts,
      };
    }).sort((a,b) => b.total - a.total);
  }, [attendanceMap, sessionsById]);

  const filtered = query
    ? memberStats.filter(m => m.name.toLowerCase().includes(query.toLowerCase()))
    : memberStats;

  return (
    <div>
      <Topbar T={T} />

      {/* Header */}
      <div style={{ padding: '16px 18px 8px' }}>
        <div style={{ fontSize: 8, color: T.mid, letterSpacing: '0.24em', textTransform: 'uppercase' }}>deltakere</div>
        <div style={{ fontSize: 28, fontWeight: 700, marginTop: 6, color: T.accent, fontVariantNumeric: 'tabular-nums' }}>
          {memberStats.length}
          <span style={{ fontSize: 11, color: T.mid, marginLeft: 8, fontWeight: 400, letterSpacing: '0.18em', textTransform: 'uppercase' }}>
            medlemmer
          </span>
        </div>
      </div>

      {/* Search */}
      <div style={{ padding: '12px 22px 8px' }}>
        <div style={{
          background: T.card, borderRadius: T.radius, padding: '12px 16px',
          boxShadow: T.shadow, display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <span style={{ color: T.mid, fontSize: 14 }}>⌕</span>
          <input
            value={query} onChange={(e) => setQuery(e.target.value)}
            placeholder="søk på navn…"
            style={{
              flex: 1, border: 'none', background: 'transparent', outline: 'none',
              fontFamily: 'inherit', fontSize: 14, color: T.ink,
            }}
          />
          {query && (
            <span onClick={() => setQuery('')} style={{ color: T.mid, fontSize: 14, cursor: 'pointer' }}>✕</span>
          )}
        </div>
      </div>

      {/* List */}
      <div style={{ padding: '8px 22px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {memberStats.length === 0 && (
          <div style={{
            background: T.card, borderRadius: T.radius, padding: '24px 18px',
            textAlign: 'center', color: T.mid, fontSize: 13, boxShadow: T.shadow, lineHeight: 1.5,
          }}>
            ingen oppmøte registrert ennå.
            <div style={{ fontSize: 11, marginTop: 6 }}>importer Spond-eksport fra desktop-siden.</div>
          </div>
        )}
        {memberStats.length > 0 && filtered.length === 0 && (
          <div style={{
            background: T.card, borderRadius: T.radius, padding: '24px 18px',
            textAlign: 'center', color: T.mid, fontSize: 13, boxShadow: T.shadow,
          }}>
            ingen treff på "{query}".
          </div>
        )}
        {filtered.map((m) => (
          <PersonCard
            key={m.name} T={T} member={m}
            expanded={expanded === m.name}
            onToggle={() => setExpanded(expanded === m.name ? null : m.name)}
          />
        ))}
      </div>

      <div style={{
        margin: '20px 22px 0', padding: '14px 16px',
        background: 'transparent', border: `1px dashed ${T.rule}`, borderRadius: T.radius,
        fontSize: 11, color: T.mid, lineHeight: 1.5, textAlign: 'center',
      }}>
        oppmøte importeres på laptop fra Spond-eksport.
      </div>
    </div>
  );
}

function PersonCard({ T, member, expanded, onToggle }) {
  const initials = member.name.split(' ').map(s => s[0]?.toUpperCase()).slice(0, 2).join('');
  const lastDate = member.lastDate ? parseYmdM(member.lastDate) : null;
  const lastLabel = lastDate
    ? `${NORWAY_DAYS_SHORT[lastDate.getDay()]} ${lastDate.getDate()}.${pad(lastDate.getMonth()+1)}`
    : '—';

  // Recency-based status
  const daysSince = lastDate ? Math.floor((NOW - lastDate) / 86400000) : 999;
  const statusColor = daysSince <= 7 ? T.accent2 : daysSince <= 21 ? T.amber : T.mid;

  return (
    <div style={{
      background: T.card, borderRadius: T.radius,
      boxShadow: T.shadow, overflow: 'hidden',
      transition: 'all 0.15s',
    }}>
      {/* Row */}
      <div onClick={onToggle} style={{
        display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', cursor: 'pointer',
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: 0,
          background: T.bg, color: T.ink,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 11, fontWeight: 700, flexShrink: 0, fontVariantNumeric: 'tabular-nums',
          border: `1px solid ${statusColor}`,
          letterSpacing: '0.08em',
        }}>{initials}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600, textTransform: 'capitalize', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {member.name}
          </div>
          <div style={{ fontSize: 11, color: T.mid, marginTop: 2 }}>
            {member.total} økter · sist {lastLabel}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
          <div style={{ fontSize: 22, fontWeight: 700, lineHeight: 1, color: T.ink }}>{member.total}</div>
          <div style={{ fontSize: 10, color: T.mid }}>{expanded ? '▾' : '▸'}</div>
        </div>
      </div>

      {expanded && <PersonDetail T={T} member={member} />}
    </div>
  );
}

function PersonDetail({ T, member }) {
  const { attended, tagCounts, total } = member;

  // Group breakdown
  const groupCounts = {};
  attended.forEach(s => { groupCounts[s.group] = (groupCounts[s.group] || 0) + 1; });
  const groupSorted = Object.entries(groupCounts).sort((a,b) => b[1]-a[1]);

  // Last 6 months
  const monthCounts = {};
  attended.forEach(s => {
    const ym = s.date.slice(0, 7);
    monthCounts[ym] = (monthCounts[ym] || 0) + 1;
  });
  const months = Object.keys(monthCounts).sort().slice(-6);
  const maxMonth = Math.max(1, ...months.map(m => monthCounts[m]));

  // Tag-historikk: sortert etter sist sett, kun tags personen har vært på
  // attended er allerede sortert desc, så første treff på en tag er sist sett
  const tagLastDate = {};
  attended.forEach(s => (s.tags || []).forEach(t => {
    if (!tagLastDate[t]) tagLastDate[t] = s.date;
  }));
  const tagHistory = Object.keys(tagCounts)
    .map(id => ({ id, count: tagCounts[id], lastDate: tagLastDate[id] }))
    .sort((a, b) => (b.lastDate || '').localeCompare(a.lastDate || ''));

  // Recent sessions
  const recent = attended.slice(0, 4);

  // Active weeks
  const weeks = new Set();
  attended.forEach(s => {
    const d = parseYmdM(s.date);
    const onejan = new Date(d.getFullYear(), 0, 1);
    const week = Math.ceil(((d - onejan) / 86400000 + onejan.getDay() + 1) / 7);
    weeks.add(`${d.getFullYear()}-${week}`);
  });

  return (
    <div style={{
      padding: '4px 16px 18px',
      borderTop: `1px solid ${T.rule}`,
      display: 'flex', flexDirection: 'column', gap: 18,
    }}>
      {/* Stat row */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginTop: 12,
      }}>
        <SmallStat T={T} label="ØKTER" value={total} />
        <SmallStat T={T} label="GRUPPER" value={Object.keys(groupCounts).length} />
        <SmallStat T={T} label="UKER" value={weeks.size} />
      </div>

      {/* Monthly bars */}
      {months.length > 0 && (
        <div>
          <SectionLabel T={T}>oppmøte siste mnd</SectionLabel>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 64, marginTop: 8 }}>
            {months.map(ym => {
              const v = monthCounts[ym];
              const h = (v / maxMonth) * 56;
              return (
                <div key={ym} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: T.ink }}>{v}</div>
                  <div style={{ width: '100%', height: h, background: T.accent, borderRadius: 4, minHeight: 3 }}></div>
                  <div style={{ fontSize: 9, color: T.mid }}>{ym.slice(5)}/{ym.slice(2,4)}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Group breakdown */}
      {groupSorted.length > 0 && (
        <div>
          <SectionLabel T={T}>gruppe-fordeling</SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
            {groupSorted.map(([g, c]) => (
              <div key={g} style={{ display: 'grid', gridTemplateColumns: '90px 1fr 28px', gap: 10, alignItems: 'center' }}>
                <div style={{ fontSize: 11, color: M_GROUP[g] || T.ink, fontWeight: 600 }}>{g}</div>
                <div style={{ height: 6, background: T.bg, borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${(c/total)*100}%`, background: M_GROUP[g] || T.ink }}></div>
                </div>
                <div style={{ fontSize: 11, fontWeight: 700, textAlign: 'right' }}>{c}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tag-historikk: tags personen har vært på, sortert etter sist sett */}
      <div>
        <SectionLabel T={T}>tag-historikk</SectionLabel>
        {tagHistory.length === 0 ? (() => {
          const tagged = attended.filter(s => (s.tags || []).length > 0).length;
          return (
            <div style={{
              padding: '14px 12px', marginTop: 4,
              border: `1px dashed ${T.rule}`,
              color: T.mid, fontSize: 10, textAlign: 'center',
              letterSpacing: '0.14em', textTransform: 'uppercase',
              lineHeight: 1.6,
            }}>
              ingen tagger registrert ennå
              <div style={{ marginTop: 6, color: T.mid, fontSize: 9, letterSpacing: '0.10em' }}>
                {attended.length} {attended.length === 1 ? 'økt' : 'økter'} · {tagged} har tagger
              </div>
            </div>
          );
        })() : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0, marginTop: 4 }}>
            {tagHistory.map((t, i) => {
              const def = TL_DATA.tags.find(x => x.id === t.id);
              const color = M_TAG_COLOR[def?.kind] || T.mid;
              const days = Math.floor((NOW - parseYmdM(t.lastDate)) / 86400000);
              const ago = days === 0 ? 'i dag' : days === 1 ? '1d' : `${days}d`;
              return (
                <div key={t.id} style={{
                  padding: '8px 0', display: 'grid',
                  gridTemplateColumns: '12px 1fr auto auto', gap: 10, alignItems: 'center',
                  borderBottom: i === tagHistory.length - 1 ? 'none' : `1px solid ${T.rule}`,
                }}>
                  <div style={{ width: 8, height: 8, background: color }} />
                  <div style={{ fontSize: 11, color: T.ink, fontWeight: 500 }}>
                    {def?.label || t.id}
                  </div>
                  <div style={{ fontSize: 9, color: T.mid, letterSpacing: '0.14em', textTransform: 'uppercase', fontVariantNumeric: 'tabular-nums' }}>
                    sist {ago}
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: T.ink, fontVariantNumeric: 'tabular-nums', minWidth: 24, textAlign: 'right' }}>
                    {t.count}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Recent sessions */}
      {recent.length > 0 && (
        <div>
          <SectionLabel T={T}>siste økter</SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0, marginTop: 4 }}>
            {recent.map((s, i) => {
              const d = parseYmdM(s.date);
              return (
                <div key={s.id} style={{
                  padding: '10px 0', display: 'grid',
                  gridTemplateColumns: '60px 1fr', gap: 10,
                  borderBottom: i === recent.length-1 ? 'none' : `1px solid ${T.rule}`,
                  alignItems: 'center',
                }}>
                  <div style={{ fontSize: 11, color: T.mid }}>
                    {NORWAY_DAYS_SHORT[d.getDay()]} {d.getDate()}.{pad(d.getMonth()+1)}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, color: T.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {s.title || <span style={{ color: T.mid, fontStyle: 'italic' }}>uten innhold</span>}
                    </div>
                    <div style={{ fontSize: 10, color: M_GROUP[s.group] || T.mid, marginTop: 2 }}>{s.group}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function SmallStat({ T, label, value }) {
  return (
    <div style={{
      background: T.bg, borderRadius: 0, padding: '10px 12px',
      display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
    }}>
      <div style={{ fontSize: 9, letterSpacing: 1.4, color: T.mid }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 700, color: T.ink, marginTop: 2 }}>{value}</div>
    </div>
  );
}

function SectionLabel({ T, children }) {
  return (
    <div style={{ fontSize: 10, letterSpacing: 1.4, color: T.mid, textTransform: 'uppercase' }}>
      {children}
    </div>
  );
}

// ─── FAB (primary action) ───────────────────────────────────────────
function FAB({ T, onClick }) {
  return (
    <button onClick={onClick} style={{
      position: 'fixed', bottom: 'calc(110px + env(safe-area-inset-bottom))', right: 18,
      width: 52, height: 52, borderRadius: 0,
      background: `linear-gradient(180deg, ${T.copperHi}, ${T.accent})`,
      color: '#0B0A09', border: 'none',
      fontSize: 24, fontWeight: 700, fontFamily: 'inherit',
      boxShadow: '0 4px 12px rgba(204,122,61,0.35)',
      cursor: 'pointer', zIndex: 30,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>+</button>
  );
}

// ─── Tab bar ────────────────────────────────────────────────────────
function TabBar({ T, screen, onChange }) {
  const tabs = [
    { id: 'home',   label: 'i dag',     icon: '◉' },
    { id: 'dash',   label: 'dashbord',  icon: '◈' },
    { id: 'month',  label: 'kalender',  icon: '▦' },
    { id: 'people', label: 'deltakere', icon: '◌' },
  ];
  return (
    <div style={{
      position: 'fixed', bottom: 0, left: 0, right: 0,
      background: T.tabBg,
      borderTop: `1px solid ${T.ruleHi}`,
      paddingTop: 10, paddingLeft: 8, paddingRight: 8,
      paddingBottom: 'calc(14px + env(safe-area-inset-bottom))',
      display: 'grid', gridTemplateColumns: `repeat(${tabs.length}, 1fr)`, gap: 6,
      maxWidth: 480, margin: '0 auto',
      zIndex: 20,
    }}>
      {tabs.map(t => {
        const active = screen === t.id;
        return (
          <button key={t.id} onClick={() => onChange(t.id)} style={{
            position: 'relative', padding: '8px 4px 6px',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
            background: active ? T.accent : 'transparent',
            border: active ? `1px solid ${T.accent}` : `1px solid ${T.rule}`,
            borderRadius: 0,
            cursor: 'pointer', fontFamily: 'inherit',
          }}>
            {active && (
              <div style={{
                position: 'absolute', top: -1, left: -1, right: -1, height: 3,
                background: T.copperHi,
              }} />
            )}
            <div style={{
              width: 24, height: 24,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 14, fontWeight: 700,
              color: active ? '#0B0A09' : T.ink,
              background: active ? 'rgba(11,10,9,0.12)' : T.card,
              border: active ? '1px solid rgba(11,10,9,0.3)' : `1px solid ${T.rule}`,
            }}>{t.icon}</div>
            <div style={{
              fontSize: 8, letterSpacing: '0.18em', textTransform: 'uppercase',
              fontWeight: active ? 700 : 500,
              color: active ? '#0B0A09' : T.ink,
            }}>{t.label}</div>
          </button>
        );
      })}
    </div>
  );
}

// ─── Log modal ──────────────────────────────────────────────────────
function LogModal({ T, mode, initial, trainers, sessions, onSave, onClose, onDelete }) {
  // Pre-fill from planned/initial
  const init = initial || {};
  const trainerList = (trainers && trainers.length) ? trainers : TL_DATA.trainers;
  const defaultTrainer = init.trainer || (trainerList[0] && trainerList[0].id) || '';
  const [date, setDate] = React.useState(init.date || TODAY_M);
  const [time, setTime] = React.useState(init.time || '18:00');
  const [group, setGroup] = React.useState(init.group || 'grunnleggende');
  const [trainer, setTrainer] = React.useState(defaultTrainer);
  const [title, setTitle] = React.useState(init.title || '');
  const [content, setContent] = React.useState(init.content || '');
  const [tags, setTags] = React.useState(init.tags || []);
  const [newTagInput, setNewTagInput] = React.useState('');

  // Type: 'logged' (full skjema) eller 'planned' (forenklet)
  // - edit/plan-fill: alltid logged
  // - new: framtidig dato → planned, ellers logged
  const [type, setType] = React.useState(() => {
    if (mode === 'edit' || mode === 'plan-fill') return 'logged';
    return (init.date && init.date > TODAY_M) ? 'planned' : 'logged';
  });
  const isPlanned = type === 'planned';
  const canToggleType = mode === 'new';

  // Recurring: bare relevant når planned + new
  const [recurring, setRecurring] = React.useState(false);
  const [recurDays, setRecurDays] = React.useState([]);  // JS-dager 0..6
  const [recurUntil, setRecurUntil] = React.useState(() => {
    const d = parseYmdM(init.date || TODAY_M);
    d.setDate(d.getDate() + 56); // +8 uker
    return ymdM(d);
  });
  // Når recurring slås på første gang, seed med start-datoens ukedag
  const enableRecurring = () => {
    setRecurring(true);
    if (!recurDays.length) {
      const dow = parseYmdM(date).getDay();
      setRecurDays([dow]);
    }
  };
  const toggleRecurDay = (dow) => {
    setRecurDays(prev => prev.includes(dow) ? prev.filter(x => x !== dow) : [...prev, dow].sort());
  };
  const recurringPreview = React.useMemo(() => {
    if (!recurring) return [];
    return expandRecurring(date, recurUntil, recurDays);
  }, [recurring, date, recurUntil, recurDays]);

  const toggleTag = (t) => {
    setTags(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);
  };

  const addCustomTag = () => {
    const slug = slugifyTag(newTagInput);
    if (!slug) return;
    setTags(prev => prev.includes(slug) ? prev : [...prev, slug]);
    setNewTagInput('');
  };

  // Tag-forslag fra historikk: alle distinkte tags brukt før, sortert på frekvens
  const tagUseCounts = React.useMemo(() => countTagUse(sessions), [sessions]);
  const predefinedTagIds = React.useMemo(() => new Set(TL_DATA.tags.map(t => t.id)), []);
  const customTagsUsed = React.useMemo(() =>
    Object.keys(tagUseCounts)
      .filter(id => !predefinedTagIds.has(id))
      .sort((a, b) => tagUseCounts[b] - tagUseCounts[a]),
    [tagUseCounts, predefinedTagIds]
  );
  // Tags som er valgt på denne økten men ikke ennå er sett i historikk eller forhåndsdefinert
  const draftCustomTags = tags.filter(id => !predefinedTagIds.has(id) && !customTagsUsed.includes(id));

  const buildPayload = () => isPlanned
    ? { date, time, group, trainer, title }
    : { date, time, group, trainer, title, content, tags, attendance: init.attendance ?? null };
  const submit = () => {
    if (isPlanned && recurring && recurringPreview.length > 0) {
      const base = buildPayload();
      const payloads = recurringPreview.map(d => ({ ...base, date: d }));
      onSave(payloads, { type });
    } else {
      onSave(buildPayload(), { type });
    }
  };
  const submitAndNew = () => onSave(buildPayload(), { keepOpen: true, type });

  // Group tags by category for chip section
  const tagGroups = [
    { kind: 'position', label: 'posisjon' },
    { kind: 'action',   label: 'handling' },
  ];
  const tagsByKind = {};
  TL_DATA.tags.forEach(t => (tagsByKind[t.kind] ||= []).push(t));

  const titleLabel =
    mode === 'plan-fill' ? 'logg planlagt økt' :
    mode === 'edit' ? 'rediger økt' :
    isPlanned ? 'planlegg økt' : 'ny økt';

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)',
      zIndex: 100, display: 'flex', alignItems: 'flex-end',
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        width: '100%', maxWidth: 480, margin: '0 auto',
        background: T.bg, borderRadius: 0,
        borderTop: `1px solid ${T.ruleHi}`,
        maxHeight: '92vh', overflowY: 'auto',
      }}>
        {/* drag handle */}
        <div style={{ padding: '12px 0 6px', display: 'flex', justifyContent: 'center' }}>
          <div style={{ width: 40, height: 4, borderRadius: 2, background: T.rule }}></div>
        </div>

        {/* header */}
        <div style={{ padding: '4px 22px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 11, color: T.mid, letterSpacing: 0.5 }}>{titleLabel}</div>
            {mode === 'plan-fill' && (
              <div style={{ fontSize: 11, color: T.accent2, marginTop: 2 }}>● forhåndsutfylt fra plan</div>
            )}
          </div>
          <button onClick={onClose} style={{
            width: 28, height: 28, borderRadius: 0, border: `1px solid ${T.rule}`,
            background: T.card, color: T.ink, fontSize: 14, cursor: 'pointer',
            fontFamily: 'inherit',
          }}>✕</button>
        </div>

        {/* Type toggle (only for new sessions) */}
        {canToggleType && (
          <div style={{ padding: '0 22px 14px', display: 'flex', gap: 6 }}>
            {[
              { id: 'logged', label: 'logg' },
              { id: 'planned', label: 'planlegg' },
            ].map(opt => {
              const active = type === opt.id;
              return (
                <button key={opt.id} onClick={() => setType(opt.id)} style={{
                  flex: 1, padding: '10px 14px',
                  background: active ? T.ink : T.card,
                  color: active ? '#fff' : T.mid,
                  border: 'none', borderRadius: T.radius,
                  fontFamily: 'inherit', fontSize: 13, fontWeight: active ? 600 : 400,
                  boxShadow: active ? 'none' : T.shadow,
                  cursor: 'pointer', transition: 'all 0.12s',
                }}>{opt.label}</button>
              );
            })}
          </div>
        )}

        {/* form */}
        <div style={{ padding: '0 22px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Title */}
          <Field T={T} label={isPlanned ? 'hva er planen?' : 'hva trente dere på?'}>
            <input value={title} onChange={(e) => setTitle(e.target.value)}
              placeholder={isPlanned ? 'f.eks. passing — knee cut' : 'f.eks. closed guard — kimura'}
              style={{
                width: '100%', padding: '14px 16px',
                background: T.card, border: `1px solid ${T.rule}`, borderRadius: T.radius,
                fontFamily: 'inherit', fontSize: 16, color: T.ink,
                boxShadow: T.shadow, boxSizing: 'border-box',
              }}
            />
          </Field>

          {/* Time + date row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Field T={T} label={isPlanned && recurring ? 'starter' : 'dato'}>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
                style={{
                  width: '100%', padding: '12px 14px',
                  background: T.card, border: `1px solid ${T.rule}`, borderRadius: T.radius,
                  fontFamily: 'inherit', fontSize: 14, color: T.ink,
                  boxShadow: T.shadow, boxSizing: 'border-box',
                }}
              />
            </Field>
            <Field T={T} label="tid">
              <input type="time" value={time} onChange={(e) => setTime(e.target.value)}
                style={{
                  width: '100%', padding: '12px 14px',
                  background: T.card, border: `1px solid ${T.rule}`, borderRadius: T.radius,
                  fontFamily: 'inherit', fontSize: 14, color: T.ink,
                  boxShadow: T.shadow, boxSizing: 'border-box',
                }}
              />
            </Field>
          </div>

          {/* Recurring (kun ved planlegging av ny økt) */}
          {isPlanned && canToggleType && (
            <Field T={T} label="gjenta">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => setRecurring(false)} style={{
                    flex: 1, padding: '10px',
                    background: !recurring ? T.ink : T.card,
                    color: !recurring ? '#fff' : T.mid,
                    border: 'none', borderRadius: T.radius,
                    fontFamily: 'inherit', fontSize: 13, fontWeight: !recurring ? 600 : 400,
                    boxShadow: !recurring ? 'none' : T.shadow,
                    cursor: 'pointer',
                  }}>én gang</button>
                  <button onClick={enableRecurring} style={{
                    flex: 1, padding: '10px',
                    background: recurring ? T.ink : T.card,
                    color: recurring ? '#fff' : T.mid,
                    border: 'none', borderRadius: T.radius,
                    fontFamily: 'inherit', fontSize: 13, fontWeight: recurring ? 600 : 400,
                    boxShadow: recurring ? 'none' : T.shadow,
                    cursor: 'pointer',
                  }}>hver uke</button>
                </div>

                {recurring && (
                  <>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {[1, 2, 3, 4, 5, 6, 0].map(dow => {
                        const sel = recurDays.includes(dow);
                        return (
                          <button key={dow} onClick={() => toggleRecurDay(dow)} style={{
                            flex: 1, padding: '10px 0',
                            background: sel ? T.accent : T.card,
                            color: sel ? '#fff' : T.ink,
                            border: 'none', borderRadius: 0,
                            fontFamily: 'inherit', fontSize: 12, fontWeight: sel ? 700 : 500,
                            boxShadow: sel ? 'none' : T.shadow,
                            cursor: 'pointer',
                          }}>{NORWAY_DAYS_INITIAL[dow]}</button>
                        );
                      })}
                    </div>

                    <div>
                      <div style={{ fontSize: 11, color: T.mid, marginBottom: 6, paddingLeft: 4 }}>til og med</div>
                      <input type="date" value={recurUntil} min={date}
                        onChange={(e) => setRecurUntil(e.target.value)}
                        style={{
                          width: '100%', padding: '12px 14px',
                          background: T.card, border: `1px solid ${T.rule}`, borderRadius: T.radius,
                          fontFamily: 'inherit', fontSize: 14, color: T.ink,
                          boxShadow: T.shadow, boxSizing: 'border-box',
                        }}
                      />
                    </div>

                    <div style={{
                      padding: '10px 14px', borderRadius: 0,
                      background: recurringPreview.length > 0 ? T.bg : 'transparent',
                      border: `1px dashed ${T.rule}`,
                      fontSize: 12, color: recurringPreview.length > 0 ? T.ink : T.mid,
                      textAlign: 'center',
                    }}>
                      {recurDays.length === 0
                        ? 'velg én eller flere dager'
                        : recurringPreview.length === 0
                          ? 'ingen datoer i dette intervallet'
                          : `lager ${recurringPreview.length} planlagte økter`}
                    </div>
                  </>
                )}
              </div>
            </Field>
          )}

          {/* Group chips */}
          <Field T={T} label="gruppe">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {TL_DATA.groups.map(g => {
                const sel = group === g;
                return (
                  <span key={g} onClick={() => setGroup(g)} style={{
                    padding: '8px 14px', borderRadius: 0,
                    background: sel ? M_GROUP[g] : T.card,
                    color: sel ? '#fff' : T.ink,
                    boxShadow: sel ? 'none' : T.shadow,
                    fontSize: 13, fontWeight: sel ? 600 : 400, cursor: 'pointer',
                    transition: 'all 0.12s',
                  }}>{g}</span>
                );
              })}
            </div>
          </Field>

          {/* Trainer chips */}
          <Field T={T} label="trener">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {trainerList.filter(t => t.active !== false).map(t => {
                const sel = trainer === t.id;
                return (
                  <span key={t.id} onClick={() => setTrainer(t.id)} style={{
                    padding: '8px 14px', borderRadius: 0,
                    background: sel ? T.ink : T.card,
                    color: sel ? '#fff' : T.ink,
                    boxShadow: sel ? 'none' : T.shadow,
                    fontSize: 13, fontWeight: sel ? 600 : 400, cursor: 'pointer',
                    transition: 'all 0.12s',
                  }}>{t.name}</span>
                );
              })}
              {/* Tom-knapp for åpen matte */}
              <span onClick={() => setTrainer('')} style={{
                padding: '8px 14px', borderRadius: 0,
                background: trainer === '' ? T.mid : T.card,
                color: trainer === '' ? '#fff' : T.mid,
                boxShadow: trainer === '' ? 'none' : T.shadow,
                fontSize: 13, fontWeight: trainer === '' ? 600 : 400, cursor: 'pointer',
                fontStyle: 'italic',
              }}>(ingen)</span>
            </div>
          </Field>

          {!isPlanned && (
          /* TAGS — front and center */
          <Field T={T} label={`tags · ${tags.length} valgt`}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {tagGroups.map(tg => {
                const items = tagsByKind[tg.kind] || [];
                if (!items.length) return null;
                return (
                  <div key={tg.kind}>
                    <div style={{ fontSize: 10, color: T.mid, letterSpacing: 1, marginBottom: 6, textTransform: 'uppercase' }}>
                      {tg.label}
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {items.map(t => {
                        const sel = tags.includes(t.id);
                        const color = M_TAG_COLOR[t.kind] || T.ink;
                        return (
                          <span key={t.id} onClick={() => toggleTag(t.id)} style={{
                            padding: '7px 12px', borderRadius: 0, fontSize: 12,
                            background: sel ? color : T.card,
                            color: sel ? '#fff' : T.ink,
                            border: sel ? 'none' : `1px solid ${T.rule}`,
                            cursor: 'pointer', fontWeight: sel ? 600 : 400,
                            transition: 'all 0.12s',
                          }}>{sel ? '✓ ' : ''}{t.label}</span>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {/* Tidligere brukt — egne tags fra tidligere økter, sortert på frekvens */}
              {customTagsUsed.length > 0 && (
                <div>
                  <div style={{ fontSize: 10, color: T.mid, letterSpacing: 1, marginBottom: 6, textTransform: 'uppercase' }}>
                    tidligere brukt
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {customTagsUsed.map(id => {
                      const sel = tags.includes(id);
                      const color = M_TAG_COLOR.custom;
                      return (
                        <span key={id} onClick={() => toggleTag(id)} style={{
                          padding: '7px 12px', borderRadius: 0, fontSize: 12,
                          background: sel ? color : T.card,
                          color: sel ? '#fff' : T.ink,
                          border: sel ? 'none' : `1px solid ${T.rule}`,
                          cursor: 'pointer', fontWeight: sel ? 600 : 400,
                          transition: 'all 0.12s',
                        }}>
                          {sel ? '✓ ' : ''}{id}
                          <span style={{ marginLeft: 6, opacity: 0.6, fontSize: 10 }}>· {tagUseCounts[id]}</span>
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Helt nye tags som ble lagt til i denne økten */}
              {draftCustomTags.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {draftCustomTags.map(id => (
                    <span key={id} onClick={() => toggleTag(id)} style={{
                      padding: '7px 12px', borderRadius: 0, fontSize: 12,
                      background: M_TAG_COLOR.custom, color: '#fff',
                      border: 'none', cursor: 'pointer', fontWeight: 600,
                    }}>✓ {id}</span>
                  ))}
                </div>
              )}

              {/* Fritekst-input for ny tag */}
              <div>
                <div style={{ fontSize: 10, color: T.mid, letterSpacing: 1, marginBottom: 6, textTransform: 'uppercase' }}>
                  legg til ny tag
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <input
                    value={newTagInput}
                    onChange={(e) => setNewTagInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustomTag(); } }}
                    placeholder="f.eks. side-control"
                    style={{
                      flex: 1, padding: '10px 14px',
                      background: T.card, border: `1px solid ${T.rule}`, borderRadius: T.radius,
                      fontFamily: 'inherit', fontSize: 13, color: T.ink,
                      boxShadow: T.shadow, boxSizing: 'border-box',
                    }}
                  />
                  <button onClick={addCustomTag} disabled={!slugifyTag(newTagInput)} style={{
                    padding: '0 16px', minWidth: 44,
                    background: slugifyTag(newTagInput) ? T.ink : T.rule,
                    color: '#fff', border: 'none', borderRadius: T.radius,
                    fontFamily: 'inherit', fontSize: 18, fontWeight: 600,
                    cursor: slugifyTag(newTagInput) ? 'pointer' : 'not-allowed',
                  }}>+</button>
                </div>
              </div>
            </div>
          </Field>
          )}

          {!isPlanned && (
          /* Notat (free text) */
          <Field T={T} label="notat (valgfritt)">
            <textarea value={content} onChange={(e) => setContent(e.target.value)}
              placeholder="kort beskrivelse, fokus, observasjoner…"
              rows={3}
              style={{
                width: '100%', padding: '12px 14px',
                background: T.card, border: `1px solid ${T.rule}`, borderRadius: T.radius,
                fontFamily: 'inherit', fontSize: 14, color: T.ink, lineHeight: 1.5,
                boxShadow: T.shadow, resize: 'vertical', boxSizing: 'border-box',
              }}
            />
          </Field>
          )}

          {/* Save row */}
          {mode === 'edit' ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 8, marginTop: 8 }}>
              <button onClick={() => {
                if (!window.confirm('Slette denne økten? Dette kan ikke angres.')) return;
                if (onDelete && initial?.id) onDelete(initial.id);
              }} style={{
                padding: '14px',
                background: 'transparent',
                color: T.coral,
                border: `1px solid ${T.coral}`, borderRadius: 0,
                fontFamily: 'inherit', fontSize: 11, fontWeight: 700,
                letterSpacing: '0.20em', textTransform: 'uppercase',
                cursor: 'pointer',
              }}>slett</button>
              <button onClick={submit} disabled={!title} style={{
                padding: '14px',
                background: title ? T.accent : T.rule,
                color: title ? '#0B0A09' : T.mid,
                border: `1px solid ${title ? T.accent : T.rule}`, borderRadius: 0,
                fontFamily: 'inherit', fontSize: 11, fontWeight: 700,
                letterSpacing: '0.20em', textTransform: 'uppercase',
                cursor: title ? 'pointer' : 'not-allowed',
              }}>lagre endringer</button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8 }}>
              <button onClick={submit} disabled={!title} style={{
                padding: '14px',
                background: title ? T.accent : T.rule,
                color: title ? '#0B0A09' : T.mid,
                border: `1px solid ${title ? T.accent : T.rule}`, borderRadius: 0,
                fontFamily: 'inherit', fontSize: 11, fontWeight: 700,
                letterSpacing: '0.20em', textTransform: 'uppercase',
                cursor: title ? 'pointer' : 'not-allowed',
              }}>{isPlanned ? 'lagre plan' : 'lagre'}</button>
              <button onClick={submitAndNew} disabled={!title} style={{
                padding: '14px',
                background: 'transparent',
                color: title ? T.ink : T.mid,
                border: `1px solid ${T.rule}`, borderRadius: 0,
                fontFamily: 'inherit', fontSize: 11, fontWeight: 700,
                letterSpacing: '0.20em', textTransform: 'uppercase',
                cursor: title ? 'pointer' : 'not-allowed',
              }}>lagre & ny</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ T, label, children }) {
  return (
    <div>
      <div style={{
        fontSize: 9, color: T.mid, marginBottom: 8, letterSpacing: '0.20em',
        textTransform: 'uppercase', fontWeight: 700,
      }}>
        {label}
      </div>
      {children}
    </div>
  );
}

window.MobileApp = MobileApp;
