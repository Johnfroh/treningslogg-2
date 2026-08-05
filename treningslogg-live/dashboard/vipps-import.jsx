/* Vipps-utsalg: import av eksporter fra portal.vipps.no.
   To filtyper, begge eksportert for HELE perioden (01.01.2023 → i dag):
     - Oppgjørsrapport (.csv)  → månedstall pr. strøm (butikk/diverse)
     - Salgsrapport (.xlsx)    → produkttopp for vippsbutikken
   Strøm-skillet går på betalingsløsning: Handlekurv (vippsbutikken) = 'butikk',
   Valgfritt beløp m.m. = 'diverse' (historisk blandet: drakter, seminar, NN-påmelding).
   Bruker parseCSVtext + parseXlsxRaw fra xlsx-import.jsx. */
const { useState: useSv } = React;

const VIPPS_STREAM_LABEL = { butikk: 'Butikk (Handlekurv)', diverse: 'Diverse (historisk)' };

function parseVippsOppgjor(text){
  const rows = parseCSVtext(text);
  if(!rows.length) throw new Error('Tom fil.');
  const h = rows[0].map(x=>String(x||'').trim());
  const idx = (...names)=>{ for(const n of names){ const i=h.findIndex(c=>c.toLowerCase()===n.toLowerCase()); if(i>=0) return i; } return -1; };
  const c = {
    losning: idx('Betalingsløsning'),
    type: idx('Type'),
    dato: idx('Bokføringsdato','Tidspunkt'),
    belop: idx('Beløp'),
    gebyr: idx('Gebyr'),
    netto: idx('Nettobeløp'),
  };
  if(c.type<0 || c.dato<0 || c.belop<0) throw new Error('Ligner ikke en Vipps oppgjørsrapport (mangler Type/Bokføringsdato/Beløp).');
  const months = {}; // key `${ym}|${stream}`
  let tx = 0;
  for(let i=1;i<rows.length;i++){
    const r = rows[i]; if(!r || String(r[c.type]||'').trim()!=='Belastning') continue;
    const ym = String(r[c.dato]||'').slice(0,7);
    if(!/^\d{4}-\d{2}$/.test(ym)) continue;
    const stream = String(r[c.losning]||'').trim()==='Handlekurv' ? 'butikk' : 'diverse';
    const brutto = parseFloat(r[c.belop])||0;
    const gebyr = Math.abs(parseFloat(c.gebyr>=0 ? r[c.gebyr] : '')||0);
    const nettoRaw = c.netto>=0 ? parseFloat(r[c.netto]) : NaN;
    const netto = isNaN(nettoRaw) ? brutto-gebyr : nettoRaw;
    const key = ym+'|'+stream;
    const m = months[key] || (months[key] = { month: ym, stream, brutto:0, gebyr:0, netto:0, antall:0 });
    m.brutto += brutto; m.gebyr += gebyr; m.netto += netto; m.antall += 1;
    tx++;
  }
  const list = Object.values(months).sort((a,b)=>a.month===b.month ? a.stream.localeCompare(b.stream) : a.month.localeCompare(b.month));
  list.forEach(m=>{ m.brutto=Math.round(m.brutto); m.gebyr=Math.round(m.gebyr*100)/100; m.netto=Math.round(m.netto*100)/100; });
  return { months: list, tx };
}

async function parseVippsSalgsrapport(buf){
  const rows = await parseXlsxRaw(buf);
  const products = [];
  let inTable = false;
  for(const r of rows){
    const first = String(r[0]==null?'':r[0]).trim();
    if(!inTable){ if(first==='Vare') inTable = true; continue; }
    if(!first || first==='Totalt') break;
    const antall = r.num && r.num[2]!=null ? r.num[2] : parseFloat(r[2])||0;
    const belop = r.num && r.num[3]!=null ? r.num[3] : parseFloat(r[3])||0;
    products.push({ navn: first, antall: Math.round(antall), belop: Math.round(belop) });
  }
  if(!products.length) throw new Error('Fant ingen varelinjer — er dette en Vipps salgsrapport (Handlekurv)?');
  products.sort((a,b)=>b.belop-a.belop);
  return { products };
}

async function parseVippsFile(file){
  const name = (file.name||'').toLowerCase();
  if(name.endsWith('.csv')){
    const res = parseVippsOppgjor(await file.text());
    return { kind:'oppgjor', ...res };
  }
  if(name.endsWith('.xlsx')){
    const res = await parseVippsSalgsrapport(await file.arrayBuffer());
    return { kind:'salgsrapport', ...res };
  }
  throw new Error('Ukjent filtype — last opp oppgjørsrapport (.csv) eller salgsrapport (.xlsx).');
}

