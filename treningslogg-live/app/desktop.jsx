// Treningslogg — desktop-app (Steel-tema)
// Tre-kolonne layout: sidebar (220px) + topbar + main grid.
// Bruker shared.js for tema, util og computeDashboard.
//
// Fase 4 (denne fila): Hjem + Deltakere + Kalender + Logg-modal + Import-overlay.

// ─── Spond-import: parse-helpers (port fra app/import.jsx) ─────────
const _excelSerialToDate = (serial) => {
  const n = Number(serial);
  if (!Number.isFinite(n)) return null;
  const ms = (n - 25569) * 86400 * 1000;
  const d = new Date(ms);
  return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
};

const _mapClassToGroup = (raw) => {
  if (!raw) return null;
  const s = String(raw).toLowerCase().replace(/\*+\s*$/, '').trim();
  if (s.includes('junior')) return 'junior';
  if (s.includes('nogi') || s.includes('no-gi') || s.includes('erfaren')) return 'erfaren';
  if (s.includes('grunn') || s.includes('intro') || s.includes('fundamental')) return 'grunnleggende';
  if (s.includes('åpen') || s.includes('open mat')) return 'åpen matte';
  if (s.includes('ekstra')) return 'erfaren';
  if (s.includes('alle')) return 'alle nivåer';
  if (s.startsWith('gi')) return 'alle nivåer';
  return 'alle nivåer';
};

const _parseWorkbook = (arrayBuffer) => {
  const wb = XLSX.read(arrayBuffer, { type: 'array' });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false });
  if (rows.length < 3) throw new Error('Fant ingen rader.');
  const dateRow = rows[0];
  const classRow = rows[1];
  const sessionCols = [];
  for (let c = 0; c < dateRow.length; c++) {
    const dateCell = dateRow[c];
    const classCell = classRow[c];
    if (!dateCell || !classCell) continue;
    const date = _excelSerialToDate(dateCell);
    if (!date) continue;
    const rawClass = String(classCell);
    sessionCols.push({
      colIdx: c, date,
      ymd: `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`,
      rawClass: rawClass.replace(/\*+\s*$/, '').trim(),
      group: _mapClassToGroup(rawClass),
    });
  }
  const members = [];
  for (let r = 2; r < rows.length; r++) {
    const row = rows[r];
    if (!row || !row[0]) continue;
    const name = String(row[0]).trim();
    if (!name) continue;
    const attended = sessionCols
      .filter(sc => row[sc.colIdx] && String(row[sc.colIdx]).trim() === '1')
      .map(sc => sc.colIdx);
    members.push({ name, attendedCols: attended });
  }
  return { sessionCols, members };
};

const _buildAttendance = (parsed) => {
  const byCol = {};
  for (const sc of parsed.sessionCols) byCol[sc.colIdx] = [];
  for (const m of parsed.members) for (const colIdx of m.attendedCols) byCol[colIdx].push(m.name);
  return byCol;
};

const _buildMatches = (parsed, existingSessions) => {
  const byKey = new Map();
  for (const s of existingSessions) {
    const k = `${s.date}|${s.group}`;
    if (!byKey.has(k)) byKey.set(k, []);
    byKey.get(k).push(s);
  }
  return parsed.sessionCols.map(sc => {
    const key = `${sc.ymd}|${sc.group}`;
    const candidates = byKey.get(key) || [];
    return { ...sc, match: candidates[0] || null, candidates };
  });
};

function DesktopApp() {
  const [screen, setScreen] = React.useState('home');
  const [sessions, setSessions] = React.useState([]);
  const [planned, setPlanned] = React.useState([]);
  const [members, setMembers] = React.useState([]);
  const [attendance, setAttendance] = React.useState([]);
  const [trainers, setTrainers] = React.useState(TL_DATA.trainers);
  const [loading, setLoading] = React.useState(true);
  const [syncError, setSyncError] = React.useState(null);
  const [logging, setLogging] = React.useState(null); // null eller { mode, initial }
  const [toast, setToast] = React.useState(null);
  const [importOpen, setImportOpen] = React.useState(false);

  React.useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { initial, refresh } = await window.TL_API.bootstrap();
        if (!alive) return;
        applyData(initial);
        setLoading(false);
        refresh.then(fresh => { if (alive) applyData(fresh); }).catch(() => {});
      } catch (err) {
        if (!alive) return;
        const msg = String(err?.message || err || 'ukjent feil').slice(0, 100);
        setSyncError('bootstrap: ' + msg);
        setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  function applyData(d) {
    if (Array.isArray(d.sessions)) setSessions(d.sessions);
    if (Array.isArray(d.planned))  setPlanned(d.planned);
    if (Array.isArray(d.members) && d.members.length) setMembers(d.members);
    if (Array.isArray(d.attendance)) setAttendance(d.attendance);
    if (Array.isArray(d.trainers) && d.trainers.length) setTrainers(d.trainers);
  }

  const flashToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  };

  const handleImport = () => setImportOpen(true);

  // Spond-import apply: opprett nye økter + oppdater attendance på matchede + send attendance-rader
  const applyImport = async ({ newSessions, updatedAttendance, attendanceMap }) => {
    setImportOpen(false);
    flashToast('importerer …');

    const idMap = {};
    for (const ns of newSessions) {
      try {
        const created = await window.TL_API.createSession({
          date: ns.date, time: ns.time || '', group: ns.group,
          trainer: ns.trainer || '', title: ns.title || '',
          content: ns.content || '', tags: ns.tags || [],
          attendance: ns.attendance,
        });
        idMap[ns.id] = created.id;
      } catch (err) {
        console.error('createSession feilet:', err, ns);
      }
    }

    for (const [sessionId, count] of Object.entries(updatedAttendance)) {
      try {
        await window.TL_API.updateSession(sessionId, { attendance: count });
      } catch (err) {
        console.error('updateSession feilet:', err, sessionId);
      }
    }

    const rows = [];
    for (const [origId, names] of Object.entries(attendanceMap)) {
      const sessionId = idMap[origId] || origId;
      for (const name of names) rows.push({ sessionId, memberName: name });
    }

    let importResult = { count: 0, newMembers: 0 };
    if (rows.length) {
      try {
        importResult = await window.TL_API.importAttendance(rows);
      } catch (err) {
        flashToast('feil ved import — sjekk konsollen');
        return;
      }
    }

    flashToast(
      `ferdig · ${importResult.count} oppmøter` +
      (importResult.newMembers ? ` · ${importResult.newMembers} nye medlemmer` : '') +
      (newSessions.length ? ` · ${newSessions.length} nye økter` : '')
    );
    try { applyData(await window.TL_API.refresh()); } catch (_) {}
  };

  const openLog = (initial = null, mode = 'new') => setLogging({ initial, mode });

  // ─── Save (logg eller plan) ──────────────────────────────────────
  const saveSession = async (data, opts = {}) => {
    if (Array.isArray(data)) return savePlanBatch(data);
    const isPlanned = opts.type === 'planned';
    const mode = logging?.mode;
    const planId = logging?.initial?.id;
    const tempId = `tmp-${Date.now()}`;

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
    setLogging(null);
    flashToast(mode === 'edit' ? 'lagrer endringer …' : isPlanned ? 'lagrer planlagt …' : 'lagrer økt …');

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
          window.TL_API.deletePlanned(planId).catch(() => {});
        }
      }
      setSyncError(null);
      flashToast(mode === 'edit' ? 'endringer lagret' : isPlanned ? 'planlagt lagret' : 'økt lagret');
    } catch (err) {
      flashToast('feil — prøv igjen');
      try { applyData(await window.TL_API.refresh()); } catch (_) {}
    }
  };

  const savePlanBatch = async (payloads) => {
    if (!payloads.length) return;
    const tempIds = payloads.map((_, i) => `tmp-${Date.now()}-${i}`);
    const optimistic = payloads.map((p, i) => ({ ...p, id: tempIds[i] }));
    setPlanned(prev => [...optimistic, ...prev]);
    setLogging(null);
    flashToast(`lagrer ${payloads.length} planlagte …`);
    const results = await Promise.allSettled(
      payloads.map(p => window.TL_API.createPlanned(p))
    );
    const tempToReal = {};
    results.forEach((r, i) => { if (r.status === 'fulfilled') tempToReal[tempIds[i]] = r.value; });
    setPlanned(prev => prev.map(p => tempToReal[p.id] || p));
    const failed = results.filter(r => r.status === 'rejected').length;
    flashToast(failed === 0 ? `${payloads.length} planlagte lagret` : `${payloads.length - failed} av ${payloads.length} lagret`);
  };

  const deleteSession = async (id) => {
    if (!id) return;
    const original = sessions.find(s => s.id === id);
    setSessions(prev => prev.filter(s => s.id !== id));
    setLogging(null);
    flashToast('sletter økt …');
    try {
      await window.TL_API.deleteSession(id);
      flashToast('økt slettet');
    } catch (err) {
      if (original) setSessions(prev => [original, ...prev]);
      flashToast('feil — prøv igjen');
    }
  };

  return (
    <div style={{
      height: '100vh', width: '100vw', display: 'flex',
      background: M.bg, color: M.ink, fontFamily: STEEL_FONT,
      overflow: 'hidden',
    }}>
      <Sidebar
        active={screen}
        onSelect={(s) => s === 'log' ? openLog() : setScreen(s)}
        onImport={handleImport}
      />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {syncError && (
          <div style={{
            padding: '10px 28px', background: M.tabBg, borderBottom: `1px solid ${M.rule}`,
            fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase',
            color: M.coral, fontWeight: 700, textAlign: 'center',
          }}>⚠ {syncError}</div>
        )}
        {screen === 'home' && (
          <DesktopHome sessions={sessions} planned={planned} attendance={attendance} loading={loading} />
        )}
        {screen === 'month' && (
          <DesktopMonth sessions={sessions} planned={planned} onOpenLog={openLog} />
        )}
        {screen === 'people' && (
          <DesktopPeople sessions={sessions} attendance={attendance} members={members} />
        )}
      </div>

      {logging && (
        <DesktopLogModal
          mode={logging.mode}
          initial={logging.initial}
          trainers={trainers}
          sessions={sessions}
          onSave={saveSession}
          onDelete={deleteSession}
          onClose={() => setLogging(null)}
        />
      )}

      {importOpen && (
        <ImportOverlay
          existingSessions={sessions}
          onClose={() => setImportOpen(false)}
          onApply={applyImport}
        />
      )}

      {toast && <DesktopToast>{toast}</DesktopToast>}
    </div>
  );
}

