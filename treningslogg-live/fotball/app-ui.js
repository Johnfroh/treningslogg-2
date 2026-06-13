/* BYGG MOTOREN — UI: faner, øktliste, øktdetalj, lagring + feiring */
(function(){
"use strict";
var D = window.BM_DATA, BM = window.BM;
function $(id){ return document.getElementById(id); }

/* ---------- faner ---------- */
var navBtns = document.querySelectorAll(".bottomnav button");
function showTab(id){
  document.querySelectorAll(".tab").forEach(function(t){ t.classList.toggle("active", t.id===id); });
  navBtns.forEach(function(b){ b.classList.toggle("active", b.dataset.tab===id); });
  if(id==="tab-hjem") BM.refresh();
}
navBtns.forEach(function(b){ b.addEventListener("click", function(){ showTab(b.dataset.tab); }); });

/* ---------- øktliste ---------- */
function renderOktList(){
  var groups={ ball:$("okt-list-ball"), bonus:$("okt-list-bonus"), fart:$("okt-list-fart") };
  groups.ball.innerHTML=""; groups.bonus.innerHTML=""; groups.fart.innerHTML="";
  var stats=BM.computeStats(BM.entries);
  D.okter.forEach(function(o){
    var grp = o.key.indexOf("bonus")===0 ? "bonus" : (o.key.indexOf("fart")===0 ? "fart" : "ball");
    var count=stats.types[o.key]||0;
    var btn=document.createElement("button");
    btn.className="oktcard"+(o.accent==="gold"?" acc-gold":o.accent==="coral"?" acc-coral":"");
    btn.innerHTML='<span class="oc-top"><span class="oc-label">'+o.label+'</span>'+
      '<span class="oc-count">'+(count>0?count+" × gjennomført":"ikke prøvd ennå")+'</span></span>'+
      '<span class="oc-title">'+o.title+'</span>'+
      '<span class="oc-meta">'+o.meta+'</span>';
    btn.addEventListener("click", function(){ openDetail(o); });
    groups[grp].appendChild(btn);
  });
}

/* ---------- øktdetalj ---------- */
var currentOkt=null;
function openDetail(o){
  currentOkt=o;
  $("od-label").textContent=o.label;
  $("od-title").textContent=o.title;
  $("od-meta").textContent=o.meta;
  $("od-intro").textContent=o.intro;
  var parts=$("od-parts"); parts.innerHTML="";
  o.parts.forEach(function(p,i){
    var row=document.createElement("div");
    row.className="partrow";
    row.innerHTML='<input type="checkbox" class="pcheck" id="part-'+i+'">'+
      '<details><summary><span class="p-name">'+p.name+'</span>'+
      '<span class="p-time">'+p.time+'</span><span class="p-mer">info</span></summary>'+
      '<div class="p-desc">'+p.desc+'</div></details>';
    parts.appendChild(row);
  });
  $("od-skannbtn").style.display = o.skann ? "block" : "none";
  $("od-rekorddesc").textContent=o.rekord.desc;
  var inp=$("od-rekord"); inp.value=""; inp.placeholder=o.rekord.placeholder;
  var stats=BM.computeStats(BM.entries);
  var best=stats.best[o.key];
  $("od-prev").textContent = best!==undefined ? "beste: "+best : "ingen ennå";
  $("od-date").value=BM.todayStr();
  $("od-note").value="";
  $("okt-detail").classList.add("open");
  $("okt-detail").scrollTop=0;
}
$("od-close").addEventListener("click", function(){ $("okt-detail").classList.remove("open"); });
$("od-skannbtn").addEventListener("click", function(){
  $("okt-detail").classList.remove("open");
  showTab("tab-skann");
});

/* ---------- lagring + feiring ---------- */
$("od-save").addEventListener("click", function(){
  if(!currentOkt) return;
  var o=currentOkt;
  var parts=o.parts.map(function(_,i){ return $("part-"+i).checked; });
  if(parts.filter(Boolean).length===0){
    BM.toast("Kryss av minst én deløvelse først");
    return;
  }
  var date=$("od-date").value||BM.todayStr();
  var rekord=$("od-rekord").value.trim();
  var note=$("od-note").value.trim();

  var before=BM.computeStats(BM.entries);
  var xp=D.xpRules.base, detail=["Økt gjennomført +"+D.xpRules.base];
  var all=parts.every(Boolean);
  if(all){ xp+=D.xpRules.allParts; detail.push("Alle deløvelser +"+D.xpRules.allParts); }
  var nv=BM.parseNum(rekord), prevBest=before.best[o.key];
  var newRec = nv!==null && prevBest!==undefined && BM.isBetter(o,nv,prevBest);
  if(newRec){ xp+=D.xpRules.newRecord; detail.push("Ny rekord! +"+D.xpRules.newRecord); }

  var badgesBefore=BM.earnedBadges(before);
  var lvlBefore=BM.levelInfo(before.xp);

  BM.addEntry({
    id: "bm-" + Date.now() + "-" + Math.random().toString(36).slice(2,7),
    date: date, okt: o.key, parts: parts, rekord: rekord, note: note, xp: xp
  });

  var after=BM.computeStats(BM.entries);
  var badgesAfter=BM.earnedBadges(after);
  var newBadges=badgesAfter.filter(function(k){ return badgesBefore.indexOf(k)<0; });
  var lvlAfter=BM.levelInfo(after.xp);

  $("okt-detail").classList.remove("open");
  celebrate(o, xp, detail, newBadges, lvlBefore, lvlAfter, newRec);
});

var CHEERS=["Sterkt!","Ført inn!","Møtte opp!","Motoren går!","Egentrent!","Den teller!"];
function celebrate(o, xp, detail, newBadges, lvlBefore, lvlAfter, newRec){
  $("cb-title").textContent = newRec ? "Ny rekord!" : CHEERS[Math.floor(Math.random()*CHEERS.length)];
  $("cb-okt").textContent = o.label+" · "+o.title;
  $("cb-xp").textContent = "+"+xp+" XP";
  $("cb-xpdetail").innerHTML = detail.join("<br>");
  var news=$("cb-news"); news.innerHTML="";
  if(lvlAfter.num>lvlBefore.num){
    var li=document.createElement("div");
    li.className="cb-newitem lvl";
    li.textContent="Nivå "+lvlAfter.num+" — «"+lvlAfter.name+"»";
    news.appendChild(li);
  }
  newBadges.forEach(function(k){
    var b=D.badges.find(function(x){ return x.key===k; });
    if(!b) return;
    var bi=document.createElement("div");
    bi.className="cb-newitem";
    bi.textContent="★ Nytt merke: "+b.name;
    news.appendChild(bi);
  });
  var card=$("cb-card");
  card.querySelectorAll(".confetti-piece").forEach(function(c){ c.remove(); });
  var colors=["#5fe0a0","#ffce8a","#da5b3b","#3ea86a","#e0992e"];
  for(var i=0;i<22;i++){
    var c=document.createElement("span");
    c.className="confetti-piece";
    c.style.left=(4+Math.random()*92)+"%";
    c.style.background=colors[i%colors.length];
    c.style.animationDelay=(Math.random()*0.5)+"s";
    c.style.transform="rotate("+(Math.random()*360)+"deg)";
    card.appendChild(c);
  }
  $("celebrate").classList.add("open");
  renderOktList();
  BM.refresh();
}
$("cb-close").addEventListener("click", function(){
  $("celebrate").classList.remove("open");
  showTab("tab-hjem");
});

/* eksponer slik at core-fila kan trigge re-render etter bootstrap */
window.BM_UI = { refresh: renderOktList };

renderOktList();
})();
