/* FAMILIEHEFTENE — UI: faner, øktliste (data-drevet), øktdetalj, lagring + feiring */
(function(){
"use strict";
var BM = window.BM;
function $(id){ return document.getElementById(id); }

/* ---------- faner ---------- */
var navBtns = document.querySelectorAll(".bottomnav button");
function showTab(id){
  document.querySelectorAll(".tab").forEach(function(t){ t.classList.toggle("active", t.id===id); });
  navBtns.forEach(function(b){ b.classList.toggle("active", b.dataset.tab===id); });
  if(id==="tab-hjem") BM.refresh();
}
navBtns.forEach(function(b){ b.addEventListener("click", function(){ showTab(b.dataset.tab); }); });

/* ---------- øktliste (bygges fra programmets grupper) ---------- */
function verb(P){ return (P.id==="ungdom" || P.id.indexOf("core")===0) ? "gjennomført" : P.id==="junior" ? "spilt" : "gjort"; }
function renderOktList(){
  var P=BM.current;
  var host=$("okt-groups"); if(!host) return;
  host.innerHTML="";
  var stats=BM.computeStats(BM.entries);
  P.groups.forEach(function(g){
    var lbl=document.createElement("div"); lbl.className="seclabel";
    lbl.innerHTML=g.title+(g.sub?' <span>'+g.sub+'</span>':'');
    host.appendChild(lbl);
    var list=document.createElement("div"); host.appendChild(list);
    P.okter.filter(function(o){ return o.group===g.key; }).forEach(function(o){
      var count=stats.types[o.key]||0;
      var btn=document.createElement("button");
      btn.className="oktcard"+(o.accent==="gold"?" acc-gold":o.accent==="coral"?" acc-coral":"");
      btn.innerHTML='<span class="oc-top"><span class="oc-label">'+o.label+'</span>'+
        '<span class="oc-count">'+(count>0?count+" × "+verb(P):"ikke prøvd ennå")+'</span></span>'+
        '<span class="oc-title">'+o.title+'</span>'+
        '<span class="oc-meta">'+o.meta+'</span>';
      btn.addEventListener("click", function(){ openDetail(o); });
      list.appendChild(btn);
    });
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
    var row=document.createElement("div"); row.className="partrow";
    row.innerHTML='<input type="checkbox" class="pcheck" id="part-'+i+'">'+
      '<details><summary><span class="p-name">'+p.name+'</span>'+
      '<span class="p-time">'+p.time+'</span><span class="p-mer">info</span></summary>'+
      '<div class="p-desc">'+p.desc+'</div></details>';
    parts.appendChild(row);
  });
  $("od-skannbtn").style.display = o.skann ? "flex" : "none";
  // «Husk»-kort
  var husk=$("od-husk");
  if(o.note){ husk.style.display="block"; $("od-husk-text").textContent=o.note; }
  else husk.style.display="none";
  // rekordboks – kun når økta har rekord
  var rbox=$("od-rekordbox");
  if(o.rekord){
    rbox.style.display="block";
    $("od-rekorddesc").textContent=o.rekord.desc;
    var inp=$("od-rekord"); inp.value=""; inp.placeholder=o.rekord.placeholder;
    var stats=BM.computeStats(BM.entries); var best=stats.best[o.key];
    $("od-prev").textContent = best!==undefined ? "beste: "+best : "ingen ennå";
  } else { rbox.style.display="none"; }
  $("od-date").value=BM.todayStr();
  $("od-note").value="";
  $("okt-detail").classList.add("open");
  $("okt-detail").scrollTop=0;
}
$("od-close").addEventListener("click", function(){ $("okt-detail").classList.remove("open"); });
$("od-skannbtn").addEventListener("click", function(){ $("okt-detail").classList.remove("open"); showTab("tab-skann"); });

/* ---------- lagring + feiring ---------- */
$("od-save").addEventListener("click", function(){
  if(!currentOkt) return;
  var o=currentOkt, D=BM.current;
  var parts=o.parts.map(function(_,i){ return $("part-"+i).checked; });
  if(parts.filter(Boolean).length===0){ BM.toast("Kryss av minst én del først"); return; }
  var date=$("od-date").value||BM.todayStr();
  var rekord=o.rekord ? $("od-rekord").value.trim() : "";
  var note=$("od-note").value.trim();

  var before=BM.computeStats(BM.entries);
  var xp=D.xpRules.base, detail=["Gjennomført +"+D.xpRules.base];
  var all=parts.every(Boolean);
  if(all){ xp+=D.xpRules.allParts; detail.push("Alt krysset av +"+D.xpRules.allParts); }
  var newRec=false;
  if(o.rekord && D.xpRules.newRecord>0){
    var nv=BM.parseNum(rekord), prevBest=before.best[o.key];
    newRec = nv!==null && prevBest!==undefined && BM.isBetter(o,nv,prevBest);
    if(newRec){ xp+=D.xpRules.newRecord; detail.push("Ny rekord! +"+D.xpRules.newRecord); }
  }

  var badgesBefore=BM.earnedBadges(before);
  var lvlBefore=BM.levelInfo(before.xp);
  BM.addEntry({ id: "bm-"+Date.now()+"-"+Math.random().toString(36).slice(2,7), date:date, okt:o.key, parts:parts, rekord:rekord, note:note, xp:xp });
  var after=BM.computeStats(BM.entries);
  var newBadges=BM.earnedBadges(after).filter(function(k){ return badgesBefore.indexOf(k)<0; });
  var lvlAfter=BM.levelInfo(after.xp);

  $("okt-detail").classList.remove("open");
  celebrate(o, xp, detail, newBadges, lvlBefore, lvlAfter, newRec);
});

var CHEERS_FOTBALL=["Sterkt!","Ført inn!","Møtte opp!","Motoren går!","Egentrent!","Den teller!"];
var CHEERS_JUNIOR=["Bra jobba!","Så gøy!","Touch samlet!","Du leker fint!","Heia deg!","Den teller!"];
var CHEERS_RG=["Så fint!","Mykt og flott!","Det fløt!","Elegant!","Vakkert!","Den teller!"];
var CHEERS_CORE=["Sterkt!","Ført inn!","Reps i banken!","Helkropp – ferdig!","Grunnmuren står!","Den teller!"];
function cheers(){ var id=BM.current.id; return id==="junior"?CHEERS_JUNIOR:id==="rg"?CHEERS_RG:id.indexOf("core")===0?CHEERS_CORE:CHEERS_FOTBALL; }

function celebrate(o, xp, detail, newBadges, lvlBefore, lvlAfter, newRec){
  var C=cheers();
  $("cb-title").textContent = newRec ? "Ny rekord!" : C[Math.floor(Math.random()*C.length)];
  $("cb-okt").textContent = o.label+" · "+o.title;
  $("cb-xp").textContent = "+"+xp+" XP";
  $("cb-xpdetail").innerHTML = detail.join("<br>");
  var news=$("cb-news"); news.innerHTML="";
  if(lvlAfter.num>lvlBefore.num){
    var li=document.createElement("div"); li.className="cb-newitem lvl";
    li.textContent="Nivå "+lvlAfter.num+" — «"+lvlAfter.name+"»"; news.appendChild(li);
  }
  newBadges.forEach(function(k){
    var b=BM.current.badges.find(function(x){ return x.key===k; }); if(!b) return;
    var bi=document.createElement("div"); bi.className="cb-newitem";
    bi.textContent="★ Nytt merke: "+b.name; news.appendChild(bi);
  });
  var card=$("cb-card");
  card.querySelectorAll(".confetti-piece").forEach(function(c){ c.remove(); });
  var colors=BM.current.confetti||["#fff"];
  for(var i=0;i<22;i++){
    var c=document.createElement("span"); c.className="confetti-piece";
    c.style.left=(4+Math.random()*92)+"%"; c.style.background=colors[i%colors.length];
    c.style.animationDelay=(Math.random()*0.5)+"s"; c.style.transform="rotate("+(Math.random()*360)+"deg)";
    card.appendChild(c);
  }
  $("celebrate").classList.add("open");
  renderOktList(); BM.refresh();
}
$("cb-close").addEventListener("click", function(){ $("celebrate").classList.remove("open"); showTab("tab-hjem"); });

/* ---------- kroker som motoren kaller ved program-bytte ---------- */
BM.uiSync = renderOktList;
BM.goHome = function(){ showTab("tab-hjem"); };

/* ---------- start (etter at krokene er satt) ---------- */
window.BM_BOOT();
})();
