/* Innstillinger — driftsterskler og hendelser.

   Lå som modal bak ⚙ i topplinja. Nå er panelene seksjoner i Data-fanen,
   der resten av «drift» bor (import, avstemming, om dataene) — ⚙ lenker dit.

   Tersklene for «I dag»-listene lå i Tweaks-panelet, altså i hver enkelt
   nettleser: to trenere så to forskjellige lister, og ingen visste hvilke
   tall som gjaldt. Nå ligger de i dash_settings (Sheets) og leses av alle.

   Tilgang: ALLE kan se verdiene — det er selve poenget at tersklene er
   synlige. Bare styre (isStyre) ser lagre-knappen, og proxyen
   (functions/api.js, STYRE_HANDLINGER) avviser lagring fra andre.

   Bruker globale useMembers, HENDELSE_TYPER, HENDELSE_FARGE, fmtN, fmtDate. */
const { useState: useSt, useEffect: useStEffect } = React;

// Siste skanse hvis verken Sheets eller api.js svarer. Speiler
// SETTING_DEFAULTS i api.js og DASH_SETTING_DEFAULTS i Code.gs.
const TERSKEL_STANDARD = {
  stilleUker: 3, gradMinOppmote: 30, gradMinMnd: 6, introUker: 2, fallendeMinPrev4: 3,
};
function tersklerFra(v) {
  const u = {};
  TERSKEL_FELT.forEach(f => {
    const n = Number((v || {})[f.key]);
    u[f.key] = isNaN(n) || !n ? TERSKEL_STANDARD[f.key] : n;
  });
  return u;
}

// Felt-etikettene. Rekkefølgen her er rekkefølgen i skjemaet.
const TERSKEL_FELT = [
  { key: 'stilleUker', label: 'Stille etter', unit: 'uker',
    hint: 'Medlem som ikke er sett på så lenge havner i «Stille medlemmer».' },
  { key: 'gradMinOppmote', label: 'Graderingsklar — oppmøter', unit: 'oppmøter',
    hint: 'Minste antall registrerte oppmøter før noen regnes som kandidat.' },
  { key: 'gradMinMnd', label: 'Graderingsklar — tid', unit: 'mnd',
    hint: 'Minste tid siden forrige gradering.' },
  { key: 'introUker', label: 'Intro-oppfølging etter', unit: 'uker',
    hint: 'Introdeltaker som ikke har møtt på så lenge trenger en telefon.' },
  { key: 'fallendeMinPrev4', label: 'Fallende oppmøte — fra', unit: 'oppmøter',
    hint: 'Hvor mange oppmøter i de forrige fire ukene før et fall teller. '
      + 'Lavere terskel gir flere rader, men også mer støy.' },
];

