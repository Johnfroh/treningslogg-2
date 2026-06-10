// Treningslogg — components (Daylight design system)
// Plus Jakarta Sans, lys lavendel bakgrunn, hvite avrundede kort.

const C = {
  // Tekst
  anthracite: '#232136',
  deepAnthracite: '#1A1830',
  // Overflater
  offWhite: '#F4F3FB',
  surface: '#FFFFFF',
  // Aksenter / palett (matches M-palett)
  bone: '#7B6EF6',     // lavendel-aksent (var: bone)
  boneMuted: '#4F9BEA', // blå (var: bonemuted som var grålig)
  amber: '#B06FD6',    // lilla (var: amber-ish)
  green: '#34B98C',    // mynte-grønn
  coral: '#F2825F',    // korall
  // Skiller
  greyMid: '#8A86A0',
  greyDim: '#B4B0C6',
  greyFrame: '#ECEAF4',
  ruleLight: '#ECEAF4',
  ruleDark: '#DEDBEC',
};

// Tag color by kind
const TAG_COLOR = {
  guard: C.green,
  submission: C.coral,
  dominant: C.bone,
  method: C.greyMid,
  custom: C.bone,
};

const GROUP_COLOR = {
  'junior':         C.amber,      // lilla
  'gi':             C.green,      // mynte
  'nogi':           C.coral,      // korall
  'åpen matte':     C.boneMuted,  // blå
};

// ─── Utility ──────────────────────────────────────────────────────────
const ymd = (d) => d.toISOString().slice(0, 10);
const parseYmd = (s) => { const [y,m,d] = s.split('-').map(Number); return new Date(y, m-1, d); };
const monthLabel = (d) => {
  const months = ['januar','februar','mars','april','mai','juni','juli','august','september','oktober','november','desember'];
  return `${months[d.getMonth()]} ${d.getFullYear()}`;
};
const dayLabel = (d) => {
  const days = ['søndag','mandag','tirsdag','onsdag','torsdag','fredag','lørdag'];
  return days[d.getDay()];
};
const dayShort = (d) => {
  const days = ['søn','man','tirs','ons','tor','fre','lør'];
  return days[d.getDay()];
};

// ─── Tag pill ─────────────────────────────────────────────────────────
const Tag = ({ tag, selected, onClick, size = 'md' }) => {
  const def = TL_DATA.tags.find(t => t.id === tag) || { label: tag, kind: 'custom' };
  const color = TAG_COLOR[def.kind] || C.anthracite;
  const fontSize = size === 'sm' ? 9 : 10;
  const pad = size === 'sm' ? '3px 8px' : '4px 10px';
  const style = {
    display: 'inline-block',
    fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
    fontSize,
    fontWeight: selected ? 700 : 400,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    padding: pad,
    border: `1px solid ${color}`,
    color: selected ? C.offWhite : color,
    background: selected ? color : 'transparent',
    cursor: onClick ? 'pointer' : 'default',
    whiteSpace: 'nowrap',
  };
  return <span style={style} onClick={onClick}>{def.label}</span>;
};

// ─── Button ───────────────────────────────────────────────────────────
const Btn = ({ variant = 'primary', children, onClick, style = {}, dark }) => {
  const base = {
    fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    padding: '10px 18px',
    cursor: 'pointer',
    border: 'none',
    background: 'transparent',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
  };
  const variants = {
    primary:   { background: C.anthracite, color: C.offWhite },
    secondary: { background: 'transparent', color: C.anthracite, border: `1px solid ${C.anthracite}` },
    ghost:     { background: 'transparent', color: C.greyMid, border: `1px solid ${C.ruleLight}` },
    amber:     { background: C.amber, color: C.offWhite },
    danger:    { background: 'transparent', color: C.coral, border: `1px solid ${C.coral}` },
  };
  if (dark) {
    variants.primary = { background: C.bone, color: C.deepAnthracite };
    variants.secondary = { background: 'transparent', color: C.bone, border: `1px solid ${C.boneMuted}` };
  }
  return (
    <button style={{ ...base, ...variants[variant], ...style }} onClick={onClick}>
      {children}
    </button>
  );
};