function DesktopToast({ children }) {
  return (
    <div style={{
      position: 'fixed', bottom: 28, left: '50%', transform: 'translateX(-50%)',
      background: M.card, color: M.ink,
      border: `1px solid ${M.ruleHi}`,
      padding: '12px 22px', borderRadius: 0,
      fontSize: 11, fontWeight: 500, letterSpacing: '0.18em', textTransform: 'uppercase',
      zIndex: 200, pointerEvents: 'none',
      boxShadow: '0 6px 24px rgba(0,0,0,0.4)',
    }}>{children}</div>
  );
}

// ─── Sidebar ───────────────────────────────────────────────────────
function Sidebar({ active, onSelect, onImport }) {
  const items = [
    { id: 'home',   label: 'dashbord',  icon: '◈' },
    { id: 'month',  label: 'kalender',  icon: '▦' },
    { id: 'people', label: 'deltakere', icon: '◌' },
    { id: 'log',    label: 'logg økt',  icon: '＋' },
    { id: 'import', label: 'importer',  icon: '↑', kind: 'tool' },
  ];

  return (
    <div style={{
      width: 220, background: M.tabBg, color: M.ink,
      borderRight: `1px solid ${M.ruleHi}`,
      display: 'flex', flexDirection: 'column', flexShrink: 0,
    }}>
      {/* Logo + wordmark */}
      <div style={{
        padding: '20px 18px 18px', borderBottom: `1px solid ${M.rule}`,
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <img src="logo.png" alt="" style={{ width: 32, height: 32, objectFit: 'contain' }} />
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.16em', color: M.ink, textTransform: 'lowercase' }}>
            treningslogg
          </div>
          <div style={{ fontSize: 7, letterSpacing: '0.24em', color: M.accent, textTransform: 'uppercase', marginTop: 4 }}>
            BODØ BJJ
          </div>
        </div>
      </div>

      {/* Nav */}
      <div style={{ padding: '14px 10px', display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
        {items.map((it, idx) => {
          const isActive = it.id === active;
          const isTool = it.kind === 'tool';
          const prevIsTool = idx > 0 && items[idx - 1].kind === 'tool';
          const needsSep = isTool && !prevIsTool;
          return (
            <React.Fragment key={it.id}>
              {needsSep && (
                <div style={{
                  margin: '10px 12px 6px', height: 1, background: M.rule, position: 'relative',
                }}>
                  <span style={{
                    position: 'absolute', top: -6, left: 0, background: M.tabBg, padding: '0 6px 0 0',
                    fontSize: 7, letterSpacing: '0.24em', color: M.mid, textTransform: 'uppercase',
                  }}>verktøy</span>
                </div>
              )}
              <div
                className={`tl-nav-item ${isActive ? 'is-active' : ''}`}
                onClick={() => it.id === 'import' ? onImport() : onSelect(it.id)}
                style={{
                  padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 12,
                  background: isActive ? M.accent : 'transparent',
                  border: isActive
                    ? `1px solid ${M.accent}`
                    : isTool
                      ? `1px dashed ${M.rule}`
                      : `1px solid transparent`,
                  color: isActive ? '#0B0A09' : M.ink,
                  cursor: 'pointer', position: 'relative',
                }}>
                {isActive && (
                  <div style={{ position: 'absolute', left: -1, top: -1, bottom: -1, width: 3, background: M.copperHi }} />
                )}
                <span style={{
                  fontSize: 14, fontWeight: 700, width: 18, textAlign: 'center',
                  color: isActive ? '#0B0A09' : (isTool ? M.accent : M.ink),
                }}>{it.icon}</span>
                <span style={{
                  fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase',
                  fontWeight: isActive ? 700 : 500,
                }}>
                  {it.label}
                </span>
              </div>
            </React.Fragment>
          );
        })}
      </div>

      {/* Footer */}
      <div style={{
        padding: '14px 18px', borderTop: `1px solid ${M.rule}`,
        fontSize: 7, letterSpacing: '0.24em', color: M.mid, textTransform: 'uppercase',
      }}>
        steel · v2
      </div>
    </div>
  );
}

// ─── Topbar (per-skjerm) ───────────────────────────────────────────
function DesktopTopbar({ title, subtitle, period, onPeriodChange, groupFilter, onGroupChange, showGroupFilter = true }) {
  const groups = ['alle', ...TL_DATA.groups];
  const [groupOpen, setGroupOpen] = React.useState(false);

  return (
    <div style={{
      padding: '16px 28px', borderBottom: `1px solid ${M.rule}`,
      display: 'flex', alignItems: 'center', gap: 24, background: M.bg,
      flexShrink: 0,
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 8, letterSpacing: '0.24em', color: M.mid, textTransform: 'uppercase', fontWeight: 700 }}>
          {subtitle}
        </div>
        <div style={{
          fontSize: 22, fontWeight: 700, color: M.ink, marginTop: 4,
          textTransform: 'lowercase', letterSpacing: '0.02em',
        }}>
          {title}
        </div>
      </div>

      {period != null && (
        <div style={{ display: 'flex', gap: 0 }}>
          {PERIOD_OPTIONS.map((p, i) => {
            const sel = p.id === period;
            return (
              <button key={p.id}
                className={`tl-period ${sel ? 'is-active' : ''}`}
                onClick={() => onPeriodChange(p.id)}
                style={{
                  padding: '8px 14px', fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase',
                  fontWeight: sel ? 700 : 500,
                  background: sel ? M.accent : M.card,
                  color: sel ? '#0B0A09' : M.ink,
                  border: `1px solid ${sel ? M.accent : M.rule}`,
                  borderLeftWidth: i === 0 || sel ? 1 : 0,
                  cursor: 'pointer', fontFamily: 'inherit',
                }}>{p.label}</button>
            );
          })}
        </div>
      )}

      {showGroupFilter && (
        <div style={{ position: 'relative' }}>
          <button onClick={() => setGroupOpen(o => !o)} style={{
            padding: '8px 14px', background: M.card,
            border: `1px solid ${groupOpen ? M.accent : M.rule}`,
            fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: M.ink,
            display: 'flex', gap: 8, alignItems: 'center', cursor: 'pointer',
            minWidth: 160, fontFamily: 'inherit',
          }}>
            <span style={{ color: M.accent }}>{groupOpen ? '▴' : '▾'}</span> {groupFilter || 'alle'}
          </button>
          {groupOpen && (
            <div style={{
              position: 'absolute', top: 'calc(100% + 4px)', right: 0, minWidth: 200,
              background: M.card, border: `1px solid ${M.accent}`, zIndex: 10,
            }}>
              {groups.map(g => (
                <div key={g}
                  onClick={() => { onGroupChange(g); setGroupOpen(false); }}
                  className="tl-nav-item"
                  style={{
                    padding: '10px 14px', fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase',
                    color: g === groupFilter ? M.accent : M.ink,
                    borderBottom: `1px solid ${M.rule}`, cursor: 'pointer',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  }}>
                  <span>{g}</span>
                  {g === groupFilter && <span style={{ color: M.accent }}>●</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Hjem (dashboard-data i bredere layout) ────────────────────────
function DesktopHome({ sessions, planned, attendance, loading }) {
  const [periodId, setPeriodId] = React.useState('30d');
  const [groupFilter, setGroupFilter] = React.useState('alle');
  const period = PERIOD_OPTIONS.find(p => p.id === periodId) || PERIOD_OPTIONS[1];

  // Filter sessions etter gruppe hvis valgt
  const filteredSessions = React.useMemo(() => {
    if (groupFilter === 'alle') return sessions;
    return sessions.filter(s => s.group === groupFilter);
  }, [sessions, groupFilter]);

  const data = React.useMemo(
    () => computeDashboard(filteredSessions, planned, attendance, period.days),
    [filteredSessions, planned, attendance, period.days]
  );
  const { summary, groupStats, tagBalance, dowStats, gaps, suggestion } = data;
  const dowMax = Math.max(1, ...dowStats.map(d => d.avg));
  const groupMax = Math.max(1, ...groupStats.map(g => g.avg));

  return (
    <>
      <DesktopTopbar
        title={`dashbord · ${groupFilter}`}
        subtitle={`siste ${period.days} dager · ${summary.sessionsLogged} økter loggført`}
        period={periodId} onPeriodChange={setPeriodId}
        groupFilter={groupFilter} onGroupChange={setGroupFilter}
      />

      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: 24 }}>
        {loading && summary.sessionsLogged === 0 ? (
          <div style={{
            padding: 60, textAlign: 'center', color: M.mid,
            fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', fontWeight: 700,
          }}>henter data fra Sheets …</div>
        ) : (
          <>
            {/* KPI-rad */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 1, background: M.rule, marginBottom: 20 }}>
              <KPICard label="snitt på matta" value={summary.avgAtt} trend={summary.trendPct} color={M.ink} suffix="" />
              <KPICard label="logget" value={summary.sessionsLogged} color={M.accent2} />
              <KPICard label="planlagt" value={summary.sessionsPlanned} color={M.copperHi} />
              <KPICard label="aktive medlemmer" value={summary.activeMembers} color={M.accent} />
              <KPICard label="hull i planen" value={gaps.length} color={gaps.length > 0 ? M.coral : M.mid} />
            </div>

            {/* Forslag + Gruppe-snitt side om side */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
              {suggestion ? (
                <SuggestionCard suggestion={suggestion} />
              ) : (
                <div style={{
                  background: M.card, border: `1px solid ${M.rule}`, padding: 20,
                  color: M.mid, fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase',
                }}>ingen forslag — alle core-tags er dekket godt</div>
              )}

              <GroupBlock groupStats={groupStats} groupMax={groupMax} />
            </div>

            {/* Tema-balanse + Ukedag side om side */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
              <TagBalanceBlock tagBalance={tagBalance} />
              <DowBlock dowStats={dowStats} dowMax={dowMax} />
            </div>

            {/* Hull i planen */}
            {gaps.length > 0 && (
              <GapsBlock gaps={gaps} />
            )}
          </>
        )}
      </div>
    </>
  );
}

// ─── Dashboard-byggesteiner ────────────────────────────────────────
function KPICard({ label, value, trend, color, suffix }) {
  return (
    <div style={{ background: M.card, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ fontSize: 7, letterSpacing: '0.24em', color: M.mid, textTransform: 'uppercase', fontWeight: 700 }}>
        {label}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <span style={{ fontSize: 28, fontWeight: 700, color: color, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
          {value || '—'}
        </span>
        {suffix && <span style={{ fontSize: 10, color: M.mid }}>{suffix}</span>}
        {trend !== undefined && trend !== 0 && (
          <span style={{
            fontSize: 10, fontWeight: 700,
            color: trend >= 0 ? M.accent2 : M.coral,
            letterSpacing: '0.08em', marginLeft: 'auto', fontVariantNumeric: 'tabular-nums',
          }}>
            {trend >= 0 ? '▲' : '▼'} {Math.abs(trend)}%
          </span>
        )}
      </div>
    </div>
  );
}

function SectionHead({ left, right }) {
  return (
    <div style={{
      padding: '12px 16px', borderBottom: `1px solid ${M.rule}`,
      display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
      background: M.cardHi,
    }}>
      <div style={{ fontSize: 9, letterSpacing: '0.24em', textTransform: 'uppercase', color: M.ink, fontWeight: 700 }}>
        {left}
      </div>
      {right && (
        <div style={{ fontSize: 8, letterSpacing: '0.20em', textTransform: 'uppercase', color: M.mid }}>
          {right}
        </div>
      )}
    </div>
  );
}

function SuggestionCard({ suggestion }) {
  return (
    <div style={{
      background: M.card, border: `1px solid ${M.accent}`,
      position: 'relative', overflow: 'hidden',
    }}>
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: M.accent }} />
      <SectionHead left="forslag · neste økt" right="bygd på data" />
      <div style={{ padding: '16px 18px 16px 22px' }}>
        <div style={{ fontSize: 8, letterSpacing: '0.24em', color: M.accent, textTransform: 'uppercase', fontWeight: 700 }}>
          ↳ {suggestion.group}
        </div>
        <div style={{ fontSize: 18, color: M.ink, marginTop: 8, fontWeight: 500 }}>
          prioritér <span style={{ color: M.accent, fontWeight: 700 }}>{suggestion.tagLabel}</span>
        </div>
        <div style={{ fontSize: 11, color: M.mid, marginTop: 8, lineHeight: 1.5 }}>
          {suggestion.reason}
        </div>
      </div>
    </div>
  );
}

function GroupBlock({ groupStats, groupMax }) {
  return (
    <div style={{ background: M.card, border: `1px solid ${M.rule}` }}>
      <SectionHead left="oppmøte · per gruppe" right="snitt i periode" />
      <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {groupStats.length === 0 ? (
          <div style={{
            padding: 12, color: M.mid, fontSize: 10, textAlign: 'center',
            letterSpacing: '0.16em', textTransform: 'uppercase',
          }}>ingen data i denne perioden</div>
        ) : groupStats.map((s, i) => {
          const w = (s.avg / groupMax) * 100;
          const trendColor = s.trend > 0 ? M.accent2 : s.trend < 0 ? M.coral : M.mid;
          const color = M_GROUP[s.g] || M.mid;
          return (
            <div key={i} style={{
              display: 'grid', gridTemplateColumns: '120px 1fr 80px', gap: 12, alignItems: 'center',
            }}>
              <span style={{
                fontSize: 9, letterSpacing: '0.18em', color, textTransform: 'uppercase', fontWeight: 700,
              }}>{s.g}</span>
              <div style={{ height: 5, background: M.rule, position: 'relative' }}>
                <div style={{ position: 'absolute', inset: 0, width: `${w}%`, background: color }} />
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, justifyContent: 'flex-end' }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: M.ink, fontVariantNumeric: 'tabular-nums' }}>
                  {s.avg.toFixed(1)}
                </span>
                <span style={{
                  fontSize: 8, color: trendColor, fontWeight: 700, fontVariantNumeric: 'tabular-nums',
                }}>
                  {s.trend > 0 ? `▲+${s.trend}` : s.trend < 0 ? `▼${s.trend}` : '—'}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TagBalanceBlock({ tagBalance }) {
  return (
    <div style={{ background: M.card, border: `1px solid ${M.rule}` }}>
      <SectionHead left="tema-balanse" right="↓ trenger fokus" />
      <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {tagBalance.map(t => {
          const color = M_TAG_COLOR[t.kind] || M.mid;
          const low = t.count <= 1;
          return (
            <div key={t.id} style={{ display: 'grid', gridTemplateColumns: '120px 1fr 32px', gap: 12, alignItems: 'center' }}>
              <span style={{
                fontSize: 10, color: M.ink, fontWeight: low ? 700 : 400,
              }}>{t.label}</span>
              <div style={{ height: 5, background: M.rule, position: 'relative' }}>
                <div style={{ position: 'absolute', inset: 0, width: `${Math.max(2, t.pct * 100)}%`, background: color }} />
              </div>
              <span style={{
                fontSize: 11, fontWeight: 700, color: low ? M.accent : M.ink,
                fontVariantNumeric: 'tabular-nums', textAlign: 'right',
              }}>{t.count}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DowBlock({ dowStats, dowMax }) {
  return (
    <div style={{ background: M.card, border: `1px solid ${M.rule}` }}>
      <SectionHead left="oppmøte · per ukedag" right="snitt 90d" />
      <div style={{ padding: 14 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6, alignItems: 'end', height: 100 }}>
          {dowStats.map((d, i) => {
            const empty = d.avg === 0;
            const h = empty ? 8 : (d.avg / dowMax) * 86 + 14;
            const isBest = !empty && d.avg === dowMax;
            return (
              <div key={i} style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                height: '100%', justifyContent: 'flex-end',
              }}>
                <div style={{
                  fontSize: 10, fontWeight: 700,
                  color: empty ? M.mid : M.ink, fontVariantNumeric: 'tabular-nums',
                }}>{empty ? '—' : d.avg.toFixed(1)}</div>
                <div style={{
                  width: '100%', height: h,
                  background: empty ? M.rule : (isBest ? M.accent : M.cardHi),
                  border: `1px solid ${empty ? M.rule : M.ruleHi}`,
                }} />
              </div>
            );
          })}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6, marginTop: 8 }}>
          {dowStats.map((d, i) => (
            <div key={i} style={{
              textAlign: 'center', fontSize: 8, letterSpacing: '0.18em',
              color: d.avg === 0 ? M.mid : M.ink, textTransform: 'uppercase', fontWeight: 700,
            }}>{NORWAY_DAYS_INITIAL[d.dow]}</div>
          ))}
        </div>
      </div>
    </div>
  );
}

function GapsBlock({ gaps }) {
  return (
    <div style={{ background: M.card, border: `1px solid ${M.rule}` }}>
      <SectionHead left="planlagt · uten tema" right={`${gaps.length} hull`} />
      <div style={{ padding: 14, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 8 }}>
        {gaps.map((g, i) => {
          const d = parseYmdM(g.date);
          const color = M_GROUP[g.group] || M.mid;
          return (
            <div key={i} className="tl-card-clickable" style={{
              background: M.bg, border: `1px solid ${M.rule}`,
              padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 12,
              position: 'relative', overflow: 'hidden', cursor: 'pointer',
            }}>
              <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: color }} />
              <div style={{ marginLeft: 4, minWidth: 56 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: M.ink, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
                  {String(d.getDate()).padStart(2, '0')}.{pad(d.getMonth() + 1)}
                </div>
                <div style={{ fontSize: 7, letterSpacing: '0.20em', color: M.mid, textTransform: 'uppercase', marginTop: 4, fontWeight: 700 }}>
                  {NORWAY_DAYS_SHORT[d.getDay()]} · {g.time || '—'}
                </div>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 9, letterSpacing: '0.18em', color, textTransform: 'uppercase', fontWeight: 700 }}>
                  {g.group}
                </div>
                <div style={{ fontSize: 10, color: M.mid, marginTop: 4, fontStyle: 'italic' }}>
                  mangler tema
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Placeholder for kommende skjermer ─────────────────────────────
function PlaceholderScreen({ title, subtitle }) {
  return (
    <>
      <DesktopTopbar title={title} subtitle={subtitle} showGroupFilter={false} />
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: M.mid, fontSize: 11, letterSpacing: '0.20em', textTransform: 'uppercase',
        fontFamily: STEEL_FONT,
      }}>
        kommer i en senere fase
      </div>
    </>
  );
}

// ─── Deltakere-skjerm med rangering, trend, sparkline, frafall ─────
function DesktopPeople({ sessions, attendance, members }) {
  const [groupFilter, setGroupFilter] = React.useState('alle');
  const [query, setQuery] = React.useState('');
  const [expandedName, setExpandedName] = React.useState(null);

  const filteredSessions = React.useMemo(() => {
    if (groupFilter === 'alle') return sessions;
    return sessions.filter(s => s.group === groupFilter);
  }, [sessions, groupFilter]);

  const sessionsById = React.useMemo(
    () => Object.fromEntries(filteredSessions.map(s => [s.id, s])),
    [filteredSessions]
  );

  const stats = React.useMemo(
    () => computeMemberStats(attendance, sessionsById),
    [attendance, sessionsById]
  );

  const filtered = query
    ? stats.filter(m => m.name.toLowerCase().includes(query.toLowerCase()))
    : stats;

  const counts = {
    aktiv:   stats.filter(m => m.status === 'aktiv').length,
    stille:  stats.filter(m => m.status === 'stille').length,
    risiko:  stats.filter(m => m.status === 'risiko').length,
    frafall: stats.filter(m => m.status === 'frafall').length,
  };

  return (
    <>
      <DesktopTopbar
        title={`deltakere · ${groupFilter}`}
        subtitle={`${stats.length} medlemmer · ${counts.risiko + counts.frafall} trenger oppfølging`}
        groupFilter={groupFilter} onGroupChange={setGroupFilter}
      />

      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: 24 }}>
        {/* Status-rad */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1, background: M.rule, marginBottom: 20 }}>
          <KPICard label="aktiv ≤14d"  value={counts.aktiv}   color={M.accent2} />
          <KPICard label="stille 15-28d" value={counts.stille} color={M.amber} />
          <KPICard label="risiko 29-60d" value={counts.risiko} color={M.accent} />
          <KPICard label="frafall 60d+"  value={counts.frafall} color={M.coral} />
        </div>

        {/* Søk */}
        <div style={{ marginBottom: 16 }}>
          <div style={{
            background: M.card, border: `1px solid ${M.rule}`,
            padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <span style={{ color: M.mid, fontSize: 14 }}>⌕</span>
            <input
              value={query} onChange={(e) => setQuery(e.target.value)}
              placeholder="søk på navn …"
              style={{
                flex: 1, border: 'none', background: 'transparent', outline: 'none',
                fontFamily: 'inherit', fontSize: 13, color: M.ink,
              }}
            />
            {query && (
              <span onClick={() => setQuery('')} style={{ color: M.mid, fontSize: 14, cursor: 'pointer' }}>✕</span>
            )}
          </div>
        </div>

        {/* Frafall-summary hvis det finnes folk i risiko/frafall */}
        {(counts.risiko + counts.frafall > 0) && groupFilter === 'alle' && !query && (
          <FrafallSummary stats={stats} onSelect={setExpandedName} />
        )}

        {/* Rangert liste */}
        {filtered.length === 0 ? (
          <div style={{
            background: M.card, border: `1px solid ${M.rule}`, padding: 24,
            color: M.mid, fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase',
            textAlign: 'center',
          }}>
            {stats.length === 0 ? 'ingen oppmøte registrert ennå' : `ingen treff på "${query}"`}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{
              padding: '8px 14px', display: 'grid',
              gridTemplateColumns: '40px 1fr 100px 80px 90px 50px 24px', gap: 12, alignItems: 'center',
              fontSize: 7, letterSpacing: '0.24em', color: M.mid, textTransform: 'uppercase', fontWeight: 700,
            }}>
              <span>#</span><span>navn</span><span>trend 30d</span><span>6 uker</span>
              <span style={{ textAlign: 'center' }}>status</span>
              <span style={{ textAlign: 'right' }}>totalt</span><span></span>
            </div>
            {filtered.map((m, i) => (
              <DesktopPersonRow key={m.name}
                rank={i + 1} member={m}
                expanded={expandedName === m.name}
                onToggle={() => setExpandedName(expandedName === m.name ? null : m.name)}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}

function FrafallSummary({ stats, onSelect }) {
  const risiko = stats.filter(m => m.status === 'risiko');
  const frafall = stats.filter(m => m.status === 'frafall');
  return (
    <div style={{
      background: M.card, border: `1px solid ${M.coral}`,
      marginBottom: 16, position: 'relative', overflow: 'hidden',
    }}>
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: M.coral }} />
      <SectionHead left="frafall-risiko" right={`${risiko.length + frafall.length} personer`} />
      <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {[...risiko, ...frafall].slice(0, 8).map(m => {
          const color = m.status === 'frafall' ? M.coral : M.accent;
          return (
            <div key={m.name} onClick={() => onSelect(m.name)} className="tl-card-clickable" style={{
              padding: '8px 12px', background: M.bg, border: `1px solid ${M.rule}`,
              display: 'grid', gridTemplateColumns: '1fr 80px 80px', gap: 12, alignItems: 'center',
              cursor: 'pointer',
            }}>
              <div style={{ fontSize: 12, color: M.ink, textTransform: 'capitalize' }}>{m.name}</div>
              <div style={{ fontSize: 9, color, letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 700 }}>
                ● {m.status}
              </div>
              <div style={{ fontSize: 10, color: M.mid, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                {m.daysSince}d siden sist
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DesktopPersonRow({ rank, member, expanded, onToggle }) {
  const lastDate = member.lastDate ? parseYmdM(member.lastDate) : null;
  const lastLabel = lastDate
    ? `${NORWAY_DAYS_SHORT[lastDate.getDay()]} ${lastDate.getDate()}.${pad(lastDate.getMonth()+1)}`
    : '—';

  const statusColor = member.status === 'aktiv' ? M.accent2
    : member.status === 'stille' ? M.amber
    : member.status === 'risiko' ? M.accent
    : M.coral;
  const trendColor = member.trend > 0 ? M.accent2 : member.trend < 0 ? M.coral : M.mid;
  const trendGlyph = member.trend > 0 ? '▲' : member.trend < 0 ? '▼' : '—';
  const trendText = member.trend === 0 ? 'flat' : `${member.trend > 0 ? '+' : ''}${member.trend}`;
  const weekMax = Math.max(1, ...member.weekBuckets);

  return (
    <div style={{ background: M.card, border: `1px solid ${M.rule}` }}>
      <div onClick={onToggle} className="tl-card-clickable" style={{
        padding: '10px 14px', display: 'grid',
        gridTemplateColumns: '40px 1fr 100px 80px 90px 50px 24px', gap: 12, alignItems: 'center',
        cursor: 'pointer',
      }}>
        <div style={{
          fontSize: 11, color: M.mid, fontVariantNumeric: 'tabular-nums', fontWeight: 700,
          letterSpacing: '0.08em',
        }}>#{rank.toString().padStart(2, '0')}</div>
        <div style={{ minWidth: 0 }}>
          <div style={{
            fontSize: 13, fontWeight: 600, color: M.ink, textTransform: 'capitalize',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>{member.name}</div>
          <div style={{ fontSize: 9, color: M.mid, marginTop: 3, letterSpacing: '0.10em' }}>
            sist {lastLabel}
          </div>
        </div>
        <div style={{
          fontSize: 11, color: trendColor, fontWeight: 700, letterSpacing: '0.08em',
          fontVariantNumeric: 'tabular-nums',
        }}>{trendGlyph} {trendText}</div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 24 }}>
          {member.weekBuckets.map((v, i) => (
            <div key={i} style={{
              width: 6, height: Math.max(2, (v / weekMax) * 22),
              background: v > 0 ? trendColor : M.rule,
            }} />
          ))}
        </div>
        <div style={{
          fontSize: 8, letterSpacing: '0.18em', color: statusColor,
          fontWeight: 700, textTransform: 'uppercase', textAlign: 'center',
        }}>● {member.status}</div>
        <div style={{ fontSize: 16, fontWeight: 700, color: M.ink, fontVariantNumeric: 'tabular-nums', textAlign: 'right' }}>
          {member.total}
        </div>
        <div style={{ fontSize: 12, color: M.mid }}>{expanded ? '▾' : '▸'}</div>
      </div>
      {expanded && <DesktopPersonDetail member={member} />}
    </div>
  );
}

function DesktopPersonDetail({ member }) {
  const { attended, tagCounts, total } = member;
  const groupCounts = {};
  attended.forEach(s => { groupCounts[s.group] = (groupCounts[s.group] || 0) + 1; });
  const groupSorted = Object.entries(groupCounts).sort((a,b) => b[1]-a[1]);

  // Tag-historikk: alle tags personen har vært på, sortert etter sist sett
  const tagLastDate = {};
  attended.forEach(s => (s.tags || []).forEach(t => {
    if (!tagLastDate[t]) tagLastDate[t] = s.date;
  }));
  const tagHistory = Object.keys(tagCounts)
    .map(id => ({ id, count: tagCounts[id], lastDate: tagLastDate[id] }))
    .sort((a, b) => (b.lastDate || '').localeCompare(a.lastDate || ''));

  const recent = attended.slice(0, 6);

  return (
    <div style={{ borderTop: `1px solid ${M.rule}`, padding: '16px 20px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20 }}>
      {/* Gruppe-fordeling */}
      <div>
        <div style={{ fontSize: 7, letterSpacing: '0.24em', color: M.mid, textTransform: 'uppercase', fontWeight: 700, marginBottom: 8 }}>
          gruppe-fordeling
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {groupSorted.map(([g, c]) => (
            <div key={g} style={{ display: 'grid', gridTemplateColumns: '90px 1fr 28px', gap: 8, alignItems: 'center' }}>
              <div style={{ fontSize: 10, color: M_GROUP[g] || M.ink, fontWeight: 600 }}>{g}</div>
              <div style={{ height: 5, background: M.bg, position: 'relative' }}>
                <div style={{ position: 'absolute', inset: 0, width: `${(c/total)*100}%`, background: M_GROUP[g] || M.ink }} />
              </div>
              <div style={{ fontSize: 10, fontWeight: 700, textAlign: 'right', color: M.ink, fontVariantNumeric: 'tabular-nums' }}>{c}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tag-historikk */}
      <div>
        <div style={{ fontSize: 7, letterSpacing: '0.24em', color: M.mid, textTransform: 'uppercase', fontWeight: 700, marginBottom: 8 }}>
          tag-historikk
        </div>
        {tagHistory.length === 0 ? (
          <div style={{
            padding: 10, border: `1px dashed ${M.rule}`,
            color: M.mid, fontSize: 9, textAlign: 'center',
            letterSpacing: '0.14em', textTransform: 'uppercase',
          }}>
            ingen tagger registrert<br/>
            {attended.length} økter · 0 har tagger
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {tagHistory.slice(0, 8).map((t, i) => {
              const def = TL_DATA.tags.find(x => x.id === t.id);
              const color = M_TAG_COLOR[def?.kind] || M.mid;
              const days = Math.floor((NOW - parseYmdM(t.lastDate)) / 86400000);
              return (
                <div key={t.id} style={{
                  padding: '6px 0', display: 'grid',
                  gridTemplateColumns: '10px 1fr auto auto', gap: 8, alignItems: 'center',
                  borderBottom: i === Math.min(tagHistory.length, 8) - 1 ? 'none' : `1px solid ${M.rule}`,
                }}>
                  <div style={{ width: 6, height: 6, background: color }} />
                  <div style={{ fontSize: 10, color: M.ink }}>{def?.label || t.id}</div>
                  <div style={{ fontSize: 8, color: M.mid, letterSpacing: '0.12em', fontVariantNumeric: 'tabular-nums' }}>
                    {days}d
                  </div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: M.ink, fontVariantNumeric: 'tabular-nums', minWidth: 18, textAlign: 'right' }}>
                    {t.count}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Siste økter */}
      <div>
        <div style={{ fontSize: 7, letterSpacing: '0.24em', color: M.mid, textTransform: 'uppercase', fontWeight: 700, marginBottom: 8 }}>
          siste 6 økter
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {recent.map((s, i) => {
            const d = parseYmdM(s.date);
            return (
              <div key={s.id} style={{
                padding: '6px 0', display: 'grid', gridTemplateColumns: '60px 1fr', gap: 10, alignItems: 'center',
                borderBottom: i === recent.length - 1 ? 'none' : `1px solid ${M.rule}`,
              }}>
                <div style={{ fontSize: 9, color: M.mid, fontVariantNumeric: 'tabular-nums' }}>
                  {NORWAY_DAYS_SHORT[d.getDay()]} {d.getDate()}.{pad(d.getMonth()+1)}
                </div>
                <div>
                  <div style={{ fontSize: 11, color: M.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {s.title || <span style={{ color: M.mid, fontStyle: 'italic' }}>uten tittel</span>}
                  </div>
                  <div style={{ fontSize: 8, color: M_GROUP[s.group] || M.mid, marginTop: 2, letterSpacing: '0.16em', textTransform: 'uppercase', fontWeight: 700 }}>
                    {s.group}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Kalender-skjerm ───────────────────────────────────────────────
function DesktopMonth({ sessions, planned, onOpenLog }) {
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
    <>
      <DesktopTopbar
        title={`${NORWAY_MONTHS[month.getMonth()]} ${month.getFullYear()}`}
        subtitle={`${(sessionsByDate[selected] || []).length} økter på valgt dag`}
        showGroupFilter={false}
      />

      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: 24, display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20 }}>
        {/* Måned-grid */}
        <div style={{ background: M.card, border: `1px solid ${M.rule}` }}>
          <div style={{
            padding: 14, borderBottom: `1px solid ${M.rule}`, background: M.cardHi,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <button onClick={() => setMonth(m => new Date(m.getFullYear(), m.getMonth()-1, 1))} style={{
              width: 32, height: 32, border: `1px solid ${M.rule}`, background: M.bg,
              fontSize: 14, color: M.ink, cursor: 'pointer', fontFamily: 'inherit',
            }}>‹</button>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
              <span style={{ fontSize: 11, color: M.mid, fontVariantNumeric: 'tabular-nums' }}>{month.getFullYear()}</span>
              <span style={{ fontSize: 22, fontWeight: 700, color: M.accent }}>
                {NORWAY_MONTHS[month.getMonth()]}
              </span>
            </div>
            <button onClick={() => setMonth(m => new Date(m.getFullYear(), m.getMonth()+1, 1))} style={{
              width: 32, height: 32, border: `1px solid ${M.rule}`, background: M.bg,
              fontSize: 14, color: M.ink, cursor: 'pointer', fontFamily: 'inherit',
            }}>›</button>
          </div>
          <div style={{ padding: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', marginBottom: 8 }}>
              {['M','T','O','T','F','L','S'].map((d, i) => (
                <div key={i} style={{
                  textAlign: 'center', fontSize: 8, color: M.mid,
                  letterSpacing: '0.20em', padding: '6px 0', textTransform: 'uppercase', fontWeight: 700,
                }}>{d}</div>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4 }}>
              {cells.map((d, i) => {
                if (!d) return <div key={i} style={{ height: 80 }} />;
                const ymd = ymdM(d);
                const isToday = ymd === TODAY_M;
                const isSelected = ymd === selected;
                const items = sessionsByDate[ymd] || [];
                return (
                  <button key={i} onClick={() => setSelected(ymd)} style={{
                    height: 80, padding: 8, cursor: 'pointer', fontFamily: 'inherit',
                    background: isSelected ? M.accent : M.bg,
                    color: isSelected ? '#0B0A09' : M.ink,
                    border: `1px solid ${isSelected ? M.accent : (isToday ? M.accent : M.rule)}`,
                    display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
                    position: 'relative', textAlign: 'left',
                  }}>
                    <div style={{
                      fontSize: 14, fontWeight: 700,
                      fontVariantNumeric: 'tabular-nums',
                      color: isSelected ? '#0B0A09' : (isToday ? M.accent : M.ink),
                    }}>{d.getDate()}</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 2, marginTop: 4 }}>
                      {items.slice(0, 4).map((it, j) => (
                        <span key={j} style={{
                          width: 6, height: 6,
                          background: isSelected ? '#0B0A09' : (it.kind === 'logged' ? (M_GROUP[it.group] || M.mid) : M.copperHi),
                        }} />
                      ))}
                      {items.length > 4 && (
                        <span style={{ fontSize: 7, color: isSelected ? '#0B0A09' : M.mid, marginLeft: 2 }}>+{items.length-4}</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Valgt dag */}
        <div style={{ background: M.card, border: `1px solid ${M.rule}`, height: 'fit-content', alignSelf: 'start' }}>
          <SectionHead
            left={`${NORWAY_DAYS_LONG[selectedDate.getDay()]} ${selectedDate.getDate()}.${pad(selectedDate.getMonth()+1)}`}
            right={`${selectedItems.length} økter`}
          />
          <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {selectedItems.length === 0 && (
              <div style={{
                padding: 16, color: M.mid, fontSize: 10, textAlign: 'center',
                letterSpacing: '0.16em', textTransform: 'uppercase',
              }}>ingen økter denne dagen</div>
            )}
            {selectedItems.map((it, i) => {
              const color = M_GROUP[it.group] || M.mid;
              return (
                <div key={i} onClick={() => {
                  if (it.kind === 'planned') onOpenLog(it, 'plan-fill');
                  else onOpenLog(it, 'edit');
                }} className="tl-card-clickable" style={{
                  background: M.bg, border: `1px solid ${M.rule}`,
                  padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 12,
                  position: 'relative', overflow: 'hidden', cursor: 'pointer',
                }}>
                  <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: color }} />
                  <div style={{ marginLeft: 4, minWidth: 50 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: M.ink, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
                      {it.time || '—'}
                    </div>
                    <div style={{ fontSize: 7, letterSpacing: '0.20em', color, textTransform: 'uppercase', fontWeight: 700, marginTop: 4 }}>
                      {it.group}
                    </div>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 11, color: it.title ? M.ink : M.mid, fontStyle: it.title ? 'normal' : 'italic',
                                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {it.title || (it.kind === 'planned' ? 'planlagt — uten innhold' : 'uten tittel')}
                    </div>
                  </div>
                  <div style={{ fontSize: 14, color: it.kind === 'logged' ? M.accent2 : M.accent }}>
                    {it.kind === 'logged' ? '●' : '○'}
                  </div>
                </div>
              );
            })}
            <button onClick={() => onOpenLog({ date: selected }, 'new')} style={{
              padding: 12, marginTop: 4,
              background: 'transparent', color: M.ink,
              border: `1px dashed ${M.rule}`, fontFamily: 'inherit',
              fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 700,
              cursor: 'pointer',
            }}>+ ny økt</button>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Logg-modal (port fra mobil, desktop-layout) ───────────────────
function DesktopLogModal({ mode, initial, trainers, sessions, onSave, onDelete, onClose }) {
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

  const [type, setType] = React.useState(() => {
    if (mode === 'edit' || mode === 'plan-fill') return 'logged';
    return (init.date && init.date > TODAY_M) ? 'planned' : 'logged';
  });
  const isPlanned = type === 'planned';
  const canToggleType = mode === 'new';

  const [recurring, setRecurring] = React.useState(false);
  const [recurDays, setRecurDays] = React.useState([]);
  const [recurUntil, setRecurUntil] = React.useState(() => {
    const d = parseYmdM(init.date || TODAY_M);
    d.setDate(d.getDate() + 56);
    return ymdM(d);
  });
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
  const recurringPreview = React.useMemo(
    () => recurring ? expandRecurring(date, recurUntil, recurDays) : [],
    [recurring, date, recurUntil, recurDays]
  );

  const toggleTag = (t) => setTags(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);
  const addCustomTag = () => {
    const slug = slugifyTag(newTagInput);
    if (!slug) return;
    setTags(prev => prev.includes(slug) ? prev : [...prev, slug]);
    setNewTagInput('');
  };

  // Tag-grupper
  const tagGroups = [
    { kind: 'position', label: 'posisjon' },
    { kind: 'action',   label: 'handling' },
  ];
  const tagsByKind = {};
  TL_DATA.tags.forEach(t => (tagsByKind[t.kind] ||= []).push(t));

  // Tidligere brukt (ikke-core)
  const tagUseCounts = React.useMemo(() => countTagUse(sessions), [sessions]);
  const predefinedTagIds = React.useMemo(() => new Set(TL_DATA.tags.map(t => t.id)), []);
  const customTagsUsed = React.useMemo(() =>
    Object.keys(tagUseCounts).filter(id => !predefinedTagIds.has(id))
      .sort((a, b) => tagUseCounts[b] - tagUseCounts[a]),
    [tagUseCounts, predefinedTagIds]
  );
  const draftCustomTags = tags.filter(id => !predefinedTagIds.has(id) && !customTagsUsed.includes(id));

  const buildPayload = () => isPlanned
    ? { date, time, group, trainer, title }
    : { date, time, group, trainer, title, content, tags, attendance: init.attendance ?? null };

  const submit = () => {
    if (isPlanned && recurring && recurringPreview.length > 0) {
      const base = buildPayload();
      onSave(recurringPreview.map(d => ({ ...base, date: d })), { type });
    } else {
      onSave(buildPayload(), { type });
    }
  };

  React.useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose(); }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const titleLabel =
    mode === 'plan-fill' ? 'logg planlagt økt' :
    mode === 'edit' ? 'rediger økt' :
    isPlanned ? 'planlegg økt' : 'ny økt';

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 100,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        width: 720, maxHeight: '92vh', overflowY: 'auto',
        background: M.bg, border: `1px solid ${M.ruleHi}`, fontFamily: STEEL_FONT,
      }}>
        <div style={{
          padding: '14px 22px', borderBottom: `1px solid ${M.rule}`,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div>
            <div style={{ fontSize: 8, letterSpacing: '0.24em', color: M.mid, textTransform: 'uppercase', fontWeight: 700 }}>
              {titleLabel}
            </div>
            {mode === 'plan-fill' && (
              <div style={{ fontSize: 9, color: M.copperHi, marginTop: 4, letterSpacing: '0.16em', textTransform: 'uppercase' }}>
                ● forhåndsutfylt fra plan
              </div>
            )}
          </div>
          <button onClick={onClose} style={{
            width: 28, height: 28, border: `1px solid ${M.rule}`,
            background: M.card, color: M.ink, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit',
          }}>✕</button>
        </div>

        {canToggleType && (
          <div style={{ padding: '14px 22px 0', display: 'flex', gap: 6 }}>
            {[{ id: 'logged', label: 'logg' }, { id: 'planned', label: 'planlegg' }].map(opt => {
              const active = type === opt.id;
              return (
                <button key={opt.id} onClick={() => setType(opt.id)} style={{
                  flex: 1, padding: '10px 14px',
                  background: active ? M.ink : M.card,
                  color: active ? '#fff' : M.mid,
                  border: 'none', fontFamily: 'inherit', fontSize: 11,
                  fontWeight: active ? 700 : 400, letterSpacing: '0.14em', textTransform: 'uppercase',
                  cursor: 'pointer',
                }}>{opt.label}</button>
              );
            })}
          </div>
        )}

        <div style={{ padding: '20px 22px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <DField label={isPlanned ? 'hva er planen?' : 'hva trente dere på?'}>
            <input value={title} onChange={(e) => setTitle(e.target.value)}
              placeholder={isPlanned ? 'f.eks. passing — knee cut' : 'f.eks. closed guard — kimura'}
              style={DFieldStyle()} />
          </DField>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <DField label={isPlanned && recurring ? 'starter' : 'dato'}>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={DFieldStyle()} />
            </DField>
            <DField label="tid">
              <input type="time" value={time} onChange={(e) => setTime(e.target.value)} style={DFieldStyle()} />
            </DField>
            <DField label="trener">
              <select value={trainer} onChange={(e) => setTrainer(e.target.value)} style={{ ...DFieldStyle(), appearance: 'none' }}>
                <option value="">(ingen)</option>
                {trainerList.map(t => <option key={t.id} value={t.id}>{t.name || t.id}</option>)}
              </select>
            </DField>
          </div>

          <DField label="gruppe">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {TL_DATA.groups.map(g => {
                const sel = group === g;
                return (
                  <span key={g} onClick={() => setGroup(g)} style={{
                    padding: '8px 14px',
                    background: sel ? (M_GROUP[g] || M.accent) : M.card,
                    color: sel ? '#fff' : M.ink,
                    border: `1px solid ${sel ? (M_GROUP[g] || M.accent) : M.rule}`,
                    fontSize: 11, fontWeight: sel ? 700 : 400, letterSpacing: '0.10em',
                    textTransform: 'uppercase', cursor: 'pointer',
                  }}>{g}</span>
                );
              })}
            </div>
          </DField>

          {isPlanned && canToggleType && (
            <DField label="gjenta">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => setRecurring(false)} style={DToggleStyle(!recurring)}>én gang</button>
                  <button onClick={enableRecurring} style={DToggleStyle(recurring)}>hver uke</button>
                </div>
                {recurring && (
                  <>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {[1,2,3,4,5,6,0].map(dow => {
                        const sel = recurDays.includes(dow);
                        return (
                          <button key={dow} onClick={() => toggleRecurDay(dow)} style={{
                            flex: 1, padding: '8px 0',
                            background: sel ? M.accent : M.card,
                            color: sel ? '#0B0A09' : M.ink,
                            border: `1px solid ${sel ? M.accent : M.rule}`,
                            fontFamily: 'inherit', fontSize: 11, fontWeight: sel ? 700 : 500,
                            cursor: 'pointer',
                          }}>{NORWAY_DAYS_INITIAL[dow]}</button>
                        );
                      })}
                    </div>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                      <span style={{ fontSize: 9, color: M.mid, letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 700 }}>til og med</span>
                      <input type="date" value={recurUntil} min={date} onChange={(e) => setRecurUntil(e.target.value)} style={{ ...DFieldStyle(), flex: 1 }} />
                    </div>
                    <div style={{
                      padding: '8px 14px', border: `1px dashed ${M.rule}`,
                      fontSize: 10, color: recurringPreview.length > 0 ? M.ink : M.mid,
                      letterSpacing: '0.14em', textTransform: 'uppercase', textAlign: 'center', fontWeight: 700,
                    }}>
                      {recurDays.length === 0 ? 'velg én eller flere dager'
                        : recurringPreview.length === 0 ? 'ingen datoer i intervallet'
                        : `lager ${recurringPreview.length} planlagte økter`}
                    </div>
                  </>
                )}
              </div>
            </DField>
          )}

          {!isPlanned && (
            <DField label={`tags · ${tags.length} valgt`}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {tagGroups.map(tg => {
                  const items = tagsByKind[tg.kind] || [];
                  if (!items.length) return null;
                  return (
                    <div key={tg.kind}>
                      <div style={{ fontSize: 8, color: M.mid, letterSpacing: '0.20em', marginBottom: 6, textTransform: 'uppercase', fontWeight: 700 }}>
                        {tg.label}
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {items.map(t => {
                          const sel = tags.includes(t.id);
                          const color = M_TAG_COLOR[t.kind] || M.ink;
                          return (
                            <span key={t.id} onClick={() => toggleTag(t.id)} style={{
                              padding: '6px 12px',
                              background: sel ? color : M.card,
                              color: sel ? '#fff' : M.ink,
                              border: `1px solid ${sel ? color : M.rule}`,
                              fontSize: 11, fontWeight: sel ? 600 : 400, cursor: 'pointer',
                            }}>{sel ? '✓ ' : ''}{t.label}</span>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
                {customTagsUsed.length > 0 && (
                  <div>
                    <div style={{ fontSize: 8, color: M.mid, letterSpacing: '0.20em', marginBottom: 6, textTransform: 'uppercase', fontWeight: 700 }}>tidligere brukt</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {customTagsUsed.map(id => {
                        const sel = tags.includes(id);
                        return (
                          <span key={id} onClick={() => toggleTag(id)} style={{
                            padding: '6px 12px',
                            background: sel ? M_TAG_COLOR.custom : M.card,
                            color: sel ? '#fff' : M.ink,
                            border: `1px solid ${sel ? M_TAG_COLOR.custom : M.rule}`,
                            fontSize: 11, fontWeight: sel ? 600 : 400, cursor: 'pointer',
                          }}>
                            {sel ? '✓ ' : ''}{id}
                            <span style={{ marginLeft: 6, opacity: 0.6, fontSize: 9 }}>· {tagUseCounts[id]}</span>
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}
                {draftCustomTags.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {draftCustomTags.map(id => (
                      <span key={id} onClick={() => toggleTag(id)} style={{
                        padding: '6px 12px', background: M_TAG_COLOR.custom, color: '#fff',
                        border: 'none', fontSize: 11, fontWeight: 600, cursor: 'pointer',
                      }}>✓ {id}</span>
                    ))}
                  </div>
                )}
                <div style={{ display: 'flex', gap: 6 }}>
                  <input value={newTagInput}
                    onChange={(e) => setNewTagInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustomTag(); } }}
                    placeholder="legg til ny tag, f.eks. side-control"
                    style={{ ...DFieldStyle(), flex: 1 }}
                  />
                  <button onClick={addCustomTag} disabled={!slugifyTag(newTagInput)} style={{
                    padding: '0 18px', background: slugifyTag(newTagInput) ? M.ink : M.rule,
                    color: '#fff', border: 'none', fontSize: 16, cursor: slugifyTag(newTagInput) ? 'pointer' : 'not-allowed',
                    fontFamily: 'inherit',
                  }}>+</button>
                </div>
              </div>
            </DField>
          )}

          {!isPlanned && (
            <DField label="notat (valgfritt)">
              <textarea value={content} onChange={(e) => setContent(e.target.value)} rows={3}
                placeholder="kort beskrivelse, fokus, observasjoner …"
                style={{ ...DFieldStyle(), resize: 'vertical', lineHeight: 1.5 }} />
            </DField>
          )}

          {/* Save row */}
          {mode === 'edit' ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 8, marginTop: 8 }}>
              <button onClick={() => {
                if (!window.confirm('Slette denne økten? Dette kan ikke angres.')) return;
                if (onDelete && initial?.id) onDelete(initial.id);
              }} style={DBtn('coral')}>slett</button>
              <button onClick={submit} disabled={!title} style={DBtn('primary', !title)}>lagre endringer</button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 8, marginTop: 8 }}>
              <button onClick={submit} disabled={!title} style={DBtn('primary', !title)}>
                {isPlanned ? 'lagre plan' : 'lagre'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DField({ label, children }) {
  return (
    <div>
      <div style={{
        fontSize: 9, color: M.mid, marginBottom: 8, letterSpacing: '0.20em',
        textTransform: 'uppercase', fontWeight: 700,
      }}>{label}</div>
      {children}
    </div>
  );
}

function DFieldStyle() {
  return {
    width: '100%', padding: '10px 14px',
    background: M.card, border: `1px solid ${M.rule}`,
    fontFamily: 'inherit', fontSize: 13, color: M.ink,
    boxSizing: 'border-box', borderRadius: 0,
  };
}

function DToggleStyle(active) {
  return {
    flex: 1, padding: '10px',
    background: active ? M.ink : M.card,
    color: active ? '#fff' : M.mid,
    border: 'none', fontFamily: 'inherit',
    fontSize: 11, fontWeight: active ? 700 : 400,
    letterSpacing: '0.14em', textTransform: 'uppercase',
    cursor: 'pointer',
  };
}

function DBtn(variant, disabled) {
  const styles = {
    primary: {
      background: disabled ? M.rule : M.accent,
      color: disabled ? M.mid : '#0B0A09',
      border: `1px solid ${disabled ? M.rule : M.accent}`,
    },
    coral: {
      background: 'transparent',
      color: M.coral,
      border: `1px solid ${M.coral}`,
    },
  };
  return {
    padding: '14px',
    fontFamily: 'inherit',
    fontSize: 11, fontWeight: 700,
    letterSpacing: '0.20em', textTransform: 'uppercase',
    cursor: disabled ? 'not-allowed' : 'pointer',
    ...styles[variant],
  };
}

// ─── Import-overlay (Steel-stil drag-zone for Spond .xlsx) ─────────
function ImportOverlay({ existingSessions, onClose, onApply }) {
  const [stage, setStage] = React.useState('drop'); // drop · preview
  const [filename, setFilename] = React.useState('');
  const [error, setError] = React.useState(null);
  const [parsed, setParsed] = React.useState(null);
  const [matches, setMatches] = React.useState([]);
  const [createMissing, setCreateMissing] = React.useState(true);
  const [overrideAtt, setOverrideAtt] = React.useState(true);
  const fileRef = React.useRef(null);

  React.useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose(); }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const handleFile = async (file) => {
    setError(null);
    setFilename(file.name);
    try {
      if (typeof XLSX === 'undefined') {
        throw new Error('XLSX-biblioteket er ikke lastet — last siden på nytt.');
      }
      const buf = await file.arrayBuffer();
      const p = _parseWorkbook(buf);
      const m = _buildMatches(p, existingSessions);
      setParsed(p);
      setMatches(m);
      setStage('preview');
    } catch (e) {
      setError(e.message || 'Klarte ikke lese fila.');
    }
  };

  const onDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer?.files?.[0];
    if (file) handleFile(file);
  };
  const onPick = (e) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const stats = React.useMemo(() => {
    if (!matches.length || !parsed) return null;
    const matched = matches.filter(m => m.match).length;
    const totalAttendance = parsed.members.reduce((s, m) => s + m.attendedCols.length, 0);
    return {
      totalSessions: matches.length, matched,
      missing: matches.length - matched,
      members: parsed.members.length, totalAttendance,
    };
  }, [matches, parsed]);

  const matchesByMonth = React.useMemo(() => {
    const map = {};
    for (const m of matches) {
      const k = m.ymd.slice(0, 7);
      (map[k] || (map[k] = [])).push(m);
    }
    return Object.entries(map).sort((a, b) => b[0].localeCompare(a[0]));
  }, [matches]);

  const apply = () => {
    const attMap = _buildAttendance(parsed);
    const updatedAttendance = {};
    const attendanceMap = {};
    const newSessions = [];
    matches.forEach((m, idx) => {
      const names = attMap[m.colIdx] || [];
      if (m.match) {
        attendanceMap[m.match.id] = names;
        if (overrideAtt) updatedAttendance[m.match.id] = names.length;
      } else if (createMissing) {
        const id = `imp-${m.ymd}-${m.group}-${idx}`;
        newSessions.push({
          id, date: m.ymd, time: '', group: m.group,
          trainer: '', title: m.rawClass, content: '', tags: [],
          attendance: names.length, imported: true,
        });
        attendanceMap[id] = names;
      }
    });
    onApply({ newSessions, updatedAttendance, attendanceMap });
  };

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 150,
      display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
      paddingTop: 60, paddingBottom: 40, overflowY: 'auto',
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        width: 'min(900px, 94vw)', background: M.bg,
        border: `1px solid ${M.accent}`, color: M.ink, fontFamily: STEEL_FONT,
      }}>
        {/* Header */}
        <div style={{
          padding: '14px 22px', borderBottom: `1px solid ${M.rule}`,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div>
            <div style={{ fontSize: 8, letterSpacing: '0.24em', color: M.accent, textTransform: 'uppercase', fontWeight: 700 }}>
              verktøy
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, color: M.ink, marginTop: 4, textTransform: 'lowercase' }}>
              {stage === 'drop' ? 'importer spond-eksport' : `forhåndsvis · ${filename}`}
            </div>
          </div>
          <button onClick={onClose} style={{
            width: 28, height: 28, border: `1px solid ${M.rule}`,
            background: M.card, color: M.ink, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit',
          }}>✕</button>
        </div>

        {stage === 'drop' && (
          <div style={{ padding: 28 }}>
            <div style={{ fontSize: 11, color: M.mid, lineHeight: 1.7, marginBottom: 18 }}>
              dra og slipp en .xlsx fra Spond → Oppmøtehistorikk, eller klikk for å velge fil.
              datoer + klassetyper leses fra header og matches mot eksisterende økter på dato + gruppe.
            </div>
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={onDrop}
              onClick={() => fileRef.current?.click()}
              className="tl-card-clickable"
              style={{
                padding: 48, border: `1px dashed ${M.accent}`, background: M.card,
                textAlign: 'center', cursor: 'pointer',
              }}>
              <div style={{ fontSize: 28, color: M.accent, marginBottom: 12 }}>↑</div>
              <div style={{
                fontSize: 11, letterSpacing: '0.20em', color: M.ink,
                textTransform: 'uppercase', fontWeight: 700,
              }}>slipp .xlsx-fil her</div>
              <div style={{ fontSize: 9, color: M.mid, marginTop: 8, letterSpacing: '0.14em' }}>
                eller klikk for å velge
              </div>
            </div>
            <input ref={fileRef} type="file" accept=".xlsx,.xls" onChange={onPick} style={{ display: 'none' }} />
            {error && (
              <div style={{
                marginTop: 16, padding: 12, border: `1px solid ${M.coral}`,
                color: M.coral, fontSize: 11, letterSpacing: '0.14em',
              }}>
                {error}
              </div>
            )}
            <div style={{ marginTop: 24, fontSize: 9, color: M.mid, lineHeight: 1.8, letterSpacing: '0.08em' }}>
              <div style={{ fontSize: 7, letterSpacing: '0.24em', color: M.accent, textTransform: 'uppercase', marginBottom: 6, fontWeight: 700 }}>
                hva skjer med fila
              </div>
              <div>↳ matchede økter får oppmøte-liste lagt til (navn knyttes til økt)</div>
              <div>↳ økter som ikke finnes kan opprettes som skeleton (uten tags eller innhold)</div>
              <div>↳ idempotent — samme fil kan lastes opp på nytt uten dubletter</div>
              <div>↳ ingenting lagres før du bekrefter</div>
            </div>
          </div>
        )}

        {stage === 'preview' && stats && (
          <div>
            {/* Stats-rad */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 1, background: M.rule }}>
              <KPICard label="økter i fil"     value={stats.totalSessions} color={M.ink} />
              <KPICard label="matchet"         value={stats.matched}       color={M.accent2} />
              <KPICard label="umatchet"        value={stats.missing}       color={stats.missing ? M.amber : M.mid} />
              <KPICard label="deltakere"       value={stats.members}       color={M.ink} />
              <KPICard label="oppmøter totalt" value={stats.totalAttendance} color={M.accent} />
            </div>

            {/* Options */}
            <div style={{
              padding: '14px 22px', borderBottom: `1px solid ${M.rule}`,
              display: 'flex', gap: 24, fontSize: 11, color: M.ink, flexWrap: 'wrap',
            }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input type="checkbox" checked={createMissing}
                  onChange={(e) => setCreateMissing(e.target.checked)} />
                <span>opprett skeleton-økter for {stats.missing} umatchede</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input type="checkbox" checked={overrideAtt}
                  onChange={(e) => setOverrideAtt(e.target.checked)} />
                <span>overskriv oppmøte-tall på matchede økter</span>
              </label>
            </div>

            {/* Match-liste */}
            <div style={{ maxHeight: 420, overflowY: 'auto' }}>
              {matchesByMonth.map(([ym, list]) => (
                <div key={ym}>
                  <div style={{
                    padding: '8px 22px', background: M.cardHi,
                    fontSize: 8, letterSpacing: '0.24em', color: M.mid,
                    textTransform: 'uppercase', fontWeight: 700,
                    borderBottom: `1px solid ${M.rule}`, borderTop: `1px solid ${M.rule}`,
                  }}>{ym}</div>
                  {list.map((m, i) => {
                    const names = (parsed && _buildAttendance(parsed)[m.colIdx]) || [];
                    const groupColor = M_GROUP[m.group] || M.mid;
                    return (
                      <div key={i} style={{
                        padding: '10px 22px', display: 'grid',
                        gridTemplateColumns: '70px 110px 1fr 80px 80px', gap: 12,
                        alignItems: 'center', fontSize: 11,
                        borderBottom: `1px solid ${M.rule}`,
                      }}>
                        <span style={{ color: M.mid, fontVariantNumeric: 'tabular-nums' }}>{m.ymd.slice(5)}</span>
                        <span style={{
                          color: groupColor, fontSize: 9, letterSpacing: '0.18em',
                          textTransform: 'uppercase', fontWeight: 700,
                        }}>{m.group}</span>
                        <span style={{
                          color: M.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>{m.rawClass}</span>
                        <span style={{ textAlign: 'right', color: M.mid, fontVariantNumeric: 'tabular-nums' }}>
                          {names.length} delt.
                        </span>
                        <span style={{
                          textAlign: 'right', fontSize: 9, letterSpacing: '0.18em',
                          color: m.match ? M.accent2 : M.amber, fontWeight: 700,
                        }}>
                          {m.match ? '● MATCH' : '○ NY'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>

            {/* Footer */}
            <div style={{
              padding: '14px 22px', borderTop: `1px solid ${M.rule}`,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              background: M.cardHi,
            }}>
              <button onClick={() => { setStage('drop'); setParsed(null); setMatches([]); }} style={{
                padding: '10px 16px', background: 'transparent', color: M.ink,
                border: `1px solid ${M.rule}`, fontFamily: 'inherit',
                fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 700,
                cursor: 'pointer',
              }}>← bytt fil</button>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={onClose} style={{
                  padding: '10px 16px', background: 'transparent', color: M.ink,
                  border: `1px solid ${M.rule}`, fontFamily: 'inherit',
                  fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 700,
                  cursor: 'pointer',
                }}>avbryt</button>
                <button onClick={apply} style={{
                  padding: '10px 20px', background: M.accent, color: '#0B0A09',
                  border: `1px solid ${M.accent}`, fontFamily: 'inherit',
                  fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 700,
                  cursor: 'pointer',
                }}>
                  importer {stats.matched} match{createMissing && stats.missing ? ` + ${stats.missing} ny` : ''}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
