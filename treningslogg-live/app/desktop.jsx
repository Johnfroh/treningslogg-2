// Treningslogg — desktop-app (Steel-tema)
// Tre-kolonne layout: sidebar (220px) + topbar + main grid.
// Bruker shared.js for tema, util og computeDashboard.
//
// Fase 2 (denne fila): skall + Hjem-skjerm med dashboard-data.
//   Kalender · Deltakere · Logg-økt: enkle placeholders.
//   Importer: åpner /import.html i samme fane.
// Fase 3: dyptgående dashboard, frafall-risiko, deltaker-detalj.
// Fase 4: drag-zone-import erstatter /import.html.

function DesktopApp() {
  const [screen, setScreen] = React.useState('home');
  const [sessions, setSessions] = React.useState([]);
  const [planned, setPlanned] = React.useState([]);
  const [members, setMembers] = React.useState([]);
  const [attendance, setAttendance] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [syncError, setSyncError] = React.useState(null);

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
  }

  const handleImport = () => {
    window.location.href = '/import.html';
  };

  return (
    <div style={{
      height: '100vh', width: '100vw', display: 'flex',
      background: M.bg, color: M.ink, fontFamily: STEEL_FONT,
      overflow: 'hidden',
    }}>
      <Sidebar active={screen} onSelect={setScreen} onImport={handleImport} />
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
          <PlaceholderScreen title="kalender" subtitle="kommer i fase 3" />
        )}
        {screen === 'people' && (
          <PlaceholderScreen title="deltakere" subtitle="kommer i fase 3" />
        )}
        {screen === 'log' && (
          <PlaceholderScreen title="logg økt" subtitle="kommer i fase 3" />
        )}
      </div>
    </div>
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
        denne flata bygges ut i fase 3
      </div>
    </>
  );
}
