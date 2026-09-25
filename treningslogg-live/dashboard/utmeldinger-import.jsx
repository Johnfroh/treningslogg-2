/* Tidligere medlemmer: import av Spond-eksporten «utmeldinger» (styre).
   Kolonner: Fornavn, Etternavn, Dato deaktivert, Medlemstype, Kjønn,
   Innmeldingsdato. Én rad pr. MEDLEMSKAP — samme person kan stå flere
   ganger (bytte av medlemstype, gjeninnmelding, feilføring). Her slås de
   sammen til én pr. person: første innmelding og siste deaktivering.

   Nåværende medlemmer sendes også med (de trengs for å vite når de meldte
   seg inn første gang), men holdes utenfor churn i Code.gs
   (dashDepartedStats). Bruker parseCSVtext / parseXlsxRaw / serialToISOimp /
   deriveKategoriImp fra xlsx-import.jsx. */
const { useState: useUt } = React;

// Samme slug som medlems-id-ene (slugImp i xlsx-import.jsx) — ellers kobles
// ikke personene i fila til registeret.
const utmSlug = s => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

function utmDato(v) {
  if (v == null || v === '') return '';
  const s = String(v).trim();
  if (/^\d{5}(\.0+)?$/.test(s)) return serialToISOimp(parseFloat(s)) || '';
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const m = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  return m ? `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}` : '';   // «-» = ukjent
}

async function parseUtmeldinger(file) {
  const navn = (file.name || '').toLowerCase();
  const buf = await file.arrayBuffer();
  const b = new Uint8Array(buf);
  const rows = (navn.endsWith('.xlsx') || (b[0] === 0x50 && b[1] === 0x4b))
    ? await parseXlsxRaw(buf)
    : parseCSVtext(new TextDecoder().decode(b));
  if (!rows.length) throw new Error('Tom fil.');
  const h = rows[0].map(x => String(x || '').trim().toLowerCase());
  const idx = (...n) => { for (const x of n) { const i = h.indexOf(x.toLowerCase()); if (i >= 0) return i; } return -1; };
  const c = {
    fornavn: idx('Fornavn', 'Medlem fornavn'), etternavn: idx('Etternavn', 'Medlem etternavn'),
    ut: idx('Dato deaktivert', 'Deaktivert', 'Utmeldingsdato'), type: idx('Medlemstype'),
    inn: idx('Innmeldingsdato', 'Innmeldt'),
  };
  if (c.fornavn < 0 || c.ut < 0) throw new Error('Ligner ikke Spond-eksporten av tidligere medlemmer (mangler Fornavn / Dato deaktivert).');

  const per = {};
  let rader = 0;
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const g = k => (c[k] >= 0 ? String(r[c[k]] == null ? '' : r[c[k]]).trim() : '');
    const helt = (g('fornavn') + ' ' + g('etternavn')).trim();
    const id = utmSlug(helt);
    if (!id) continue;
    rader++;
    const p = per[id] || (per[id] = { id, navn: helt, innmeldingsdato: '', sluttet: '', typer: [], rader: 0 });
    p.rader++;
    const inn = utmDato(g('inn')), ut = utmDato(g('ut'));
    if (inn && (!p.innmeldingsdato || inn < p.innmeldingsdato)) p.innmeldingsdato = inn;   // første gang
    if (ut && ut > p.sluttet) p.sluttet = ut;                                                // siste gang
    p.typer.push({ ut, type: g('type') });
  }
  // Kategori fra det siste medlemskapet som sier noe («.», «..», «Ikke aktiv»
  // er parkerte eller tomme typer i Spond).
  const personer = Object.values(per).map(p => {
    const sortert = p.typer.slice().sort((a, b) => String(b.ut).localeCompare(String(a.ut)));
    const treff = sortert.map(t => deriveKategoriImp(t.type)).find(k => k !== 'Annet');
    return { id: p.id, navn: p.navn, kategori: treff || 'Annet', innmeldingsdato: p.innmeldingsdato,
      sluttet: p.sluttet, rader: p.rader };
  });
  return { rader, personer };
}

