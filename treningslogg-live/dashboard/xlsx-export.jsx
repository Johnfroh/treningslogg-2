/* Skriver en ekte .xlsx-fil i nettleseren — uten bibliotek.

   Hvorfor ikke bare CSV: en CSV har ingen måte å si hvilket skilletegn den
   bruker. Excel gjetter ut fra listeskillet i Windows-innstillingene, så en
   semikolonfil havner i én eneste kolonne når maskinen er satt opp med komma
   (og motsatt). Med .xlsx finnes ikke det problemet — kolonnene ER kolonner.

   I tillegg får vi det CSV ikke kan gi: én fane pr. seksjon, autofilter på
   overskriftsraden, fryst topprad, kolonnebredder, og tall og datoer som
   Excel forstår som tall og datoer.

   Zip-en skrives med «stored» (ingen komprimering). Det er fullt lovlig i
   xlsx-formatet og sparer oss for en deflate-implementasjon; filene er noen
   titalls kB, så størrelsen spiller ingen rolle. */

/* ---------- CRC32 (påkrevd i zip-headerne) ---------- */
const XE_CRC_TAB = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    t[i] = c >>> 0;
  }
  return t;
})();
function xeCrc32(bytes){
  let c = 0xFFFFFFFF;
  for (let i = 0; i < bytes.length; i++) c = XE_CRC_TAB[(c ^ bytes[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}

/* ---------- Minimal zip-skriver (kun «stored») ---------- */
function xeZip(filer){
  const enc = new TextEncoder();
  const deler = [], sentral = [];
  let offset = 0;
  const u16 = n => [n & 0xFF, (n >>> 8) & 0xFF];
  const u32 = n => [n & 0xFF, (n >>> 8) & 0xFF, (n >>> 16) & 0xFF, (n >>> 24) & 0xFF];

  filer.forEach(f => {
    const navn = enc.encode(f.navn);
    const data = enc.encode(f.innhold);
    const crc = xeCrc32(data);
    // Lokal header: signatur, versjon 2.0, ingen flagg, metode 0 (stored),
    // null-dato (Excel bryr seg ikke), crc, størrelser, navnelengde.
    const lokal = [].concat(
      u32(0x04034B50), u16(20), u16(0), u16(0), u16(0), u16(0),
      u32(crc), u32(data.length), u32(data.length), u16(navn.length), u16(0));
    deler.push(new Uint8Array(lokal), navn, data);
    sentral.push({ navn, crc, len: data.length, offset });
    offset += lokal.length + navn.length + data.length;
  });

  const sentralStart = offset;
  sentral.forEach(e => {
    const h = [].concat(
      u32(0x02014B50), u16(20), u16(20), u16(0), u16(0), u16(0), u16(0),
      u32(e.crc), u32(e.len), u32(e.len),
      u16(e.navn.length), u16(0), u16(0), u16(0), u16(0), u32(0), u32(e.offset));
    deler.push(new Uint8Array(h), e.navn);
    offset += h.length + e.navn.length;
  });
  deler.push(new Uint8Array([].concat(
    u32(0x06054B50), u16(0), u16(0), u16(sentral.length), u16(sentral.length),
    u32(offset - sentralStart), u32(sentralStart), u16(0))));

  return new Blob(deler, { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

/* ---------- Regneark-XML ---------- */
function xeEsc(s){
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    // Kontrolltegn er ulovlige i XML og får Excel til å melde om ødelagt fil.
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');
}
function xeKol(i){
  let s = '', n = i + 1;
  while (n > 0) { const r = (n - 1) % 26; s = String.fromCharCode(65 + r) + s; n = Math.floor((n - 1) / 26); }
  return s;
}
const XE_DATO = /^\d{4}-\d{2}-\d{2}$/;
// Excel teller dager fra 1899-12-30 (skuddårsfeilen fra Lotus 1-2-3 er med).
function xeSerial(iso){
  const t = Date.UTC(+iso.slice(0,4), +iso.slice(5,7) - 1, +iso.slice(8,10));
  return Math.round((t - Date.UTC(1899, 11, 30)) / 86400000);
}
// Arknavn: maks 31 tegn, og Excel forbyr : \ / ? * [ ]
function xeArknavn(navn, brukt){
  let n = String(navn || 'Ark').replace(/[:\\/?*[\]]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 31) || 'Ark';
  let i = 2;
  while (brukt[n.toLowerCase()]) { const suf = ' (' + (i++) + ')'; n = n.slice(0, 31 - suf.length) + suf; }
  brukt[n.toLowerCase()] = true;
  return n;
}

/* ark: [{ navn, kolonner:[...], rader:[[...]] }] → Blob */
function byggXlsx(ark){
  const enc = new TextEncoder();
  const strenger = [], strIdx = {};
  const sIdx = s => {
    const k = String(s);
    if (strIdx[k] === undefined) { strIdx[k] = strenger.length; strenger.push(k); }
    return strIdx[k];
  };
  const brukt = {};
  const sheets = ark.map((a, i) => {
    const navn = xeArknavn(a.navn, brukt);
    const kolonner = a.kolonner || [];
    const rader = a.rader || [];
    const bredder = kolonner.map(k => String(k == null ? '' : k).length);

    const celle = (v, r, c, header) => {
      const ref = xeKol(c) + r;
      const tekst = v == null ? '' : String(v);
      if (bredder[c] === undefined || tekst.length > bredder[c]) bredder[c] = tekst.length;
      if (header) return `<c r="${ref}" s="2" t="s"><v>${sIdx(tekst)}</v></c>`;
      if (v == null || v === '') return '';
      if (typeof v === 'number') return isFinite(v) ? `<c r="${ref}"><v>${v}</v></c>` : '';
      if (XE_DATO.test(tekst)) return `<c r="${ref}" s="1"><v>${xeSerial(tekst)}</v></c>`;
      return `<c r="${ref}" t="s"><v>${sIdx(tekst)}</v></c>`;
    };

    const linjer = [`<row r="1">${kolonner.map((k, c) => celle(k, 1, c, true)).join('')}</row>`];
    rader.forEach((rad, ri) => {
      const r = ri + 2;
      linjer.push(`<row r="${r}">${rad.map((v, c) => celle(v, r, c)).join('')}</row>`);
    });

    const sisteKol = xeKol(Math.max(0, kolonner.length - 1));
    const sisteRad = rader.length + 1;
    const cols = bredder.map((b, c) =>
      `<col min="${c+1}" max="${c+1}" width="${Math.min(46, Math.max(9, b + 3))}" customWidth="1"/>`).join('');

    // Rekkefølgen på elementene er fastsatt i formatet: dimension, sheetViews,
    // sheetFormatPr, cols, sheetData, autoFilter. Bytter man om, nekter Excel
    // å åpne fila.
    const xml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
      `<dimension ref="A1:${sisteKol}${sisteRad}"/>` +
      '<sheetViews><sheetView' + (i === 0 ? ' tabSelected="1"' : '') + ' workbookViewId="0">' +
      '<pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/>' +
      '</sheetView></sheetViews>' +
      '<sheetFormatPr defaultRowHeight="15"/>' +
      (cols ? `<cols>${cols}</cols>` : '') +
      `<sheetData>${linjer.join('')}</sheetData>` +
      (kolonner.length ? `<autoFilter ref="A1:${sisteKol}${sisteRad}"/>` : '') +
      '</worksheet>';
    return { navn, xml };
  });

  const nsRel = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
  const filer = [
    { navn: '[Content_Types].xml', innhold:
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
      '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
      '<Default Extension="xml" ContentType="application/xml"/>' +
      '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
      sheets.map((s, i) => `<Override PartName="/xl/worksheets/sheet${i+1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('') +
      '<Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/>' +
      '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
      '</Types>' },
    { navn: '_rels/.rels', innhold:
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      `<Relationship Id="rId1" Type="${nsRel}/officeDocument" Target="xl/workbook.xml"/>` +
      '</Relationships>' },
    { navn: 'xl/workbook.xml', innhold:
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" ' +
      `xmlns:r="${nsRel}"><sheets>` +
      sheets.map((s, i) => `<sheet name="${xeEsc(s.navn)}" sheetId="${i+1}" r:id="rId${i+1}"/>`).join('') +
      '</sheets></workbook>' },
    { navn: 'xl/_rels/workbook.xml.rels', innhold:
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      sheets.map((s, i) => `<Relationship Id="rId${i+1}" Type="${nsRel}/worksheet" Target="worksheets/sheet${i+1}.xml"/>`).join('') +
      `<Relationship Id="rId${sheets.length+1}" Type="${nsRel}/sharedStrings" Target="sharedStrings.xml"/>` +
      `<Relationship Id="rId${sheets.length+2}" Type="${nsRel}/styles" Target="styles.xml"/>` +
      '</Relationships>' },
    // s="1" = dato (yyyy-mm-dd), s="2" = halvfet overskrift.
    { navn: 'xl/styles.xml', innhold:
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
      '<numFmts count="1"><numFmt numFmtId="164" formatCode="yyyy\\-mm\\-dd"/></numFmts>' +
      '<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font>' +
      '<font><b/><sz val="11"/><name val="Calibri"/></font></fonts>' +
      '<fills count="2"><fill><patternFill patternType="none"/></fill>' +
      '<fill><patternFill patternType="gray125"/></fill></fills>' +
      '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>' +
      '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
      '<cellXfs count="3">' +
      '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>' +
      '<xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>' +
      '<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>' +
      '</cellXfs>' +
      '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>' +
      '</styleSheet>' },
    { navn: 'xl/sharedStrings.xml', innhold:
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      `<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="${strenger.length}" uniqueCount="${strenger.length}">` +
      // xml:space bevarer ledende/etterfølgende mellomrom.
      strenger.map(s => `<si><t xml:space="preserve">${xeEsc(s)}</t></si>`).join('') +
      '</sst>' },
  ].concat(sheets.map((s, i) => ({ navn: `xl/worksheets/sheet${i+1}.xml`, innhold: s.xml })));

  void enc;
  return xeZip(filer);
}

function lastNedXlsx(filnavn, ark){
  const blob = byggXlsx(ark);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filnavn;
  document.body.appendChild(a); a.click();
  setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);
}

Object.assign(window, { byggXlsx, lastNedXlsx, xeZip, xeCrc32, xeKol, xeSerial, xeArknavn });
