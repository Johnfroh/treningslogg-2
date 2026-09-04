/* Månedsrapport til instruktører — aktivitet, oppmøte pr. økt, hvem som er
   borte, og gradering. Åpnes i eget vindu og skrives ut / lagres som PDF,
   samme mønster som årsrapporten.

   Personvern: rapporten er en fil som sendes videre, så ALLE navngis som
   «Fornavn E.» — også voksne. Mindreårige er dessuten allerede maskert i
   api.js før dataene kommer hit.

   Datakilder (ingen nye): dashCalendar (økter), dashList (register, gradering,
   sist sett), live.memberMonthly (oppmøte pr. medlem pr. kalendermåned),
   live.attFrom (hvor langt tilbake oppmøtedataene rekker), departed. */
const { useState: useMr } = React;

const MR_MND = ['januar','februar','mars','april','mai','juni','juli','august','september','oktober','november','desember'];
const MR_MND_K = ['jan','feb','mar','apr','mai','jun','jul','aug','sep','okt','nov','des'];
const MR_ISO = /^\d{4}-\d{2}-\d{2}$/;

function mrEsc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function mrMndNavn(ym){ const m=/^(\d{4})-(\d{2})$/.exec(String(ym||'')); return m? MR_MND[+m[2]-1]+' '+m[1] : String(ym||''); }
// Forrige måned relativt til ym ('2026-09' → '2026-08').
function mrForrige(ym, n){
  const m=/^(\d{4})-(\d{2})$/.exec(String(ym||'')); if(!m) return '';
  const d=new Date(Date.UTC(+m[1], +m[2]-1-(n||1), 1));
  return d.toISOString().slice(0,7);
}
function mrDagMnd(iso){
  if(!MR_ISO.test(iso||'')) return String(iso||'');
  return parseInt(iso.slice(8,10),10)+'. '+MR_MND_K[parseInt(iso.slice(5,7),10)-1];
}
// «Fornavn E.» for alle. Maskerte barn har allerede formen; voksne kortes her.
function mrNavn(m){
  if(!m) return 'Ukjent';
  const fornavn=(m.fornavn||'').trim() || String(m.navn||'').trim().split(/\s+/)[0] || 'Medlem';
  const init=(m.initial||'').trim()
    || ((m.etternavn||'').trim() ? (m.etternavn||'').trim().charAt(0).toUpperCase()+'.' : '');
  return (fornavn+' '+init).trim();
}
function mrDagerSiden(iso){
  if(!iso) return null;
  const t=new Date(iso).getTime();
  if(isNaN(t)) return null;
  return Math.floor((Date.now()-t)/86400000);
}
function mrSiden(iso){
  const d=mrDagerSiden(iso);
  if(d==null) return 'aldri registrert';
  if(d<=0) return 'i dag';
  if(d<14) return d+' dager siden';
  if(d<60) return Math.round(d/7)+' uker siden';
  return Math.round(d/30.4)+' mnd siden';
}
// Siste gradering som faktisk er en gradering (innmelding teller ikke).
function mrSistGradert(m){
  const h=(m.grading && m.grading.history) || [];
  let best='';
  h.forEach(e=>{ if(e.kind!=='innmelding' && MR_ISO.test(e.date||'') && e.date>best) best=e.date; });
  if(best) return best;
  const cur=m.grading && m.grading.current;
  return (cur && MR_ISO.test(cur.since||'')) ? cur.since : '';
}
function mrBelteTekst(m){
  const c=(m.grading && m.grading.current) || {};
  const st=Number(c.stripes||0);
  return (c.belt||'Hvit') + (st>0 ? ' ' + '●'.repeat(Math.min(st,4)) : '');
}

