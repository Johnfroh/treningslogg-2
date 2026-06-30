/* FAMILIEHEFTENE — avatar + garderobe (utledet av eksisterende fremgang) */
(function(){
"use strict";
var BM = window.BM;
function $(id){ return document.getElementById(id); }
function el(tag, css, html){ var d=document.createElement(tag); if(css) d.setAttribute("style",css); if(html!=null) d.innerHTML=html; return d; }

var SLOTS = [
  { key:"hode",    label:"Hode" },
  { key:"drakt",   label:"Drakt" },
  { key:"fottoy",  label:"Føtter" },
  { key:"tilbehor",label:"Tilbehør" }
];
var BASES = [
  { id:"gutt",  label:"Gutt",  ear:null,     face:"#f4c89a" },
  { id:"jente", label:"Jente", ear:null,     face:"#f4c89a", hair:true },
  { id:"rev",   label:"Rev",   ear:"triangle", face:"#ff8a3d", snout:true },
  { id:"bjorn", label:"Bjørn", ear:"round",  face:"#c98a4a" },
  { id:"love",  label:"Løve",  ear:"round",  face:"#ffce5a", mane:true }
];
var KIT_COLORS = ["#46c06a","#ffd23e","#ff5d6c","#6fc8ff","#b98cff","#ff8a3d","#2fa860","#ff8fc4"];

function curProgram(){ return BM.current; }
function hasAvatar(){ var P=curProgram(); return P && (P.progressStyle==="avatar" || P.progressStyle==="motor") && P.equipment; }

// fargehjelpere
function clamp(n){ return Math.max(0,Math.min(255,n)); }
function shade(hex,amt){ var c=hex.replace('#',''); var r=clamp(parseInt(c.substr(0,2),16)+amt),g=clamp(parseInt(c.substr(2,2),16)+amt),b=clamp(parseInt(c.substr(4,2),16)+amt); return '#'+[r,g,b].map(function(x){return ('0'+x.toString(16)).slice(-2);}).join(''); }
function hexA(hex,a){ var c=hex.replace('#',''); return 'rgba('+parseInt(c.substr(0,2),16)+','+parseInt(c.substr(2,2),16)+','+parseInt(c.substr(4,2),16)+','+a+')'; }

// ---- bygg avatar-figuren (size = total høyde i px) ----
function buildAvatar(cfg, size){
  var s = size/210; // referansehøyde 210
  function px(n){ return Math.round(n*s); }
  var base = BASES.filter(function(b){return b.id===cfg.base;})[0] || BASES[0];
  var kit  = cfg.kitColor || "#2fa860";
  var eq   = cfg.equipped || {};
  var wrap = el("div","position:relative;width:"+px(130)+"px;height:"+size+"px;margin:0 auto;");

  // hode + ev. ører/snute/man
  var head = el("div","position:absolute;left:50%;top:"+px(18)+"px;transform:translateX(-50%);width:"+px(58)+"px;height:"+px(56)+"px;border-radius:"+(base.id==="rev"?"50% 50% 46% 46%":base.snout? "50%": "18px")+";background:"+base.face+";z-index:2;");
  head.innerHTML =
    '<span style="position:absolute;left:'+px(15)+'px;top:'+px(24)+'px;width:'+px(7)+'px;height:'+px(7)+'px;border-radius:50%;background:#2a1810;"></span>'+
    '<span style="position:absolute;right:'+px(15)+'px;top:'+px(24)+'px;width:'+px(7)+'px;height:'+px(7)+'px;border-radius:50%;background:#2a1810;"></span>';
  if(base.mane){ wrap.appendChild(el("div","position:absolute;left:50%;top:"+px(12)+"px;transform:translateX(-50%);width:"+px(76)+"px;height:"+px(70)+"px;border-radius:50%;background:#e0992e;z-index:1;")); }
  if(base.ear==="triangle"){
    wrap.appendChild(el("div","position:absolute;left:"+px(20)+"px;top:"+px(8)+"px;width:0;height:0;border-left:"+px(11)+"px solid transparent;border-right:"+px(11)+"px solid transparent;border-bottom:"+px(20)+"px solid "+base.face+";z-index:1;"));
    wrap.appendChild(el("div","position:absolute;right:"+px(20)+"px;top:"+px(8)+"px;width:0;height:0;border-left:"+px(11)+"px solid transparent;border-right:"+px(11)+"px solid transparent;border-bottom:"+px(20)+"px solid "+base.face+";z-index:1;"));
  } else if(base.ear==="round"){
    wrap.appendChild(el("div","position:absolute;left:"+px(26)+"px;top:"+px(10)+"px;width:"+px(18)+"px;height:"+px(18)+"px;border-radius:50%;background:"+base.face+";z-index:1;"));
    wrap.appendChild(el("div","position:absolute;right:"+px(26)+"px;top:"+px(10)+"px;width:"+px(18)+"px;height:"+px(18)+"px;border-radius:50%;background:"+base.face+";z-index:1;"));
  }
  if(base.hair){ wrap.appendChild(el("div","position:absolute;left:50%;top:"+px(10)+"px;transform:translateX(-50%);width:"+px(66)+"px;height:"+px(44)+"px;border-radius:24px 24px 30px 30px;background:#5a3a2e;z-index:1;")); }
  if(base.snout){ head.innerHTML += '<div style="position:absolute;left:50%;bottom:'+px(2)+'px;transform:translateX(-50%);width:'+px(30)+'px;height:'+px(22)+'px;border-radius:40% 40% 50% 50%;background:#fffdf5;"></div>'; }

  // utstyr: HODE
  if(eq.hode==="band_std" || eq.hode==="visir_skann"){ wrap.appendChild(el("div","position:absolute;left:50%;top:"+px(30)+"px;transform:translateX(-50%);width:"+px(60)+"px;height:"+px(8)+"px;background:#5fe0a0;z-index:4;")); }
  if(eq.hode==="solcaps"){ wrap.appendChild(el("div","position:absolute;left:50%;top:"+px(2)+"px;transform:translateX(-50%);width:"+px(56)+"px;height:"+px(21)+"px;background:#ff5d6c;border-radius:28px 28px 4px 4px;z-index:4;")); }
  if(eq.hode==="harslojfe"){ wrap.appendChild(el("div","position:absolute;left:50%;top:"+px(2)+"px;transform:translateX(-50%);display:flex;gap:1px;z-index:5;",'<span style="width:'+px(13)+'px;height:'+px(13)+'px;background:#ff8fc4;border-radius:60% 20% 60% 20%;"></span><span style="width:'+px(13)+'px;height:'+px(13)+'px;background:#ff8fc4;border-radius:20% 60% 20% 60%;"></span>')); }

  wrap.appendChild(head);

  // DRAKT (kropp)
  var bodyGrad = "linear-gradient(180deg,"+kit+","+shade(kit,-26)+")";
  var body = el("div","position:absolute;left:50%;top:"+px(70)+"px;transform:translateX(-50%);width:"+px(94)+"px;height:"+px(62)+"px;border-radius:15px 15px 13px 13px;background:"+bodyGrad+";z-index:1;box-shadow:0 0 16px "+hexA(kit,.35)+";");
  if(eq.drakt==="drakt10"||eq.drakt==="kit_proff"){ body.innerHTML='<span style="position:absolute;left:50%;top:'+px(18)+'px;transform:translateX(-50%);font-family:\'Anton\',sans-serif;font-size:'+px(28)+'px;color:#fffdf5;">10</span>'; }
  if(eq.tilbehor==="band_kaptein"){ body.innerHTML+='<span style="position:absolute;left:'+px(5)+'px;top:'+px(11)+'px;width:'+px(11)+'px;height:'+px(19)+'px;background:#ffce8a;border-radius:3px;"></span>'; }
  wrap.appendChild(body);

  // bein
  wrap.appendChild(el("div","position:absolute;left:50%;top:"+px(130)+"px;transform:translateX(-50%);display:flex;gap:"+px(10)+"px;",'<span style="width:'+px(18)+'px;height:'+px(26)+'px;border-radius:7px;background:#0e2117;"></span><span style="width:'+px(18)+'px;height:'+px(26)+'px;border-radius:7px;background:#0e2117;"></span>'));

  // FØTTER
  var shoe = eq.fottoy==="sko_gull" ? "linear-gradient(90deg,#ffe49a,#e0992e)"
           : eq.fottoy==="sko_lyn"  ? "linear-gradient(90deg,#9fffe0,#2fa860)"
           : eq.fottoy==="ballettsko" ? "#ff8fc4"
           : "linear-gradient(90deg,"+kit+","+shade(kit,-20)+")";
  wrap.appendChild(el("div","position:absolute;left:50%;top:"+px(156)+"px;transform:translateX(-50%);display:flex;gap:"+px(10)+"px;",'<span style="width:'+px(24)+'px;height:'+px(11)+'px;border-radius:5px 9px 9px 5px;background:'+shoe+';box-shadow:0 0 8px '+hexA(kit,.5)+';"></span><span style="width:'+px(24)+'px;height:'+px(11)+'px;border-radius:5px 9px 9px 5px;background:'+shoe+';"></span>'));

  // TILBEHØR (ball / kappe)
  if(eq.tilbehor==="ball_egen"||eq.tilbehor==="turnball"||eq.tilbehor==="ball_magisk"){
    var ball = eq.tilbehor==="turnball" ? "radial-gradient(circle at 36% 32%,#fff0fa,#ff8fc4 70%,#d64f93)" : "#fffdf5";
    wrap.appendChild(el("span","position:absolute;right:"+px(-12)+"px;bottom:"+px(0)+"px;width:"+px(28)+"px;height:"+px(28)+"px;border-radius:50%;background:"+ball+";box-shadow:0 0 0 2px #0e2117 inset;z-index:5;"));
  }
  if(eq.tilbehor==="kappe"){ wrap.appendChild(el("div","position:absolute;left:50%;top:"+px(74)+"px;transform:translateX(-50%);width:"+px(100)+"px;height:"+px(70)+"px;background:"+hexA("#ff5d6c",.85)+";border-radius:0 0 40% 40%;z-index:0;")); }

  return wrap;
}

// ---- Hjem-helt ----
function refresh(){
  var P = curProgram(); if(!P) return;
  var host = $("avatar-hero");
  var fhero = document.querySelector("#tab-hjem .fhero");
  var navBtn = document.querySelector('.bottomnav button[data-tab="tab-spiller"]');
  if(!hasAvatar()){
    // core_a: ingen avatar/fane — behold streak-helten
    if(host){ host.innerHTML=""; host.style.display="none"; }
    if(fhero) fhero.style.display="";
    if(navBtn) navBtn.style.display="none";
    return;
  }
  if(navBtn) navBtn.style.display="";
  if(P.progressStyle==="motor"){
    // ungdom: behold streak-helten på Hjem, avatar bor i «Min spiller»
    if(host){ host.innerHTML=""; host.style.display="none"; }
    if(fhero) fhero.style.display="";
  } else {
    // barn: avataren tar streakens plass
    if(fhero) fhero.style.display="none";
    if(host){ host.style.display="block"; drawHero(host); }
  }
  renderMinSpiller();
}
function drawHero(host){
  var stats = BM.computeStats(BM.entries);
  var lvl = BM.levelInfo(stats.xp);
  var cfg = BM.getAvatarCfg();
  host.innerHTML="";
  var stage = el("div","height:168px;display:flex;align-items:flex-end;justify-content:center;");
  var av = buildAvatar(cfg, 158); av.style.animation="floaty 4s ease-in-out infinite";
  stage.appendChild(av); host.appendChild(stage);
  host.appendChild(el("div","font-family:'Anton',sans-serif;font-size:22px;color:var(--ink);text-transform:uppercase;text-align:center;margin-top:8px;", cfg.name || "Min spiller"));
  var chips = el("div","display:flex;gap:8px;justify-content:center;margin-top:10px;");
  chips.innerHTML =
    '<span style="font:700 8.5px/1 \'Roboto Mono\';letter-spacing:.1em;text-transform:uppercase;color:#08395f;background:var(--green-bright);padding:7px 11px;">Nivå '+lvl.num+' · '+lvl.name+'</span>'+
    '<span style="font:700 8.5px/1 \'Roboto Mono\';letter-spacing:.1em;text-transform:uppercase;color:var(--green-bright);border:1px solid var(--line-strong);padding:7px 11px;">🔥 '+stats.streak+' uker</span>';
  host.appendChild(chips);
  // Ingen «Endre spilleren»-knapp på Hjem — redigering skjer via «Min spiller» i bunnmenyen.
}

// ---- «Min spiller»-fane ----
function renderMinSpiller(){
  var host = $("ms-body"); if(!host) return;
  host.innerHTML="";
  var stats = BM.computeStats(BM.entries);
  var cfg = BM.getAvatarCfg();
  var stage = el("div","height:188px;border:1px solid var(--line-strong);background:radial-gradient(closest-side at 50% 30%, rgba(95,224,160,.16), rgba(8,20,12,.2) 72%);display:flex;align-items:flex-end;justify-content:center;");
  var av = buildAvatar(cfg, 176); av.style.animation="floaty 4.2s ease-in-out infinite";
  stage.appendChild(av); host.appendChild(stage);
  var edit = el("button","margin-top:14px;width:100%;height:48px;background:var(--green);color:#06140c;border:none;font-family:'Anton',sans-serif;font-size:15px;letter-spacing:.1em;text-transform:uppercase;cursor:pointer;","Endre spilleren");
  edit.addEventListener("click", openGarderobe); host.appendChild(edit);
  host.appendChild(buildLocker(stats, cfg));
}
function buildLocker(stats){
  var P = curProgram(); var earned = BM.earnedEquipment(stats);
  var grid = el("div","display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:16px;");
  P.equipment.forEach(function(e){
    if(e.base) return;
    var has = earned.indexOf(e.id)>=0;
    var card = el("div","border:1px solid "+(has?"var(--line-strong)":"var(--line)")+";background:"+(has?"rgba(20,60,36,.4)":"rgba(10,22,16,.5)")+";padding:9px 6px;text-align:center;");
    card.innerHTML =
      '<div style="height:26px;display:flex;align-items:center;justify-content:center;font-size:13px;color:var(--muted);">'+(has?'★':'🔒')+'</div>'+
      '<div style="font:700 7.5px/1.2 \'Roboto Mono\';text-transform:uppercase;color:'+(has?'var(--ink)':'#9fc3aa')+';margin-top:5px;">'+e.name+'</div>'+
      '<div style="font:700 7px/1.2 \'Roboto Mono\';color:'+(has?'var(--muted)':'var(--gold-bright)')+';margin-top:4px;">'+(has?'Låst opp ✓':(e.hint||''))+'</div>';
    grid.appendChild(card);
  });
  return grid;
}

// ---- Garderobe (modal) ----
var curSlot = "drakt";
function openGarderobe(){ curSlot="drakt"; var ov=$("garderobe"); if(ov){ ov.classList.add("open"); drawGarderobe(); } }
function closeGarderobe(){ var ov=$("garderobe"); if(ov) ov.classList.remove("open"); }
function drawGarderobe(){
  var stats = BM.computeStats(BM.entries);
  var cfg = BM.getAvatarCfg();
  var earned = BM.earnedEquipment(stats);
  var P = curProgram();
  // preview
  var prev = $("gd-preview"); prev.innerHTML=""; var av=buildAvatar(cfg,120); prev.appendChild(av);
  // figur + farge (kun for barn-programmer som tillater fritt valg)
  var allowBase = (P.progressStyle==="avatar");
  $("gd-base").style.display = allowBase ? "block":"none";
  if(allowBase){
    var bw=$("gd-base-row"); bw.innerHTML="";
    BASES.forEach(function(b){
      var on = cfg.base===b.id;
      var btn=el("button","flex:1;border:"+(on?"2px solid var(--green-bright)":"1px solid var(--line)")+";background:"+(on?"rgba(95,224,160,.16)":"transparent")+";padding:8px 0;text-align:center;cursor:pointer;color:var(--ink);",'<div style="font:700 7px/1 \'Roboto Mono\';margin-top:4px;">'+b.label.toUpperCase()+'</div>');
      btn.insertBefore(miniHead(b),btn.firstChild);
      btn.addEventListener("click",function(){ cfg.base=b.id; BM.setAvatarCfg(cfg); drawGarderobe(); });
      bw.appendChild(btn);
    });
    var cw=$("gd-color-row"); cw.innerHTML="";
    KIT_COLORS.forEach(function(col){
      var on=(cfg.kitColor||"")===col;
      var sw=el("span","width:30px;height:30px;border-radius:50%;background:"+col+";cursor:pointer;"+(on?"box-shadow:0 0 0 2px #fff,0 0 0 4px "+col+";":""));
      sw.addEventListener("click",function(){ cfg.kitColor=col; BM.setAvatarCfg(cfg); drawGarderobe(); });
      cw.appendChild(sw);
    });
  }
  // slot-faner
  var tabs=$("gd-tabs"); tabs.innerHTML="";
  SLOTS.forEach(function(sl){
    var on=curSlot===sl.key;
    var t=el("span","flex:1;text-align:center;font:700 8px/1 'Roboto Mono';letter-spacing:.06em;text-transform:uppercase;padding:8px 0;cursor:pointer;"+(on?"color:#06140c;background:var(--green-bright);":"color:var(--muted);border:1px solid var(--line);"), sl.label);
    t.addEventListener("click",function(){ curSlot=sl.key; drawGarderobe(); });
    tabs.appendChild(t);
  });
  // utstyr i valgt slot
  var list=$("gd-items"); list.innerHTML="";
  P.equipment.filter(function(e){return e.slot===curSlot;}).forEach(function(e){
    var has = e.base || earned.indexOf(e.id)>=0;
    var onNow = (cfg.equipped[curSlot]||"")===e.id || (e.base && !cfg.equipped[curSlot]);
    var row=el("div","display:flex;align-items:center;gap:12px;padding:10px 12px;margin-bottom:8px;border:"+(onNow?"2px solid var(--green-bright)":"1px solid "+(has?"var(--line-strong)":"var(--line)"))+";background:"+(onNow?"rgba(20,60,36,.5)":has?"var(--field)":"rgba(10,22,16,.5)")+";");
    var right = onNow ? '<span style="width:20px;height:20px;border-radius:50%;background:var(--green-bright);color:#06140c;display:flex;align-items:center;justify-content:center;font-size:12px;">✓</span>'
      : has ? '<button style="font:700 8px/1 \'Roboto Mono\';letter-spacing:.06em;text-transform:uppercase;color:#06140c;background:var(--green-bright);border:none;padding:7px 10px;cursor:pointer;" data-eq="'+e.id+'">Sett på</button>'
      : '<span style="font-size:13px;color:var(--muted);">🔒</span>';
    row.innerHTML='<div style="flex:1;"><div style="font:700 10px/1 \'Roboto Mono\';text-transform:uppercase;color:'+(has?'var(--ink)':'#9fc3aa')+';">'+e.name+'</div>'+
      '<div style="font:700 7.5px/1.3 \'Roboto Mono\';color:'+(has?'var(--muted)':'var(--gold-bright)')+';margin-top:4px;">'+(onNow?'PÅ NÅ':has?'LÅST OPP':('LÅS OPP · '+(e.hint||'')))+'</div></div>'+right;
    var setBtn = row.querySelector("[data-eq]");
    if(setBtn) setBtn.addEventListener("click",function(){ cfg.equipped[curSlot]=e.id; BM.setAvatarCfg(cfg); drawGarderobe(); });
    list.appendChild(row);
  });
}
function miniHead(b){
  var d=el("div","width:24px;height:24px;border-radius:"+(b.ear==="triangle"?"50% 50% 46% 46%":b.id==="jente"?"12px 12px 9px 9px":"50%")+";background:"+b.face+";margin:0 auto;");
  return d;
}

// ---- init ----
window.BM_AVATAR = { refresh:refresh, openGarderobe:openGarderobe, closeGarderobe:closeGarderobe };
document.addEventListener("DOMContentLoaded", function(){
  var c=$("gd-close"); if(c) c.addEventListener("click", closeGarderobe);
});
})();
