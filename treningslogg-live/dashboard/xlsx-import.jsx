/* Client-side member-file parser for monthly imports.
   Handles: Spond .xlsx export, Spond .csv export, and this app's own belt CSV.
   Exposes window.parseMemberFile(file) -> Promise<{members, format}>. */

const NOW_IMP = new Date();
const todayImp = () => new Date().toISOString().slice(0,10);

function serialToISOimp(n){ if(n==null||isNaN(n)) return null; return new Date(Date.UTC(1899,11,30)+Math.round(n)*86400000).toISOString().slice(0,10); }
function parseDateLoose(v){
  if(v==null||v==='') return null;
  const s=String(v).trim();
  if(/^\d{5}(\.0+)?$/.test(s)) return serialToISOimp(parseFloat(s));
  if(/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0,10);
  const m=s.match(/^(\d{1,2})[.\/](\d{1,2})[.\/](\d{4})$/); // dd.mm.yyyy
  if(m) return `${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`;
  return null;
}
function deriveKategoriImp(t){t=(t||'').toLowerCase();if(t.includes('kn'))return'Knøtte';if(t.includes('junior'))return'Junior';if(t.includes('student'))return'Student';if(t.includes('voksen'))return'Voksen';if(t.includes('familie'))return'Familie';if(t.includes('intro'))return'Introkurs';return'Annet';}
function priceFromTypeImp(t){t=t||'';const m=t.match(/(\d[\d\s]{1,5})/);if(!m)return 0;let n=parseInt(m[1].replace(/\s/g,''));if(/halv|semester/i.test(t))n=Math.round(n/6);return n;}
const slugImp = s => (s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
function ageFrom(iso){ return iso? Math.floor((NOW_IMP-new Date(iso))/(365.25*86400000)) : null; }

function buildMember(f){
  // f: { fornavn, etternavn, type, epost, mobil, kjonn, innm, fdato, adresse, postnr, poststed, foresatte, belt?, stripes?, beltSince? }
  const navn=((f.fornavn||'')+' '+(f.etternavn||'')).trim();
  const kategori=deriveKategoriImp(f.type);
  const m={
    id: slugImp(navn)||slugImp(f.epost)||('m'+Math.random().toString(36).slice(2,7)),
    fornavn:(f.fornavn||'').trim(), etternavn:(f.etternavn||'').trim(), navn,
    kategori, medlemstype:f.type||'', prisMnd:priceFromTypeImp(f.type),
    epost:f.epost||'', mobil:f.mobil||'', kjonn:f.kjonn||'Ukjent',
    innmeldingsdato:f.innm||null, fodselsdato:f.fdato||null, alder:ageFrom(f.fdato),
    adresse:f.adresse||'', postnr:f.postnr||'', poststed:f.poststed||'',
    foresatte:f.foresatte||[],
  };
  if(f.belt){ m.beltImport={ belt:f.belt, stripes:parseInt(f.stripes)||0, since:f.beltSince||f.innm||null }; }
  return m;
}

/* ---------- XLSX (Spond positional layout) ---------- */
async function inflateRaw(comp){
  const ds=new DecompressionStream('deflate-raw');
  const w=ds.writable.getWriter(); w.write(comp); w.close();
  const reader=ds.readable.getReader(); const chunks=[]; let total=0;
  while(true){ const {done,value}=await reader.read(); if(done)break; chunks.push(value); total+=value.length; }
  const out=new Uint8Array(total); let off=0; for(const c of chunks){out.set(c,off);off+=c.length;}
  return new TextDecoder().decode(out);
}
async function parseXlsx(buf){
  const bytes=new Uint8Array(buf), dvv=new DataView(buf);
  let p=-1; for(let i=bytes.length-22;i>=0;i--){ if(bytes[i]===0x50&&bytes[i+1]===0x4b&&bytes[i+2]===0x05&&bytes[i+3]===0x06){p=i;break;} }
  const cdOffset=dvv.getUint32(p+16,true), cdCount=dvv.getUint16(p+10,true);
  let o=cdOffset; const files={};
  for(let i=0;i<cdCount;i++){
    const method=dvv.getUint16(o+10,true), compSize=dvv.getUint32(o+20,true);
    const nameLen=dvv.getUint16(o+28,true), extraLen=dvv.getUint16(o+30,true), commentLen=dvv.getUint16(o+32,true);
    const lho=dvv.getUint32(o+42,true);
    const name=new TextDecoder().decode(bytes.slice(o+46,o+46+nameLen));
    files[name]={lho,method,compSize}; o+=46+nameLen+extraLen+commentLen;
  }
  async function get(name){ const e=files[name]; if(!e) return ''; const nL=dvv.getUint16(e.lho+26,true), xL=dvv.getUint16(e.lho+28,true); const start=e.lho+30+nL+xL; const comp=bytes.slice(start,start+e.compSize); return e.method===0? new TextDecoder().decode(comp): await inflateRaw(comp); }
  const ss=await get('xl/sharedStrings.xml');
  const strings=[...ss.matchAll(/<si>(.*?)<\/si>/gs)].map(m=>[...m[1].matchAll(/<t[^>]*>(.*?)<\/t>/gs)].map(x=>x[1]).join(''));
  let sheetName='xl/worksheets/sheet1.xml'; if(!files[sheetName]){ sheetName=Object.keys(files).find(n=>/xl\/worksheets\/.*\.xml$/.test(n)); }
  const sheet=await get(sheetName);
  const rows=[...sheet.matchAll(/<row[^>]*>(.*?)<\/row>/gs)].map(r=>r[1]);
  const colIdx=ls=>{let n=0;for(const ch of ls)n=n*26+(ch.charCodeAt(0)-64);return n-1;};
  function parseRow(r){const cells=[...r.matchAll(/<c r="([A-Z]+)\d+"([^>]*)>(.*?)<\/c>/gs)];const out={num:{}};for(const c of cells){const idx=colIdx(c[1]);const isStr=/t="s"/.test(c[2]);const v=(c[3].match(/<v>(.*?)<\/v>/s)||[])[1];if(v===undefined){out[idx]='';continue;}if(isStr){out[idx]=strings[parseInt(v)];}else{out[idx]=v;out.num[idx]=parseFloat(v);}}return out;}
  const members=[];
  for(let i=1;i<rows.length;i++){
    const o2=parseRow(rows[i]);
    const fornavn=(o2[3]||'').trim(), etternavn=(o2[4]||'').trim();
    if(!fornavn&&!etternavn) continue;
    let innmSerial=null; for(let c=11;c<=23;c++){ if(o2.num[c]!=null&&o2.num[c]>=41000&&o2.num[c]<=47200){innmSerial=o2.num[c];break;} }
    const fSerial=(o2.num[24]!=null&&o2.num[24]>15000)?o2.num[24]:null;
    const guardians=[];
    for(let c=11;c<=18;c+=4){ const fn=o2[c],ln=o2[c+1]; if(typeof fn==='string'&&fn&&isNaN(parseFloat(fn))&&!/^\+?\d/.test(fn)){ guardians.push({navn:((fn||'')+' '+(ln||'')).trim(),epost:o2[c+2]||'',tel:o2[c+3]||''}); } }
    members.push(buildMember({ fornavn,etternavn,type:o2[0]||'',epost:o2[5]||'',mobil:o2[6]||'',kjonn:o2[25]||'Ukjent',
      innm:serialToISOimp(innmSerial), fdato:serialToISOimp(fSerial), adresse:o2[26]||'',postnr:o2[27]||'',poststed:o2[28]||'', foresatte:guardians }));
  }
  return { members, format:'Spond Excel' };
}

/* ---------- CSV ---------- */
function parseCSVtext(text){
  if(text.charCodeAt(0)===0xFEFF) text=text.slice(1);
  const delim = (text.split('\n')[0].match(/;/g)||[]).length > (text.split('\n')[0].match(/,/g)||[]).length ? ';' : ',';
  const rows=[]; let row=[], field='', q=false;
  for(let i=0;i<text.length;i++){ const ch=text[i];
    if(q){ if(ch==='"'){ if(text[i+1]==='"'){field+='"';i++;} else q=false; } else field+=ch; }
    else { if(ch==='"') q=true; else if(ch===delim){ row.push(field); field=''; } else if(ch==='\n'){ row.push(field); rows.push(row); row=[]; field=''; } else if(ch==='\r'){} else field+=ch; }
  }
  if(field.length||row.length){ row.push(field); rows.push(row); }
  return rows.filter(r=>r.some(c=>c.trim()!==''));
}
function parseCsv(text){
  const rows=parseCSVtext(text); if(!rows.length) return {members:[],format:'CSV'};
  const head=rows[0].map(h=>h.trim());
  const idx=(...names)=>{ for(const n of names){ const i=head.findIndex(h=>h.toLowerCase()===n.toLowerCase()); if(i>=0) return i; } return -1; };
  const own = idx('Beltefarge')>=0 && idx('Fornavn')>=0;
  const c={
    fornavn: idx('Medlem fornavn','Fornavn'),
    etternavn: idx('Medlem etternavn','Etternavn'),
    type: idx('Medlemstype'),
    epost: idx('Medlems-e-post','E-post','Epost'),
    mobil: idx('Medlem mobil','Mobil','Telefon'),
    kjonn: idx('Kjønn'),
    innm: idx('Innmeldingsdato','Innmeldt'),
    fdato: idx('Fødselsdato'),
    adresse: idx('Adresse'),
    postnr: idx('Postnummer','Postnr'),
    poststed: idx('Poststed'),
    belt: idx('Beltefarge'),
    stripes: idx('Striper'),
    beltSince: idx('Belte oppnådd'),
  };
  const members=[];
  for(let i=1;i<rows.length;i++){
    const r=rows[i]; const g=k=> (c[k]>=0? (r[c[k]]||'').trim() : '');
    const fornavn=g('fornavn'), etternavn=g('etternavn');
    if(!fornavn&&!etternavn) continue;
    members.push(buildMember({ fornavn,etternavn,type:g('type'),epost:g('epost'),mobil:g('mobil'),kjonn:g('kjonn')||'Ukjent',
      innm:parseDateLoose(g('innm')), fdato:parseDateLoose(g('fdato')), adresse:g('adresse'),postnr:g('postnr'),poststed:g('poststed'),
      belt: own? g('belt'):'', stripes: own? g('stripes'):0, beltSince: own? parseDateLoose(g('beltSince')):null }));
  }
  return { members, format: own? 'Belte-CSV (denne appen)':'Spond CSV' };
}

async function parseMemberFile(file){
  const name=(file.name||'').toLowerCase();
  if(name.endsWith('.xlsx')) return await parseXlsx(await file.arrayBuffer());
  if(name.endsWith('.csv')) return parseCsv(await file.text());
  // try xlsx by signature (PK), else csv
  const buf=await file.arrayBuffer(); const b=new Uint8Array(buf);
  if(b[0]===0x50&&b[1]===0x4b) return await parseXlsx(buf);
  return parseCsv(new TextDecoder().decode(b));
}

Object.assign(window, { parseMemberFile });
