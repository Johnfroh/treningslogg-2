/* Personlig dashboard på medlemskortet: oppmøtetrend, gruppemiks og
   innholdsprofil (hva medlemmet har trent, mot hva klubben har tilbudt).
   Trend og gruppemiks regnes av `live` (dashList) som allerede er lastet.
   Innholdsprofilen hentes fra Code.gs (dashMemberInnhold) når kortet åpnes. */
const { useState: useStateMD, useEffect: useEffectMD, useMemo: useMemoMD } = React;

const MD_UKER = 26;          // trendvinduet, i hele uker
const MD_GRUPPE_UKER = 52;   // gruppemiksen ser ett år tilbake
const MD_MIN_TAGGET = 5;     // under dette er profilen for tynn til å tolke
const MD_AVVIK = 0.05;       // minste avvik fra klubben som nevnes i teksten

const mdPst = (x) => Math.round((x || 0) * 100) + ' %';
const mdKortDato = (iso) => {
  try { return new Date(iso + 'T00:00:00').toLocaleDateString('nb-NO', { day: 'numeric', month: 'short' }); }
  catch { return iso; }
};
const mdDesimal = (x) => (Math.round(x * 10) / 10).toLocaleString('nb-NO');

// Ukeserien for ett medlem: Sheets-oppmøte + Spond-historikken, som på
// topplisten i Trender — så tallene stemmer med totalen på kortet.
function mdUkeserie(live, member) {
  const id = member.id;
  const mw = (live && live.memberWeekly && live.memberWeekly[id]) || {};
  const hw = (live && live.memberHistWeekly && live.memberHistWeekly[id]) || {};
  let uker = mandagerTil(MD_UKER, sisteHeleUke(live));
  // Nye medlemmer: start ved innmeldingsuka, ellers drar ukene før de
  // begynte snittet ned.
  const start = member.innmeldingsdato ? isoMandag(member.innmeldingsdato) : '';
  if (start && start > uker[0]) uker = uker.filter(w => w >= start);
  if (!uker.length) uker = [sisteHeleUke(live)];
  return uker.map(w => ({ uke: w, n: (mw[w] || 0) + (hw[w] || 0) }));
}

function UkeSoyler({ serie, snitt }) {
  const n = serie.length;
  const maks = Math.max(1, ...serie.map(d => d.n));
  const H = 64, B = 10;
  const y = (v) => H - (v / maks) * H;
  return (
    <div>
      <svg width="100%" height={H} viewBox={`0 0 ${n * B} ${H}`} preserveAspectRatio="none"
        style={{ display: 'block', overflow: 'visible' }} role="img"
        aria-label={`Oppmøte pr. uke, siste ${n} uker`}>
        {serie.map((d, i) => (
          <rect key={d.uke} x={i * B + 1.5} y={y(d.n)} width={B - 3} height={Math.max(0, H - y(d.n))}
            fill={i >= n - 4 ? 'var(--accent)' : 'var(--accent-soft)'} rx={1.5}>
            <title>{`Uka fra ${mdKortDato(d.uke)}: ${d.n} ${d.n === 1 ? 'økt' : 'økter'}`}</title>
          </rect>
        ))}
        {snitt > 0 && (
          <line x1={0} x2={n * B} y1={y(snitt)} y2={y(snitt)} stroke="var(--ink-soft)"
            strokeWidth={1} strokeDasharray="4 3" vectorEffect="non-scaling-stroke" opacity={.7} />
        )}
      </svg>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--muted)', marginTop: 5 }}>
        <span>{mdKortDato(serie[0].uke)}</span>
        <span>stiplet linje = snitt</span>
        <span>uka fra {mdKortDato(serie[n - 1].uke)}</span>
      </div>
    </div>
  );
}

function MdTall({ label, verdi, under }) {
  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: 'var(--ink)' }}>{verdi}</div>
      {under && <div style={{ fontSize: 11, color: 'var(--ink-soft)', marginTop: 1 }}>{under}</div>}
    </div>
  );
}

function OppmoteTrend({ member, live }) {
  const serie = useMemoMD(() => mdUkeserie(live, member), [live, member]);
  if (!live || !live.memberWeekly) return null;
  const sum = serie.reduce((s, d) => s + d.n, 0);
  const snitt = sum / serie.length;
  const siste4 = serie.slice(-4).reduce((s, d) => s + d.n, 0);
  const forrige4 = serie.slice(-8, -4).reduce((s, d) => s + d.n, 0);
  const aktiveUker = serie.filter(d => d.n > 0).length;
  const diff = siste4 - forrige4;
  const pil = serie.length < 8 ? null
    : diff > 0 ? { t: `↑ ${diff} fra forrige 4`, c: 'var(--green-ink)' }
    : diff < 0 ? { t: `↓ ${-diff} fra forrige 4`, c: 'var(--coral-ink)' }
    : { t: 'som forrige 4', c: 'var(--ink-soft)' };

  return (
    <div className="so-card">
      <div className="so-card-h">
        <span>Oppmøtetrend</span>
        <span className="muted" style={{ fontSize: 11, fontWeight: 500 }}>siste {serie.length} hele uker</span>
      </div>
      {sum === 0 ? (
        <div className="muted" style={{ fontSize: 12.5 }}>Ingen registrerte oppmøter i perioden.</div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: 12, marginBottom: 14 }}>
            <MdTall label="Snitt pr. uke" verdi={mdDesimal(snitt)} />
            <MdTall label="Siste 4 uker" verdi={siste4}
              under={pil && <span style={{ color: pil.c, fontWeight: 600 }}>{pil.t}</span>} />
            <MdTall label="Uker med trening" verdi={`${aktiveUker}/${serie.length}`} />
          </div>
          <UkeSoyler serie={serie} snitt={snitt} />
        </>
      )}
      <Gruppemiks member={member} live={live} />
    </div>
  );
}

