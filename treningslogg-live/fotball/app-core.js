/* BYGG MOTOREN — kjerne
   Lagrer økt-entries og innstillinger i Google Sheets (samme backend
   som trener-appen, via /api og bm_entries / bm_settings-fanene).
   localStorage brukes kun som lese-cache for snappy åpning.
*/
(function(){
"use strict";
var D = window.BM_DATA;

/* ---------- ikoner (fotball-merker) ---------- */
var ICONS = {
  whistle:'<path d="M3 10h10a4 4 0 1 1 0 8H8l-4 4v-4a4 4 0 0 1-1-8z"/><circle cx="9" cy="14" r="1.6"/><path d="M14 6.5l3-1.5"/>',
  flame:'<path d="M12 3c1.2 3-1.8 4.2-1.8 7A2.2 2.2 0 0 0 14 11c0-1-.3-1.8-1-2.6 3 .8 4.5 3.6 4.5 6.6a5.5 5.5 0 1 1-11 0c0-4 4-5.5 5.5-12z"/>',
  trophy:'<path d="M7 4h10v4a5 5 0 0 1-10 0z"/><path d="M7 6H4v1a3 3 0 0 0 3 3"/><path d="M17 6h3v1a3 3 0 0 1-3 3"/><path d="M12 13v4"/><path d="M9 21h6"/><path d="M10 17h4"/>',
  calendar:'<rect x="4" y="5" width="16" height="15"/><path d="M4 10h16"/><path d="M8 3v4"/><path d="M16 3v4"/>',
  calcheck:'<rect x="4" y="5" width="16" height="15"/><path d="M4 10h16"/><path d="M8 3v4"/><path d="M16 3v4"/><path d="M9 15l2 2 4-4"/>',
  gear:'<circle cx="12" cy="12" r="3.2"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5 5l2.1 2.1M16.9 16.9 19 19M19 5l-2.1 2.1M7.1 16.9 5 19"/>',
  clipboard:'<rect x="5" y="4" width="14" height="17"/><path d="M9 4h6v3H9z"/><path d="M8 11h8M8 15h8"/>',
  chart:'<path d="M4 20V4M4 20h16"/><path d="M7 16l4-5 3 3 5-7"/><path d="M19 7v4M19 7h-4"/>'
};
function ico(name){ return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'+(ICONS[name]||'')+'</svg>'; }

/* ---------- API-klient ---------- */
// Egen API-rute under /fotball slik at brukere med kun /fotball-tilgang
// i Cloudflare Access slipper gjennom (vanlige /api krever trener-tilgang).
var API_URL   = '/fotball/api';
var API_TOKEN = 'bjj-Hk8nQ2wT-2026';  // samme token som trener-appen
var USER      = '';                    // single-user nå — fylles ut når flere kommer på

function apiGet(action, extra){
  var u = new URL(API_URL, location.origin);
  u.searchParams.set('action', action);
  u.searchParams.set('token',  API_TOKEN);
  u.searchParams.set('_ts',    Date.now().toString());
  if (extra) Object.keys(extra).forEach(function(k){ u.searchParams.set(k, extra[k]); });
  return fetch(u.toString(), { cache: 'no-store' }).then(function(r){
    if (!r.ok) throw new Error('GET ' + action + ' ' + r.status);
    return r.json();
  }).then(function(j){
    if (!j.ok) throw new Error(j.error || 'unknown error');
    return j.data;
  });
}
function apiPost(body){
  body.token = API_TOKEN;
  return fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(body),
    cache: 'no-store',
  }).then(function(r){
    if (!r.ok) throw new Error('POST ' + body.action + ' ' + r.status);
    return r.json();
  }).then(function(j){
    if (!j.ok) throw new Error(j.error || 'unknown error');
    return j.data;
  });
}

/* ---------- Cache i localStorage (rask åpning, ikke sannhet) ---------- */
var CACHE_KEY = 'bm-cache-v1';
function loadCache(){
  try{ var raw=localStorage.getItem(CACHE_KEY); if(!raw) return null;
       var d=JSON.parse(raw); return d && Array.isArray(d.entries) ? d : null;
  }catch(e){ return null; }
}
function saveCache(){ try{ localStorage.setItem(CACHE_KEY, JSON.stringify({entries:entries, settings:settings, weekGoals:weekGoals})); }catch(e){} }

/* ---------- state ---------- */
var cached = loadCache();
var entries = cached ? cached.entries : [];
var settings = Object.assign({ goal: 3 }, cached ? (cached.settings||{}) : {});
if (typeof settings.goal === 'string') settings.goal = parseInt(settings.goal, 10) || 3;
// Ukemål per uke: { "2026-W24": 3 }. Låser inn målet som gjaldt da uka
// pågikk — brukes av computeStats så streak ikke endres med tilbakevirkende
// kraft når brukeren justerer målet. Uker uten egen verdi faller tilbake
// til settings.goal (gjeldende mål).
var weekGoals = (cached && cached.weekGoals) ? cached.weekGoals : {};
function goalForWeek(wk){
  return (weekGoals[wk] != null) ? weekGoals[wk] : settings.goal;
}
// En uke er "låst" når minst én økt er ført inn i den — da kan ikke målet
// for uka endres lenger (hindrer at man senker målet for å jukse fram streak).
function isWeekLocked(wk){
  return entries.some(function(e){ return weekKey(e.date) === wk; });
}

/* ---------- dato-hjelpere ---------- */
function todayStr(){
  var d=new Date();
  return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
}
function parseDate(s){ var p=s.split("-"); return new Date(+p[0], +p[1]-1, +p[2]); }
function weekKey(s){
  var d=parseDate(s);
  d.setDate(d.getDate()+3-((d.getDay()+6)%7));
  var y=d.getFullYear();
  var jan4=new Date(y,0,4);
  jan4.setDate(jan4.getDate()+3-((jan4.getDay()+6)%7));
  var wk=1+Math.round((d-jan4)/(7*864e5));
  return y+"-W"+String(wk).padStart(2,"0");
}
function fmtShort(s){ var p=s.split("-"); return p[2]+"."+p[1]+"."; }
function weekKeyToThursday(k){
  var p=k.split("-W"), y=+p[0], w=+p[1];
  var jan4=new Date(y,0,4); jan4.setDate(jan4.getDate()+3-((jan4.getDay()+6)%7));
  jan4.setDate(jan4.getDate()+(w-1)*7); return jan4;
}
function shiftWeekKey(k, days){
  var d=weekKeyToThursday(k); d.setDate(d.getDate()+days);
  return weekKey(d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0"));
}
function prevWeekKeyFromKey(k){ return shiftWeekKey(k,-7); }
function nextWeekKeyFromKey(k){ return shiftWeekKey(k,7); }

/* ---------- rekord-parsing ---------- */
function parseNum(str){
  if(!str) return null;
  var m=String(str).replace(",",".").match(/-?\d+(\.\d+)?/);
  return m?parseFloat(m[0]):null;
}
function isBetter(okt, nv, ov){
  if(nv===null||ov===null) return false;
  return okt.rekord.better==="lower" ? nv<ov : nv>ov;
}
function oktByKey(k){ return D.okter.find(function(o){return o.key===k;}); }

/* ---------- statistikk (replay) ---------- */
function computeStats(list){
  var sorted=list.slice().sort(function(a,b){ return a.date<b.date?-1:a.date>b.date?1:0; });
  var best={}, improvements=0, weeks={}, types={};
  sorted.forEach(function(e){
    var okt=oktByKey(e.okt); if(!okt) return;
    types[e.okt]=(types[e.okt]||0)+1;
    var wk=weekKey(e.date); weeks[wk]=(weeks[wk]||0)+1;
    var n=parseNum(e.rekord);
    if(n!==null){
      if(best[e.okt]===undefined) best[e.okt]=n;
      else if(isBetter(okt,n,best[e.okt])){ improvements++; best[e.okt]=n; }
    }
  });
  // Streak bruker per-uke-målet (goalForWeek), ikke ett fast mål — så
  // historiske uker beholder terskelen de faktisk hadde.
  var curWk=weekKey(todayStr());
  var streak=0, wk=curWk;
  if((weeks[wk]||0)>=goalForWeek(wk)){ streak++; wk=prevWeekKeyFromKey(wk); }
  else { wk=prevWeekKeyFromKey(wk); }
  while((weeks[wk]||0)>=goalForWeek(wk)){ streak++; wk=prevWeekKeyFromKey(wk); }
  var metWeeks=Object.keys(weeks).filter(function(k){return weeks[k]>=goalForWeek(k);}).sort();
  var bestStreak=0, run=0, prev=null;
  metWeeks.forEach(function(k){
    run=(prev!==null && k===nextWeekKeyFromKey(prev)) ? run+1 : 1;
    if(run>bestStreak) bestStreak=run;
    prev=k;
  });
  if(streak>bestStreak) bestStreak=streak;
  var xp=0;
  sorted.forEach(function(e){ xp+=e.xp||0; });
  return {
    total:sorted.length,
    distinct:Object.keys(types).length,
    types:types, best:best, improvements:improvements,
    weeks:weeks, weeksMet:metWeeks.length,
    streak:streak, bestStreak:bestStreak,
    thisWeek:weeks[curWk]||0, xp:xp
  };
}

/* ---------- nivå + merker ---------- */
function levelInfo(xp){
  var idx=0;
  D.levels.forEach(function(l,i){ if(xp>=l.xp) idx=i; });
  var cur=D.levels[idx], next=D.levels[idx+1];
  var pct=next?Math.min(100,Math.round((xp-cur.xp)/(next.xp-cur.xp)*100)):100;
  return { num:idx+1, name:cur.name, pct:pct, next:next, xp:xp };
}
function earnedBadges(stats){
  return D.badges.filter(function(b){ return b.check(stats); }).map(function(b){ return b.key; });
}

/* ---------- dashboard-rendering ---------- */
function $(id){ return document.getElementById(id); }

function renderDashboard(){
  var stats=computeStats(entries);
  var doy=Math.floor((Date.now()-new Date(new Date().getFullYear(),0,0))/864e5);
  $("quote-text").textContent="«"+D.quotes[doy%D.quotes.length]+"»";
  $("streak-num").textContent=stats.streak;
  $("streak-unit").textContent=stats.streak===1?"uke":"uker";
  $("streak-sub").textContent=stats.streak>0?"hold gløden i live":"tenn den denne uka";
  var lvl=levelInfo(stats.xp);
  $("lvl-num").textContent=lvl.num;
  $("lvl-name").textContent=lvl.name;
  $("xp-fill").style.width=lvl.pct+"%";
  $("xp-text").textContent=lvl.next?(stats.xp+" XP · "+(lvl.next.xp-stats.xp)+" til «"+lvl.next.name+"»"):(stats.xp+" XP · toppnivå");
  // uke + is→ild-bar (ukens fremgang mot målet)
  // Vises mot ukens LÅSTE mål (goalForWeek), ikke mot gjeldende default.
  var curWk=weekKey(todayStr());
  var curGoal=goalForWeek(curWk);
  var locked=isWeekLocked(curWk);
  $("week-count").textContent=stats.thisWeek;
  $("week-goal").textContent=curGoal;
  $("goal-val").textContent=settings.goal;
  var goal=curGoal||1;
  var pct=Math.max(0,Math.min(100,Math.round(stats.thisWeek/goal*100)));
  if($("if-fill")) $("if-fill").style.width=pct+"%";
  if($("if-edge")) $("if-edge").style.left=pct+"%";
  if($("if-pct"))  $("if-pct").textContent=pct+"%";
  var gl=$("goal-lock");
  if(gl) gl.textContent = locked ? ("🔒 låst på "+curGoal+" denne uka — endring teller fra neste uke") : "";
  // merker (klubb-crests)
  var earned=earnedBadges(stats);
  var bc=$("badge-count"); if(bc) bc.textContent=earned.length+" / "+D.badges.length+" låst opp";
  var bg=$("badge-grid"); bg.innerHTML="";
  D.badges.forEach(function(b){
    var has=earned.indexOf(b.key)>=0;
    var inner=b.num?('<span class="num">'+b.num+'</span>'):('<span class="ico">'+ico(b.icon)+'</span>');
    var el=document.createElement("div");
    el.className="badge"+(has?" earned":"");
    el.innerHTML='<div class="crest">'+inner+'</div><div class="bd-name">'+b.name+'</div>';
    bg.appendChild(el);
  });
  var rl=$("record-list"); rl.innerHTML="";
  var any=false;
  D.okter.forEach(function(o){
    if(stats.best[o.key]===undefined) return;
    any=true;
    var row=document.createElement("div");
    row.className="recordrow";
    row.innerHTML='<span class="rr-okt">'+o.label+'</span><span class="rr-name">'+o.rekord.desc+'</span><span class="rr-val">'+stats.best[o.key]+'</span>';
    rl.appendChild(row);
  });
  if(!any) rl.innerHTML='<p class="emptymsg">Rekordene dine dukker opp her etter første økt.</p>';
  var ll=$("log-list"); ll.innerHTML="";
  var recent=entries.slice().sort(function(a,b){ return a.date<b.date?1:-1; }).slice(0,8);
  if(recent.length===0){
    ll.innerHTML='<p class="emptymsg">Ingen økter ført ennå. Velg en økt under «Økter» — den første teller mest.</p>';
  }
  recent.forEach(function(e){
    var okt=oktByKey(e.okt); if(!okt) return;
    var det=[];
    var partsArr = Array.isArray(e.parts) ? e.parts : [];
    det.push(partsArr.filter(Boolean).length+"/"+okt.parts.length+" deløvelser");
    if(e.rekord) det.push("rekord: "+e.rekord);
    if(e.note) det.push(e.note);
    var row=document.createElement("div");
    row.className="lograw";
    row.innerHTML='<span class="lg-date">'+fmtShort(e.date)+'</span>'+
      '<div class="lg-main"><div class="lg-okt">'+okt.label+' · '+okt.title+'</div><div class="lg-det">'+det.join(" · ")+'</div></div>'+
      '<button class="lg-del" aria-label="Slett">✕</button>';
    row.querySelector(".lg-del").addEventListener("click", function(){
      deleteEntry(e.id);
    });
    ll.appendChild(row);
  });
}

/* ---------- mutasjoner (optimistisk + server) ---------- */
function addEntry(entry){
  entries.push(entry);
  // Lås inn ukemålet for uka denne økta tilhører, hvis det ikke alt er
  // satt — så streak-terskelen for uka er bevart selv om målet endres senere.
  var ewk = weekKey(entry.date);
  var lockGoal = null;
  if (weekGoals[ewk] == null) { weekGoals[ewk] = settings.goal; lockGoal = settings.goal; }
  saveCache();
  renderDashboard();
  if (window.BM_UI && window.BM_UI.refresh) window.BM_UI.refresh();
  if (lockGoal != null) {
    apiPost({ action: 'bmSetWeekGoal', user: USER, week: ewk, value: String(lockGoal) })
      .catch(function(err){ console.warn('bmSetWeekGoal (lås) feilet:', err.message); });
  }
  apiPost({ action: 'bmCreate', payload: Object.assign({}, entry, { user: USER }) })
    .then(function(saved){
      if (saved && saved.id && saved.id !== entry.id) {
        var idx = entries.findIndex(function(e){ return e.id === entry.id; });
        if (idx >= 0) { entries[idx] = Object.assign({}, entries[idx], { id: saved.id }); saveCache(); }
      }
    })
    .catch(function(err){
      console.error('bmCreate feilet:', err);
      entries = entries.filter(function(e){ return e.id !== entry.id; });
      saveCache();
      renderDashboard();
      if (window.BM_UI && window.BM_UI.refresh) window.BM_UI.refresh();
      window.BM.toast('Lagring feilet — prøv igjen');
    });
}

function deleteEntry(id){
  if (!confirm("Slette denne økta fra loggen?")) return;
  var before = entries.slice();
  entries = entries.filter(function(e){ return e.id !== id; });
  saveCache();
  renderDashboard();
  if (window.BM_UI && window.BM_UI.refresh) window.BM_UI.refresh();
  apiPost({ action: 'bmDelete', id: id }).catch(function(err){
    console.error('bmDelete feilet:', err);
    entries = before;
    saveCache();
    renderDashboard();
    window.BM.toast('Sletting feilet');
  });
}

function setGoal(goal){
  settings.goal = goal;
  // settings.goal er alltid "gjeldende mål framover". Inneværende uke får
  // det nye målet KUN hvis uka ikke er låst (ingen økt ført ennå). Er den
  // låst, gjelder endringen først fra neste uke.
  var curWk = weekKey(todayStr());
  var changedThisWeek = false;
  if (!isWeekLocked(curWk)) { weekGoals[curWk] = goal; changedThisWeek = true; }
  saveCache();
  renderDashboard();
  apiPost({ action: 'bmSetSetting', user: USER, key: 'goal', value: String(goal) })
    .catch(function(err){
      console.error('bmSetSetting feilet:', err);
      window.BM.toast('Innstilling ikke lagret');
    });
  if (changedThisWeek) {
    apiPost({ action: 'bmSetWeekGoal', user: USER, week: curWk, value: String(goal) })
      .catch(function(err){ console.warn('bmSetWeekGoal feilet:', err.message); });
  }
}

/* ---------- eksport ---------- */
function exportCSV(){
  var lines=["dato;okt;rekord;delovelser;notat"];
  entries.slice().sort(function(a,b){return a.date<b.date?-1:1;}).forEach(function(e){
    var okt=oktByKey(e.okt);
    var partsArr = Array.isArray(e.parts) ? e.parts : [];
    lines.push([e.date, okt?okt.label+" "+okt.title:e.okt, e.rekord||"",
      partsArr.filter(Boolean).length+"/"+(okt?okt.parts.length:""), (e.note||"").replace(/;/g,",")].join(";"));
  });
  var txt=lines.join("\n");
  function done(){ window.BM.toast("Loggen er kopiert — lim inn i Google Sheets"); }
  if(navigator.clipboard&&navigator.clipboard.writeText){ navigator.clipboard.writeText(txt).then(done, fallback); }
  else fallback();
  function fallback(){
    var ta=document.createElement("textarea"); ta.value=txt; document.body.appendChild(ta);
    ta.select(); try{ document.execCommand("copy"); done(); }catch(e){} document.body.removeChild(ta);
  }
}

/* ---------- hendelser ---------- */
$("goal-minus").addEventListener("click", function(){ setGoal(Math.max(1, settings.goal-1)); });
$("goal-plus").addEventListener("click",  function(){ setGoal(Math.min(7, settings.goal+1)); });
$("btn-export").addEventListener("click", exportCSV);

/* ---------- delt API for ui-fila ---------- */
window.BM = {
  get entries(){ return entries; },
  addEntry: addEntry,
  deleteEntry: deleteEntry,
  settings: settings,
  computeStats: computeStats,
  levelInfo: levelInfo,
  earnedBadges: earnedBadges,
  oktByKey: oktByKey,
  parseNum: parseNum,
  isBetter: isBetter,
  todayStr: todayStr,
  refresh: renderDashboard,
  toast: function(msg){
    var t=$("toast"); t.textContent=msg; t.classList.add("show");
    clearTimeout(t._tm); t._tm=setTimeout(function(){ t.classList.remove("show"); },2600);
  }
};

/* ---------- bootstrap (fersker data fra Sheets) ---------- */
renderDashboard();  // umiddelbart fra cache
apiGet('bmList', { user: USER }).then(function(data){
  entries  = Array.isArray(data.entries) ? data.entries : [];
  var srvSettings = data.settings || {};
  if (srvSettings.goal) settings.goal = parseInt(srvSettings.goal, 10) || settings.goal;
  if (data.weekGoals && typeof data.weekGoals === 'object') weekGoals = data.weekGoals;
  saveCache();
  renderDashboard();
  if (window.BM_UI && window.BM_UI.refresh) window.BM_UI.refresh();
}).catch(function(err){
  console.warn('bmList bootstrap feilet:', err.message);
});
})();