// Oppmøter for ett medlem i én kalendermåned.
function mrMnd(live, id, ym){
  const mm=(live && live.memberMonthly && live.memberMonthly[id]) || null;
  return mm ? (mm[ym]||0) : 0;
}
// Oppmøter for ett medlem fra og med en dato, til og med rapportmåneden.
// Oppløsningen er kalendermåned, så måneden graderingen skjedde i tas med i sin
// helhet — å utelate den ville underrapportert systematisk for alle som ble
// gradert tidlig i en måned.
//
// Øvre grense er viktig: uten den talte en augustrapport også september, og en
// rapport for en gammel måned fikk med alt fram til i dag.
function mrOkterSiden(live, id, fraISO, tilYm){
  const mm=(live && live.memberMonthly && live.memberMonthly[id]) || null;
  if(!mm) return 0;
  const fraYm = MR_ISO.test(fraISO||'') ? fraISO.slice(0,7) : '';
  let n=0;
  Object.keys(mm).forEach(ym=>{
    if(fraYm && ym<fraYm) return;
    if(tilYm && ym>tilYm) return;
    n+=mm[ym];
  });
  return n;
}

/* ---------- Datagrunnlaget rapporten bygger på ---------- */
function buildManedsrapportData(ym, members, sessions, live, departed, terskler){
  const th=terskler||{};
  const stilleUker=th.stilleUker||3, introUker=th.introUker||2;
  const gradMinOppmote=th.gradMinOppmote||30, gradMinMnd=th.gradMinMnd||6;
  const list=members||[];
  const byId={}; list.forEach(m=>{ byId[m.id]=m; });

  // 1) Økter i måneden, kronologisk.
  const okter=(sessions||[])
    .filter(s => MR_ISO.test(s.date||'') && s.date.slice(0,7)===ym)
    .sort((a,b)=> a.date===b.date ? String(a.time||'').localeCompare(String(b.time||'')) : a.date.localeCompare(b.date));
  const oppmoteAv = s => (s.attendance==null || s.attendance==='') ? null : Number(s.attendance);
  const medTall = okter.filter(s => oppmoteAv(s)!=null);
  const oppmoterTot = medTall.reduce((n,s)=> n+oppmoteAv(s), 0);
  const utenTall = okter.length - medTall.length;

  // Pr. gruppe i måneden.
  const grupper={};
  okter.forEach(s=>{
    const g=String(s.group||'').trim()||'ukjent';
    const e=grupper[g]||(grupper[g]={gruppe:g, okter:0, oppmoter:0, medTall:0});
    e.okter++;
    const a=oppmoteAv(s);
    if(a!=null){ e.oppmoter+=a; e.medTall++; }
  });
  const gruppeListe=Object.keys(grupper).map(g=>{
    const e=grupper[g];
    return { ...e, snitt: e.medTall ? e.oppmoter/e.medTall : 0 };
  }).sort((a,b)=> b.oppmoter-a.oppmoter);

  // 2) Unike medlemmer innom matta denne måneden + forrige måned til trend.
  const forrige=mrForrige(ym,1);
  let unike=0, unikeForrige=0;
  list.forEach(m=>{
    if(mrMnd(live,m.id,ym)>0) unike++;
    if(mrMnd(live,m.id,forrige)>0) unikeForrige++;
  });

  // Forrige måneds økter/oppmøter, for pilene.
  const okterF=(sessions||[]).filter(s => MR_ISO.test(s.date||'') && s.date.slice(0,7)===forrige);
  const medTallF=okterF.filter(s => oppmoteAv(s)!=null);
  const oppmoterF=medTallF.reduce((n,s)=> n+oppmoteAv(s), 0);

  // 3) Hvem er borte.
  const intro=list.filter(m=>{
    if(m.kategori!=='Introkurs') return false;
    const d=mrDagerSiden(m.oppmote && m.oppmote.sisteOppmote);
    return d==null || d>=introUker*7;
  }).sort((a,b)=> (mrDagerSiden(b.oppmote && b.oppmote.sisteOppmote)||9999) - (mrDagerSiden(a.oppmote && a.oppmote.sisteOppmote)||9999));

  const stille=list.filter(m=>{
    if(m.kategori==='Introkurs') return false;   // dekkes av intro-lista over
    const d=mrDagerSiden(m.oppmote && m.oppmote.sisteOppmote);
    return d!=null && d>=stilleUker*7;
  }).sort((a,b)=> mrDagerSiden(b.oppmote.sisteOppmote) - mrDagerSiden(a.oppmote.sisteOppmote));

  // 4) Gradering.
  const gradertNa=[];
  list.forEach(m=>{
    ((m.grading && m.grading.history) || []).forEach(e=>{
      if(e.kind==='innmelding') return;
      if(String(e.date||'').slice(0,7)!==ym) return;
      gradertNa.push({ navn:mrNavn(m), kategori:m.kategori, dato:e.date,
        belt:e.belt, stripes:Number(e.stripes||0), kind:e.kind, by:e.by, note:e.note });
    });
  });
  gradertNa.sort((a,b)=> String(a.dato).localeCompare(String(b.dato)));

  // Aktivitet siden sist gradering + tre siste måneder som trend.
  const trendMnd=[mrForrige(ym,2), mrForrige(ym,1), ym];
  const attFrom=(live && live.attFrom) || '';
  const attFromYm=MR_ISO.test(attFrom) ? attFrom.slice(0,7) : '';
  const aktivitet=list.map(m=>{
    const sist=mrSistGradert(m);
    const sortBelte=((m.grading && m.grading.current && m.grading.current.belt)||'')==='Sort';
    // Ble de gradert før oppmøtedataene starter, er tallet et GULV, ikke en
    // fasit: vi teller bare fra der dataene begynner. Uten dette merket ser
    // «95» ut som 95 økter siden gradering, når det egentlig er 95 økter
    // siden registeret begynte å føre oppmøte.
    const avkortet=!!(attFromYm && (!sist || sist.slice(0,7) < attFromYm));
    return {
      id:m.id, navn:mrNavn(m), kategori:m.kategori, belte:mrBelteTekst(m),
      sistGradert:sist, sidenTekst: sist? mrSiden(sist) : 'aldri gradert',
      okterSiden: mrOkterSiden(live, m.id, sist, ym),
      trend: trendMnd.map(t => mrMnd(live, m.id, t)),
      sortBelte, avkortet,
    };
  }).filter(r => r.okterSiden>0 && !r.sortBelte)
    .sort((a,b)=> b.okterSiden - a.okterSiden);

  // Terskelen tegnes som en referanselinje i den samme tabellen — ikke som en
  // egen «klare nå»-liste. Vurderingen er trenernes.
  const overTerskel = aktivitet.filter(r =>
    r.okterSiden>=gradMinOppmote && mrDagerSiden(r.sistGradert)!=null && mrDagerSiden(r.sistGradert)>=gradMinMnd*30).length;

  return {
    ym, forrige, trendMnd,
    okter, oppmoterTot, utenTall, medTall: medTall.length,
    snitt: medTall.length ? oppmoterTot/medTall.length : 0,
    gruppeListe, unike, unikeForrige,
    okterForrige: okterF.length, oppmoterForrige: oppmoterF,
    snittForrige: medTallF.length ? oppmoterF/medTallF.length : 0,
    intro, stille,
    gradertNa, aktivitet, overTerskel,
    gradMinOppmote, gradMinMnd, stilleUker, introUker,
    attFrom: (live && live.attFrom) || '',
    umatchede: (live && live.unmatched) || 0,
    sluttet: (departed && departed.total) || 0,
    byId,
  };
}

