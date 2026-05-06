// Mobile mockups — 4 distinkt ulike retninger for treningslogg på mobil
// Hver mockup viser: header, lite kalender-peek, dagens 1-2 økter, primary action.

const W = 393, H = 852; // iPhone 16

// ─── Direction 1: BRUTALIST MONO ─────────────────────────────────────
// Beholder app-stilen: Roboto Mono, skarp, høy info-tetthet, ingen runde kanter.
function MockBrutalist() {
  const C = { ink: '#373F43', bone: '#F5F0E8', surface: '#F0EBE1', amber: '#AC7A34', green: '#306C48', coral: '#9E4430', mid: '#76726A', rule: '#D8D2C8' };
  return (
    <div style={{ width: W, height: H, background: C.bone, fontFamily: 'Roboto Mono, monospace', color: C.ink, position: 'relative', overflow: 'hidden' }}>
      <IOSStatusBar />
      {/* header */}
      <div style={{ padding: '8px 20px 16px', borderBottom: `1px solid ${C.ink}` }}>
        <div style={{ fontSize: 9, letterSpacing: 2, color: C.mid }}>BJJ.LOGG · MARIUS</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 4 }}>
          <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: '0.04em' }}>tirs · 5. mai</div>
          <div style={{ fontSize: 11, color: C.mid }}>uke 19</div>
        </div>
      </div>
      {/* week strip */}
      <div style={{ padding: '14px 8px', borderBottom: `1px solid ${C.rule}`, display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4 }}>
        {['ma','ti','on','to','fr','lø','sø'].map((d, i) => {
          const isToday = i === 1;
          const has = [1,2,4].includes(i);
          return (
            <div key={i} style={{
              border: `1px solid ${isToday ? C.ink : C.rule}`,
              padding: '6px 0 8px', textAlign: 'center',
              background: isToday ? C.ink : 'transparent',
              color: isToday ? C.bone : C.ink,
            }}>
              <div style={{ fontSize: 8, letterSpacing: 1.4, opacity: 0.7 }}>{d.toUpperCase()}</div>
              <div style={{ fontSize: 16, fontWeight: 700, marginTop: 2 }}>{4 + i}</div>
              <div style={{ height: 2, marginTop: 4, background: has ? (isToday ? C.amber : C.green) : 'transparent' }}></div>
            </div>
          );
        })}
      </div>
      {/* today */}
      <div style={{ padding: '20px 20px 12px' }}>
        <div style={{ fontSize: 9, letterSpacing: 2, color: C.mid }}>DAGENS ØKTER · 2</div>
      </div>
      <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <SessCardBrutalist time="18:00" group="grunnleggende" title="closed guard — kimura" tags={['guard','submission']} att={14} status="logget" C={C} />
        <SessCardBrutalist time="20:30" group="erfaren" title="leg lock entries" tags={['submission','leg-lock']} att={null} status="planlagt" C={C} />
      </div>
      {/* primary CTA */}
      <div style={{ position: 'absolute', left: 20, right: 20, bottom: 110 }}>
        <button style={{
          width: '100%', padding: '18px 16px',
          background: C.amber, color: C.bone, border: 'none',
          fontFamily: 'inherit', fontSize: 13, letterSpacing: '0.18em', textTransform: 'uppercase',
          fontWeight: 700,
        }}>+ logg ny økt</button>
      </div>
      {/* tab bar */}
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 90, borderTop: `1px solid ${C.ink}`, background: C.bone, display: 'grid', gridTemplateColumns: 'repeat(4,1fr)' }}>
        {['kalender','liste','tags','folk'].map((t, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', paddingTop: 14, gap: 4 }}>
            <div style={{ width: 18, height: 18, border: `1.5px solid ${i===0?C.ink:C.mid}` }}></div>
            <div style={{ fontSize: 9, letterSpacing: 1.4, color: i===0?C.ink:C.mid, fontWeight: i===0?700:400 }}>{t.toUpperCase()}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
function SessCardBrutalist({ time, group, title, tags, att, status, C }) {
  const colors = { 'grunnleggende': '#306C48', 'erfaren': '#9E4430', 'junior': '#AC7A34', 'alle nivåer': '#76726A', 'åpen matte': '#A89A82' };
  return (
    <div style={{ border: `1px solid ${status==='planlagt'?C.rule:C.ink}`, borderLeft: `3px solid ${colors[group]}`, padding: '12px 14px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase' }}>
          {time} · {group}
        </div>
        <div style={{ fontSize: 9, letterSpacing: 1.6, color: status==='logget'?'#306C48':'#AC7A34' }}>
          {status==='logget'?'● LOGGET':'○ PLANLAGT'}
        </div>
      </div>
      <div style={{ fontSize: 14, marginTop: 6 }}>{title}</div>
      <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
        {tags.map(t => (
          <span key={t} style={{ fontSize: 9, letterSpacing: 1, padding: '3px 6px', border: `1px solid ${C.ink}`, color: C.ink }}>{t}</span>
        ))}
      </div>
      {att != null && <div style={{ fontSize: 9, letterSpacing: 1.4, color: C.mid, marginTop: 8 }}>{att} OPPMØTT</div>}
    </div>
  );
}

// ─── Direction 2: SOFT & ROUND (vennlig, store knapper) ──────────────
function MockSoft() {
  const C = { bg: '#FFF7EE', card: '#FFFFFF', ink: '#1F1A14', mid: '#7A6F5F', accent: '#E0723F', accent2: '#3F8B5E', shadow: '0 4px 14px rgba(31,26,20,0.06)' };
  return (
    <div style={{ width: W, height: H, background: C.bg, fontFamily: 'Inter, system-ui, sans-serif', color: C.ink, position: 'relative', overflow: 'hidden' }}>
      <IOSStatusBar />
      <div style={{ padding: '12px 22px 8px' }}>
        <div style={{ fontSize: 13, color: C.mid }}>God morgen, Marius 👋</div>
        <div style={{ fontSize: 30, fontWeight: 700, marginTop: 4, letterSpacing: '-0.02em' }}>Tirsdag<br/>5. mai</div>
      </div>
      {/* big stat bubble */}
      <div style={{ margin: '14px 22px', padding: '20px 22px', background: C.card, borderRadius: 24, boxShadow: C.shadow, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: 12, color: C.mid }}>denne uken</div>
          <div style={{ fontSize: 32, fontWeight: 700, marginTop: 2 }}>3 av 5</div>
          <div style={{ fontSize: 11, color: C.mid, marginTop: 2 }}>økter logget</div>
        </div>
        <div style={{ width: 64, height: 64, borderRadius: '50%', border: `6px solid ${C.bg}`, background: `conic-gradient(${C.accent2} 0 60%, #E5DDD0 60% 100%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700 }}>60%</div>
      </div>
      {/* today section */}
      <div style={{ padding: '8px 22px 4px', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <div style={{ fontSize: 17, fontWeight: 700 }}>I dag</div>
        <div style={{ fontSize: 12, color: C.mid }}>2 økter</div>
      </div>
      <div style={{ padding: '8px 22px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <SessCardSoft time="18:00" group="Grunnleggende" title="Closed guard — kimura" att={14} done={true} color="#3F8B5E" C={C} />
        <SessCardSoft time="20:30" group="Erfaren" title="Leg lock entries" att={null} done={false} color="#E0723F" C={C} />
      </div>
      {/* primary FAB-style */}
      <div style={{ position: 'absolute', left: 22, right: 22, bottom: 110 }}>
        <button style={{
          width: '100%', padding: '20px 16px',
          background: C.ink, color: '#fff', border: 'none', borderRadius: 28,
          fontSize: 16, fontWeight: 600, fontFamily: 'inherit',
          boxShadow: '0 6px 20px rgba(31,26,20,0.18)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
        }}>
          <span style={{ fontSize: 20 }}>＋</span> Logg ny økt
        </button>
      </div>
      {/* pill tab bar */}
      <div style={{ position: 'absolute', left: 22, right: 22, bottom: 38, height: 60, background: C.card, borderRadius: 30, boxShadow: '0 4px 14px rgba(31,26,20,0.10)', display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', alignItems: 'center' }}>
        {['Hjem','Liste','Tags','Folk'].map((t, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
            <div style={{ width: 22, height: 22, borderRadius: 6, background: i===0?C.accent:'transparent', border: i===0?'none':`1.5px solid ${C.mid}` }}></div>
            <div style={{ fontSize: 10, color: i===0?C.ink:C.mid, fontWeight: i===0?600:400 }}>{t}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
function SessCardSoft({ time, group, title, att, done, color, C }) {
  return (
    <div style={{ background: C.card, borderRadius: 18, padding: '14px 16px', boxShadow: C.shadow, display: 'flex', alignItems: 'center', gap: 14 }}>
      <div style={{ width: 44, height: 44, borderRadius: 14, background: color, color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 700 }}>{time.split(':')[0]}</div>
        <div style={{ fontSize: 9, opacity: 0.85 }}>:{time.split(':')[1]}</div>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11, color: C.mid }}>{group}</div>
        <div style={{ fontSize: 14, fontWeight: 600, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</div>
        <div style={{ fontSize: 11, color: C.mid, marginTop: 4 }}>
          {done ? `✓ Logget · ${att} oppmøtt` : 'Planlagt — trykk for å logge'}
        </div>
      </div>
      <div style={{ fontSize: 18, color: C.mid }}>›</div>
    </div>
  );
}

// ─── Direction 3: MINIMAL APPLE-AKTIG ───────────────────────────────
function MockMinimal() {
  const C = { bg: '#F2F2F7', card: '#FFFFFF', ink: '#000', sub: '#8E8E93', accent: '#007AFF', sep: '#E5E5EA' };
  return (
    <div style={{ width: W, height: H, background: C.bg, fontFamily: '-apple-system, "SF Pro", system-ui', color: C.ink, position: 'relative', overflow: 'hidden' }}>
      <IOSStatusBar />
      {/* large title */}
      <div style={{ padding: '8px 20px 12px' }}>
        <div style={{ fontSize: 13, color: C.sub, letterSpacing: '-0.01em' }}>tirsdag 5. mai</div>
        <div style={{ fontSize: 34, fontWeight: 700, marginTop: 2, letterSpacing: '-0.025em' }}>I dag</div>
      </div>
      {/* segmented week */}
      <div style={{ margin: '0 20px', background: '#E9E9EE', borderRadius: 10, padding: 3, display: 'grid', gridTemplateColumns: 'repeat(7,1fr)' }}>
        {['M','T','O','T','F','L','S'].map((d, i) => {
          const sel = i === 1;
          return (
            <div key={i} style={{
              padding: '8px 0', textAlign: 'center',
              background: sel ? '#fff' : 'transparent',
              borderRadius: 8,
              boxShadow: sel ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
            }}>
              <div style={{ fontSize: 11, color: C.sub }}>{d}</div>
              <div style={{ fontSize: 15, fontWeight: 600, marginTop: 1 }}>{4 + i}</div>
              <div style={{ width: 4, height: 4, borderRadius: '50%', background: [1,2,4].includes(i) ? C.accent : 'transparent', margin: '3px auto 0' }}></div>
            </div>
          );
        })}
      </div>

      {/* section header */}
      <div style={{ padding: '24px 20px 8px' }}>
        <div style={{ fontSize: 13, color: C.sub, letterSpacing: 0.5, textTransform: 'uppercase' }}>Økter</div>
      </div>
      {/* grouped list */}
      <div style={{ margin: '0 20px', background: C.card, borderRadius: 12, overflow: 'hidden' }}>
        <SessRowMinimal time="18:00" group="Grunnleggende" title="Closed guard — kimura" sub="14 oppmøtt · Ola" done C={C} />
        <div style={{ height: 1, background: C.sep, marginLeft: 56 }}></div>
        <SessRowMinimal time="20:30" group="Erfaren" title="Leg lock entries" sub="Planlagt" C={C} />
      </div>

      {/* secondary list */}
      <div style={{ padding: '24px 20px 8px' }}>
        <div style={{ fontSize: 13, color: C.sub, letterSpacing: 0.5, textTransform: 'uppercase' }}>Forrige</div>
      </div>
      <div style={{ margin: '0 20px', background: C.card, borderRadius: 12 }}>
        <SessRowMinimal time="man." group="Grunnleggende" title="Half guard — underhook" sub="14 oppmøtt" done C={C} small />
      </div>

      {/* bottom: subtle CTA + tab */}
      <div style={{ position: 'absolute', left: 20, right: 20, bottom: 100 }}>
        <button style={{
          width: '100%', padding: '14px 16px',
          background: C.accent, color: '#fff', border: 'none', borderRadius: 12,
          fontSize: 17, fontWeight: 600, fontFamily: 'inherit',
        }}>Ny økt</button>
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 84, background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(20px)', borderTop: `0.5px solid ${C.sep}`, display: 'grid', gridTemplateColumns: 'repeat(4,1fr)' }}>
        {[['I dag','●'],['Liste','≡'],['Tags','#'],['Folk','◌']].map(([t, ic], i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', paddingTop: 8, gap: 2 }}>
            <div style={{ fontSize: 22, color: i===0?C.accent:C.sub, lineHeight: 1 }}>{ic}</div>
            <div style={{ fontSize: 10, color: i===0?C.accent:C.sub }}>{t}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
function SessRowMinimal({ time, group, title, sub, done, C, small }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', gap: 12 }}>
      <div style={{ width: 40, fontSize: small ? 11 : 13, color: C.sub, fontWeight: 500, flexShrink: 0 }}>{time}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 16, fontWeight: 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</div>
        <div style={{ fontSize: 13, color: C.sub, marginTop: 1 }}>{group} · {sub}</div>
      </div>
      <div style={{ fontSize: 16, color: '#C7C7CC' }}>›</div>
    </div>
  );
}

// ─── Direction 4: BOLD DISPLAY (typografisk hero) ───────────────────
function MockBold() {
  const C = { bg: '#0E0E0C', ink: '#F4EFE3', mute: '#7A766B', accent: '#FF7A2A', card: '#1A1A17', rule: '#2A2A26' };
  return (
    <div style={{ width: W, height: H, background: C.bg, fontFamily: 'Space Grotesk, system-ui, sans-serif', color: C.ink, position: 'relative', overflow: 'hidden' }}>
      <IOSStatusBar dark />
      {/* huge type hero */}
      <div style={{ padding: '12px 24px 20px' }}>
        <div style={{ fontSize: 11, letterSpacing: 3, color: C.mute, textTransform: 'uppercase' }}>tirs 5 · mai · uke 19</div>
        <div style={{ fontFamily: 'Fraunces, serif', fontSize: 84, fontWeight: 900, lineHeight: 0.88, letterSpacing: '-0.04em', marginTop: 14 }}>
          To<br/>økter<br/><span style={{ color: C.accent, fontStyle: 'italic' }}>i&nbsp;dag.</span>
        </div>
      </div>

      <div style={{ height: 1, background: C.rule, margin: '8px 24px' }}></div>

      {/* sessions as raw type list */}
      <div style={{ padding: '18px 24px 12px', display: 'flex', flexDirection: 'column', gap: 22 }}>
        <SessRowBold n="01" time="18:00" group="GRUNN" title="Closed guard — kimura" status="LOGGET · 14" C={C} />
        <SessRowBold n="02" time="20:30" group="ERF" title="Leg lock entries" status="PLANLAGT" muted C={C} />
      </div>

      {/* bottom: huge CTA + minimal tabs */}
      <div style={{ position: 'absolute', left: 24, right: 24, bottom: 110 }}>
        <button style={{
          width: '100%', padding: '22px 16px',
          background: C.accent, color: C.bg, border: 'none',
          fontFamily: 'Fraunces, serif', fontSize: 22, fontWeight: 900, fontStyle: 'italic',
          letterSpacing: '-0.02em',
          textAlign: 'left', paddingLeft: 24,
          position: 'relative',
        }}>
          Logg ny →
        </button>
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 86, borderTop: `1px solid ${C.rule}`, display: 'grid', gridTemplateColumns: 'repeat(4,1fr)' }}>
        {['I DAG','LISTE','TAGS','FOLK'].map((t, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, letterSpacing: 2, color: i===0?C.accent:C.mute, fontWeight: i===0?700:400 }}>
            {t}
          </div>
        ))}
      </div>
    </div>
  );
}
function SessRowBold({ n, time, group, title, status, muted, C }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '32px 1fr', gap: 14 }}>
      <div style={{ fontSize: 12, color: C.mute, letterSpacing: 1, paddingTop: 8 }}>{n}</div>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <div style={{ fontSize: 13, letterSpacing: 2, color: muted ? C.mute : C.ink }}>
            {time} · {group}
          </div>
          <div style={{ fontSize: 10, letterSpacing: 1.6, color: muted ? C.mute : C.accent }}>{status}</div>
        </div>
        <div style={{
          fontFamily: 'Fraunces, serif', fontSize: 30, fontWeight: 700, lineHeight: 1.05,
          marginTop: 6, letterSpacing: '-0.02em',
          color: muted ? C.mute : C.ink,
        }}>
          {title}
        </div>
      </div>
    </div>
  );
}

// ─── Frame wrapper (lightweight phone bezel) ────────────────────────
function Phone({ children, dark }) {
  return (
    <div style={{
      width: W + 16, height: H + 16,
      padding: 8, borderRadius: 56,
      background: dark ? '#000' : '#1a1815',
      boxShadow: '0 6px 20px rgba(0,0,0,0.25)',
      boxSizing: 'border-box',
    }}>
      <div style={{
        width: W, height: H, borderRadius: 48, overflow: 'hidden', position: 'relative',
      }}>
        {children}
      </div>
    </div>
  );
}

// ─── Canvas ──────────────────────────────────────────────────────────
function MobileMockupsCanvas() {
  return (
    <DesignCanvas>
      <DCSection id="mobile" title="Treningslogg — 4 mobil-retninger">
        <DCArtboard id="brutalist" label="A · brutalist mono" width={W + 32} height={H + 32}>
          <Phone><MockBrutalist /></Phone>
        </DCArtboard>
        <DCArtboard id="soft" label="B · soft & rund" width={W + 32} height={H + 32}>
          <Phone><MockSoft /></Phone>
        </DCArtboard>
        <DCArtboard id="minimal" label="C · minimal apple" width={W + 32} height={H + 32}>
          <Phone><MockMinimal /></Phone>
        </DCArtboard>
        <DCArtboard id="bold" label="D · bold display" width={W + 32} height={H + 32}>
          <Phone dark><MockBold /></Phone>
        </DCArtboard>
      </DCSection>
    </DesignCanvas>
  );
}

window.MobileMockupsCanvas = MobileMockupsCanvas;
