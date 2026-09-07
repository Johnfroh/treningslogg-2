/* Rapportmotor — bygger en utskriftsvennlig rapport av valgte seksjoner over
   en valgt periode. Åpnes i eget vindu og skrives ut / lagres som PDF.
   UI-en ligger i data-panel.jsx; denne fila regner og rendrer.

   Personvern: rapporten er en fil som sendes videre, så ALLE navngis som
   «Fornavn E.» — også voksne. Mindreårige er dessuten maskert i api.js før
   dataene kommer hit. mrNavn() klarer aldri å skrive ut et helt etternavn,
   uansett hvilken kilde navnet kommer fra.

   Periodegranularitet er KALENDERMÅNED. Økonomi lagres pr. måned og oppmøte
   pr. medlem likeså; en dag-presis periode ville gitt tall som ikke summerer
   opp mot det brukeren ba om. Øktlista er dag-eksakt inne i perioden. */
const { useState: useMr } = React;

const MR_MND = ['januar','februar','mars','april','mai','juni','juli','august','september','oktober','november','desember'];
const MR_MND_K = ['jan','feb','mar','apr','mai','jun','jul','aug','sep','okt','nov','des'];
const MR_ISO = /^\d{4}-\d{2}-\d{2}$/;
// Med capture-grupper: mrSkyv/mrMndNavn leser m[1] og m[2]. Uten dem er begge
// undefined, og Date.UTC(NaN, NaN) kaster «Invalid time value».
const MR_YM = /^(\d{4})-(\d{2})$/;

