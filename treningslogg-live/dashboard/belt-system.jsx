/* Belt system for Bodø JJ register
   IBJJF adult + junior belts (Norwegian), 0–4 stripes.
   Exports to window: BELT_META, ADULT_BELTS, JUNIOR_BELTS, ALL_BELTS,
   beltMeta(), isJunorBelt(), BeltGraphic, BeltChip, nextBelt(), maxStripes */

const maxStripes = 4;

// base = belt body colour; mid = lengthwise centre stripe (kids split belts); bar = degree-bar colour
const BELT_META = {
  // ---- Adult ----
  'Hvit':         { base:'#E9E5D8', mid:null,       bar:'#26242E', ink:'#33313B', adult:true,  order:0 },
  'Blå':          { base:'#2C6CB0', mid:null,       bar:'#16161C', ink:'#fff',    adult:true,  order:1 },
  'Lilla':        { base:'#6B4791', mid:null,       bar:'#16161C', ink:'#fff',    adult:true,  order:2 },
  'Brun':         { base:'#6A4327', mid:null,       bar:'#16161C', ink:'#fff',    adult:true,  order:3 },
  'Sort':         { base:'#26252E', mid:null,       bar:'#C0392B', ink:'#fff',    adult:true,  order:4 },
  'Korall':       { base:'#26252E', mid:'#C0392B',  bar:'#C0392B', ink:'#fff',    adult:true,  order:5 },
  // ---- Junior (IBJJF) ----
  'Grå/Hvit':     { base:'#8C8C95', mid:'#EFEDE6',  bar:'#16161C', ink:'#fff', junior:true, order:0 },
  'Grå':          { base:'#8C8C95', mid:null,       bar:'#16161C', ink:'#fff', junior:true, order:1 },
  'Grå/Sort':     { base:'#8C8C95', mid:'#1B1B22',  bar:'#16161C', ink:'#fff', junior:true, order:2 },
  'Gul/Hvit':     { base:'#F1C338', mid:'#EFEDE6',  bar:'#16161C', ink:'#3a2f00', junior:true, order:3 },
  'Gul':          { base:'#F1C338', mid:null,       bar:'#16161C', ink:'#3a2f00', junior:true, order:4 },
  'Gul/Sort':     { base:'#F1C338', mid:'#1B1B22',  bar:'#16161C', ink:'#3a2f00', junior:true, order:5 },
  'Oransje/Hvit': { base:'#DE7A2C', mid:'#EFEDE6',  bar:'#16161C', ink:'#fff', junior:true, order:6 },
  'Oransje':      { base:'#DE7A2C', mid:null,       bar:'#16161C', ink:'#fff', junior:true, order:7 },
  'Oransje/Sort': { base:'#DE7A2C', mid:'#1B1B22',  bar:'#16161C', ink:'#fff', junior:true, order:8 },
  'Grønn/Hvit':   { base:'#3C9A63', mid:'#EFEDE6',  bar:'#16161C', ink:'#fff', junior:true, order:9 },
  'Grønn':        { base:'#3C9A63', mid:null,       bar:'#16161C', ink:'#fff', junior:true, order:10 },
  'Grønn/Sort':   { base:'#3C9A63', mid:'#1B1B22',  bar:'#16161C', ink:'#fff', junior:true, order:11 },
};

const ADULT_BELTS  = Object.keys(BELT_META).filter(k => BELT_META[k].adult).sort((a,b)=>BELT_META[a].order-BELT_META[b].order);
const JUNIOR_BELTS = Object.keys(BELT_META).filter(k => BELT_META[k].junior).sort((a,b)=>BELT_META[a].order-BELT_META[b].order);
const ALL_BELTS = [...ADULT_BELTS, ...JUNIOR_BELTS];

function beltMeta(name){ return BELT_META[name] || BELT_META['Hvit']; }
function isJuniorBelt(name){ return !!(BELT_META[name] && BELT_META[name].junior); }
function beltLadder(name){ return isJuniorBelt(name) ? JUNIOR_BELTS : ADULT_BELTS; }
function nextBelt(name){
  const lad = beltLadder(name); const i = lad.indexOf(name);
  return (i>=0 && i<lad.length-1) ? lad[i+1] : null;
}

/* A real-looking belt: coloured body, optional centre stripe, a dark rank-bar near
   the tip holding up to 4 degree stripes. height drives the whole scale. */
function BeltGraphic({ belt, stripes=0, height=26, width, title }){
  const m = beltMeta(belt);
  const h = height;
  const barW = Math.round(h*1.55);
  const stripeW = Math.max(2, Math.round(h*0.13));
  const stripeGap = Math.max(2, Math.round(h*0.11));
  const radius = Math.round(h*0.18);
  return (
    <div title={title || `${belt}${stripes?` · ${stripes} ${stripes===1?'stripe':'striper'}`:''}`}
      style={{ position:'relative', width: width||'100%', height:h, borderRadius:radius,
        background:m.base, boxShadow:'inset 0 0 0 1px rgba(0,0,0,.14), 0 1px 2px rgba(20,16,40,.12)',
        overflow:'hidden', flex:'none' }}>
      {/* subtle weave sheen */}
      <div style={{position:'absolute', inset:0, background:'linear-gradient(180deg, rgba(255,255,255,.16), rgba(0,0,0,.10))'}}/>
      {/* centre stripe for split kids belts / coral */}
      {m.mid && <div style={{position:'absolute', left:0, right:0, top:'34%', height:'32%', background:m.mid}}/>}
      {/* rank bar near the tip */}
      <div style={{position:'absolute', top:0, bottom:0, right:`${Math.round(h*0.5)}px`, width:barW,
        background:m.bar, boxShadow:'inset 1px 0 0 rgba(255,255,255,.12), inset -1px 0 0 rgba(0,0,0,.25)',
        display:'flex', alignItems:'center', justifyContent:'center', gap:stripeGap }}>
        {Array.from({length:stripes}).map((_,i)=>(
          <span key={i} style={{width:stripeW, height:'62%', background:'#F3F1E9', borderRadius:1, boxShadow:'0 0 0 .5px rgba(0,0,0,.3)'}}/>
        ))}
      </div>
    </div>
  );
}

/* Compact label chip: small belt swatch + name (+ stripe dots) */
function BeltChip({ belt, stripes=0, size=13 }){
  const m = beltMeta(belt);
  return (
    <span style={{display:'inline-flex', alignItems:'center', gap:8, fontSize:size, whiteSpace:'nowrap'}}>
      <BeltGraphic belt={belt} stripes={stripes} height={Math.round(size*1.15)} width={Math.round(size*2.6)}/>
      <span style={{fontWeight:600}}>{belt}</span>
      {stripes>0 && <span style={{fontSize:size-2, color:'var(--muted)', fontVariantNumeric:'tabular-nums'}}>{stripes}★</span>}
    </span>
  );
}

Object.assign(window, { BELT_META, ADULT_BELTS, JUNIOR_BELTS, ALL_BELTS, maxStripes,
  beltMeta, isJuniorBelt, beltLadder, nextBelt, BeltGraphic, BeltChip });
