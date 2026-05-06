// ImportModal — last opp Spond-Excel og match mot økter
// Format (forklaring av Excel):
//   row 0: ['Navn', 'INVITERTE…', 'DELTATT…', '%', '%', '%', null, <excel-date-serial>, …]
//   row 1: [null, …, null, '<klassetype>*', …]   (klassetype med trailing *)
//   row 2+: ['<navn>', invitert, deltatt, %, %, %, null, '1' eller null, …]

const excelSerialToDate = (serial) => {
  const n = Number(serial);
  if (!Number.isFinite(n)) return null;
  // Excel epoch: Dec 30 1899 (handles 1900 leap-year bug)
  const ms = (n - 25569) * 86400 * 1000;
  const d = new Date(ms);
  // pull Y/M/D in UTC then build local-midnight
  return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
};

// Map Excel klassetype → app group
const mapClassToGroup = (raw) => {
  if (!raw) return null;
  const s = String(raw).toLowerCase().replace(/\*+\s*$/, '').trim();
  if (s.includes('junior')) return 'junior';
  if (s.includes('nogi') || s.includes('no-gi') || s.includes('erfaren')) return 'erfaren';
  if (s.includes('grunn') || s.includes('intro') || s.includes('fundamental')) return 'grunnleggende';
  // "Åpen matte" = fri trening uten instruktør (egen gruppe)
  if (s.includes('åpen') || s.includes('open mat')) return 'åpen matte';
  if (s.includes('ekstra')) return 'erfaren';
  // "Alle Nivåer" og "Gi" er instruktørledede økter
  if (s.includes('alle')) return 'alle nivåer';
  if (s.startsWith('gi')) return 'alle nivåer';
  return 'alle nivåer';
};

const parseWorkbook = (arrayBuffer) => {
  const wb = XLSX.read(arrayBuffer, { type: 'array' });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false });
  if (rows.length < 3) throw new Error('Fant ingen rader.');

  const dateRow = rows[0];
  const classRow = rows[1];

  // Find session columns (skip first 6 stat columns + null gap)
  const sessionCols = [];
  for (let c = 0; c < dateRow.length; c++) {
    const dateCell = dateRow[c];
    const classCell = classRow[c];
    if (!dateCell || !classCell) continue;
    const date = excelSerialToDate(dateCell);
    if (!date) continue;
    const rawClass = String(classCell);
    sessionCols.push({
      colIdx: c,
      date,
      ymd: `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`,
      rawClass: rawClass.replace(/\*+\s*$/, '').trim(),
      group: mapClassToGroup(rawClass),
    });
  }

  // Members: rows 2+
  const members = [];
  for (let r = 2; r < rows.length; r++) {
    const row = rows[r];
    if (!row || !row[0]) continue;
    const name = String(row[0]).trim();
    if (!name) continue;
    const attended = sessionCols
      .filter(sc => row[sc.colIdx] && String(row[sc.colIdx]).trim() === '1')
      .map(sc => sc.colIdx);
    members.push({
      name,
      invited: row[1],
      attended: row[2],
      pct: row[3],
      attendedCols: attended,
    });
  }

  return { sessionCols, members };
};

// Build attendance map: sessionCol-key → [memberNames]
const buildAttendance = (parsed) => {
  const byCol = {};
  for (const sc of parsed.sessionCols) byCol[sc.colIdx] = [];
  for (const m of parsed.members) {
    for (const colIdx of m.attendedCols) byCol[colIdx].push(m.name);
  }
  return byCol;
};

// Match each Excel session to an existing app session by date+group
const buildMatches = (parsed, existingSessions) => {
  const byKey = new Map();
  for (const s of existingSessions) {
    const k = `${s.date}|${s.group}`;
    if (!byKey.has(k)) byKey.set(k, []);
    byKey.get(k).push(s);
  }
  return parsed.sessionCols.map(sc => {
    const key = `${sc.ymd}|${sc.group}`;
    const candidates = byKey.get(key) || [];
    return {
      ...sc,
      match: candidates[0] || null,
      candidates,
    };
  });
};