function TerskelSkjema({ isStyre, settings, brukerStandard }) {
  const { actions } = useMembers();
  // settings kan mangle helt hvis nettleseren sitter med en gammel cachet
  // api.js (script-tag og Babel-fetch caches ulikt). Da skal skjemaet vise
  // standardverdier, ikke krasje på første felt.
  const verdier = settings || {};
  const [utkast, setUtkast] = useSt(() => tersklerFra(verdier));
  const [lagrer, setLagrer] = useSt(false);
  const [msg, setMsg] = useSt('');
  // Rekker noen å åpne ⚙ før Sheets har svart, står utkastet med
  // standardverdier. Synk det når tersklene faktisk kommer inn (og etter
  // lagring, som også gir et nytt settings-objekt).
  useStEffect(() => { setUtkast(tersklerFra(verdier)); }, [settings]);
  const endret = TERSKEL_FELT.some(f => Number(utkast[f.key]) !== Number(tersklerFra(verdier)[f.key]));

  function lagre() {
    setLagrer(true); setMsg('');
    actions.saveSettings(utkast)
      .then(() => setMsg('Lagret. Gjelder for alle som åpner dashboardet.'))
      .catch(e => setMsg('Kunne ikke lagre: ' + e.message))
      .then(() => setLagrer(false));
  }

  return (
    <>
      {brukerStandard && (
        <div className="dim" style={{ fontSize: 12, lineHeight: 1.6, marginBottom: 14, color: 'var(--coral)' }}>
          Fikk ikke lest tersklene fra Sheets — viser standardverdier. Kjør
          <code style={{ margin: '0 4px' }}>_setupDashSheets</code>
          i Apps Script hvis arket <code>dash_settings</code> mangler.
        </div>
      )}
      <div className="dim" style={{ fontSize: 12, lineHeight: 1.6, marginBottom: 16 }}>
        Tersklene styrer hvem som havner i listene under «I dag». De ligger i
        Sheets, så alle trenere ser de samme listene.
      </div>
      {TERSKEL_FELT.map(f => (
        <label className="fld" key={f.key}>
          <span>{f.label} <span className="opt">({f.unit})</span></span>
          <input type="number" min={1} value={utkast[f.key]} disabled={!isStyre}
            onChange={e => setUtkast(u => ({ ...u, [f.key]: e.target.value === '' ? '' : Number(e.target.value) }))} />
          <span className="dim" style={{ fontSize: 11, lineHeight: 1.5 }}>{f.hint}</span>
        </label>
      ))}
      {isStyre ? (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <button className="btn primary sm" disabled={lagrer || !endret} onClick={lagre}>Lagre terskler</button>
          {endret && <span className="dim" style={{ fontSize: 11 }}>ulagrede endringer</span>}
        </div>
      ) : (
        <div className="dim" style={{ fontSize: 11.5, lineHeight: 1.6 }}>
          Bare styret kan endre tersklene. Si fra hvis en liste er for lang
          eller for kort — det er som regel terskelen, ikke medlemmene.
        </div>
      )}
      {msg && <div className="dim" style={{ fontSize: 12, marginTop: 10 }}>{msg}</div>}
    </>
  );
}

// Ukentlige aggregater. Historikken starter ved første kjøring — det finnes
// ingen tilbakefylling, for tallene for forrige uke er ikke lenger utledbare
// når registeret først er overskrevet.
function SnapshotPanel({ isStyre }) {
  const { actions } = useMembers();
  const [snaps, setSnaps] = useSt(null);
  const [busy, setBusy] = useSt(false);
  const [msg, setMsg] = useSt('');
  const last = () => actions.fetchSnapshots().then(setSnaps).catch(() => setSnaps([]));
  useStEffect(() => { last(); }, []);
  const siste = snaps && snaps.length ? snaps[snaps.length - 1] : null;

  function taNa() {
    setBusy(true); setMsg('');
    actions.snapshotNow()
      .then(r => { setMsg('Snapshot lagret for ' + r.uke + '.'); return last(); })
      .catch(e => setMsg('Kunne ikke ta snapshot: ' + e.message))
      .then(() => setBusy(false));
  }

  return (
    <div style={{ marginTop: 22, paddingTop: 16, borderTop: '1px solid var(--line)' }}>
      <div style={{ fontSize: 12.5, fontWeight: 700, marginBottom: 6 }}>Ukentlig snapshot</div>
      <div className="dim" style={{ fontSize: 11.5, lineHeight: 1.6, marginBottom: 10 }}>
        Én rad pr. uke med aggregater (aktive, fordelinger, listelengder) —
        ingen navn, ingen økonomi. Skrives automatisk mandag morgen.
        {snaps == null ? ' Laster …'
          : siste ? ` Siste: ${siste.uke} · ${fmtN(snaps.length)} ${snaps.length === 1 ? 'uke' : 'uker'} lagret.`
            : ' Ingen snapshots ennå — historikken starter ved første kjøring.'}
      </div>
      {isStyre && (
        <button className="btn outline sm" disabled={busy} onClick={taNa}>Ta snapshot nå</button>
      )}
      {msg && <div className="dim" style={{ fontSize: 11.5, marginTop: 8 }}>{msg}</div>}
    </div>
  );
}

