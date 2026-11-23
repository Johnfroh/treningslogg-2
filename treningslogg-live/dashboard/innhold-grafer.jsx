/* Visninger for Innhold-fanen:
   - TemaUkekart:      kjernetemaer × siste 12 uker, sortert på «lengst siden»
   - Ordsky:           egne tags og ord fra innholdsteksten
   - LoggingPerGruppe: andel økter med innhold, pr. gruppe
   Alt regnes fra øktene dashThemes allerede sender — ingen nye kall. */

const IG_UKER = 12;              // kolonner i ukekartet
const IG_VARSEL_DAGER = 28;      // over dette: oransje «⚑» (ikke trent på 4 uker)
const IG_ORD_MAKS = 40;          // ord i skyen
const IG_POS = ['guard', 'mount', 'sidekontroll', 'back', 'c2c', 'c2b'];
const IG_ACT = ['passing', 'escapes', 'submissions', 'takedowns', 'sweeps', 'pins'];
const IG_NIVA = ['grunn', 'erfaren', 'mix', 'junior'];
const IG_ETIKETT = { c2c: 'C2C', c2b: 'C2B' };
const igEtikett = (k) => IG_ETIKETT[k] || (k.charAt(0).toUpperCase() + k.slice(1));
// Fire trinn i lavendel: ingen, 1, 2, 3+ økter samme uke.
const IG_TRINN = ['var(--bar-bg)', '#C9C3FB', '#9C91F8', '#6A5CE8'];

function igDagerSiden(iso) {
  if (!iso) return null;
  const d = new Date(iso + 'T00:00:00'), n = new Date(isoLokal(new Date()) + 'T00:00:00');
  return Math.max(0, Math.round((n - d) / 86400000));
}
function igSistTekst(dager) {
  if (dager == null) return 'aldri';
  if (dager === 0) return 'i dag';
  if (dager === 1) return 'i går';
  return `${dager} dager siden`;
}
// ISO-ukenummer for en mandag (YYYY-MM-DD).
function igUkenr(mandag) {
  const d = new Date(mandag + 'T00:00:00');
  d.setDate(d.getDate() + 3);
  const jan4 = new Date(d.getFullYear(), 0, 4);
  return 1 + Math.round(((d - jan4) / 86400000 - 3 + ((jan4.getDay() + 6) % 7)) / 7);
}