function UtmeldingerImportModal({ onClose }) {
  const { members, actions, loadError } = useMembers();
  const [busy, setBusy] = useUt(false);
  const [err, setErr] = useUt('');
  const [res, setRes] = useUt(null);
  const [done, setDone] = useUt(null);

  const iRegisteret = new Set((members || []).map(m => m.id));
  const naa = res ? res.personer.filter(p => iRegisteret.has(p.id)) : [];
  const sluttet = res ? res.personer.filter(p => !iRegisteret.has(p.id)) : [];
  const perAar = {};
  sluttet.forEach(p => { const y = p.sluttet ? p.sluttet.slice(0, 4) : 'Uten dato'; perAar[y] = (perAar[y] || 0) + 1; });

  async function velg(file) {
    if (!file) return;
    setErr(''); setRes(null); setBusy(true);
    try { setRes(await parseUtmeldinger(file)); } catch (e) { setErr(e.message || 'Kunne ikke lese fila.'); }
    setBusy(false);
  }
  async function lagre() {
    setBusy(true); setErr('');
    try { setDone(await actions.importUtmeldinger(res.personer)); } catch (e) { setErr(e.message || 'Import feilet.'); }
    setBusy(false);
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal import-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <div className="modal-kicker">Churn og innmeldinger</div>
            <div className="modal-title">Importer tidligere medlemmer</div>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Lukk">✕</button>
        </div>
        {done ? (
          <div className="dlg-body">
            <div className="import-done">
              <div className="big-check">✓</div>
              <div className="modal-title" style={{ marginBottom: 6 }}>Import fullført</div>
              <div className="muted" style={{ fontSize: 13, lineHeight: 1.7 }}>
                <strong>{done.personer}</strong> personer lagret. Churn og «nye medlemmer» regnes nå fra denne lista.
              </div>
            </div>
            <div className="modal-foot"><button className="btn primary" onClick={onClose}>Ferdig</button></div>
          </div>
        ) : !res ? (
          <div className="dlg-body">
            <label className="dropzone">
              <input type="file" accept=".csv,.xlsx" style={{ display: 'none' }} onChange={e => velg(e.target.files[0])} />
              <div className="dz-icon">⤓</div>
              <div className="dz-main">{busy ? 'Leser fil…' : 'Velg Spond-eksporten av tidligere medlemmer'}</div>
              <div className="dz-sub">.csv eller .xlsx · Fornavn, Etternavn, Dato deaktivert, Medlemstype, Innmeldingsdato</div>
            </label>
            {loadError && <div className="import-err">Registeret kunne ikke lastes — last siden på nytt før du importerer.</div>}
            {err && <div className="import-err">{err}</div>}
            <div className="import-howto">
              <div className="kv-h">Slik brukes den</div>
              <ul>
                <li>Samme person med flere medlemskap telles <strong>én gang</strong>.</li>
                <li>Den som er medlem i dag, telles <strong>ikke</strong> som sluttet — og ikke som ny når de melder seg inn igjen.</li>
                <li>Importer hele lista på nytt når du vil. Den erstatter forrige import.</li>
              </ul>
            </div>
          </div>
        ) : (
          <div className="dlg-body">
            <div className="import-stats">
              <div className="ist blue"><div className="n">{res.rader}</div><div className="l">Rader i fila</div></div>
              <div className="ist coral"><div className="n">{sluttet.length}</div><div className="l">Personer som har sluttet</div></div>
              <div className="ist green"><div className="n">{naa.length}</div><div className="l">Medlem i dag — holdes utenfor</div></div>
            </div>
            <div className="muted" style={{ fontSize: 12.5, lineHeight: 1.8, margin: '10px 0' }}>
              Sluttet pr. år: {Object.keys(perAar).sort().map(y => `${y}: ${perAar[y]}`).join(' · ')}
            </div>
            {naa.length > 0 && (
              <div className="import-list">
                <div className="il-head">Står som sluttet i Spond, men er medlem nå ({naa.length})</div>
                <div className="il-body">{naa.map(p => <span key={p.id} className="il-name">{p.navn}</span>)}</div>
              </div>
            )}
            {err && <div className="import-err">{err}</div>}
            <div className="modal-foot">
              <button className="btn ghost" onClick={() => setRes(null)}>Velg en annen fil</button>
              <button className="btn primary" disabled={busy || !!loadError} onClick={lagre}>Lagre {res.personer.length} personer</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

Object.assign(window, { UtmeldingerImportModal, parseUtmeldinger });
