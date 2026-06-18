/* Shared dashboard components and computed data
   Loaded after React. Exports to window. */

const { useState, useEffect, useMemo, useRef } = React;

// =============== DATA HOOK ===============
function useKpis() {
  const [kpis, setKpis] = useState(null);
  useEffect(() => {
    DASH_API.fetchKpis().then(setKpis);
  }, []);
  return kpis;
}

// =============== UTILS ===============
const fmtN = (n) => new Intl.NumberFormat('nb-NO').format(Math.round(n));
const fmtKr = (n) => new Intl.NumberFormat('nb-NO').format(Math.round(n)) + ' kr';
const fmtPct = (n, d=0) => (n*100).toFixed(d) + '%';
const WD = ['Man','Tir','Ons','Tor','Fre','Lør','Søn'];

// Compute derived
function deriveCharts(kpis) {
  if (!kpis) return null;

  // Class popularity: avg attendees per session
  const classes = Object.keys(kpis.classAttendance).map(name => ({
    name,
    total: kpis.classAttendance[name],
    sessions: kpis.classSessions[name],
    avg: kpis.classSessions[name] ? kpis.classAttendance[name] / kpis.classSessions[name] : 0,
  })).sort((a,b) => b.avg - a.avg);

  // Daily timeline (sorted)
  const daily = Object.entries(kpis.dailyAttendance)
    .map(([date, count]) => ({ date, count }))
    .sort((a,b) => a.date.localeCompare(b.date));

  // Monthly aggregate
  const monthly = {};
  for (const d of daily) {
    const m = d.date.slice(0,7);
    monthly[m] = (monthly[m] || 0) + d.count;
  }
  const monthlyArr = Object.entries(monthly).map(([k,v]) => ({m:k, v})).sort((a,b)=>a.m.localeCompare(b.m));

  // Heatmap matrix [day][hour] — broaden to cover full active range (7–22)
  const allHours = [11,12,13,14,15,16,17,18,19,20,21];
  const heatGrid = [];
  let maxAtt = 0;
  for (let d = 0; d < 7; d++) {
    const row = [];
    for (const h of allHours) {
      const att = kpis.heatmap.attendance[`${d}-${h}`] || 0;
      const sessions = kpis.heatmap.sessions[`${d}-${h}`] || 0;
      const avg = sessions ? att/sessions : 0;
      row.push({ d, h, att, sessions, avg });
      if (avg > maxAtt) maxAtt = avg;
    }
    heatGrid.push(row);
  }

  // Cohort retention: people from year X still active
  const signups = kpis.signupsPerYear;
  const stillActive = kpis.cohortByYear;
  const cohortYears = ['2020','2021','2022','2023','2024','2025','2026'];
  const cohorts = cohortYears.map(y => ({
    year: y,
    signups: signups[y] || 0,
    stillActive: stillActive[y] || 0,
    retention: signups[y] ? (stillActive[y] || 0) / signups[y] : 0,
  }));

  // Net member change per year
  const yearly = {};
  for (const y of cohortYears) {
    yearly[y] = {
      signups: signups[y] || 0,
      churn: kpis.deactPerYear[y] || 0,
      net: (signups[y] || 0) - (kpis.deactPerYear[y] || 0),
    };
  }

  // Belt distribution (with extended belts)
  const beltOrder = ['Hvit','Grå/Hvit','Grå','Gul','Oransje','Grønn','Blå','Blått','Lilla','Brun','Sort'];
  const belts = beltOrder
    .filter(b => kpis.byBelt[b])
    .map(b => ({ name: b, count: kpis.byBelt[b] }));

  // Pricing breakdown sorted
  const pricing = Object.entries(kpis.pricingBreakdown)
    .map(([type, info]) => ({ type, ...info }))
    .sort((a,b) => b.mrr - a.mrr);

  return { classes, daily, monthlyArr, heatGrid, allHours, maxAtt, cohorts, yearly, belts, pricing };
}

// =============== TINY CHART PRIMITIVES ===============
// Bar chart (horizontal)
function HBar({ data, valueKey='value', labelKey='label', max, color, showValue=true, height=18, gap=6 }) {
  const m = max || Math.max(...data.map(d => d[valueKey]));
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: gap }}>
      {data.map((d, i) => (
        <div key={i} style={{ display: 'grid', gridTemplateColumns: '120px 1fr 50px', alignItems: 'center', gap: 8, fontSize: 12 }}>
          <div style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{d[labelKey]}</div>
          <div style={{ height, background: 'var(--bar-bg, rgba(0,0,0,.06))', position:'relative' }}>
            <div style={{
              position:'absolute', left:0, top:0, bottom:0,
              width: ((d[valueKey] / m) * 100) + '%',
              background: color || 'var(--accent-dominant)',
            }} />
          </div>
          {showValue && <div style={{ textAlign:'right', fontVariantNumeric:'tabular-nums' }}>{fmtN(d[valueKey])}</div>}
        </div>
      ))}
    </div>
  );
}

