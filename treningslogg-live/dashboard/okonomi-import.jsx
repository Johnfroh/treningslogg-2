/* Økonomi (finance) import — parses Spond payment exports (both formats),
   aggregates transactions into months. Exposes window.parseOkonomiFile(file)
   and the OkonomiImportModal component. */
const { useState: useSo } = React;

function okSerialISO(n){ const f=parseFloat(n); if(isNaN(f)) return null; return new Date(Date.UTC(1899,11,30)+Math.round(f)*86400000).toISOString().slice(0,10); }
function okKat(s){ s=(s||'').toLowerCase(); if(s.includes('voksen'))return'Voksen'; if(s.includes('student'))return'Student'; if(s.includes('junior'))return'Junior'; if(s.includes('familie'))return'Familie'; if(s.includes('kn'))return'Knøtte'; return'Annet'; }
const MND_NO = ['jan','feb','mar','apr','mai','jun','jul','aug','sep','okt','nov','des'];
function monthLabel(ym){ const [y,m]=ym.split('-'); return MND_NO[parseInt(m)-1]+' '+y; }

async function okInflate(comp){
  const ds=new DecompressionStream('deflate-raw'); const w=ds.writable.getWriter(); w.write(comp); w.close();
  const reader=ds.readable.getReader(); const chunks=[]; let total=0;
  while(true){ const {done,value}=await reader.read(); if(done)break; chunks.push(value); total+=value.length; }
  const out=new Uint8Array(total); let off=0; for(const c of chunks){out.set(c,off);off+=c.length;} return new TextDecoder().decode(out);
}
async function loadWorkbook(buf){
  const bytes=new Uint8Array(buf), dvv=new DataView(buf);
  let p=-1; for(let i=bytes.length-22;i>=0;i--){ if(bytes[i]===0x50&&bytes[i+1]===0x4b&&bytes[i+2]===0x05&&bytes[i+3]===0x06){p=i;break;} }
  const cdOffset=dvv.getUint32(p+16,true), cdCount=dvv.getUint16(p+10,true); let o=cdOffset; const files={};
  for(let i=0;i<cdCount;i++){ const method=dvv.getUint16(o+10,true),compSize=dvv.getUint32(o+20,true);const nameLen=dvv.getUint16(o+28,true),extraLen=dvv.getUint16(o+30,true),commentLen=dvv.getUint16(o+32,true);const lho=dvv.getUint32(o+42,true);const name=new TextDecoder().decode(bytes.slice(o+46,o+46+nameLen));files[name]={lho,method,compSize};o+=46+nameLen+extraLen+commentLen; }
  async function get(name){ const e=files[name]; if(!e) return ''; const nL=dvv.getUint16(e.lho+26,true),xL=dvv.getUint16(e.lho+28,true);const start=e.lho+30+nL+xL;const comp=bytes.slice(start,start+e.compSize);return e.method===0?new TextDecoder().decode(comp):await okInflate(comp); }
  const ss=files['xl/sharedStrings.xml']?[...(await get('xl/sharedStrings.xml')).matchAll(/<si>(.*?)<\/si>/gs)].map(m=>[...m[1].matchAll(/<t[^>]*>(.*?)<\/t>/gs)].map(x=>x[1]).join('')):[];
  const wb=await get('xl/workbook.xml');
  const rels=await get('xl/_rels/workbook.xml.rels');
  const relMap={}; for(const m of rels.matchAll(/<Relationship[^>]*Id="([^"]*)"[^>]*Target="([^"]*)"/g)) relMap[m[1]]=m[2];
  const sheetNames=[]; for(const m of wb.matchAll(/<sheet [^>]*name="([^"]*)"[^>]*r:id="([^"]*)"/g)){ let t=relMap[m[2]]||''; if(t&&!t.startsWith('xl/')) t='xl/'+t.replace(/^\//,''); sheetNames.push({name:m[1], file:t}); }
  const colIdx=ls=>{let n=0;for(const ch of ls)n=n*26+(ch.charCodeAt(0)-64);return n-1;};
  async function rowsOf(file){ const sheet=await get(file); const rows=[...sheet.matchAll(/<row[^>]*>(.*?)<\/row>/gs)].map(r=>r[1]); return rows.map(r=>{const cells=[...r.matchAll(/<c r="([A-Z]+)\d+"([^>]*)>(.*?)<\/c>/gs)];const out=[];for(const c of cells){const idx=colIdx(c[1]);const isStr=/t="s"/.test(c[2]);const v=(c[3].match(/<v>(.*?)<\/v>/s)||[])[1];out[idx]=v===undefined?'':(isStr?ss[parseInt(v)]:v);}return out;}); }
  return { sheetNames, rowsOf };
}

async function parseOkonomiFile(file){
  const buf = await file.arrayBuffer();
  const wb = await loadWorkbook(buf);
  const months = {}; let txCount = 0;
  function addTx(ym, {netto,brutto,avgifter,kat}){
    if(!ym) return;
    const M = months[ym] || (months[ym]={netto:0,brutto:0,avgifter:0,antall:0,byKategori:{}});
    M.netto+=netto; M.brutto+=brutto; M.avgifter+=avgifter; M.antall++;
    if(kat) M.byKategori[kat]=(M.byKategori[kat]||0)+netto;
    txCount++;
  }
  const hdrIdx = (header, ...names)=>{ for(const n of names){ const i=header.findIndex(h=>(h||'').toLowerCase().trim()===n.toLowerCase()); if(i>=0) return i; } return -1; };

  // 1) transaction-level sheets (preferred)
  for(const s of wb.sheetNames){
    const rows = await wb.rowsOf(s.file);
    if(!rows.length) continue;
    const h = rows[0];
    const cDate = hdrIdx(h,'Betalingsdato'), cNet = hdrIdx(h,'Netto');
    if(cDate<0 || cNet<0) continue;                 // not a transaction sheet
    const cBrutto=hdrIdx(h,'Brutto'), cAvg=hdrIdx(h,'Avgifter'), cProd=hdrIdx(h,'Produkt','Gruppe','Betaling');
    let used=0;
    for(let i=1;i<rows.length;i++){
      const r=rows[i]; if(!r||r[cDate]==null||r[cDate]==='') continue;
      const ym = (okSerialISO(r[cDate])||'').slice(0,7); if(!ym) continue;
      addTx(ym, { netto:parseFloat(r[cNet])||0, brutto:cBrutto>=0?parseFloat(r[cBrutto])||0:0,
        avgifter:cAvg>=0?parseFloat(r[cAvg])||0:0, kat: okKat(cProd>=0?r[cProd]:'') }); used++;
    }
    if(used>0) break; // got transactions from this sheet
  }

  // 2) fallback: payout-summary sheet (Utbetalinger)
  if(txCount===0){
    for(const s of wb.sheetNames){
      const rows = await wb.rowsOf(s.file); if(!rows.length) continue;
      const h = rows[0];
      const cDate = hdrIdx(h,'Utbetalingsdato','Betalingsdato'), cNet=hdrIdx(h,'Netto');
      if(cDate<0||cNet<0) continue;
      const cBrutto=hdrIdx(h,'Brutto'), cAvg=hdrIdx(h,'Avgifter');
      for(let i=1;i<rows.length;i++){ const r=rows[i]; if(!r) continue; const net=parseFloat(r[cNet])||0; if(!net) continue;
        const ym=(okSerialISO(r[cDate])||'').slice(0,7); addTx(ym,{netto:net,brutto:cBrutto>=0?parseFloat(r[cBrutto])||0:0,avgifter:cAvg>=0?parseFloat(r[cAvg])||0:0,kat:''}); }
      if(txCount>0) break;
    }
  }

  for(const m in months){ const M=months[m]; M.netto=Math.round(M.netto); M.brutto=Math.round(M.brutto); M.avgifter=Math.round(M.avgifter); for(const k in M.byKategori) M.byKategori[k]=Math.round(M.byKategori[k]); }
  const keys=Object.keys(months).sort();
  return { months, monthKeys:keys, txCount, format: wb.sheetNames.some(s=>/transaksjon/i.test(s.name)) ? 'Spond transaksjoner' : 'Spond betalinger' };
}

/* ---------- Import modal ---------- */
function OkonomiImportModal({ onClose }){
  const { okonomiActions } = useMembers();
  const [busy,setBusy]=useSo(false); const [err,setErr]=useSo(''); const [parsed,setParsed]=useSo(null); const [drag,setDrag]=useSo(false); const [done,setDone]=useSo(null);

  async function handleFile(file){ if(!file) return; setErr(''); setBusy(true); setParsed(null);
    try { const res=await parseOkonomiFile(file); if(!res.monthKeys.length) throw new Error('Fant ingen betalinger med dato og netto-beløp i fila.'); setParsed(res); }
    catch(e){ setErr(e.message||'Kunne ikke lese fila.'); } setBusy(false);
  }
  async function apply(){ setBusy(true);
    try { const s=await okonomiActions.importMonths(parsed.months); setDone(s); }
    catch(e){ setErr(e.message||'Import feilet.'); }
    setBusy(false);
  }
  const totalNet = parsed? parsed.monthKeys.reduce((a,k)=>a+parsed.months[k].netto,0):0;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal import-modal" onClick={e=>e.stopPropagation()}>
        <div className="modal-head">
          <div><div className="modal-kicker">Månedlig oppdatering</div><div className="modal-title">Importer økonomi</div></div>
          <button className="icon-btn" onClick={onClose}>✕</button>
        </div>
        {done ? (
          <div className="dlg-body">
            <div className="import-done"><div className="big-check">✓</div>
              <div className="modal-title" style={{marginBottom:6}}>Import fullført</div>
              <div className="muted" style={{fontSize:13,lineHeight:1.7}}><strong>{done.added}</strong> måned(er) lagt til/oppdatert.<br/>Trenden dekker nå <strong>{done.total}</strong> måneder.</div>
            </div>
            <div className="modal-foot"><button className="btn primary" onClick={onClose}>Ferdig</button></div>
          </div>
        ) : !parsed ? (
          <div className="dlg-body">
            <label className={'dropzone'+(drag?' over':'')} onDragOver={e=>{e.preventDefault();setDrag(true);}} onDragLeave={()=>setDrag(false)} onDrop={e=>{e.preventDefault();setDrag(false);handleFile(e.dataTransfer.files[0]);}}>
              <input type="file" accept=".xlsx,.csv" style={{display:'none'}} onChange={e=>handleFile(e.target.files[0])}/>
              <div className="dz-icon">⤓</div>
              <div className="dz-main">{busy?'Leser fil…':'Slipp Spond betalings­eksport her, eller klikk'}</div>
              <div className="dz-sub">.xlsx · utbetalinger / transaksjoner</div>
            </label>
            {err && <div className="import-err">{err}</div>}
            <div className="import-howto"><div className="kv-h">Slik fungerer det</div>
              <ul><li>Last opp Spond-eksporten for én eller flere måneder.</li><li>Netto inntekt summeres pr. måned og legges til trenden.</li><li>Importerer du samme måned på nytt, oppdateres tallene.</li></ul>
            </div>
          </div>
        ) : (
          <div className="dlg-body">
            <div className="import-format"><span className="tag green">{parsed.format}</span><span className="muted">{parsed.txCount} betalinger · {parsed.monthKeys.length} måned(er)</span></div>
            <div className="import-stats">
              <div className="ist green"><div className="n">{fmtN(totalNet)}</div><div className="l">Netto kr</div></div>
              <div className="ist blue"><div className="n">{parsed.monthKeys.length}</div><div className="l">Måneder</div></div>
              <div className="ist coral"><div className="n">{parsed.txCount}</div><div className="l">Betalinger</div></div>
            </div>
            <div className="ok-monthlist">
              {parsed.monthKeys.map(k=>(
                <div key={k} className="ok-monthrow"><span>{monthLabel(k)}</span><span className="tabular"><strong>{fmtN(parsed.months[k].netto)} kr</strong> <span className="muted">· {parsed.months[k].antall} betalinger</span></span></div>
              ))}
            </div>
            <div className="import-note">Netto = etter Spond-avgifter. Avvik mot estimert MRR skyldes 6-mnd-abonnement, drop-in og familierabatt.</div>
            <div className="modal-foot">
              <button className="btn ghost" onClick={()=>setParsed(null)}>Velg en annen fil</button>
              <button className="btn primary" onClick={apply}>Legg til i trenden</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

Object.assign(window, { parseOkonomiFile, OkonomiImportModal, monthLabel, MND_NO });