/* ---------- HTML ---------- */
function buildManedsrapportHTML(d){
  const e=mrEsc;
  const pil=(na,for_)=>{
    if(!for_) return '';
    const diff=na-for_;
    if(diff===0) return '<span class="flat">uendret</span>';
    const kl=diff>0?'up':'down';
    return `<span class="${kl}">${diff>0?'▲':'▼'} ${Math.abs(Math.round(diff*10)/10)} mot forrige mnd</span>`;
  };
  const nf=n=>new Intl.NumberFormat('nb-NO').format(Math.round(n));

  const oktRader=d.okter.map(s=>{
    const a=(s.attendance==null||s.attendance==='')?null:Number(s.attendance);
    return `<tr${a==null?' class="mangler"':''}><td>${e(mrDagMnd(s.date))}</td><td class="dim">${e(s.time||'')}</td>` +
      `<td>${e(s.group||'—')}</td><td>${e(s.title||'')}</td><td class="dim">${e(s.trainer||'')}</td>` +
      `<td class="num">${a==null?'<span class="mangel">ikke ført</span>':nf(a)}</td></tr>`;
  }).join('');

  const gruppeRader=d.gruppeListe.map(g=>
    `<tr><td><strong>${e(g.gruppe)}</strong></td><td class="num">${g.okter}</td>` +
    `<td class="num">${nf(g.oppmoter)}</td><td class="num">${g.snitt.toFixed(1)}</td></tr>`).join('');

  const bortRader=(rows,vis)=>rows.map(m=>
    `<tr><td><strong>${e(mrNavn(m))}</strong></td><td class="dim">${e(m.kategori||'')}</td>` +
    `<td class="dim">${e((m.grading&&m.grading.current&&m.grading.current.belt)||'')}</td>` +
    `<td class="num dim">${e(vis(m))}</td></tr>`).join('');

  const gradRader=d.gradertNa.map(g=>
    `<tr><td>${e(mrDagMnd(g.dato))}</td><td><strong>${e(g.navn)}</strong></td>` +
    `<td class="dim">${e(g.kategori||'')}</td>` +
    `<td>${e(g.belt)}${g.stripes>0?' '+'●'.repeat(Math.min(g.stripes,4)):''}</td>` +
    `<td class="dim">${e(g.kind==='belte'?'nytt belte':'stripe')}</td>` +
    `<td class="dim">${e(g.by||'')}</td></tr>`).join('');

  // Terskellinja legges inn etter siste rad som er over terskelen.
  const trendHead=d.trendMnd.map(t=>`<th class="num">${MR_MND_K[parseInt(t.slice(5,7),10)-1]}</th>`).join('');
  // Hele registeret ville gitt 100+ rader der halen er folk med 1–2 økter.
  // Vis de mest aktive — men aldri færre enn alle som ligger over terskelen,
  // ellers ville linja hatt rader under seg som ikke var med.
  const AKT_MAKS=30;
  const aktVis=Math.max(AKT_MAKS, d.overTerskel);
  const aktRest=Math.max(0, d.aktivitet.length-aktVis);
  let aktRader='';
  d.aktivitet.slice(0, aktVis).forEach((r,i)=>{
    if(i===d.overTerskel && d.overTerskel>0){
      aktRader+=`<tr class="terskel"><td colspan="7">Terskel: ${d.gradMinOppmote} økter og ${d.gradMinMnd} mnd siden sist gradering — en referanselinje, ikke en anbefaling</td></tr>`;
    }
    aktRader+=`<tr><td><strong>${e(r.navn)}</strong></td><td class="dim">${e(r.kategori||'')}</td>` +
      `<td>${e(r.belte)}</td><td class="dim">${e(r.sidenTekst)}</td>` +
      `<td class="num">${r.avkortet?'<span class="gulv" title="Gradert før oppmøtedataene starter — minst så mange">≥</span> ':''}${nf(r.okterSiden)}</td>` +
      r.trend.map(v=>`<td class="num dim">${v||'–'}</td>`).join('') + '</tr>';
  });

  const advarsler=[];
  if(d.utenTall>0) advarsler.push(`${d.utenTall} ${d.utenTall===1?'økt':'økter'} mangler oppmøtetall — de teller ikke i snittet.`);
  if(d.umatchede>0) advarsler.push(`${d.umatchede} oppmøter er ikke koblet til registeret og mangler i tallene pr. medlem. Kjør avstemmingen før neste rapport.`);

  return `<!DOCTYPE html><html lang="nb"><head><meta charset="utf-8">
<title>Månedsrapport ${e(mrMndNavn(d.ym))} — Bodø Jiu Jitsu</title>
<style>
  :root{ --accent:#7B6EF6; --green:#34B98C; --coral:#F2825F; --blue:#4F9BEA; --ink:#232136; --mut:#8A86A0; --rule:#ECEAF4; }
  *{ margin:0; padding:0; box-sizing:border-box; }
  body{ font-family:'Plus Jakarta Sans', system-ui, -apple-system, sans-serif; color:var(--ink); padding:72px 52px 44px; max-width:900px; margin:0 auto; }
  header{ display:flex; justify-content:space-between; align-items:flex-end; border-bottom:3px solid var(--accent); padding-bottom:18px; }
  h1{ font-size:30px; letter-spacing:-0.02em; } h1 small{ display:block; font-size:12px; color:var(--mut); font-weight:600; letter-spacing:.14em; text-transform:uppercase; margin-bottom:6px; }
  .gen{ font-size:11px; color:var(--mut); text-align:right; line-height:1.6; }
  h2{ font-size:15px; margin:0 0 12px; } h2 small{ color:var(--mut); font-weight:500; font-size:11px; margin-left:8px; }
  .sec{ margin-top:30px; page-break-inside:avoid; }
  .brk{ page-break-before:always; }
  .kpis{ display:grid; grid-template-columns:repeat(auto-fit,minmax(150px,1fr)); gap:12px; }
  .kpi{ border:1px solid var(--rule); border-radius:12px; padding:14px 16px; }
  .kv{ font-size:24px; font-weight:800; } .kl{ font-size:10.5px; color:var(--mut); text-transform:uppercase; letter-spacing:.08em; margin-top:4px; }
  .kd{ font-size:10.5px; margin-top:6px; font-weight:700; }
  .up{ color:var(--green); } .down{ color:var(--coral); } .flat{ color:var(--mut); font-weight:600; }
  table{ width:100%; border-collapse:collapse; font-size:12.5px; }
  th{ text-align:left; font-size:10px; color:var(--mut); text-transform:uppercase; letter-spacing:.1em; padding:6px 8px; border-bottom:1px solid var(--rule); }
  td{ padding:6px 8px; border-bottom:1px solid var(--rule); } .num{ text-align:right; font-weight:700; } .dim{ color:var(--mut); font-weight:400; }
  tr.mangler td{ background:#FFF8F4; } .mangel{ color:var(--coral); font-weight:700; font-size:11px; }
  .gulv{ color:var(--accent); font-weight:800; }
  tr.terskel td{ background:#F7F6FD; color:var(--accent); font-size:10.5px; font-weight:700; text-align:center; letter-spacing:.04em; padding:7px; }
  .note{ font-size:11px; color:var(--mut); line-height:1.65; margin-top:10px; }
  .varsel{ border:1px solid #F2C9B5; background:#FFF8F4; border-radius:10px; padding:12px 14px; font-size:11.5px; line-height:1.7; margin-top:14px; }
  .varsel strong{ color:var(--coral); }
  .tom{ font-size:12px; color:var(--mut); padding:10px 0; }
  footer{ margin-top:36px; padding-top:12px; border-top:1px solid var(--rule); font-size:10.5px; color:var(--mut); display:flex; justify-content:space-between; }
  .printbtn{ position:fixed; top:16px; right:16px; background:var(--accent); color:#fff; border:none; border-radius:10px; padding:11px 18px; font:700 13px 'Plus Jakarta Sans',system-ui; cursor:pointer; }
  @media print{ .printbtn{ display:none; } body{ padding:10mm 8mm; max-width:none; } }
</style></head><body>
<button class="printbtn" onclick="window.print()">Skriv ut / lagre PDF</button>

<header>
  <h1><small>Månedsrapport · instruktører</small>${e(mrMndNavn(d.ym))}</h1>
  <div class="gen">Bodø Jiu Jitsu<br>Generert ${new Date().toLocaleDateString('nb-NO')}<br>løft.app/dashboard</div>
</header>

<div class="sec">
  <div class="kpis">
    <div class="kpi"><div class="kv">${nf(d.okter.length)}</div><div class="kl">økter holdt</div><div class="kd">${pil(d.okter.length, d.okterForrige)}</div></div>
    <div class="kpi"><div class="kv">${nf(d.oppmoterTot)}</div><div class="kl">oppmøter</div><div class="kd">${pil(d.oppmoterTot, d.oppmoterForrige)}</div></div>
    <div class="kpi"><div class="kv">${d.snitt.toFixed(1)}</div><div class="kl">snitt pr. økt</div><div class="kd">${pil(d.snitt, d.snittForrige)}</div></div>
    <div class="kpi"><div class="kv">${nf(d.unike)}</div><div class="kl">innom matta</div><div class="kd">${pil(d.unike, d.unikeForrige)}</div></div>
  </div>
  ${advarsler.length? `<div class="varsel"><strong>Merk:</strong> ${advarsler.map(e).join(' ')}</div>`:''}
</div>

<div class="sec">
  <h2>Pr. gruppe</h2>
  ${gruppeRader
    ? `<table><thead><tr><th>Gruppe</th><th class="num">Økter</th><th class="num">Oppmøter</th><th class="num">Snitt</th></tr></thead><tbody>${gruppeRader}</tbody></table>`
    : '<div class="tom">Ingen økter registrert denne måneden.</div>'}
</div>

<div class="sec brk">
  <h2>Oppmøte pr. økt <small>${d.okter.length} økter</small></h2>
  ${oktRader
    ? `<table><thead><tr><th>Dato</th><th>Tid</th><th>Gruppe</th><th>Økt</th><th>Trener</th><th class="num">Oppmøte</th></tr></thead><tbody>${oktRader}</tbody></table>`
    : '<div class="tom">Ingen økter registrert denne måneden.</div>'}
  ${d.utenTall>0? `<div class="note">Rader med lys bakgrunn mangler oppmøtetall. De er talt som avholdte økter, men holdes utenfor snittet.</div>`:''}
</div>

<div class="sec brk">
  <h2>Intro-oppfølging <small>ikke møtt på ${d.introUker} uker eller mer</small></h2>
  ${d.intro.length
    ? `<table><thead><tr><th>Navn</th><th>Kategori</th><th>Belte</th><th class="num">Sist sett</th></tr></thead><tbody>${bortRader(d.intro, m=>mrSiden(m.oppmote && m.oppmote.sisteOppmote))}</tbody></table>`
    : '<div class="tom">Ingen introdeltakere som trenger oppfølging.</div>'}
</div>

<div class="sec">
  <h2>Stille medlemmer <small>ikke sett på ${d.stilleUker} uker eller mer</small></h2>
  ${d.stille.length
    ? `<table><thead><tr><th>Navn</th><th>Kategori</th><th>Belte</th><th class="num">Sist sett</th></tr></thead><tbody>${bortRader(d.stille, m=>mrSiden(m.oppmote.sisteOppmote))}</tbody></table>`
    : '<div class="tom">Ingen over terskelen — eller oppmøtedata mangler ennå.</div>'}
  <div class="note">Medlemmer uten registrert oppmøte i det hele tatt er utelatt: det er et hull i dataene, ikke et fravær.</div>
</div>

<div class="sec brk">
  <h2>Gradert i ${e(mrMndNavn(d.ym))}</h2>
  ${gradRader
    ? `<table><thead><tr><th>Dato</th><th>Navn</th><th>Kategori</th><th>Til</th><th>Type</th><th>Av</th></tr></thead><tbody>${gradRader}</tbody></table>`
    : '<div class="tom">Ingen graderinger registrert denne måneden.</div>'}
</div>

<div class="sec">
  <h2>Aktivitet siden sist gradering <small>sortert på flest økter</small></h2>
  ${aktRader
    ? `<table><thead><tr><th>Navn</th><th>Kategori</th><th>Belte nå</th><th>Sist gradert</th><th class="num">Økter siden${d.attFrom? ' (tidligst '+e(MR_MND_K[parseInt(d.attFrom.slice(5,7),10)-1]+' '+d.attFrom.slice(0,4))+')':''}</th>${trendHead}</tr></thead><tbody>${aktRader}</tbody></table>`
    : '<div class="tom">Ingen oppmøtedata å vise ennå.</div>'}
  ${aktRest>0? `<div class="note">Viser de ${aktVis} mest aktive. ${aktRest} medlemmer med færre økter er utelatt.</div>`:''}
  <div class="note">
    De tre siste kolonnene er oppmøte pr. måned — trenden bak totalen. 60 økter med kurven opp er noe annet enn 60 med kurven ned.
    ${d.attFrom? `Oppmøtedataene starter ${e(mrDagMnd(d.attFrom))} ${e(d.attFrom.slice(0,4))}. Rader merket <strong>≥</strong> ble gradert før det: tallet er alt vi har data for, ikke alt de har trent — det ekte tallet er høyere.` : ''}
    Sortbelter er utelatt. Rapporten tar ingen stilling til hvem som bør graderes — det er trenernes vurdering.
  </div>
</div>

<footer><span>Bodø Jiu Jitsu · instruktørrapport · ${e(mrMndNavn(d.ym))}</span><span>Navn forkortes til fornavn og forbokstav</span></footer>
</body></html>`;
}