// Sparkline / line chart
function Spark({ data, height=60, color, fill, accessor=(d)=>d, showAxis=false }) {
  const ref = useRef(null);
  const [size, setSize] = useState({ w: 400, h: height });
  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(entries => {
      for (const e of entries) setSize({ w: e.contentRect.width, h: height });
    });
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, [height]);

  const values = data.map(accessor);
  const maxV = Math.max(...values);
  const minV = 0;
  const w = size.w;
  const h = size.h;
  const stepX = data.length > 1 ? w / (data.length - 1) : 0;
  const points = values.map((v, i) => {
    const x = i * stepX;
    const y = h - ((v - minV) / (maxV - minV || 1)) * h;
    return [x, y];
  });
  const pathD = points.map((p,i) => (i===0?'M':'L') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
  const fillD = pathD + ` L ${w} ${h} L 0 ${h} Z`;

  return (
    <div ref={ref} style={{ width:'100%', height: h }}>
      <svg width={w} height={h} style={{ display:'block', overflow:'visible' }}>
        {fill && <path d={fillD} fill={fill} />}
        <path d={pathD} fill="none" stroke={color || 'currentColor'} strokeWidth={1.2} />
      </svg>
    </div>
  );
}

// Donut / ring
function Donut({ data, size=140, thickness=22, colors, centerLabel, centerValue }) {
  const total = data.reduce((s,d) => s+d.value, 0);
  const r = (size-thickness)/2;
  const c = 2*Math.PI*r;
  let acc = 0;
  return (
    <div style={{ position:'relative', width:size, height:size }}>
      <svg width={size} height={size}>
        <g transform={`translate(${size/2} ${size/2}) rotate(-90)`}>
          {data.map((d, i) => {
            const dash = (d.value/total) * c;
            const el = (
              <circle key={i} r={r} fill="none"
                stroke={colors[i % colors.length]}
                strokeWidth={thickness}
                strokeDasharray={`${dash} ${c}`}
                strokeDashoffset={-acc}
              />
            );
            acc += dash;
            return el;
          })}
        </g>
      </svg>
      {(centerLabel !== undefined || centerValue !== undefined) && (
        <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', textAlign:'center', lineHeight:1.1 }}>
          {centerValue && <div style={{ fontSize: 22, fontWeight: 700, fontVariantNumeric:'tabular-nums' }}>{centerValue}</div>}
          {centerLabel && <div style={{ fontSize: 10, letterSpacing:'.12em', textTransform:'uppercase', opacity:.7 }}>{centerLabel}</div>}
        </div>
      )}
    </div>
  );
}

// Heatmap
function Heatmap({ grid, hours, max, palette }) {
  return (
    <div style={{ fontSize: 11 }}>
      <div style={{ display: 'grid', gridTemplateColumns: `40px repeat(${hours.length}, 1fr)`, gap: 2 }}>
        <div></div>
        {hours.map(h => <div key={h} style={{ textAlign:'center', opacity:.6 }}>{h}</div>)}
        {grid.map((row, di) => (
          <React.Fragment key={di}>
            <div style={{ display:'flex', alignItems:'center', opacity:.7 }}>{WD[di]}</div>
            {row.map((cell, hi) => {
              const intensity = max ? Math.min(1, cell.avg/max) : 0;
              return (
                <div key={hi} title={`${WD[di]} ${hours[hi]}:00 — ${fmtN(cell.avg)} snitt (${cell.sessions} økter)`}
                     style={{ aspectRatio:'1', background: palette(intensity), display:'flex', alignItems:'center', justifyContent:'center', fontSize: 9, color: intensity > 0.5 ? '#fff' : 'inherit' }}>
                  {cell.sessions > 0 ? Math.round(cell.avg) : ''}
                </div>
              );
            })}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

// Stacked bar - cohort
function CohortBar({ cohorts, color1, color2 }) {
  const max = Math.max(...cohorts.map(c => c.signups));
  return (
    <div style={{ display:'flex', alignItems:'flex-end', gap: 8, height: 200 }}>
      {cohorts.map(c => {
        const totalH = (c.signups / max) * 180;
        const activeH = c.signups ? totalH * (c.stillActive / c.signups) : 0;
        const churnH = totalH - activeH;
        return (
          <div key={c.year} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap: 4 }}>
            <div style={{ fontSize:11, fontVariantNumeric:'tabular-nums' }}>
              <span style={{ color: color1 }}>{c.stillActive}</span>
              <span style={{ opacity:.4 }}>/{c.signups}</span>
            </div>
            <div style={{ width: '100%', height: 180, position: 'relative', display:'flex', flexDirection:'column', justifyContent:'flex-end' }}>
              <div style={{ width:'100%', height: churnH, background: color2 }}></div>
              <div style={{ width:'100%', height: activeH, background: color1 }}></div>
            </div>
            <div style={{ fontSize:11, fontWeight:700 }}>{c.year}</div>
            <div style={{ fontSize:10, opacity:.6 }}>{fmtPct(c.retention)}</div>
          </div>
        );
      })}
    </div>
  );
}

// Export
window.useKpis = useKpis;
window.deriveCharts = deriveCharts;
window.fmtN = fmtN;
window.fmtKr = fmtKr;
window.fmtPct = fmtPct;
window.WD = WD;
window.HBar = HBar;
window.Spark = Spark;
window.Donut = Donut;
window.Heatmap = Heatmap;
window.CohortBar = CohortBar;