function Gruppemiks({ member, live }) {
  const mgw = live && live.memberGruppeWeekly && live.memberGruppeWeekly[member.id];
  if (!mgw) return null;
  const fra = isoPluss(sisteHeleUke(live), -7 * (MD_GRUPPE_UKER - 1));
  const rader = Object.keys(mgw).map(g => ({
    g, n: Object.keys(mgw[g]).reduce((s, w) => (w >= fra ? s + mgw[g][w] : s), 0),
  })).filter(r => r.n > 0).sort((a, b) => b.n - a.n);
  const total = rader.reduce((s, r) => s + r.n, 0);
  if (!total) return null;
  const farge = (g) => DASH_GRUPPE_FARGE[g] || DASH_GRUPPE_FARGE.ukjent;
  return (
    <div style={{ marginTop: 18 }}>
      <div className="kv-h">Gruppemiks · siste 12 mnd</div>
      <div style={{ display: 'flex', height: 10, borderRadius: 999, overflow: 'hidden', background: 'var(--bg)' }}>
        {rader.map(r => (
          <div key={r.g} title={`${DASH_GRUPPE_LABEL[r.g] || r.g}: ${r.n}`}
            style={{ width: (r.n / total * 100) + '%', background: farge(r.g) }} />
        ))}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 14px', marginTop: 8, fontSize: 12 }}>
        {rader.map(r => (
          <span key={r.g} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: farge(r.g) }} />
            {DASH_GRUPPE_LABEL[r.g] || r.g}
            <span className="muted" style={{ fontVariantNumeric: 'tabular-nums' }}>{r.n} · {mdPst(r.n / total)}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

// Én rad: medlemmets andel som søyle, klubbens andel som strek.
function InnholdRad({ rad, modus, maks }) {
  const meg = rad.meg[modus], klubb = rad.klubb[modus];
  const bredde = (x) => Math.min(100, (x / (maks || 1)) * 100) + '%';
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '92px 1fr 92px', alignItems: 'center', gap: 10, fontSize: 12.5, padding: '3px 0' }}>
      <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
        title={`${rad.label}: ${rad.antall} ${rad.antall === 1 ? 'økt' : 'økter'}`}>{rad.label}</span>
      <div style={{ position: 'relative', height: 12, background: 'var(--bg)', borderRadius: 4 }}>
        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: bredde(meg), background: 'var(--accent)', borderRadius: 4 }} />
        {klubb > 0 && (
          <div title={`Klubben: ${mdPst(klubb)}`}
            style={{ position: 'absolute', top: -3, bottom: -3, left: `calc(${bredde(klubb)} - 1px)`, width: 2, background: 'var(--ink)', borderRadius: 1 }} />
        )}
      </div>
      <span style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
        <strong>{mdPst(meg)}</strong> <span className="muted">/ {mdPst(klubb)}</span>
      </span>
    </div>
  );
}

// «Mest over klubben: X. Minst: Y.» — bare avvik som er store nok til å bety noe.
function mdAvvikTekst(rader, modus) {
  const d = rader.map(r => ({ label: r.label, diff: r.meg[modus] - r.klubb[modus] }));
  const over = d.filter(x => x.diff >= MD_AVVIK).sort((a, b) => b.diff - a.diff)[0];
  const under = d.filter(x => x.diff <= -MD_AVVIK).sort((a, b) => a.diff - b.diff)[0];
  const pp = (x) => Math.round(Math.abs(x) * 100);
  const deler = [];
  if (over) deler.push(<span key="o">Mer enn klubben: <strong>{over.label}</strong> (+{pp(over.diff)} p.p.)</span>);
  if (under) deler.push(<span key="u">Mindre: <strong>{under.label}</strong> (−{pp(under.diff)} p.p.)</span>);
  if (!deler.length) return <span>Følger klubbens fordeling tett.</span>;
  return deler.reduce((acc, el, i) => (i ? [...acc, ' · ', el] : [el]), []);
}