function mrEsc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function mrMndNavn(ym){ const m=MR_YM.exec(String(ym||'')); return m? MR_MND[+m[2]-1]+' '+m[1] : String(ym||''); }
function mrMndKort(ym){ const m=MR_YM.exec(String(ym||'')); return m? MR_MND_K[+m[2]-1]+' '+m[1] : String(ym||''); }
// Legg til n måneder på en 'YYYY-MM' (n kan være negativ).
function mrSkyv(ym, n){
  const m=MR_YM.exec(String(ym||'')); if(!m) return '';
  return new Date(Date.UTC(+m[1], +m[2]-1+(n||0), 1)).toISOString().slice(0,7);
}
function mrMndListe(fra, til){
  if(!MR_YM.test(fra||'') || !MR_YM.test(til||'') || fra>til) return [];
  const ut=[]; let x=fra;
  while(x<=til && ut.length<240){ ut.push(x); x=mrSkyv(x,1); }
  return ut;
}
function mrPeriodeNavn(fra, til){
  if(fra===til) return mrMndNavn(fra);
  return mrMndKort(fra)+' – '+mrMndKort(til);
}
function mrDagMnd(iso){
  if(!MR_ISO.test(iso||'')) return String(iso||'');
  return parseInt(iso.slice(8,10),10)+'. '+MR_MND_K[parseInt(iso.slice(5,7),10)-1];
}
// «Fornavn E.» — for alle. Klarer aldri å skrive ut et helt etternavn: der
// bare et sammensatt navn finnes (f.eks. avgangsrader), kortes siste ledd.
function mrNavn(m){
  if(!m) return 'Ukjent';
  const hele=String(m.navn||'').trim();
  const deler=hele? hele.split(/\s+/) : [];
  const fornavn=(m.fornavn||'').trim() || deler[0] || 'Medlem';
  const etter=(m.etternavn||'').trim() || (deler.length>1 ? deler[deler.length-1] : '');
  const init=(m.initial||'').trim() || (etter ? etter.charAt(0).toUpperCase()+'.' : '');
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
// Klubbregel i Bodø JJ: striper gis til hvitt belte og til samtlige barn
// (junior-beltene, der stripene er hele progresjonen). Fargede voksenbelter —
// blå og oppover — får ikke striper her, og ville bare stått som «0 striper,
// aldri» og druknet lista.
function mrFaarStriper(belt){
  if(!belt || belt==='Hvit') return true;
  return isJuniorBelt(belt);
}
// Siste stripe og siste beltegradering hver for seg. Har man ingen striper
// ennå, er det beltedatoen som er «siden»-punktet — ikke innmeldingen, med
// mindre vi mangler beltedato også.
function mrStripeInfo(m){
  const h=(m.grading && m.grading.history) || [];
  const sortert=h.filter(e=>MR_ISO.test(e.date||''))
    .slice().sort((a,b)=> a.date===b.date ? (a._seq||0)-(b._seq||0) : a.date.localeCompare(b.date));
  let sisteStripe='', sisteBelte='', innmeldt='';
  sortert.forEach(e=>{
    if(e.kind==='stripe') sisteStripe=e.date;
    else if(e.kind==='belte') sisteBelte=e.date;
    else if(e.kind==='innmelding' && !innmeldt) innmeldt=e.date;
  });
  const cur=(m.grading && m.grading.current) || {};
  const fra = sisteStripe || sisteBelte || innmeldt || (MR_ISO.test(cur.since||'')? cur.since : '');
  return {
    sisteStripe, sisteBelte, innmeldt, fra,
    grunn: sisteStripe? 'stripe' : (sisteBelte? 'belte' : (innmeldt? 'innmelding' : 'ukjent')),
  };
}
function mrMnd(live, id, ym){
  const mm=(live && live.memberMonthly && live.memberMonthly[id]) || null;
  return mm ? (mm[ym]||0) : 0;
}
// Oppmøter for ett medlem fra en dato til og med en måned. Oppløsningen er
// kalendermåned, så måneden graderingen skjedde i tas med i sin helhet — å
// utelate den ville underrapportert alle som ble gradert tidlig i en måned.
// Øvre grense hindrer at en augustrapport teller september med.
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

/* ---------- Seksjoner ----------
   `periode: true`  → følger den valgte perioden
   `periode: false` → øyeblikksbilde, alltid «slik det ser ut i dag».
   Skillet er ekte: medlemsregisteret overskrives ved hver import, så vi kan
   ikke vite hvordan beltefordelingen så ut i mars. Panelet grupperer etter
   dette, så et datofilter aldri ser ut til å gjelde noe det ikke gjelder. */
const RAPPORT_SEKSJONER = [
  { key:'tall',     gruppe:'Aktivitet',  navn:'Nøkkeltall',                    periode:true },
  { key:'grupper',  gruppe:'Aktivitet',  navn:'Pr. gruppe',                    periode:true },
  { key:'okter',    gruppe:'Aktivitet',  navn:'Oppmøte pr. økt',               periode:true },
  { key:'gradert',  gruppe:'Gradering',  navn:'Gradert i perioden',            periode:true },
  { key:'aktivitet',gruppe:'Gradering',  navn:'Aktivitet siden sist gradering',periode:true },
  { key:'sluttet',  gruppe:'Oppfølging', navn:'Sluttet i perioden',            periode:true },
  { key:'okonomi',  gruppe:'Økonomi',    navn:'Inntekt pr. måned',             periode:true,  styre:true },
  { key:'intro',    gruppe:'Oppfølging', navn:'Intro-oppfølging',              periode:false },
  { key:'stille',   gruppe:'Oppfølging', navn:'Stille medlemmer',              periode:false },
  { key:'striper',  gruppe:'Gradering',  navn:'Striper — komplett liste',      periode:false },
  { key:'sammens',  gruppe:'Medlemmer',  navn:'Sammensetning, alder og kjønn', periode:false },
  { key:'belter',   gruppe:'Medlemmer',  navn:'Beltefordeling',                periode:false },
  { key:'geografi', gruppe:'Medlemmer',  navn:'Geografi',                      periode:false },
  { key:'pris',     gruppe:'Økonomi',    navn:'Inntekt pr. medlemstype',       periode:false, styre:true },
];
// Forhåndsvalg, så ingen trenger å krysse av tolv bokser hver måned.
const RAPPORT_PRESETS = [
  { key:'trener', navn:'Trenerrapport', periode:'forrige',
    hint:'Forrige måned · aktivitet, oppfølging og gradering',
    seksjoner:['tall','grupper','okter','intro','stille','sluttet','gradert','aktivitet'] },
  { key:'aar', navn:'Årsrapport', periode:'iaar',
    hint:'Hittil i år · medlemmer, aktivitet og økonomi',
    seksjoner:['tall','grupper','sammens','belter','geografi','gradert','okonomi','pris'] },
  { key:'striper', navn:'Stripeliste', periode:'denne',
    hint:'Alle som får striper · antall og tid siden forrige',
    seksjoner:['striper'] },
];
// Periodevalg → {fra, til} i 'YYYY-MM'.
function mrPeriode(valg, egenFra, egenTil){
  const na=new Date().toISOString().slice(0,7);
  switch(valg){
    case 'denne':   return { fra:na, til:na };
    case 'forrige': { const f=mrSkyv(na,-1); return { fra:f, til:f }; }
    case 'tre':     return { fra:mrSkyv(na,-2), til:na };
    case 'seks':    return { fra:mrSkyv(na,-5), til:na };
    case 'iaar':    return { fra:na.slice(0,4)+'-01', til:na };
    case 'ifjor':   { const y=String(Number(na.slice(0,4))-1); return { fra:y+'-01', til:y+'-12' }; }
    default:        return { fra:egenFra||na, til:egenTil||na };
  }
}

/* ---------- Datagrunnlag ---------- */
function buildRapportData(fra, til, ctx){
  const c=ctx||{};
  const th=c.terskler||{};
  const stilleUker=th.stilleUker||3, introUker=th.introUker||2;
  const gradMinOppmote=th.gradMinOppmote||30, gradMinMnd=th.gradMinMnd||6;
  const list=c.members||[];
  const live=c.live||null;
  const kpis=c.kpis||null;
  const mnd=mrMndListe(fra, til);
  const antMnd=Math.max(1, mnd.length);
  // Sammenligningsperiode: like mange måneder rett før.
  const fFra=mrSkyv(fra, -antMnd), fTil=mrSkyv(fra, -1);
  const iPeriode = ym => ym>=fra && ym<=til;

  // --- Økter (dag-eksakt inne i perioden) ---
  const oppmoteAv = s => (s.attendance==null || s.attendance==='') ? null : Number(s.attendance);
  const alle=(c.sessions||[]).filter(s => MR_ISO.test(s.date||''));
  const okter=alle.filter(s => iPeriode(s.date.slice(0,7)))
    .sort((a,b)=> a.date===b.date ? String(a.time||'').localeCompare(String(b.time||'')) : a.date.localeCompare(b.date));
  const medTall=okter.filter(s => oppmoteAv(s)!=null);
  const oppmoterTot=medTall.reduce((n,s)=> n+oppmoteAv(s), 0);
  const utenTall=okter.length-medTall.length;

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

  // Forrige periode, til pilene.
  const okterF=alle.filter(s => s.date.slice(0,7)>=fFra && s.date.slice(0,7)<=fTil);
  const medTallF=okterF.filter(s => oppmoteAv(s)!=null);
  const oppmoterF=medTallF.reduce((n,s)=> n+oppmoteAv(s), 0);

  // --- Unike innom matta ---
  const sumMnd=(id,ms)=> ms.reduce((n,ym)=> n+mrMnd(live,id,ym), 0);
  const mndF=mrMndListe(fFra, fTil);
  let unike=0, unikeF=0;
  list.forEach(m=>{
    if(sumMnd(m.id,mnd)>0) unike++;
    if(sumMnd(m.id,mndF)>0) unikeF++;
  });

  // --- Oppfølging (øyeblikksbilde) ---
  const intro=list.filter(m=>{
    if(m.kategori!=='Introkurs') return false;
    const d=mrDagerSiden(m.oppmote && m.oppmote.sisteOppmote);
    return d==null || d>=introUker*7;
  }).sort((a,b)=> (mrDagerSiden(b.oppmote && b.oppmote.sisteOppmote)||9999) - (mrDagerSiden(a.oppmote && a.oppmote.sisteOppmote)||9999));

  const stille=list.filter(m=>{
    if(m.kategori==='Introkurs') return false;   // dekkes av intro-lista
    const d=mrDagerSiden(m.oppmote && m.oppmote.sisteOppmote);
    return d!=null && d>=stilleUker*7;
  }).sort((a,b)=> mrDagerSiden(b.oppmote.sisteOppmote) - mrDagerSiden(a.oppmote.sisteOppmote));

  // --- Sluttet i perioden ---
  const dep=c.departed||null;
  const sluttet=((dep && dep.rows) || [])
    .filter(r => MR_ISO.test(r.sluttet||'') && iPeriode(r.sluttet.slice(0,7)))
    .sort((a,b)=> String(b.sluttet).localeCompare(String(a.sluttet)));
  const sluttetFra=(dep && dep.fra) || '';

  // --- Gradering ---
  const gradert=[];
  list.forEach(m=>{
    ((m.grading && m.grading.history) || []).forEach(e=>{
      if(e.kind==='innmelding') return;
      const d=String(e.date||'');
      if(!MR_ISO.test(d) || !iPeriode(d.slice(0,7))) return;
      gradert.push({ navn:mrNavn(m), kategori:m.kategori, dato:d,
        belt:e.belt, stripes:Number(e.stripes||0), kind:e.kind, by:e.by });
    });
  });
  gradert.sort((a,b)=> String(a.dato).localeCompare(String(b.dato)));

  // Trendkolonner: de tre siste månedene i perioden (færre om perioden er kort).
  const trendMnd=mnd.slice(-3);
  const attFrom=(live && live.attFrom) || '';
  const attFromYm=MR_ISO.test(attFrom) ? attFrom.slice(0,7) : '';
  const aktivitet=list.map(m=>{
    const sist=mrSistGradert(m);
    const sortBelte=((m.grading && m.grading.current && m.grading.current.belt)||'')==='Sort';
    // Gradert før oppmøtedataene starter → tallet er et GULV, ikke en fasit.
    const avkortet=!!(attFromYm && (!sist || sist.slice(0,7) < attFromYm));
    return {
      id:m.id, navn:mrNavn(m), kategori:m.kategori, belte:mrBelteTekst(m),
      sistGradert:sist, sidenTekst: sist? mrSiden(sist) : 'aldri gradert',
      okterSiden: mrOkterSiden(live, m.id, sist, til),
      trend: trendMnd.map(t => mrMnd(live, m.id, t)),
      sortBelte, avkortet,
    };
  }).filter(r => r.okterSiden>0 && !r.sortBelte)
    .sort((a,b)=> b.okterSiden - a.okterSiden);
  const overTerskel=aktivitet.filter(r =>
    r.okterSiden>=gradMinOppmote && mrDagerSiden(r.sistGradert)!=null && mrDagerSiden(r.sistGradert)>=gradMinMnd*30).length;

  // --- Striper: komplett liste over alle som får striper etter klubbregelen ---
  let utenStriper=0;
  const striper=list.map(m=>{
    const belt=(m.grading && m.grading.current && m.grading.current.belt) || 'Hvit';
    if(!mrFaarStriper(belt)){ utenStriper++; return null; }
    const info=mrStripeInfo(m);
    const ant=Number((m.grading && m.grading.current && m.grading.current.stripes) || 0);
    return {
      id:m.id, navn:mrNavn(m), kategori:m.kategori, belte:belt, antall:ant,
      sisteStripe:info.sisteStripe, fra:info.fra, grunn:info.grunn,
      dager: mrDagerSiden(info.fra),
      sidenTekst: info.fra? mrSiden(info.fra) : 'ukjent',
      okterSiden: mrOkterSiden(live, m.id, info.fra, til),
      avkortet: !!(attFromYm && (!info.fra || info.fra.slice(0,7) < attFromYm)),
    };
  }).filter(Boolean)
    // Lengst ventetid først — det er den rekkefølgen som er til å handle på.
    .sort((a,b)=> (b.dager==null?-1:b.dager) - (a.dager==null?-1:a.dager));

  // --- Økonomi pr. måned i perioden (kontingent + varesalg) ---
  const okM=(c.okonomi && c.okonomi.months) || {};
  const vipps=(c.vipps && c.vipps.months) || [];
  const okRader=mnd.map(ym=>{
    const kont=(okM[ym] && okM[ym].netto) || 0;
    let but=0, div=0;
    vipps.forEach(v=>{ if(v.month===ym){ if(v.stream==='butikk') but+=v.netto; else div+=v.netto; } });
    return { ym, kont, but, div, sum:kont+but+div };
  });
  const okSum=okRader.reduce((a,r)=>({kont:a.kont+r.kont, but:a.but+r.but, div:a.div+r.div, sum:a.sum+r.sum}),
    {kont:0,but:0,div:0,sum:0});

  return {
    fra, til, mnd, antMnd, periodeNavn: mrPeriodeNavn(fra, til),
    forrigeNavn: mrPeriodeNavn(fFra, fTil),
    okter, oppmoterTot, utenTall, medTall: medTall.length,
    snitt: medTall.length ? oppmoterTot/medTall.length : 0,
    gruppeListe, unike, unikeForrige: unikeF,
    okterForrige: okterF.length, oppmoterForrige: oppmoterF,
    snittForrige: medTallF.length ? oppmoterF/medTallF.length : 0,
    intro, stille, sluttet, sluttetFra,
    striper, utenStriper,
    gradert, aktivitet, overTerskel, trendMnd,
    gradMinOppmote, gradMinMnd, stilleUker, introUker,
    attFrom, umatchede: (live && live.unmatched) || 0,
    okRader, okSum, harOkonomi: Object.keys(okM).length>0 || vipps.length>0,
    kpis,
  };
}

/* ---------- HTML ---------- */
const mrNf = n => new Intl.NumberFormat('nb-NO').format(Math.round(n));

// Horisontale søylerader, skalert mot største verdi.
function mrBarRader(entries, farge){
  const max=Math.max(1, ...entries.map(([,v])=>v));
  return entries.map(([k,v]) =>
    `<div class="brow"><span class="bl">${mrEsc(k)}</span>` +
    `<span class="bt"><span class="bf" style="width:${Math.round(v/max*100)}%;background:${farge}"></span></span>` +
    `<span class="bv">${mrNf(v)}</span></div>`).join('');
}
function mrSeksjon(tittel, undertittel, innhold, brekk){
  return `<div class="sec${brekk?' brk':''}"><h2>${mrEsc(tittel)}` +
    (undertittel? `<small>${mrEsc(undertittel)}</small>`:'') + `</h2>${innhold}</div>`;
}
function mrTom(t){ return `<div class="tom">${mrEsc(t)}</div>`; }

// Én renderer pr. seksjon. Returnerer '' når seksjonen ikke er valgt, slik at
// rekkefølgen i rapporten er fast uansett hvilken rekkefølge man huket av i.
const MR_RENDER = {
  tall(d){
    const pil=(na,forr)=>{
      if(!forr) return '';
      const diff=na-forr;
      if(diff===0) return '<span class="flat">uendret</span>';
      return `<span class="${diff>0?'up':'down'}">${diff>0?'▲':'▼'} ${Math.abs(Math.round(diff*10)/10)} mot forrige periode</span>`;
    };
    const varsler=[];
    if(d.utenTall>0) varsler.push(`${d.utenTall} ${d.utenTall===1?'økt':'økter'} mangler oppmøtetall — de teller ikke i snittet.`);
    if(d.umatchede>0) varsler.push(`${d.umatchede} oppmøter er ikke koblet til registeret og mangler i tallene pr. medlem. Kjør avstemmingen før neste rapport.`);
    return `<div class="sec"><div class="kpis">
      <div class="kpi"><div class="kv">${mrNf(d.okter.length)}</div><div class="kl">økter holdt</div><div class="kd">${pil(d.okter.length,d.okterForrige)}</div></div>
      <div class="kpi"><div class="kv">${mrNf(d.oppmoterTot)}</div><div class="kl">oppmøter</div><div class="kd">${pil(d.oppmoterTot,d.oppmoterForrige)}</div></div>
      <div class="kpi"><div class="kv">${d.snitt.toFixed(1)}</div><div class="kl">snitt pr. økt</div><div class="kd">${pil(d.snitt,d.snittForrige)}</div></div>
      <div class="kpi"><div class="kv">${mrNf(d.unike)}</div><div class="kl">innom matta</div><div class="kd">${pil(d.unike,d.unikeForrige)}</div></div>
    </div>${varsler.length? `<div class="varsel"><strong>Merk:</strong> ${varsler.map(mrEsc).join(' ')}</div>`:''}</div>`;
  },
  grupper(d){
    if(!d.gruppeListe.length) return mrSeksjon('Pr. gruppe','',mrTom('Ingen økter i perioden.'));
    const rader=d.gruppeListe.map(g=>
      `<tr><td><strong>${mrEsc(g.gruppe)}</strong></td><td class="num">${g.okter}</td>` +
      `<td class="num">${mrNf(g.oppmoter)}</td><td class="num">${g.snitt.toFixed(1)}</td></tr>`).join('');
    return mrSeksjon('Pr. gruppe','',
      `<table><thead><tr><th>Gruppe</th><th class="num">Økter</th><th class="num">Oppmøter</th><th class="num">Snitt</th></tr></thead><tbody>${rader}</tbody></table>`);
  },
  okter(d){
    if(!d.okter.length) return mrSeksjon('Oppmøte pr. økt','',mrTom('Ingen økter i perioden.'), true);
    const rader=d.okter.map(s=>{
      const a=(s.attendance==null||s.attendance==='')?null:Number(s.attendance);
      return `<tr${a==null?' class="mangler"':''}><td>${mrEsc(mrDagMnd(s.date))}</td><td class="dim">${mrEsc(s.time||'')}</td>` +
        `<td>${mrEsc(s.group||'—')}</td><td>${mrEsc(s.title||'')}</td><td class="dim">${mrEsc(s.trainer||'')}</td>` +
        `<td class="num">${a==null?'<span class="mangel">ikke ført</span>':mrNf(a)}</td></tr>`;
    }).join('');
    return mrSeksjon('Oppmøte pr. økt', d.okter.length+' økter',
      `<table><thead><tr><th>Dato</th><th>Tid</th><th>Gruppe</th><th>Økt</th><th>Trener</th><th class="num">Oppmøte</th></tr></thead><tbody>${rader}</tbody></table>` +
      (d.utenTall>0? '<div class="note">Rader med lys bakgrunn mangler oppmøtetall. De er talt som avholdte økter, men holdes utenfor snittet.</div>':''), true);
  },
  intro(d){
    const rader=d.intro.map(m=>
      `<tr><td><strong>${mrEsc(mrNavn(m))}</strong></td><td class="dim">${mrEsc(m.kategori||'')}</td>` +
      `<td class="num dim">${mrEsc(mrSiden(m.oppmote && m.oppmote.sisteOppmote))}</td></tr>`).join('');
    return mrSeksjon('Intro-oppfølging', `ikke møtt på ${d.introUker} uker eller mer · per i dag`,
      rader? `<table><thead><tr><th>Navn</th><th>Kategori</th><th class="num">Sist sett</th></tr></thead><tbody>${rader}</tbody></table>`
           : mrTom('Ingen introdeltakere som trenger oppfølging.'), true);
  },
  stille(d){
    const rader=d.stille.map(m=>
      `<tr><td><strong>${mrEsc(mrNavn(m))}</strong></td><td class="dim">${mrEsc(m.kategori||'')}</td>` +
      `<td class="dim">${mrEsc((m.grading&&m.grading.current&&m.grading.current.belt)||'')}</td>` +
      `<td class="num dim">${mrEsc(mrSiden(m.oppmote.sisteOppmote))}</td></tr>`).join('');
    return mrSeksjon('Stille medlemmer', `ikke sett på ${d.stilleUker} uker eller mer · per i dag`,
      (rader? `<table><thead><tr><th>Navn</th><th>Kategori</th><th>Belte</th><th class="num">Sist sett</th></tr></thead><tbody>${rader}</tbody></table>`
            : mrTom('Ingen over terskelen — eller oppmøtedata mangler ennå.')) +
      '<div class="note">Medlemmer uten registrert oppmøte i det hele tatt er utelatt: det er et hull i dataene, ikke et fravær.</div>');
  },
  sluttet(d){
    const rader=d.sluttet.map(r=>
      `<tr><td>${mrEsc(mrDagMnd(r.sluttet))}</td><td><strong>${mrEsc(mrNavn(r))}</strong></td>` +
      `<td class="dim">${mrEsc(r.kategori||'')}</td>` +
      `<td class="num dim">${mrEsc(r.innmeldingsdato? mrSiden(r.innmeldingsdato).replace(' siden',''):'—')}</td></tr>`).join('');
    const note=d.sluttetFra
      ? `Avgang registreres fra ${mrEsc(mrDagMnd(d.sluttetFra))} ${mrEsc(String(d.sluttetFra).slice(0,4))}. Datoen er da medlemsimporten først savnet dem, ikke nødvendigvis dagen de sluttet.`
      : 'Avgang registreres først fra den medlemsimporten som kjøres etter at sporingen ble slått på. Lista fylles ut etter hvert.';
    return mrSeksjon('Sluttet i perioden','',
      (rader? `<table><thead><tr><th>Registrert</th><th>Navn</th><th>Kategori</th><th class="num">Var medlem i</th></tr></thead><tbody>${rader}</tbody></table>`
            : mrTom('Ingen registrert avgang i perioden.')) + `<div class="note">${note}</div>`);
  },
  gradert(d){
    const rader=d.gradert.map(g=>
      `<tr><td>${mrEsc(mrDagMnd(g.dato))}</td><td><strong>${mrEsc(g.navn)}</strong></td>` +
      `<td class="dim">${mrEsc(g.kategori||'')}</td>` +
      `<td>${mrEsc(g.belt)}${g.stripes>0?' '+'●'.repeat(Math.min(g.stripes,4)):''}</td>` +
      `<td class="dim">${mrEsc(g.kind==='belte'?'nytt belte':'stripe')}</td>` +
      `<td class="dim">${mrEsc(g.by||'')}</td></tr>`).join('');
    return mrSeksjon('Gradert i perioden','',
      rader? `<table><thead><tr><th>Dato</th><th>Navn</th><th>Kategori</th><th>Til</th><th>Type</th><th>Av</th></tr></thead><tbody>${rader}</tbody></table>`
           : mrTom('Ingen graderinger registrert i perioden.'), true);
  },
  aktivitet(d){
    if(!d.aktivitet.length) return mrSeksjon('Aktivitet siden sist gradering','',mrTom('Ingen oppmøtedata å vise ennå.'));
    const trendHead=d.trendMnd.map(t=>`<th class="num">${MR_MND_K[parseInt(t.slice(5,7),10)-1]}</th>`).join('');
    // Hele registeret ville gitt 100+ rader der halen er folk med 1–2 økter.
    // Aldri færre enn alle over terskelen, ellers hadde linja hatt rader under
    // seg som ikke var med.
    const vis=Math.max(30, d.overTerskel);
    const rest=Math.max(0, d.aktivitet.length-vis);
    let rader='';
    d.aktivitet.slice(0, vis).forEach((r,i)=>{
      if(i===d.overTerskel && d.overTerskel>0){
        rader+=`<tr class="terskel"><td colspan="${5+d.trendMnd.length}">Terskel: ${d.gradMinOppmote} økter og ${d.gradMinMnd} mnd siden sist gradering — en referanselinje, ikke en anbefaling</td></tr>`;
      }
      rader+=`<tr><td><strong>${mrEsc(r.navn)}</strong></td><td class="dim">${mrEsc(r.kategori||'')}</td>` +
        `<td>${mrEsc(r.belte)}</td><td class="dim">${mrEsc(r.sidenTekst)}</td>` +
        `<td class="num">${r.avkortet?'<span class="gulv" title="Gradert før oppmøtedataene starter — minst så mange">≥</span> ':''}${mrNf(r.okterSiden)}</td>` +
        r.trend.map(v=>`<td class="num dim">${v||'–'}</td>`).join('') + '</tr>';
    });
    const gulv=d.attFrom? ` (tidligst ${MR_MND_K[parseInt(d.attFrom.slice(5,7),10)-1]} ${d.attFrom.slice(0,4)})` : '';
    return mrSeksjon('Aktivitet siden sist gradering','sortert på flest økter',
      `<table><thead><tr><th>Navn</th><th>Kategori</th><th>Belte nå</th><th>Sist gradert</th>` +
      `<th class="num">Økter siden${mrEsc(gulv)}</th>${trendHead}</tr></thead><tbody>${rader}</tbody></table>` +
      (rest>0? `<div class="note">Viser de ${vis} mest aktive. ${rest} medlemmer med færre økter er utelatt.</div>`:'') +
      `<div class="note">De siste kolonnene er oppmøte pr. måned — trenden bak totalen. 60 økter med kurven opp er noe annet enn 60 med kurven ned.
        ${d.attFrom? `Oppmøtedataene starter ${mrEsc(mrDagMnd(d.attFrom))} ${mrEsc(d.attFrom.slice(0,4))}. Rader merket <strong>≥</strong> ble gradert før det: tallet er alt vi har data for, ikke alt de har trent — det ekte tallet er høyere.`:''}
        Sortbelter er utelatt. Rapporten tar ingen stilling til hvem som bør graderes — det er trenernes vurdering.</div>`);
  },
  striper(d){
    if(!d.striper.length) return mrSeksjon('Striper','komplett liste',mrTom('Ingen medlemmer får striper etter klubbregelen.'), true);
    const rader=d.striper.map(r=>{
      const prikker='●'.repeat(r.antall) + '○'.repeat(Math.max(0,4-r.antall));
      const siden = r.grunn==='stripe' ? mrEsc(r.sidenTekst)
        : `<span title="Har ikke fått stripe ennå — regnet fra ${r.grunn==='belte'?'beltegraderingen':'innmeldingen'}">${mrEsc(r.sidenTekst)} <span class="fra">(${r.grunn==='belte'?'belte':'innmeldt'})</span></span>`;
      return `<tr><td><strong>${mrEsc(r.navn)}</strong></td><td class="dim">${mrEsc(r.kategori||'')}</td>` +
        `<td class="dim">${mrEsc(r.belte)}</td>` +
        `<td class="prikk">${prikker}<span class="dim" style="margin-left:8px">${r.antall}/4</span></td>` +
        `<td class="dim">${r.sisteStripe? mrEsc(mrDagMnd(r.sisteStripe)+' '+r.sisteStripe.slice(0,4)) : '—'}</td>` +
        `<td class="num dim">${siden}</td>` +
        `<td class="num">${r.avkortet?'<span class="gulv" title="Referansedatoen er eldre enn oppmøtedataene — minst så mange">≥</span> ':''}${mrNf(r.okterSiden)}</td></tr>`;
    }).join('');
    return mrSeksjon('Striper', `komplett liste · ${d.striper.length} medlemmer · lengst siden først`,
      `<table><thead><tr><th>Navn</th><th>Kategori</th><th>Belte</th><th>Striper</th>` +
      `<th>Sist stripe</th><th class="num">Siden da</th><th class="num">Økter siden</th></tr></thead><tbody>${rader}</tbody></table>` +
      `<div class="note">
        Klubbregelen er lagt til grunn: striper gis til <strong>hvitt belte</strong> og til <strong>samtlige barn</strong>.
        ${d.utenStriper>0? `${d.utenStriper} medlemmer på blått belte eller høyere er utelatt — de får ikke striper her.`:''}
        Rader merket «belte» eller «innmeldt» har ikke fått stripe ennå; da er ventetiden regnet fra den datoen i stedet.
        ${d.attFrom? `Oppmøtedataene starter ${mrEsc(mrDagMnd(d.attFrom))} ${mrEsc(d.attFrom.slice(0,4))}, så «Økter siden» merket <strong>≥</strong> er et minimum.`:''}
        Lista tar ingen stilling til hvem som bør få stripe — det er trenernes vurdering.
      </div>`, true);
  },
  sammens(d){
    const k=d.kpis; if(!k) return '';
    const kj=k.byKjonn||{};
    return mrSeksjon('Sammensetning','per i dag',
      `<div class="two"><div><h3>Medlemstype</h3>${mrBarRader(Object.entries(k.byKategori||{}).sort((a,b)=>b[1]-a[1]),'var(--accent)')}
        <h3 style="margin-top:18px">Kjønn</h3>${mrBarRader([['Mann',kj.Mann||0],['Kvinne',kj.Kvinne||0],['Ukjent',kj.Ukjent||0]].filter(x=>x[1]),'var(--blue)')}</div>
      <div><h3>Alder</h3>${mrBarRader(Object.entries(k.byAgeBucket||{}).sort((a,b)=>b[1]-a[1]),'var(--green)')}</div></div>`, true);
  },
  belter(d){
    const k=d.kpis; if(!k) return '';
    const rekke=['Hvit','Grå/Hvit','Grå','Gul','Oransje','Grønn','Blå','Blått','Lilla','Brun','Sort'];
    const e=rekke.filter(b=>(k.byBelt||{})[b]).map(b=>[b,k.byBelt[b]]);
    if(!e.length) return mrSeksjon('Beltefordeling','per i dag',mrTom('Ingen graderinger registrert.'));
    const sum=e.reduce((n,x)=>n+x[1],0), hvit=(k.byBelt||{}).Hvit||0;
    return mrSeksjon('Beltefordeling','per i dag', mrBarRader(e,'var(--green)') +
      `<div class="note">${Math.round(hvit/sum*100)} % av ${sum} graderte medlemmer står på hvitt belte — ${sum-hvit} har farget belte.</div>`);
  },
  geografi(d){
    const k=d.kpis; if(!k) return '';
    const e=Object.entries(k.byPostnr||{}).sort((a,b)=>b[1]-a[1]).slice(0,15).map(([p,v])=>[p+' · Bodø',v]);
    return mrSeksjon('Geografi', e.length+' postnummer · kun voksne (barn er maskert)',
      e.length? mrBarRader(e,'var(--blue)') : mrTom('Ingen postnummer registrert.'));
  },
  okonomi(d){
    if(!d.harOkonomi) return mrSeksjon('Inntekt pr. måned','',mrTom('Ingen økonomidata importert.'), true);
    const rader=d.okRader.map(r=>
      `<tr><td>${mrEsc(mrMndKort(r.ym))}</td><td class="num">${mrNf(r.kont)}</td>` +
      `<td class="num">${mrNf(r.but)}</td><td class="num">${mrNf(r.div)}</td>` +
      `<td class="num">${mrNf(r.sum)}</td></tr>`).join('');
    return mrSeksjon('Inntekt pr. måned','netto · kontingent og varesalg',
      `<table><thead><tr><th>Måned</th><th class="num">Kontingent</th><th class="num">Butikk</th><th class="num">Diverse</th><th class="num">Sum</th></tr></thead>` +
      `<tbody>${rader}</tbody><tfoot><tr><td><strong>Sum</strong></td>` +
      `<td class="num">${mrNf(d.okSum.kont)}</td><td class="num">${mrNf(d.okSum.but)}</td>` +
      `<td class="num">${mrNf(d.okSum.div)}</td><td class="num">${mrNf(d.okSum.sum)}</td></tr></tfoot></table>` +
      '<div class="note">Alle tall i kroner, netto etter avgifter. «Diverse» er den gamle Vipps-strømmen med blandet varesalg.</div>', true);
  },
  pris(d){
    const k=d.kpis; if(!k) return '';
    const p=Object.entries(k.pricingBreakdown||{}).map(([t,i])=>({t, ...i})).sort((a,b)=>b.mrr-a.mrr);
    if(!p.length) return '';
    const rader=p.map(r=>
      `<tr><td>${mrEsc(r.t)}</td><td class="num">${r.count}</td>` +
      `<td class="num">${mrNf(r.monthly)}</td><td class="num">${mrNf(r.mrr)}</td></tr>`).join('');
    const t=k.totals||{};
    return mrSeksjon('Inntekt pr. medlemstype','per i dag',
      `<table><thead><tr><th>Medlemstype</th><th class="num">Antall</th><th class="num">Pr. mnd</th><th class="num">Sum/mnd</th></tr></thead>` +
      `<tbody>${rader}</tbody><tfoot><tr><td><strong>MRR</strong></td><td class="num">${mrNf(t.activeMembers||0)}</td>` +
      `<td class="num dim">—</td><td class="num">${mrNf(t.mrr||0)}</td></tr></tfoot></table>` +
      `<div class="note">ARR ≈ ${mrNf(t.arr||0)} kr. Beregnet fra medlemsregisteret slik det ser ut i dag, ikke fra faktiske innbetalinger.</div>`);
  },
};

/* ---------- CSV / Excel ----------
   Norsk Excel bruker semikolon som listeskille og komma som desimaltegn. En
   komma-separert fil havner i én eneste kolonne her, så vi bruker semikolon
   og BOM.

   CSV-en er MASKINVENNLIG, ikke en kopi av den trykte teksten: ISO-datoer,
   alder i hele dager som tall, og ingen ●-tegn. Poenget med et regneark er å
   kunne sortere og filtrere — «7 mnd siden» kan man ikke regne på. */
const MR_CSV_SEP = ';';
function mrCsvVerdi(v){
  if(v==null) return '';
  if(typeof v==='number') return isFinite(v)? String(v).replace('.', ',') : '';
  return String(v);
}
function mrCsvLinje(felt){
  return felt.map(v=>{
    const t=mrCsvVerdi(v);
    return /[";\r\n]/.test(t) ? '"'+t.replace(/"/g,'""')+'"' : t;
  }).join(MR_CSV_SEP);
}
const mrRund1 = n => Math.round((Number(n)||0)*10)/10;
const mrDato  = v => MR_ISO.test(v||'') ? v : '';
const mrSistSett = m => (m && m.oppmote && m.oppmote.sisteOppmote) || '';

// Én tabelldefinisjon pr. seksjon: kolonner + rader med rå verdier.
const MR_TABELL = {
  tall: d => ({
    kolonner:['Nøkkeltall','Perioden','Forrige periode'],
    rader:[
      ['Økter holdt', d.okter.length, d.okterForrige],
      ['Oppmøter', d.oppmoterTot, d.oppmoterForrige],
      ['Snitt pr. økt', mrRund1(d.snitt), mrRund1(d.snittForrige)],
      ['Innom matta', d.unike, d.unikeForrige],
      ['Økter uten ført oppmøte', d.utenTall, ''],
      ['Umatchede oppmøter', d.umatchede, ''],
    ],
  }),
  grupper: d => ({
    kolonner:['Gruppe','Økter','Oppmøter','Snitt pr. økt'],
    rader:d.gruppeListe.map(g=>[g.gruppe, g.okter, g.oppmoter, mrRund1(g.snitt)]),
  }),
  okter: d => ({
    kolonner:['Dato','Tid','Gruppe','Økt','Trener','Oppmøte'],
    rader:d.okter.map(o=>[mrDato(o.date), o.time||'', o.group||'', o.title||'', o.trainer||'',
      (o.attendance==null||o.attendance==='')? '' : Number(o.attendance)]),
  }),
  gradert: d => ({
    kolonner:['Dato','Navn','Kategori','Til belte','Striper','Type','Gradert av'],
    rader:d.gradert.map(g=>[mrDato(g.dato), g.navn, g.kategori||'', g.belt||'', g.stripes,
      g.kind==='belte'?'nytt belte':'stripe', g.by||'']),
  }),
  aktivitet: d => ({
    kolonner:['Navn','Kategori','Belte','Striper','Sist gradert','Dager siden gradering',
      'Økter siden','Er minimum'].concat(d.trendMnd.map(t=>'Økter '+t)),
    rader:d.aktivitet.map(r=>[r.navn, r.kategori||'', (r.belte||'').replace(/[●○]/g,'').trim(),
      (String(r.belte||'').match(/●/g)||[]).length, mrDato(r.sistGradert),
      mrDagerSiden(r.sistGradert), r.okterSiden, r.avkortet?'ja':'nei'].concat(r.trend)),
  }),
  sluttet: d => ({
    kolonner:['Registrert sluttet','Navn','Kategori','Innmeldt','Dager som medlem'],
    rader:d.sluttet.map(r=>{
      const inn=mrDato(r.innmeldingsdato), ut=mrDato(r.sluttet);
      const dager=(inn && ut)? Math.round((new Date(ut)-new Date(inn))/86400000) : '';
      return [ut, mrNavn(r), r.kategori||'', inn, dager];
    }),
  }),
  okonomi: d => ({
    kolonner:['Måned','Kontingent','Butikk','Diverse','Sum'],
    rader:d.okRader.map(r=>[r.ym, Math.round(r.kont), Math.round(r.but), Math.round(r.div), Math.round(r.sum)])
      .concat([['Sum', Math.round(d.okSum.kont), Math.round(d.okSum.but), Math.round(d.okSum.div), Math.round(d.okSum.sum)]]),
  }),
  intro: d => ({
    kolonner:['Navn','Kategori','Sist sett','Dager siden sist sett'],
    rader:d.intro.map(m=>[mrNavn(m), m.kategori||'', mrDato(mrSistSett(m)), mrDagerSiden(mrSistSett(m))]),
  }),
  stille: d => ({
    kolonner:['Navn','Kategori','Belte','Sist sett','Dager siden sist sett'],
    rader:d.stille.map(m=>[mrNavn(m), m.kategori||'',
      (m.grading && m.grading.current && m.grading.current.belt) || '',
      mrDato(mrSistSett(m)), mrDagerSiden(mrSistSett(m))]),
  }),
  striper: d => ({
    kolonner:['Navn','Kategori','Belte','Striper','Sist stripe','Målt fra','Dager siden',
      'Økter siden','Er minimum'],
    rader:d.striper.map(r=>[r.navn, r.kategori||'', r.belte, r.antall, mrDato(r.sisteStripe),
      r.grunn, r.dager, r.okterSiden, r.avkortet?'ja':'nei']),
  }),
  sammens: d => {
    const k=d.kpis||{};
    const rader=[];
    Object.entries(k.byKategori||{}).sort((a,b)=>b[1]-a[1]).forEach(([n,v])=>rader.push(['Medlemstype',n,v]));
    Object.entries(k.byAgeBucket||{}).sort((a,b)=>b[1]-a[1]).forEach(([n,v])=>rader.push(['Alder',n,v]));
    Object.entries(k.byKjonn||{}).forEach(([n,v])=>rader.push(['Kjønn',n,v]));
    return { kolonner:['Fordeling','Verdi','Antall'], rader };
  },
  belter: d => ({
    kolonner:['Belte','Antall'],
    rader:Object.entries((d.kpis||{}).byBelt||{}).sort((a,b)=>b[1]-a[1]),
  }),
  geografi: d => ({
    kolonner:['Postnummer','Antall'],
    rader:Object.entries((d.kpis||{}).byPostnr||{}).sort((a,b)=>b[1]-a[1]),
  }),
  pris: d => {
    const k=d.kpis||{}, t=k.totals||{};
    const rader=Object.entries(k.pricingBreakdown||{}).map(([typ,i])=>[typ, i.count, i.monthly, i.mrr])
      .sort((a,b)=>b[3]-a[3]);
    rader.push(['Sum (MRR)', t.activeMembers||0, '', t.mrr||0]);
    return { kolonner:['Medlemstype','Antall','Pris pr. mnd','Sum pr. mnd'], rader };
  },
};

// Én seksjon → ren tabell, klar for sortering i Excel. Flere seksjoner →
// blokker med tittelrad og blank linje imellom, siden en CSV bare rommer én
// tabellform om gangen.
function buildRapportCSV(d, valgte, tittel){
  const valgt=new Set(valgte||[]);
  const seksjoner=RAPPORT_SEKSJONER.filter(s => valgt.has(s.key) && MR_TABELL[s.key]);
  if(!seksjoner.length) return '';
  const flere=seksjoner.length>1;
  const linjer=[];
  if(flere){
    linjer.push(mrCsvLinje([(tittel||'Rapport')+' — '+d.periodeNavn]));
    linjer.push('');
  }
  seksjoner.forEach((s,i)=>{
    const t=MR_TABELL[s.key](d);
    if(flere){
      if(i>0) linjer.push('');
      linjer.push(mrCsvLinje([s.navn]));
    }
    linjer.push(mrCsvLinje(t.kolonner));
    t.rader.forEach(r => linjer.push(mrCsvLinje(r)));
  });
  return '\ufeff' + linjer.join('\r\n') + '\r\n';
}

// Samme tabeller som CSV-en, men som ekte regneark: én fane pr. seksjon,
// autofilter og fryst overskriftsrad. Ingen skilletegn å bomme på.
function lastNedRapportXlsx(d, valgte, tittel){
  const valgt=new Set(valgte||[]);
  const ark=RAPPORT_SEKSJONER.filter(s => valgt.has(s.key) && MR_TABELL[s.key])
    .map(s => { const t=MR_TABELL[s.key](d); return { navn:s.navn, kolonner:t.kolonner, rader:t.rader }; });
  if(!ark.length){ alert('Ingen seksjoner å eksportere.'); return; }
  lastNedXlsx('bodojj_'+mrFilnavn(tittel, d)+'.xlsx', ark);
}
function mrFilnavn(tittel, d){
  const slug=String(tittel||'rapport').toLowerCase().normalize('NFD')
    .replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
  return slug+'_'+((d.fra===d.til) ? d.fra : d.fra+'_'+d.til);
}
function lastNedRapportCSV(d, valgte, tittel){
  const csv=buildRapportCSV(d, valgte, tittel);
  if(!csv){ alert('Ingen seksjoner å eksportere.'); return; }
  const slug=String(tittel||'rapport').toLowerCase().normalize('NFD')
    .replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
  const per=(d.fra===d.til) ? d.fra : d.fra+'_'+d.til;
  downloadText('bodojj_'+slug+'_'+per+'.csv', csv);
}

function buildRapportHTML(d, valgte, tittel){
  const valgt=new Set(valgte||[]);
  const kropp=RAPPORT_SEKSJONER
    .filter(s => valgt.has(s.key) && MR_RENDER[s.key])
    .map(s => MR_RENDER[s.key](d))
    .join('');
  const navn=tittel||'Rapport';
  // Er alt som er valgt øyeblikksbilder, er perioden meningsløs i overskriften:
  // en stripeliste er ikke «september 2026», den er «per i dag».
  const harPeriode=RAPPORT_SEKSJONER.some(s => valgt.has(s.key) && s.periode);
  const undertittel=harPeriode ? d.periodeNavn : 'per ' + new Date().toLocaleDateString('nb-NO');
  return `<!DOCTYPE html><html lang="nb"><head><meta charset="utf-8">
<title>${mrEsc(navn)} ${mrEsc(undertittel)} — Bodø Jiu Jitsu</title>
<style>
  :root{ --accent:#7B6EF6; --green:#34B98C; --coral:#F2825F; --blue:#4F9BEA; --ink:#232136; --mut:#8A86A0; --rule:#ECEAF4; }
  *{ margin:0; padding:0; box-sizing:border-box; }
  body{ font-family:'Plus Jakarta Sans', system-ui, -apple-system, sans-serif; color:var(--ink); padding:72px 52px 44px; max-width:900px; margin:0 auto; }
  header{ display:flex; justify-content:space-between; align-items:flex-end; border-bottom:3px solid var(--accent); padding-bottom:18px; }
  h1{ font-size:30px; letter-spacing:-0.02em; } h1 small{ display:block; font-size:12px; color:var(--mut); font-weight:600; letter-spacing:.14em; text-transform:uppercase; margin-bottom:6px; }
  .gen{ font-size:11px; color:var(--mut); text-align:right; line-height:1.6; }
  h2{ font-size:15px; margin:0 0 12px; } h2 small{ color:var(--mut); font-weight:500; font-size:11px; margin-left:8px; }
  h3{ font-size:11px; text-transform:uppercase; letter-spacing:.1em; color:var(--mut); margin:0 0 10px; }
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
  tfoot td{ border-top:2px solid var(--rule); border-bottom:none; font-weight:800; }
  tr.mangler td{ background:#FFF8F4; } .mangel{ color:var(--coral); font-weight:700; font-size:11px; }
  tr.terskel td{ background:#F7F6FD; color:var(--accent); font-size:10.5px; font-weight:700; text-align:center; letter-spacing:.04em; padding:7px; }
  .gulv{ color:var(--accent); font-weight:800; }
  .prikk{ letter-spacing:2px; font-size:13px; }
  .fra{ font-size:10px; }
  .brow{ display:flex; align-items:center; gap:10px; margin:7px 0; font-size:12.5px; }
  .bl{ width:140px; } .bv{ width:46px; text-align:right; font-weight:700; }
  .bt{ flex:1; height:14px; background:#F4F3FB; border-radius:7px; overflow:hidden; }
  .bf{ display:block; height:100%; border-radius:7px; }
  .two{ display:grid; grid-template-columns:1fr 1fr; gap:28px; }
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
  <h1><small>${mrEsc(navn)}</small>${mrEsc(undertittel)}</h1>
  <div class="gen">Bodø Jiu Jitsu<br>Generert ${new Date().toLocaleDateString('nb-NO')}<br>løft.app/dashboard</div>
</header>
${kropp || '<div class="sec"><div class="tom">Ingen seksjoner valgt.</div></div>'}
<footer><span>Bodø Jiu Jitsu · ${mrEsc(navn.toLowerCase())} · ${mrEsc(undertittel)}</span><span>Navn forkortes til fornavn og forbokstav</span></footer>
</body></html>`;
}

function openRapport(d, valgte, tittel){
  const w=window.open('', '_blank');
  if(!w){ alert('Nettleseren blokkerte rapport-vinduet — tillat popups for løft.app.'); return; }
  w.document.write(buildRapportHTML(d, valgte, tittel));
  w.document.close();
}

Object.assign(window, { buildRapportData, buildRapportHTML, openRapport, mrNavn,
  buildRapportCSV, lastNedRapportCSV, lastNedRapportXlsx, mrFilnavn, MR_TABELL,
  RAPPORT_SEKSJONER, RAPPORT_PRESETS, mrPeriode, mrMndNavn, mrMndKort, mrSkyv, mrMndListe, useMr });