/* ---------- A: Tema-ukekart ---------- */
// okter = alle økter i valgt gruppe (hele historikken) — «sist trent» skal
// se så langt tilbake som det finnes data, kartet viser de siste 12 ukene.
function TemaUkekart({ okter }) {
  const smal = useSmal();
  const uker = mandagerTil(IG_UKER, isoMandag(isoLokal(new Date())));
  const ukeIdx = {}; uker.forEach((u, i) => { ukeIdx[u] = i; });
  const celler = {}, sist = {};
  IG_POS.concat(IG_ACT).forEach(k => { celler[k] = uker.map(() => 0); });
  (okter || []).forEach(o => {
    const tags = o.tags || [];
    const i = ukeIdx[isoMandag(o.date)];
    tags.forEach(t => {
      if (!celler[t]) return;
      if (i != null) celler[t][i]++;
      if (!sist[t] || o.date > sist[t]) sist[t] = o.date;
    });
  });
  // Lengst siden øverst — «aldri» aller øverst.
  const sorter = (keys) => keys.slice().sort((a, b) => {
    const da = igDagerSiden(sist[a]), db = igDagerSiden(sist[b]);
    return (db == null ? 1e9 : db) - (da == null ? 1e9 : da);
  });
  const kol = smal ? '84px' : '120px';
  const sistKol = smal ? '92px' : '130px';
  const rad = (k) => {
    const dager = igDagerSiden(sist[k]);
    const varsel = dager == null || dager > IG_VARSEL_DAGER;
    return (
      <div key={k} style={{ display: 'grid', gridTemplateColumns: `${kol} repeat(${IG_UKER}, 1fr) ${sistKol}`, gap: 3, alignItems: 'center', margin: '3px 0' }}>
        <span style={{ fontSize: 12.5, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{igEtikett(k)}</span>
        {celler[k].map((n, i) => (
          <div key={i} title={`${igEtikett(k)} · uke ${igUkenr(uker[i])}: ${n} ${n === 1 ? 'økt' : 'økter'}`}
            style={{ height: smal ? 18 : 22, borderRadius: 5, background: IG_TRINN[Math.min(3, n)] }} />
        ))}
        <span style={{ fontSize: 12, textAlign: 'right', whiteSpace: 'nowrap', paddingLeft: 6,
          color: varsel ? 'var(--coral-ink)' : 'var(--ink-soft)', fontWeight: varsel ? 700 : 500 }}
          title={sist[k] ? `Sist trent ${fmtDate(sist[k])}` : 'Ingen registrerte økter med dette temaet'}>
          {igSistTekst(dager)}{varsel ? ' ⚑' : ''}
        </span>
      </div>
    );
  };
  const gruppeH = (t) => (
    <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--muted)', fontWeight: 700, margin: '12px 0 4px' }}>{t}</div>
  );
  return (
    <Tile title="Tema-ukekart" corner={`siste ${IG_UKER} uker`}>
      <div style={{ display: 'grid', gridTemplateColumns: `${kol} repeat(${IG_UKER}, 1fr) ${sistKol}`, gap: 3 }}>
        <span />
        {uker.map((u, i) => (
          <span key={u} style={{ fontSize: 11, color: 'var(--muted)', textAlign: 'center' }}>
            {(!smal || i % 2 === (IG_UKER - 1) % 2) ? igUkenr(u) : ''}
          </span>
        ))}
        <span style={{ fontSize: 11, color: 'var(--muted)', textAlign: 'right' }}>sist trent</span>
      </div>
      {gruppeH('Posisjoner')}
      {sorter(IG_POS).map(rad)}
      {gruppeH('Handlinger')}
      {sorter(IG_ACT).map(rad)}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 14px', fontSize: 11.5, color: 'var(--muted)', marginTop: 12, alignItems: 'center' }}>
        {['ingen', '1 økt', '2', '3+'].map((t, i) => (
          <span key={t}><i style={{ display: 'inline-block', width: 14, height: 12, borderRadius: 3, marginRight: 5, verticalAlign: -1, background: IG_TRINN[i] }} />{t}</span>
        ))}
        <span>· ukenummer øverst · ⚑ = ikke trent på over {Math.round(IG_VARSEL_DAGER / 7)} uker · lengst siden øverst</span>
      </div>
    </Tile>
  );
}

/* ---------- Ordsky ---------- */
// Vanlige norske (og noen engelske) småord, pluss ord som står i nesten alle
// øktbeskrivelser og derfor ikke sier noe.
const IG_STOPP = new Set(('og i på til av for med som er det en et den de at har var fra om ikke ' +
  'men så vi du jeg han hun seg sin sitt sine meg deg oss dem der her når hva hvor hvordan ' +
  'kan skal vil må ble blir bli være vært også eller etter før over under mot ut inn opp ned ' +
  'litt mye mer mest noe noen alle hver hele andre annen først først deretter så samme ' +
  'dette disse denne slik bare igjen fikk fått får gjør gjøre gjorde godt god bra ' +
  'økt økta økter trening treningen trente kjørte kjører gjennomgang fokus teknikk teknikker ' +
  'runde runder min minutter del deler side sider dag uke etterpå drill drills setup entry entries ' +
  'the and from to of in on with for a an is was at by').split(/\s+/));

// BJJ-uttrykk på flere ord. Uten denne lista blir «ashi garami» til «ashi»
// og «garami», og «half guard» til «half» + «guard». Egne tags med bindestrek
// (closed-guard) legges til automatisk.
const IG_UTTRYKK = ['half guard', 'closed guard', 'open guard', 'butterfly guard', 'spider guard',
  'lasso guard', 'de la riva', 'reverse de la riva', 'x guard', 'single leg x', 'k guard', 'z guard',
  'deep half', 'leg drag', 'knee cut', 'knee slice', 'body lock', 'over under', 'double under',
  'ashi garami', 'heel hook', 'inside heel hook', 'straight ankle lock', 'toe hold', 'knee bar',
  'rear naked choke', 'rear naked', 'arm triangle', 'front headlock', 'snap down', 'arm drag',
  'single leg', 'double leg', 'back take', 'back control', 'seat belt', 'body triangle',
  'grip fighting', 'cross collar', 'bow and arrow', 'north south', 'knee on belly', 'technical mount',
  's mount', 'side control', 'guard retention', 'guard pass', 'leg lock', 'leg locks', '50 50'];
// Kjernetemaene i entall/flertall — står allerede i ukekartet.
const IG_KJERNEORD = new Set(IG_POS.concat(IG_ACT, IG_NIVA, ['sweep', 'pass', 'escape', 'submission', 'takedown', 'pin']));

function igOrd(okter) {
  const kjerne = new Set(IG_POS.concat(IG_ACT, IG_NIVA));
  const telling = {};   // ord → { n, tag }
  // Uttrykk = fast liste + alle egne tags med mellomrom/bindestrek. Lengste
  // først, så «reverse de la riva» vinner over «de la riva».
  const uttrykk = new Set(IG_UTTRYKK);
  (okter || []).forEach(o => (o.tags || []).forEach(t => {
    const k = String(t || '').toLowerCase().trim().replace(/-/g, ' ');
    if (k.indexOf(' ') > 0 && !kjerne.has(k)) uttrykk.add(k);
  }));
  const uttrykkListe = Array.from(uttrykk).sort((a, b) => b.length - a.length);
  (okter || []).forEach(o => {
    const sett = {};
    (o.tags || []).forEach(t => {
      const k = String(t || '').toLowerCase().trim();
      if (!k || kjerne.has(k)) return;
      const ord = k.replace(/-/g, ' ');
      if (sett[ord]) return;
      sett[ord] = 'tag';
    });
    // Bindestrek og skråstrek leses som mellomrom: «half-guard» = «half guard».
    let tekst = ' ' + String(o.content || '').toLowerCase().replace(/[-/]/g, ' ').replace(/\s+/g, ' ') + ' ';
    uttrykkListe.forEach(u => {
      const re = new RegExp('(^|[^a-zæøåäöü0-9])' + u.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?=[^a-zæøåäöü0-9]|$)', 'g');
      if (re.test(tekst)) {
        if (!sett[u]) sett[u] = 'tekst';
        tekst = tekst.replace(re, '$1 ');
      }
    });
    tekst.split(/[^a-zæøåäöü0-9]+/).forEach(ord => {
      if (ord.length < 3 || /^\d+$/.test(ord) || IG_STOPP.has(ord) || IG_KJERNEORD.has(ord) || sett[ord]) return;
      sett[ord] = 'tekst';
    });
    Object.keys(sett).forEach(ord => {
      const e = telling[ord] || (telling[ord] = { ord, n: 0, tag: false });
      e.n++;
      if (sett[ord] === 'tag') e.tag = true;
    });
  });
  return Object.keys(telling).map(k => telling[k])
    .sort((a, b) => b.n - a.n || a.ord.localeCompare(b.ord, 'nb')).slice(0, IG_ORD_MAKS);
}
// Fast «tilfeldig» rekkefølge — ser ut som en sky, men hopper ikke rundt
// hver gang siden tegnes på nytt.
function igHash(s) { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return h; }

function Ordsky({ okter, onVelg }) {
  const ord = igOrd(okter);
  const maks = Math.max(1, ...ord.map(o => o.n));
  const str = (n) => Math.round(12 + 20 * Math.sqrt((n - 1) / Math.max(1, maks - 1)));
  const visning = ord.slice().sort((a, b) => igHash(a.ord) - igHash(b.ord));
  return (
    <Tile title="Ordsky" corner="egne tags + innholdstekst">
      {ord.length === 0
        ? <div className="dim" style={{ fontSize: 12.5 }}>Ingen kommentarer eller egne tags i perioden.</div>
        : <>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 14px', alignItems: 'baseline', justifyContent: 'center', padding: '6px 4px' }}>
              {visning.map(o => (
                <button key={o.ord} type="button" onClick={() => onVelg && onVelg(o.ord)}
                  title={`${o.ord} · ${o.n} ${o.n === 1 ? 'økt' : 'økter'}${o.tag ? ' · egen tag' : ''} — klikk for å se øktene`}
                  style={{ appearance: 'none', border: 'none', background: 'transparent', cursor: 'pointer', padding: '2px 2px',
                    font: 'inherit', fontSize: str(o.n), lineHeight: 1.25, fontWeight: o.tag ? 700 : 500,
                    color: o.tag ? 'var(--accent-ink)' : 'var(--ink-soft)' }}>
                  {o.ord}
                </button>
              ))}
            </div>
            <div className="dim" style={{ fontSize: 11.5, marginTop: 8 }}>
              Større = flere økter. <strong style={{ color: 'var(--accent-ink)' }}>Lilla</strong> = egne tags, grå = ord fra innholdsteksten.
              Kjernetemaer og nivå er holdt utenfor. Klikk et ord for å søke i øktlista.
            </div>
          </>}
    </Tile>
  );
}

/* ---------- C: Logging pr. gruppe ---------- */
// Andel økter med innhold (tekst eller tags) i perioden. Åpen matte holdes
// utenfor: der er det ingen plan å logge.
function LoggingPerGruppe({ okter, harInnhold }) {
  const per = {};
  (okter || []).forEach(o => {
    const e = per[o.group] || (per[o.group] = { n: 0, med: 0 });
    e.n++; if (harInnhold(o)) e.med++;
  });
  const rader = DASH_GRUPPER.filter(g => g !== 'åpen matte' && per[g]).map(g => ({ g, ...per[g] }))
    .sort((a, b) => a.med / a.n - b.med / b.n);
  return (
    <Tile title="Logging pr. gruppe" corner="andel økter med innhold">
      {rader.length === 0
        ? <div className="dim" style={{ fontSize: 12.5 }}>Ingen økter i perioden.</div>
        : rader.map(r => {
            const andel = r.med / r.n;
            const lav = andel < 0.5;
            return (
              <div key={r.g} style={{ display: 'grid', gridTemplateColumns: '120px 1fr 110px', gap: 10, alignItems: 'center', margin: '7px 0', fontSize: 12.5 }}>
                <span>{DASH_GRUPPE_LABEL[r.g] || r.g}</span>
                <div style={{ height: 14, borderRadius: 7, background: 'var(--bar-bg)', overflow: 'hidden' }}>
                  <div style={{ width: (andel * 100) + '%', height: '100%', background: '#6A5CE8' }} />
                </div>
                <span style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                  <strong style={{ color: lav ? 'var(--coral-ink)' : 'var(--ink)' }}>{Math.round(andel * 100)} %</strong>
                  <span className="dim"> · {r.med}/{r.n}</span>
                </span>
              </div>
            );
          })}
      <div className="dim" style={{ fontSize: 11.5, marginTop: 8 }}>
        Lavest øverst. Under 50 % i oransje. Åpen matte er holdt utenfor.
        {per['åpen matte'] ? ` (${per['åpen matte'].n} økter i perioden.)` : ''}
        {per.ukjent ? <span style={{ color: 'var(--coral-ink)' }}> ⚠ {per.ukjent.n} økter har ukjent gruppe — rydd dem i kalenderen.</span> : null}
      </div>
    </Tile>
  );
}

Object.assign(window, { TemaUkekart, Ordsky, LoggingPerGruppe });