const ImportModal = ({ onClose, existingSessions, onApply }) => {
  const [stage, setStage] = React.useState('drop'); // drop | preview | done
  const [error, setError] = React.useState(null);
  const [parsed, setParsed] = React.useState(null);
  const [matches, setMatches] = React.useState([]);
  const [createMissing, setCreateMissing] = React.useState(true);
  const [overrideAtt, setOverrideAtt] = React.useState(true);
  const [filename, setFilename] = React.useState('');
  const fileRef = React.useRef(null);

  const handleFile = async (file) => {
    setError(null);
    setFilename(file.name);
    try {
      const buf = await file.arrayBuffer();
      const p = parseWorkbook(buf);
      const m = buildMatches(p, existingSessions);
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

  const apply = () => {
    const attMap = buildAttendance(parsed); // colIdx -> [names]
    const updatedAttendance = {}; // sessionId -> count
    const attendanceMap = {}; // sessionId -> [names]
    const newSessions = [];

    matches.forEach((m, idx) => {
      const names = attMap[m.colIdx] || [];
      if (m.match) {
        attendanceMap[m.match.id] = names;
        if (overrideAtt) updatedAttendance[m.match.id] = names.length;
      } else if (createMissing) {
        const id = `imp-${m.ymd}-${m.group}-${idx}`;
        newSessions.push({
          id,
          date: m.ymd,
          time: '',
          group: m.group,
          trainer: '',
          title: m.rawClass,
          content: '',
          tags: [],
          attendance: names.length,
          imported: true,
        });
        attendanceMap[id] = names;
      }
    });

    onApply({ newSessions, updatedAttendance, attendanceMap });
  };

  // Stats
  const stats = React.useMemo(() => {
    if (!matches.length) return null;
    const matched = matches.filter(m => m.match).length;
    const missing = matches.length - matched;
    const totalAttendance = parsed
      ? parsed.members.reduce((s, m) => s + m.attendedCols.length, 0)
      : 0;
    return { matched, missing, totalSessions: matches.length, members: parsed?.members.length || 0, totalAttendance };
  }, [matches, parsed]);

  // Group matches by month for preview
  const matchesByMonth = React.useMemo(() => {
    const map = {};
    for (const m of matches) {
      const key = m.ymd.slice(0, 7);
      (map[key] || (map[key] = [])).push(m);
    }
    return Object.entries(map).sort((a, b) => b[0].localeCompare(a[0]));
  }, [matches]);

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(18,17,16,0.55)',
        zIndex: 200, display: 'flex', justifyContent: 'center', alignItems: 'flex-start',
        paddingTop: 60, paddingBottom: 40, overflowY: 'auto',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 'min(900px, 92vw)', background: C.offWhite,
          border: `1px solid ${C.anthracite}`, color: C.anthracite,
          fontFamily: 'Roboto Mono, monospace',
        }}
      >
        {/* header */}
        <div style={{
          padding: '16px 20px', borderBottom: `1px solid ${C.anthracite}`,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div>
            <div style={{ fontSize: 11, letterSpacing: 1.6, color: C.boneMuted }}>IMPORTER OPPMØTE</div>
            <div style={{ fontSize: 18, marginTop: 2 }}>
              {stage === 'drop' ? 'last opp spond-eksport' : `forhåndsvis · ${filename}`}
            </div>
          </div>
          <button onClick={onClose} style={{
            background: 'none', border: `1px solid ${C.anthracite}`, padding: '6px 12px',
            fontFamily: 'inherit', color: C.anthracite, cursor: 'pointer', fontSize: 12,
          }}>lukk ✕</button>
        </div>

        {stage === 'drop' && (
          <div style={{ padding: 32 }}>
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={onDrop}
              onClick={() => fileRef.current?.click()}
              style={{
                border: `1px dashed ${C.anthracite}`, padding: '64px 24px',
                textAlign: 'center', cursor: 'pointer', background: C.surface,
              }}
            >
              <div style={{ fontSize: 24, marginBottom: 8 }}>↑</div>
              <div style={{ fontSize: 14 }}>dra inn .xlsx fra spond, eller klikk for å velge</div>
              <div style={{ fontSize: 11, color: C.boneMuted, marginTop: 12 }}>
                forventer "oppmøtehistorikk" — datoer i header, klassetyper i rad 2, "1" markerer oppmøte
              </div>
            </div>
            <input
              ref={fileRef} type="file" accept=".xlsx,.xls"
              onChange={onPick} style={{ display: 'none' }}
            />
            {error && (
              <div style={{
                marginTop: 16, padding: 12, border: `1px solid ${C.coral}`,
                color: C.coral, fontSize: 12,
              }}>
                {error}
              </div>
            )}
            <div style={{ marginTop: 24, fontSize: 11, color: C.boneMuted, lineHeight: 1.7 }}>
              <div style={{ letterSpacing: 1.4, marginBottom: 8 }}>HVA SKJER MED FILA</div>
              <div>↳ datoer + klassetyper leses fra header, og matches mot eksisterende økter på dato + gruppe</div>
              <div>↳ matchede økter får oppmøte-liste lagt til (navn knyttes til økt)</div>
              <div>↳ økter som ikke finnes kan opprettes som skeleton (ingen tags eller innhold)</div>
              <div>↳ ingenting lagres før du bekrefter</div>
            </div>
          </div>
        )}

        {stage === 'preview' && stats && (
          <div>
            {/* summary strip */}
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)',
              borderBottom: `1px solid ${C.anthracite}`,
            }}>
              <Stat label="ØKTER I FIL" value={stats.totalSessions} />
              <Stat label="MATCHET" value={stats.matched} accent={C.green} />
              <Stat label="UMATCHET" value={stats.missing} accent={stats.missing ? C.amber : C.boneMuted} />
              <Stat label="DELTAKERE" value={stats.members} />
              <Stat label="OPPMØTER TOTALT" value={stats.totalAttendance} last />
            </div>

            {/* options */}
            <div style={{
              padding: '14px 20px', borderBottom: `1px solid ${C.ruleLight}`,
              display: 'flex', gap: 24, fontSize: 12, flexWrap: 'wrap',
            }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input type="checkbox" checked={createMissing}
                  onChange={(e) => setCreateMissing(e.target.checked)} />
                opprett skeleton-økter for {stats.missing} umatchede
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input type="checkbox" checked={overrideAtt}
                  onChange={(e) => setOverrideAtt(e.target.checked)} />
                overskriv oppmøte-tall på matchede økter
              </label>
            </div>

            {/* matches list */}
            <div style={{ maxHeight: 420, overflowY: 'auto' }}>
              {matchesByMonth.map(([ym, list]) => (
                <div key={ym}>
                  <div style={{
                    padding: '8px 20px', background: C.surface,
                    fontSize: 10, letterSpacing: 1.6, color: C.boneMuted,
                    borderBottom: `1px solid ${C.ruleLight}`,
                  }}>
                    {ym}
                  </div>
                  {list.map((m, i) => {
                    const names = (parsed && (buildAttendance(parsed)[m.colIdx])) || [];
                    return (
                      <div key={i} style={{
                        padding: '10px 20px', display: 'grid',
                        gridTemplateColumns: '90px 110px 1fr 80px 80px',
                        gap: 12, alignItems: 'center', fontSize: 12,
                        borderBottom: `1px solid ${C.ruleDark}`,
                      }}>
                        <span style={{ color: C.boneMuted }}>{m.ymd.slice(5)}</span>
                        <span style={{ color: GROUP_COLOR[m.group] }}>{m.group}</span>
                        <span style={{ color: C.anthracite, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {m.rawClass}
                        </span>
                        <span style={{ textAlign: 'right', color: C.boneMuted }}>
                          {names.length} delt.
                        </span>
                        <span style={{
                          textAlign: 'right', fontSize: 10, letterSpacing: 1.2,
                          color: m.match ? C.green : C.amber,
                        }}>
                          {m.match ? '● MATCH' : '○ NY'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>

            {/* footer */}
            <div style={{
              padding: '14px 20px', borderTop: `1px solid ${C.anthracite}`,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              background: C.surface,
            }}>
              <button
                onClick={() => { setStage('drop'); setParsed(null); setMatches([]); }}
                style={{
                  background: 'none', border: `1px solid ${C.anthracite}`, padding: '8px 14px',
                  fontFamily: 'inherit', color: C.anthracite, cursor: 'pointer', fontSize: 12,
                }}
              >← bytt fil</button>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={onClose} style={{
                  background: 'none', border: `1px solid ${C.anthracite}`, padding: '8px 14px',
                  fontFamily: 'inherit', color: C.anthracite, cursor: 'pointer', fontSize: 12,
                }}>avbryt</button>
                <button onClick={apply} style={{
                  background: C.amber, border: `1px solid ${C.amber}`, padding: '8px 16px',
                  fontFamily: 'inherit', color: C.offWhite, cursor: 'pointer', fontSize: 12,
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
};

const Stat = ({ label, value, accent, last }) => (
  <div style={{
    padding: '14px 16px',
    borderRight: last ? 'none' : `1px solid ${C.ruleLight}`,
  }}>
    <div style={{ fontSize: 9, letterSpacing: 1.4, color: C.boneMuted }}>{label}</div>
    <div style={{ fontSize: 22, marginTop: 4, color: accent || C.anthracite }}>{value}</div>
  </div>
);

window.ImportModal = ImportModal;