function InnholdSeksjon({ tittel, rader, modus, antallMed }) {
  const maks = Math.max(0.01, ...rader.map(r => Math.max(r.meg[modus], r.klubb[modus])));
  return (
    <div style={{ marginTop: 14 }}>
      <div className="kv-h" style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span>{tittel}</span>
        <span style={{ textTransform: 'none', letterSpacing: 0, fontWeight: 500 }}>{antallMed} økter</span>
      </div>
      {antallMed === 0
        ? <div className="muted" style={{ fontSize: 12.5 }}>Ingen av øktene har tags av denne typen.</div>
        : <>
            {rader.map(r => <InnholdRad key={r.tag} rad={r} modus={modus} maks={maks} />)}
            {antallMed >= MD_MIN_TAGGET && (
              <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 6, lineHeight: 1.5 }}>
                {mdAvvikTekst(rader, modus)}
              </div>
            )}
          </>}
    </div>
  );
}

// Henter innholdsprofilen. En gammel, cachet api.js mangler memberInnhold —
// da går vi rett mot /api i stedet for å krasje. Promise.resolve().then
// gjør at også en synkron feil havner i .catch og ikke tar ned siden.
function mdHentInnhold(memberId) {
  return Promise.resolve().then(() => {
    if (window.DASH_API && typeof DASH_API.memberInnhold === 'function') return DASH_API.memberInnhold(memberId);
    const url = '/api?action=dashMemberInnhold&memberId=' + encodeURIComponent(memberId) + '&_ts=' + Date.now();
    return fetch(url, { cache: 'no-store' })
      .then(r => { if (!r.ok) throw new Error('GET dashMemberInnhold feilet: ' + r.status); return r.json(); })
      .then(j => { if (!j.ok) throw new Error(j.error || 'ukjent feil'); return j.data; });
  });
}

function Innholdsprofil({ member }) {
  const [data, setData] = useStateMD(null);
  const [feil, setFeil] = useStateMD(null);
  const [modus, setModus] = useStateMD('vektet');
  useEffectMD(() => {
    let aktiv = true;
    setData(null); setFeil(null);
    mdHentInnhold(member.id)
      .then(d => {
        if (!aktiv) return;
        if (!d || !Array.isArray(d.posisjon) || !Array.isArray(d.handling)) setFeil('uventet svar fra Apps Script');
        else setData(d);
      })
      .catch(e => { if (aktiv) setFeil(String((e && e.message) || e)); });
    return () => { aktiv = false; };
  }, [member.id]);

  let innhold;
  if (feil) {
    innhold = (
      <div className="muted" style={{ fontSize: 12.5, lineHeight: 1.6 }}>
        {/unknown action/i.test(feil)
          ? 'Innholdsprofilen krever ny versjon av Apps Script (dashMemberInnhold). Deploy Code.gs på nytt.'
          : `Fikk ikke hentet innholdsprofilen: ${feil}`}
      </div>
    );
  } else if (!data) {
    innhold = <div className="muted" style={{ fontSize: 12.5 }}>Henter …</div>;
  } else if (!data.okter) {
    innhold = <div className="muted" style={{ fontSize: 12.5 }}>Ingen økter registrert i treningsloggen ennå.</div>;
  } else {
    const tynn = data.medNoe < MD_MIN_TAGGET;
    innhold = (
      <>
        <div className="chips" style={{ marginBottom: 4 }}>
          <button className={'chip' + (modus === 'vektet' ? ' active' : '')} onClick={() => setModus('vektet')}>Nå</button>
          <button className={'chip' + (modus === 'alle' ? ' active' : '')} onClick={() => setModus('alle')}>Hele perioden</button>
        </div>
        <div style={{ fontSize: 11.5, color: 'var(--muted)', lineHeight: 1.5 }}>
          {modus === 'vektet'
            ? `Ferske økter teller mest: en økt for ${data.halveringDager} dager siden teller halvparten.`
            : 'Alle økter teller likt.'}
          {' '}Søyle = {member.fornavn || 'medlemmet'}, strek = klubben i de samme gruppene.
        </div>
        <InnholdSeksjon tittel="Posisjoner" rader={data.posisjon} modus={modus} antallMed={data.medPosisjon} />
        <InnholdSeksjon tittel="Handlinger" rader={data.handling} modus={modus} antallMed={data.medHandling} />
        <div style={{
          marginTop: 14, fontSize: 11.5, lineHeight: 1.5, padding: '8px 10px', borderRadius: 8,
          background: tynn ? 'rgba(242,130,95,.12)' : 'var(--bg)', color: tynn ? 'var(--ink)' : 'var(--ink-soft)',
        }}>
          Bygger på {data.medNoe} av {data.okter} økter med tags, fra {fmtDate(data.fra)}.
          {tynn && ' For få loggede økter til å lese mye ut av dette ennå.'}
          {' '}Eldre Spond-historikk har ikke innhold og er ikke med.
        </div>
      </>
    );
  }

  return (
    <div className="so-card">
      <div className="so-card-h"><span>Innhold på timene</span></div>
      {innhold}
    </div>
  );
}

function MemberDash({ member, live }) {
  return (
    <>
      <OppmoteTrend member={member} live={live} />
      <Innholdsprofil member={member} />
    </>
  );
}

Object.assign(window, { MemberDash });