/* ---------- Import-modal ---------- */
function VippsImportModal({ onClose, onSaved }){
  const [busy,setBusy]=useSv(false); const [err,setErr]=useSv(''); const [drag,setDrag]=useSv(false);
  const [months,setMonths]=useSv(null);     // fra oppgjørs-CSV
  const [tx,setTx]=useSv(0);
  const [products,setProducts]=useSv(null); // fra salgsrapport-xlsx
  const [done,setDone]=useSv(null);

  async function handleFiles(fileList){
    const files=[...(fileList||[])]; if(!files.length) return;
    setErr(''); setBusy(true);
    try {
      for(const f of files){
        const res = await parseVippsFile(f);
        if(res.kind==='oppgjor'){ setMonths(res.months); setTx(res.tx); }
        else { setProducts(res.products); }
      }
    } catch(e){ setErr(e.message||'Kunne ikke lese fila.'); }
    setBusy(false);
  }
  async function apply(){
    setBusy(true); setErr('');
    try {
      const res = await DASH_API.importVipps({ months: months||[], products: products||[] });
      setDone(res);
    } catch(e){ setErr(e.message==='forbidden' ? 'Kun styre kan importere økonomi.' : (e.message||'Import feilet.')); }
    setBusy(false);
  }
  const sumStream = s => (months||[]).filter(m=>m.stream===s).reduce((a,m)=>a+m.netto,0);
  const hasNoe = (months&&months.length) || (products&&products.length);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal import-modal" onClick={e=>e.stopPropagation()}>
        <div className="modal-head">
          <div><div className="modal-kicker">Vipps-utsalg</div><div className="modal-title">Importer Vipps-eksporter</div></div>
          <button className="icon-btn" onClick={onClose}>✕</button>
        </div>
        {done ? (
          <div className="dlg-body">
            <div className="import-done"><div className="big-check">✓</div>
              <div className="modal-title" style={{marginBottom:6}}>Import fullført</div>
              <div className="muted" style={{fontSize:13,lineHeight:1.7}}>
                <strong>{done.months}</strong> månedsrad(er){done.products>0 && <> og <strong>{done.products}</strong> produkter</>} lagret.
              </div>
            </div>
            <div className="modal-foot"><button className="btn primary" onClick={()=>{ if(onSaved) onSaved(); onClose(); }}>Ferdig</button></div>
          </div>
        ) : (
          <div className="dlg-body">
            <label className={'dropzone'+(drag?' over':'')} onDragOver={e=>{e.preventDefault();setDrag(true);}} onDragLeave={()=>setDrag(false)} onDrop={e=>{e.preventDefault();setDrag(false);handleFiles(e.dataTransfer.files);}}>
              <input type="file" accept=".csv,.xlsx" multiple style={{display:'none'}} onChange={e=>handleFiles(e.target.files)}/>
              <div className="dz-icon">⤓</div>
              <div className="dz-main">{busy?'Leser fil…':'Slipp Vipps-eksportene her, eller klikk'}</div>
              <div className="dz-sub">oppgjørsrapport (.csv) og/eller salgsrapport (.xlsx) · hele perioden</div>
            </label>
            {err && <div className="import-err">{err}</div>}
            {hasNoe && (
              <div className="import-stats">
                <div className="ist green"><div className="n">{fmtN(Math.round(sumStream('butikk')))}</div><div className="l">Netto butikk kr</div></div>
                <div className="ist blue"><div className="n">{fmtN(Math.round(sumStream('diverse')))}</div><div className="l">Netto diverse kr</div></div>
                <div className="ist coral"><div className="n">{products ? products.length : '—'}</div><div className="l">Produkter</div></div>
              </div>
            )}
            {months && <div className="import-format"><span className="tag green">Oppgjørsrapport</span><span className="muted">{tx} betalinger · {months.length} måned/strøm-rader</span></div>}
            {products && <div className="import-format"><span className="tag green">Salgsrapport</span><span className="muted">topp: {products.slice(0,3).map(p=>p.navn).join(', ')}</span></div>}
            <div className="import-howto"><div className="kv-h">Slik fungerer det</div>
              <ul>
                <li>Eksporter fra portal.vipps.no for <strong>hele perioden</strong> (01.01.2023 → i dag) — importen overskriver forrige.</li>
                <li>Oppgjørs-CSV gir netto pr. måned: Handlekurv = butikken, alt annet = «Diverse (historisk)».</li>
                <li>Salgsrapport-xlsx gir hvilke varer som er solgt (kun vippsbutikken).</li>
              </ul>
            </div>
            <div className="modal-foot">
              <button className="btn ghost" onClick={onClose}>Avbryt</button>
              <button className="btn primary" disabled={!hasNoe||busy} onClick={apply}>Lagre</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

Object.assign(window, { parseVippsOppgjor, parseVippsSalgsrapport, parseVippsFile, VippsImportModal, VIPPS_STREAM_LABEL });