function HendelsePanel({ isStyre }) {
  const { events, actions } = useMembers();
  const [dato, setDato] = useSt(() => new Date().toISOString().slice(0, 10));
  const [type, setType] = useSt('arrangement');
  const [tittel, setTittel] = useSt('');
  const [notat, setNotat] = useSt('');
  const [busy, setBusy] = useSt(false);
  const [msg, setMsg] = useSt('');
  const liste = (events || []).slice().reverse();

  function leggTil() {
    if (!dato || !tittel.trim()) { setMsg('Dato og tittel må fylles ut.'); return; }
    setBusy(true); setMsg('');
    actions.addEvent({ dato, type, tittel: tittel.trim(), notat: notat.trim() })
      .then(() => { setTittel(''); setNotat(''); setMsg('Lagt til.'); })
      .catch(e => setMsg('Kunne ikke lagre: ' + e.message))
      .then(() => setBusy(false));
  }
  function slett(id) {
    setBusy(true);
    actions.deleteEvent(id).catch(e => setMsg('Kunne ikke slette: ' + e.message)).then(() => setBusy(false));
  }

  return (
    <>
      <div className="dim" style={{ fontSize: 12, lineHeight: 1.6, marginBottom: 14 }}>
        Hendelser vises som loddrette markører på «Klubbens puls». Et fall i
        uke 8 betyr noe helt annet når det står «vinterferie» der.
      </div>
      {isStyre && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <label className="fld">
              <span>Dato</span>
              <input type="date" value={dato} onChange={e => setDato(e.target.value)} />
            </label>
            <label className="fld">
              <span>Type</span>
              <select value={type} onChange={e => setType(e.target.value)}>
                {HENDELSE_TYPER.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </label>
          </div>
          <label className="fld">
            <span>Tittel</span>
            <input value={tittel} maxLength={120} placeholder="Vinterferie"
              onChange={e => setTittel(e.target.value)} />
          </label>
          <label className="fld">
            <span>Notat <span className="opt">(valgfritt)</span></span>
            <input value={notat} maxLength={500} onChange={e => setNotat(e.target.value)} />
          </label>
          <button className="btn primary sm" disabled={busy} onClick={leggTil}>Legg til hendelse</button>
          {msg && <div className="dim" style={{ fontSize: 12, marginTop: 10 }}>{msg}</div>}
        </>
      )}
      <div style={{ marginTop: 18 }}>
        {liste.length === 0 ? (
          <div className="dim" style={{ fontSize: 12 }}>Ingen hendelser registrert ennå.</div>
        ) : liste.map(e => (
          <div key={e.id} style={{ display: 'flex', alignItems: 'baseline', gap: 10,
            padding: '8px 0', borderBottom: '1px solid var(--line)', fontSize: 12.5 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', flex: '0 0 auto',
              background: HENDELSE_FARGE[e.type] || HENDELSE_FARGE.annet }} />
            <span style={{ flex: 1, minWidth: 0 }}>
              <strong>{e.tittel || '(uten tittel)'}</strong>
              <span className="dim" style={{ marginLeft: 6, fontSize: 11 }}>{e.type}</span>
              {e.notat && <div className="dim" style={{ fontSize: 11 }}>{e.notat}</div>}
            </span>
            <span className="dim" style={{ whiteSpace: 'nowrap', fontSize: 11.5 }}>{fmtDate(e.dato)}</span>
            {isStyre && <button className="btn ghost xs" disabled={busy} onClick={() => slett(e.id)}>Slett</button>}
          </div>
        ))}
      </div>
    </>
  );
}

Object.assign(window, { TerskelSkjema, SnapshotPanel, HendelsePanel, TERSKEL_FELT, tersklerFra });