// ─── Header ───────────────────────────────────────────────────────────
const TopBar = ({ view, onView, trainer, onChangeTrainer }) => {
  const items = [
    { id: 'calendar', label: 'kalender' },
    { id: 'list',     label: 'liste' },
    { id: 'tags',     label: 'tags' },
    { id: 'people',   label: 'deltakere' },
  ];
  return (
    <header style={{
      background: C.offWhite,
      borderBottom: `1px solid ${C.anthracite}`,
      position: 'sticky', top: 0, zIndex: 50,
    }}>
      <div style={{
        maxWidth: 1440, margin: '0 auto', padding: '0 32px', height: 64,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 32,
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <span style={{ fontSize: 14, fontWeight: 700, letterSpacing: '0.10em', color: C.anthracite, textTransform: 'lowercase' }}>
            bodø jiu jitsu
          </span>
          <span style={{ fontSize: 8, letterSpacing: '0.10em', color: C.greyMid, textTransform: 'uppercase' }}>
            treningslogg · trenere
          </span>
        </div>
        <nav style={{ display: 'flex', gap: 28 }}>
          {items.map(it => (
            <span key={it.id} onClick={() => onView(it.id)} style={{
              fontSize: 11, letterSpacing: '0.12em', textTransform: 'lowercase',
              color: view === it.id ? C.anthracite : C.greyMid,
              fontWeight: view === it.id ? 700 : 400,
              borderBottom: view === it.id ? `2px solid ${C.amber}` : '2px solid transparent',
              padding: '22px 0',
              cursor: 'pointer',
            }}>{it.label}</span>
          ))}
        </nav>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.greyMid }}>trener</span>
          <select value={trainer} onChange={e => onChangeTrainer(e.target.value)} style={{
            fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif", fontSize: 11, letterSpacing: '0.1em',
            background: 'transparent', border: `1px solid ${C.anthracite}`, padding: '6px 10px',
            color: C.anthracite, textTransform: 'lowercase', borderRadius: 10,
          }}>
            {TL_DATA.trainers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
      </div>
    </header>
  );
};

// ─── Calendar ─────────────────────────────────────────────────────────
const Calendar = ({ month, sessions, planned, filterGroup, filterTrainer, onPickDate, today }) => {
  // build 6×7 grid for the month
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const startDay = (first.getDay() + 6) % 7; // monday=0
  const start = new Date(first); start.setDate(first.getDate() - startDay);
  const cells = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(start); d.setDate(start.getDate() + i);
    cells.push(d);
  }

  const isInMonth = (d) => d.getMonth() === month.getMonth();
  const isToday = (d) => ymd(d) === ymd(today);

  const sessionsByDate = {};
  sessions.forEach(s => {
    if (filterGroup !== 'alle' && s.group !== filterGroup) return;
    if (filterTrainer !== 'alle' && s.trainer !== filterTrainer) return;
    (sessionsByDate[s.date] ||= []).push({ ...s, kind: 'logged' });
  });
  planned.forEach(p => {
    if (filterGroup !== 'alle' && p.group !== filterGroup) return;
    if (filterTrainer !== 'alle' && p.trainer !== filterTrainer) return;
    (sessionsByDate[p.date] ||= []).push({ ...p, kind: 'planned' });
  });
  // sort by time within each day
  Object.keys(sessionsByDate).forEach(k => {
    sessionsByDate[k].sort((a, b) => (a.time || '').localeCompare(b.time || ''));
  });

  const headDays = ['MAN','TIR','ONS','TOR','FRE','LØR','SØN'];

  return (
    <div style={{ border: `1px solid ${C.anthracite}`, background: C.offWhite }}>
      {/* day headers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: `1px solid ${C.anthracite}`, background: C.anthracite }}>
        {headDays.map(h => (
          <div key={h} style={{
            fontSize: 9, fontWeight: 700, letterSpacing: '0.10em', color: C.bone,
            padding: '12px 14px', borderRight: `1px solid ${C.greyFrame}`,
          }}>{h}</div>
        ))}
      </div>
      {/* grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
        {cells.map((d, i) => {
          const inMonth = isInMonth(d);
          const today_ = isToday(d);
          const items = sessionsByDate[ymd(d)] || [];
          return (
            <div key={i} onClick={() => onPickDate(d)} style={{
              minHeight: 140,
              padding: '8px 10px',
              borderRight: (i % 7 !== 6) ? `1px solid ${C.ruleLight}` : 'none',
              borderBottom: (i < 35) ? `1px solid ${C.ruleLight}` : 'none',
              background: today_ ? 'rgba(172,122,52,0.06)' : 'transparent',
              opacity: inMonth ? 1 : 0.35,
              cursor: 'pointer',
              display: 'flex', flexDirection: 'column', gap: 4,
              position: 'relative',
            }}>
              <div style={{
                fontSize: 11,
                fontWeight: today_ ? 700 : 400,
                color: today_ ? C.amber : C.anthracite,
                letterSpacing: '0.04em',
                display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
              }}>
                <span>{d.getDate()}</span>
                {today_ && <span style={{ fontSize: 8, letterSpacing: '0.10em' }}>I DAG</span>}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 4 }}>
                {items.slice(0, 3).map((s, idx) => (
                  <div key={idx} style={{
                    borderLeft: `2px solid ${GROUP_COLOR[s.group]}`,
                    paddingLeft: 6,
                    lineHeight: 1.25,
                    opacity: s.kind === 'planned' ? 0.7 : 1,
                    overflow: 'hidden',
                  }}>
                    <div style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color: s.kind === 'planned' ? C.amber : C.anthracite,
                      letterSpacing: '0.08em',
                      fontVariantNumeric: 'tabular-nums',
                    }}>
                      {s.time}
                    </div>
                    <div style={{
                      fontSize: 9,
                      letterSpacing: '0.04em',
                      color: s.kind === 'planned' ? C.greyMid : C.anthracite,
                      textTransform: 'lowercase',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                    {s.kind === 'logged'
                      ? <span>{s.title}</span>
                      : <span style={{ fontStyle: 'italic' }}>{s.title || `${TL_DATA.groupShort[s.group]} (planlagt)`}</span>}
                    </div>
                  </div>
                ))}
                {items.length > 3 && (
                  <div style={{ fontSize: 8, letterSpacing: '0.10em', color: C.greyMid, paddingLeft: 8 }}>
                    + {items.length - 3} TIL
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ─── Filters bar ──────────────────────────────────────────────────────
const FilterBar = ({ filterGroup, setFilterGroup, filterTrainer, setFilterTrainer }) => {
  const groups = ['alle', ...TL_DATA.groups];
  const trainers = ['alle', ...TL_DATA.trainers.map(t => t.id)];
  return (
    <div style={{ display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 9, letterSpacing: '0.10em', textTransform: 'uppercase', color: C.greyMid }}>gruppe</span>
        <div style={{ display: 'flex', border: `1px solid ${C.anthracite}` }}>
          {groups.map(g => (
            <span key={g} onClick={() => setFilterGroup(g)} style={{
              fontSize: 10, letterSpacing: '0.12em', textTransform: 'lowercase',
              padding: '6px 12px',
              background: filterGroup === g ? C.anthracite : 'transparent',
              color: filterGroup === g ? C.offWhite : C.anthracite,
              cursor: 'pointer',
              borderRight: g !== groups[groups.length-1] ? `1px solid ${C.anthracite}` : 'none',
              fontWeight: filterGroup === g ? 700 : 400,
            }}>{g}</span>
          ))}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 9, letterSpacing: '0.10em', textTransform: 'uppercase', color: C.greyMid }}>trener</span>
        <div style={{ display: 'flex', border: `1px solid ${C.anthracite}` }}>
          {trainers.map(t => (
            <span key={t} onClick={() => setFilterTrainer(t)} style={{
              fontSize: 10, letterSpacing: '0.12em', textTransform: 'lowercase',
              padding: '6px 12px',
              background: filterTrainer === t ? C.anthracite : 'transparent',
              color: filterTrainer === t ? C.offWhite : C.anthracite,
              cursor: 'pointer',
              borderRight: t !== trainers[trainers.length-1] ? `1px solid ${C.anthracite}` : 'none',
              fontWeight: filterTrainer === t ? 700 : 400,
            }}>{t}</span>
          ))}
        </div>
      </div>
    </div>
  );
};

// ─── Day Side Panel ───────────────────────────────────────────────────
const DayPanel = ({ date, sessions, planned, attendanceMap, onClose, onOpenSession, onNewSession, onPlanFill }) => {
  if (!date) return null;
  const dayItems = [
    ...sessions.filter(s => s.date === ymd(date)).map(s => ({ ...s, kind: 'logged' })),
    ...planned.filter(p => p.date === ymd(date)).map(p => ({ ...p, kind: 'planned' })),
  ].sort((a,b) => a.time.localeCompare(b.time));

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(18,17,16,0.4)', zIndex: 100, display: 'flex', justifyContent: 'flex-end' }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        width: 480, background: C.offWhite, borderLeft: `1px solid ${C.anthracite}`,
        display: 'flex', flexDirection: 'column', height: '100vh', overflowY: 'auto',
      }}>
        <div style={{ padding: '20px 28px', borderBottom: `1px solid ${C.anthracite}`, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <div>
            <div style={{ fontSize: 9, letterSpacing: '0.10em', textTransform: 'uppercase', color: C.greyMid, marginBottom: 4 }}>
              {dayLabel(date)} · {date.getDate()}. {monthLabel(date).split(' ')[0]}
            </div>
            <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'lowercase', color: C.anthracite }}>
              dagens økter
            </div>
          </div>
          <span onClick={onClose} style={{ fontSize: 22, cursor: 'pointer', color: C.greyMid, lineHeight: 1 }}>×</span>
        </div>

        <div style={{ padding: '20px 28px', flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {dayItems.length === 0 && (
            <div style={{ fontSize: 12, color: C.greyMid, padding: '32px 0', textAlign: 'center', borderTop: `1px dashed ${C.ruleLight}`, borderBottom: `1px dashed ${C.ruleLight}` }}>
              ingen økter denne dagen.
            </div>
          )}

          {dayItems.map((it, i) => (
            <div key={i} onClick={() => onOpenSession(it)} style={{
              border: `1px solid ${it.kind === 'planned' ? C.ruleLight : C.anthracite}`,
              padding: '14px 16px',
              cursor: 'pointer',
              background: it.kind === 'planned' ? 'transparent' : C.offWhite,
              borderLeft: `3px solid ${GROUP_COLOR[it.group]}`,
              display: 'flex', flexDirection: 'column', gap: 8,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.anthracite }}>
                  {it.time} · {it.group}
                </div>
                <span style={{ fontSize: 9, letterSpacing: '0.10em', textTransform: 'uppercase',
                  color: it.kind === 'planned' ? C.amber : C.green }}>
                  {it.kind === 'planned' ? '○ planlagt' : '● logget'}
                </span>
              </div>
              <div style={{ fontSize: 14, fontWeight: 400, color: C.anthracite, letterSpacing: '0.04em' }}>
                {it.title || <span style={{ fontStyle: 'italic', color: C.greyMid }}>uten innhold</span>}
              </div>
              {it.kind === 'logged' && (
                <>
                  <div style={{ fontSize: 11, lineHeight: 1.6, color: C.greyMid, letterSpacing: '0.04em' }}>
                    {it.content?.length > 120 ? it.content.slice(0, 120) + '…' : it.content}
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 2 }}>
                    {it.tags.map(t => <Tag key={t} tag={t} size="sm" />)}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 4, paddingTop: 8, borderTop: `1px solid ${C.ruleLight}` }}>
                    <span style={{ fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.greyMid }}>
                      {it.trainer ? `${it.trainer} · ` : ''}{it.attendance} oppmøtt
                    </span>
                    {it.imported && (
                      <span style={{ fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.amber }}>
                        ↑ importert
                      </span>
                    )}
                  </div>
                  {attendanceMap?.[it.id]?.length > 0 && (
                    <div style={{
                      marginTop: 6, padding: '8px 10px', background: C.surface,
                      borderLeft: `2px solid ${C.greyMid}`,
                      fontSize: 10, lineHeight: 1.7, color: C.greyDim, letterSpacing: '0.04em',
                    }}>
                      <div style={{ fontSize: 9, letterSpacing: '0.08em', color: C.boneMuted, marginBottom: 4 }}>
                        DELTAKERE ({attendanceMap[it.id].length})
                      </div>
                      {attendanceMap[it.id].slice(0, 8).join(', ')}
                      {attendanceMap[it.id].length > 8 && ` +${attendanceMap[it.id].length - 8} til`}
                    </div>
                  )}
                </>
              )}
              {it.kind === 'planned' && (
                <div style={{ fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.amber, marginTop: 4 }}>
                  → legg inn innhold
                </div>
              )}
            </div>
          ))}
        </div>

        <div style={{ borderTop: `1px solid ${C.anthracite}`, padding: '16px 28px', display: 'flex', gap: 12 }}>
          <Btn variant="primary" onClick={() => onNewSession(date)}>+ logg økt</Btn>
          <Btn variant="secondary" onClick={() => onPlanFill(date)}>planlegg</Btn>
        </div>
      </div>
    </div>
  );
};

// ─── Session Editor ───────────────────────────────────────────────────
const SessionEditor = ({ initial, mode, onClose, onSave, onDelete }) => {
  const [data, setData] = React.useState(() => initial || {
    date: ymd(new Date()), time: '19:00', group: 'gi',
    trainer: 'marius', title: '', content: '', tags: [],
  });
  const [newTag, setNewTag] = React.useState('');

  const update = (k, v) => setData(d => ({ ...d, [k]: v }));
  const toggleTag = (id) => setData(d => ({
    ...d,
    tags: d.tags.includes(id) ? d.tags.filter(t => t !== id) : [...d.tags, id],
  }));

  const addCustomTag = () => {
    if (!newTag.trim()) return;
    const id = newTag.trim().toLowerCase().replace(/\s+/g, '-');
    if (!TL_DATA.tags.find(t => t.id === id)) {
      TL_DATA.tags.push({ id, label: newTag.trim().toLowerCase(), kind: 'custom' });
    }
    if (!data.tags.includes(id)) update('tags', [...data.tags, id]);
    setNewTag('');
  };

  const allTagIds = TL_DATA.tags.map(t => t.id);
  const remaining = allTagIds.filter(id => !data.tags.includes(id));

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(18,17,16,0.55)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32 }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        width: '100%', maxWidth: 920, maxHeight: 'calc(100vh - 64px)', overflowY: 'auto',
        background: C.offWhite, border: `1px solid ${C.anthracite}`,
        display: 'flex', flexDirection: 'column',
      }}>
        {/* header */}
        <div style={{ padding: '20px 32px', borderBottom: `1px solid ${C.anthracite}`, background: C.anthracite, color: C.bone, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <div>
            <div style={{ fontSize: 9, letterSpacing: '0.10em', textTransform: 'uppercase', color: C.boneMuted, marginBottom: 4 }}>
              {mode === 'new' ? 'ny økt' : mode === 'plan' ? 'planlegg økt' : 'rediger økt'}
            </div>
            <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'lowercase' }}>
              {data.title || (mode === 'plan' ? 'planlagt — uten tittel' : 'uten tittel')}
            </div>
          </div>
          <span onClick={onClose} style={{ fontSize: 24, cursor: 'pointer', color: C.boneMuted, lineHeight: 1 }}>×</span>
        </div>

        {/* body */}
        <div style={{ padding: '24px 32px', display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 32 }}>
          {/* left col: when, title, content */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <Field label="når">
              <div style={{ display: 'flex', gap: 8 }}>
                <input type="date" value={data.date} onChange={e => update('date', e.target.value)} style={inputStyle} />
                <input type="time" value={data.time} onChange={e => update('time', e.target.value)} style={{ ...inputStyle, width: 110 }} />
              </div>
            </Field>

            <Field label="tittel / fokus">
              <input type="text" value={data.title} onChange={e => update('title', e.target.value)}
                placeholder="f.eks. closed guard — kimura"
                style={inputStyle} />
            </Field>

            <Field label="innhold">
              <textarea value={data.content} onChange={e => update('content', e.target.value)}
                placeholder="oppvarming, teknikk, drilling, sparring …"
                rows={8}
                style={{ ...inputStyle, fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif", lineHeight: 1.7, resize: 'vertical' }} />
            </Field>
          </div>

          {/* right col: meta + tags */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <Field label="gruppe">
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {TL_DATA.groups.map(g => (
                  <label key={g} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '8px 12px',
                    border: `1px solid ${data.group === g ? C.anthracite : C.ruleLight}`,
                    borderBottom: 'none',
                    background: data.group === g ? C.anthracite : 'transparent',
                    color: data.group === g ? C.offWhite : C.anthracite,
                    cursor: 'pointer',
                    fontSize: 11, letterSpacing: '0.1em',
                  }} onClick={() => update('group', g)}>
                    <span style={{ width: 8, height: 8, background: GROUP_COLOR[g], display: 'inline-block' }}></span>
                    {g}
                  </label>
                ))}
                <div style={{ borderBottom: `1px solid ${C.ruleLight}` }}></div>
              </div>
            </Field>

            <Field label="trener">
              <select value={data.trainer} onChange={e => update('trainer', e.target.value)} style={inputStyle}>
                {TL_DATA.trainers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </Field>

            <Field label={`tags · valgt (${data.tags.length})`}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, minHeight: 28 }}>
                {data.tags.length === 0 && <span style={{ fontSize: 10, color: C.greyMid, letterSpacing: '0.1em' }}>ingen valgt</span>}
                {data.tags.map(t => <Tag key={t} tag={t} selected onClick={() => toggleTag(t)} />)}
              </div>
            </Field>

            <Field label="velg eller skriv">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
                {remaining.map(t => <Tag key={t} tag={t} onClick={() => toggleTag(t)} />)}
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                <input type="text" value={newTag} onChange={e => setNewTag(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') addCustomTag(); }}
                  placeholder="+ ny tag" style={{ ...inputStyle, fontSize: 10 }} />
                <Btn variant="secondary" onClick={addCustomTag} style={{ padding: '6px 12px' }}>legg til</Btn>
              </div>
            </Field>
          </div>
        </div>

        {/* footer */}
        <div style={{ borderTop: `1px solid ${C.anthracite}`, padding: '16px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: C.surface }}>
          {mode === 'edit' && onDelete
            ? <Btn variant="danger" onClick={onDelete}>slett økt</Btn>
            : <span style={{ fontSize: 9, letterSpacing: '0.10em', textTransform: 'uppercase', color: C.greyMid }}>auto-lagres når du trykker lagre</span>}
          <div style={{ display: 'flex', gap: 12 }}>
            <Btn variant="ghost" onClick={onClose}>avbryt</Btn>
            {mode !== 'edit' && (
              <Btn variant="secondary" onClick={() => onSave(data, { keepOpen: true })}>
                lagre & ny
              </Btn>
            )}
            <Btn variant="primary" onClick={() => onSave(data)}>
              {mode === 'plan' ? 'lagre planlagt' : 'lagre økt'}
            </Btn>
          </div>
        </div>
      </div>
    </div>
  );
};

const inputStyle = {
  fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
  fontSize: 12,
  letterSpacing: '0.04em',
  background: 'transparent',
  border: `1px solid ${C.anthracite}`,
  padding: '10px 12px',
  width: '100%',
  borderRadius: 10,
  color: C.anthracite,
  boxSizing: 'border-box',
};

const Field = ({ label, children }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
    <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase', color: C.greyMid }}>
      {label}
    </span>
    {children}
  </div>
);

// ─── List view (alternate to calendar) ───────────────────────────────
const ListView = ({ sessions, planned, onOpenSession, filterGroup, filterTrainer }) => {
  const all = [
    ...sessions.map(s => ({ ...s, kind: 'logged' })),
    ...planned.map(p => ({ ...p, kind: 'planned' })),
  ]
  .filter(s => filterGroup === 'alle' || s.group === filterGroup)
  .filter(s => filterTrainer === 'alle' || s.trainer === filterTrainer)
  .sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));

  return (
    <div style={{ border: `1px solid ${C.anthracite}` }}>
      <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr 130px 90px 90px', background: C.anthracite }}>
        {['DATO','ØKT','GRUPPE / TRENER','TAGS','OPPMØTE'].map(h => (
          <div key={h} style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.10em', color: C.bone, padding: '12px 16px', borderRight: `1px solid ${C.greyFrame}` }}>{h}</div>
        ))}
      </div>
      {all.map((s, i) => {
        const d = parseYmd(s.date);
        return (
          <div key={s.id} onClick={() => onOpenSession(s)} style={{
            display: 'grid', gridTemplateColumns: '120px 1fr 130px 90px 90px',
            borderBottom: `1px solid ${C.ruleLight}`,
            background: i%2===0 ? 'transparent' : 'rgba(55,63,67,0.03)',
            cursor: 'pointer',
          }}>
            <div style={{ padding: '14px 16px', borderRight: `1px solid ${C.ruleDark}` }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.04em', color: C.anthracite }}>
                {dayShort(d)} {d.getDate()}.{String(d.getMonth()+1).padStart(2,'0')}
              </div>
              <div style={{ fontSize: 9, letterSpacing: '0.08em', color: C.greyMid, textTransform: 'uppercase' }}>{s.time}</div>
            </div>
            <div style={{ padding: '14px 16px', borderRight: `1px solid ${C.ruleDark}` }}>
              <div style={{ fontSize: 12, color: C.anthracite, letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 6, height: 6, background: GROUP_COLOR[s.group], display: 'inline-block' }}></span>
                {s.title || <span style={{ fontStyle: 'italic', color: C.greyMid }}>{s.kind === 'planned' ? 'planlagt — uten innhold' : 'uten tittel'}</span>}
              </div>
              {s.content && <div style={{ fontSize: 10, color: C.greyMid, marginTop: 4, letterSpacing: '0.02em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.content}</div>}
            </div>
            <div style={{ padding: '14px 16px', borderRight: `1px solid ${C.ruleDark}`, fontSize: 10, letterSpacing: '0.1em', color: C.greyMid, textTransform: 'lowercase' }}>
              <div>{s.group}</div>
              <div style={{ color: C.boneMuted, fontSize: 9 }}>{s.trainer}</div>
            </div>
            <div style={{ padding: '14px 16px', borderRight: `1px solid ${C.ruleDark}`, display: 'flex', flexWrap: 'wrap', gap: 3, alignContent: 'flex-start' }}>
              {(s.tags || []).slice(0, 2).map(t => <Tag key={t} tag={t} size="sm" />)}
              {(s.tags || []).length > 2 && <span style={{ fontSize: 9, color: C.greyMid, letterSpacing: '0.08em' }}>+{s.tags.length - 2}</span>}
            </div>
            <div style={{ padding: '14px 16px', fontSize: 11, color: C.anthracite, letterSpacing: '0.06em' }}>
              {s.attendance != null ? `${s.attendance} stk` : <span style={{ color: C.greyMid }}>—</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
};

// Make components global
Object.assign(window, {
  C, TAG_COLOR, GROUP_COLOR, ymd, parseYmd, monthLabel, dayLabel, dayShort,
  Tag, Btn, TopBar, Calendar, FilterBar, DayPanel, SessionEditor, ListView,
});