function openManedsrapport(d){
  const w=window.open('', '_blank');
  if(!w){ alert('Nettleseren blokkerte rapport-vinduet — tillat popups for løft.app.'); return; }
  w.document.write(buildManedsrapportHTML(d));
  w.document.close();
}

/* ---------- Knapp + månedsvelger ---------- */
function ManedsrapportKnapp({ members, live, departed, terskler }){
  const [apen, setApen]=useMr(false);
  const [ym, setYm]=useMr(()=>{
    // Standard: forrige måned. Rapporten kjøres typisk den 1.
    const d=new Date();
    return new Date(Date.UTC(d.getFullYear(), d.getMonth()-1, 1)).toISOString().slice(0,7);
  });
  const [sessions, setSessions]=useMr(null);
  const [feil, setFeil]=useMr('');

  React.useEffect(()=>{
    if(!apen || sessions) return;
    if(typeof DASH_API.fetchCalendar !== 'function'){ setFeil('Kalender-ruten mangler — last siden på nytt (Ctrl/Cmd+F5).'); return; }
    DASH_API.fetchCalendar()
      .then(c => setSessions((c && c.sessions) || []))
      .catch(err => setFeil('Kunne ikke hente øktene: ' + err.message));
  }, [apen, sessions]);

  // Månedene det finnes økter for, nyeste først — pluss inneværende og forrige
  // så velgeren aldri står tom.
  const valg=React.useMemo(()=>{
    const set={};
    (sessions||[]).forEach(s=>{ if(MR_ISO.test(s.date||'')) set[s.date.slice(0,7)]=true; });
    const d=new Date();
    set[new Date(Date.UTC(d.getFullYear(), d.getMonth(), 1)).toISOString().slice(0,7)]=true;
    set[new Date(Date.UTC(d.getFullYear(), d.getMonth()-1, 1)).toISOString().slice(0,7)]=true;
    return Object.keys(set).sort().reverse().slice(0,24);
  }, [sessions]);

  function lag(){
    const d=buildManedsrapportData(ym, members, sessions||[], live, departed, terskler);
    openManedsrapport(d);
  }

  return (
    <>
      <button className="btn outline sm" title="Månedsrapport til instruktører — åpnes i eget vindu"
        onClick={()=>setApen(true)}>⤓ Månedsrapport</button>
      {apen && (
        <div className="modal-backdrop" onClick={()=>setApen(false)}>
          <div className="modal" onClick={ev=>ev.stopPropagation()}>
            <div className="modal-head">
              <div><div className="modal-kicker">Eksport</div>
                <div className="modal-title">Månedsrapport til instruktører</div></div>
              <button className="icon-btn" onClick={()=>setApen(false)} aria-label="Lukk">✕</button>
            </div>
            <div className="dlg-body">
              <div className="dim" style={{fontSize:12, lineHeight:1.7, marginBottom:14}}>
                Aktivitet, oppmøte pr. økt, hvem som ikke har vært innom, og gradering.
                Åpnes i eget vindu — skriv ut eller lagre som PDF derfra.
                Alle navngis som «Fornavn E.».
              </div>
              {feil && <div className="dim" style={{fontSize:12, color:'var(--coral)', marginBottom:12}}>{feil}</div>}
              {!sessions && !feil && <div className="dim" style={{fontSize:12}}>Henter økter …</div>}
              {sessions && (
                <>
                  <label style={{fontSize:11, textTransform:'uppercase', letterSpacing:'.12em', color:'var(--text-mut)'}}>Måned</label>
                  <select value={ym} onChange={ev=>setYm(ev.target.value)}
                    style={{width:'100%', margin:'6px 0 16px', padding:'9px 10px', fontSize:13,
                      border:'1px solid var(--border)', borderRadius:8, background:'var(--surface)', color:'var(--text)'}}>
                    {valg.map(v => <option key={v} value={v}>{mrMndNavn(v)}</option>)}
                  </select>
                  <button className="btn primary" onClick={lag}>Åpne rapport</button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

Object.assign(window, { ManedsrapportKnapp, buildManedsrapportData, buildManedsrapportHTML, mrNavn });
