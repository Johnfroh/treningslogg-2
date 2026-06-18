/* Daylight dashboard — light, soft, rounded */
const { useState, useEffect } = React;

const FONTS = {
  'Plus Jakarta Sans': "'Plus Jakarta Sans', system-ui, sans-serif",
  'Poppins': "'Poppins', system-ui, sans-serif",
  'Figtree': "'Figtree', system-ui, sans-serif",
  'Onest': "'Onest', system-ui, sans-serif",
};
const ACCENTS = ['#7B6EF6', '#F2825F', '#4F9BEA', '#34B98C', '#B06FD6'];
const BG_TONES = { 'Lavendel': '#F4F3FB', 'Krem': '#F8F5F0', 'Kjølig': '#EFF3F8' };

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "font": "Plus Jakarta Sans",
  "accent": "#7B6EF6",
  "bgTone": "Lavendel",
  "radius": 1
}/*EDITMODE-END*/;

function hexA(hex, a) {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0,2),16), g = parseInt(h.slice(2,4),16), b = parseInt(h.slice(4,6),16);
  return `rgba(${r},${g},${b},${a})`;
}

const TABS = [
  { id: 'oversikt', label: 'Oversikt' },
  { id: 'register', label: 'Medlemmer' },
  { id: 'statistikk', label: 'Medlemsstatistikk' },
  { id: 'oppmote', label: 'Oppmøte' },
  { id: 'okonomi', label: 'Økonomi' },
  { id: 'churn', label: 'Kohort & Churn' },
];

const COLORS = ['#7B6EF6','#34B98C','#F2825F','#4F9BEA','#B06FD6','#A6A3BD'];

function App() {
  const [tw, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [tab, setTab] = useState('oversikt');
  const kpis = useKpis();
  const charts = deriveCharts(kpis);

  useEffect(() => {
    const r = document.documentElement.style;
    r.setProperty('--font', FONTS[tw.font] || FONTS['Plus Jakarta Sans']);
    r.setProperty('--accent', tw.accent);
    r.setProperty('--accent-soft', hexA(tw.accent, 0.16));
    r.setProperty('--accent-bg', hexA(tw.accent, 0.10));
    r.setProperty('--bg', BG_TONES[tw.bgTone] || BG_TONES.Lavendel);
    r.setProperty('--rscale', tw.radius);
  }, [tw]);

  if (!kpis) return <div style={{padding:40, color:'#9290A6'}}>Laster…</div>;
  const tabLabel = TABS.find(x=>x.id===tab).label;
  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-badge">BJJ</div>
          <div>
            <div className="brand-title">bodø jiu jitsu</div>
            <div className="brand-meta">klubbpanel · sia 2016</div>
          </div>
        </div>
        <div className="nav">
          {TABS.map(x => (
            <button key={x.id} className={tab===x.id?'active':''} onClick={()=>setTab(x.id)}>
              <span className="dot"/>{x.label}
            </button>
          ))}
        </div>
        <div className="live"><span className="pulse"/>live · oppdatert {kpis.generated}<br/><strong>{kpis.totals.activeMembers}</strong> aktive medlemmer</div>
      </aside>
      <main className="main">
        <div className="topbar">
          <div>
            <div className="crumbs">dashboard / <span className="cur">{tabLabel}</span></div>
            <h1 className="h1">{tabLabel} <small>oppdatert {kpis.generated}</small></h1>
          </div>
          <div className="topbar-pills">
            <span className="pill" title="Konsolidert oppmøtefil"><span className="sw" style={{background:'var(--green)'}}/>verifisert</span>
            <span className="pill"><span className="sw" style={{background:'var(--accent)'}}/>jan 2023 → apr 2026</span>
            <span className="pill"><span className="sw" style={{background:'var(--blue)'}}/>{fmtN(kpis.totals.totalCheckins)} check-ins</span>
          </div>
        </div>
        {tab==='oversikt' && <Oversikt kpis={kpis} charts={charts}/>}
        {tab==='register' && <Register/>}
        {tab==='statistikk' && <Medlemmer kpis={kpis} charts={charts}/>}
        {tab==='oppmote' && <Oppmote kpis={kpis} charts={charts}/>}
        {tab==='okonomi' && <Okonomi kpis={kpis} charts={charts}/>}
        {tab==='churn' && <Churn kpis={kpis} charts={charts}/>}
        {tab!=='register' && <DataFooter kpis={kpis} />}
      </main>
      <TweaksPanel>
        <TweakSection label="Typografi" />
        <TweakSelect label="Font" value={tw.font} options={Object.keys(FONTS)} onChange={v=>setTweak('font', v)} />
        <TweakSection label="Farge & form" />
        <TweakColor label="Aksentfarge" value={tw.accent} options={ACCENTS} onChange={v=>setTweak('accent', v)} />
        <TweakRadio label="Bakgrunn" value={tw.bgTone} options={Object.keys(BG_TONES)} onChange={v=>setTweak('bgTone', v)} />
        <TweakSlider label="Avrunding" value={tw.radius} min={0.5} max={1.5} step={0.1} onChange={v=>setTweak('radius', v)} />
      </TweaksPanel>
    </div>
  );
}

function DataFooter({ kpis }) {
  return (
    <footer className="datafoot">
      <div className="ribbon">
        <span className="lbl">Datagrunnlag · oppmote_konsolidert.xlsx</span>
        <span className="muted">Konsolidert oppmøtefil · 6 Spond-eksporter · {fmtN(kpis.totals.totalCheckins)} check-ins · {fmtN(kpis.totals.sessionsTracked)} unike events (jan 2023 → apr 2026)</span>
      </div>
      <div className="grid">
        <div>
          <div className="h">Kildedata (Spond)</div>
          <ul>
            <li>download__39_.xlsx — søk: nogi</li>
            <li>download__40_.xlsx — søk: basics</li>
            <li>download__44_.xlsx — søk: erfaren</li>
            <li>download__45_.xlsx — søk: viderekommende</li>
            <li>download__46_.xlsx — søk: grunnleggende</li>
            <li>download__47_.xlsx — søk: åpen matte</li>
          </ul>
        </div>
        <div>
          <div className="h">Events pr. nivå</div>
          <ul>
            <li>Åpen matte — 499 events</li>
            <li>Erfaren / Videre — 232 events</li>
            <li>Grunnleggende — 216 events</li>
            <li>Sparring — 37 events</li>
            <li>NoGi (uspes.) — 10 events</li>
          </ul>
        </div>
        <div>
          <div className="h">Nivå-mapping</div>
          <ul>
            <li>Erfaren = Erfaren / Viderekommende / Intermediate</li>
            <li>Grunnleggende = Basics / Grunnleggende</li>
            <li>NoGi (uspes.) = NoGi-titler uten nivå</li>
          </ul>
        </div>
        <div>
          <div className="h">Forbehold</div>
          <ul>
            <li>Hver event talt nøyaktig én gang</li>
            <li>Klokkeslett estimert fra klassetype</li>
            <li>"Invitert"-tall er approksimasjon (Spond aggregerer pr. fil)</li>
          </ul>
        </div>
      </div>
    </footer>
  );
}

function KPI({ label, value, unit, delta, deltaClass, accent='amber', corner }) {
  return (
    <div className={'kpi-tile ' + accent}>
      <div className="label">{label}</div>
      <div className="value">{value}{unit && <span className="unit">{unit}</span>}</div>
      {delta && <div className={'delta '+(deltaClass||'')}>{delta}</div>}
    </div>
  );
}

function Tile({ title, corner, children, style }) {
  return (
    <div className="tile" style={style}>
      <div className="tile-header">
        <div className="tile-title">{title}</div>
        {corner && <div className="tile-corner">{corner}</div>}
      </div>
      {children}
    </div>
  );
}

function Oversikt({ kpis, charts }) {
  const t = kpis.totals;
  return (
    <div>
      <div className="grid-4">
        <KPI label="Aktive medlemmer" value={t.activeMembers} delta={`+${kpis.signupsPerYear['2026']||0} i 2026`} deltaClass="up" accent="amber"/>
        <KPI label="Estimert MRR" value={fmtN(t.mrr)} unit=" kr" delta={`ARR ≈ ${fmtN(t.arr)} kr`} deltaClass="amber" accent="green"/>
        <KPI label="Snitt medlemstid" value={(t.avgTenureDaysActive/365).toFixed(1)} unit=" år" delta="aktive medlemmer" accent="blue"/>
        <KPI label="Total check-ins" value={fmtN(t.totalCheckins)} delta={`${t.sessionsTracked} events · jan 2023 → apr 2026`} accent="coral"/>
      </div>

      <div className="section-h">Klubbens puls<span className="meta">ukentlig oppmøte · jan 2023 → uke 18/2026</span></div>
      <Tile title="oppmøte pr. uke" corner="weekly">
        <Spark
          data={Object.entries(kpis.weeklyAttendance).sort((a,b)=>a[0].localeCompare(b[0]))}
          accessor={d => d[1]} height={140}
          color="var(--accent)" fill="var(--accent-soft)"
        />
        <div style={{display:'flex', justifyContent:'space-between', fontSize:10, color:'var(--text-dim)', letterSpacing:'.12em', textTransform:'uppercase', marginTop:8}}>
          <span>2021</span><span>2026</span>
        </div>
      </Tile>

      <div className="section-h">Sammensetning</div>
      <div className="grid-3">
        <Tile title="Medlemstype" corner="kategori">
          <div style={{display:'flex', gap:14, alignItems:'center', marginTop:6}}>
            <Donut
              data={Object.entries(kpis.byKategori).map(([k,v])=>({label:k, value:v}))}
              colors={COLORS} centerValue={t.activeMembers} centerLabel="aktive"
            />
            <div style={{flex:1, fontSize:11}}>
              {Object.entries(kpis.byKategori).map(([k,v],i) => (
                <div key={k} style={{display:'flex', justifyContent:'space-between', padding:'3px 0'}}>
                  <span><span style={{display:'inline-block',width:8,height:8,marginRight:6,background:COLORS[i]}}/>{k}</span>
                  <span className="tabular">{v}</span>
                </div>
              ))}
            </div>
          </div>
        </Tile>
        <Tile title="Aldersfordeling" corner="alder">
          <HBar data={Object.entries(kpis.byAgeBucket).map(([k,v])=>({label:k, value:v}))} color="#5A8DB0" height={18}/>
        </Tile>
        <Tile title="Kjønn" corner="kjonn">
          <div style={{display:'flex', gap:14, alignItems:'center'}}>
            <Donut
              data={Object.entries(kpis.byKjonn).map(([k,v])=>({label:k, value:v}))}
              colors={['#4F9BEA','#F2825F','#C0BED2']}
              centerValue={fmtPct(kpis.byKjonn.Mann/(kpis.byKjonn.Mann+kpis.byKjonn.Kvinne))} centerLabel="menn"
            />
            <div style={{flex:1, fontSize:11}}>
              {Object.entries(kpis.byKjonn).map(([k,v],i)=>(
                <div key={k} style={{padding:'3px 0', display:'flex', justifyContent:'space-between'}}>
                  <span><span style={{display:'inline-block',width:8,height:8,marginRight:6,background:['#4F9BEA','#F2825F','#C0BED2'][i]}}/>{k}</span>
                  <span className="tabular">{v}</span>
                </div>
              ))}
            </div>
          </div>
        </Tile>
      </div>

      <div className="section-h">Klassepopularitet<span className="meta">snitt deltagere pr. økt</span></div>
      <Tile title="alle klassetyper" corner="ranking">
        <HBar data={charts.classes.map(c=>({label:c.name+' ('+c.sessions+' økter)', value:Math.round(c.avg*10)/10}))} color="var(--accent)" height={20}/>
      </Tile>

      <div className="section-h">Topp 5 mest dedikerte<span className="meta">flest registrerte oppmøter</span></div>
      <Tile title="leaderboard" corner="hot">
        <table className="t">
          <thead><tr><th>#</th><th>Navn</th><th className="num">Oppmøter</th><th className="num">Snitt %</th></tr></thead>
          <tbody>
            {kpis.leaderboard.slice(0,5).map((m,i)=>(
              <tr key={m.navn}>
                <td className="dim tabular">{String(i+1).padStart(2,'0')}</td>
                <td><strong>{m.navn}</strong> {i===0 && <span className="tag amber">leder</span>}</td>
                <td className="num"><span style={{color:'var(--amber)'}}>{m.deltatt}</span></td>
                <td className="num">{fmtPct(m.pct)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Tile>
    </div>
  );
}

function Medlemmer({ kpis, charts }) {
  const t = kpis.totals;
  return (
    <div>
      <div className="grid-4">
        <KPI label="Aktive" value={t.activeMembers} delta={`+${kpis.signupsPerYear['2026']||0} i 2026`} deltaClass="up" accent="amber"/>
        <KPI label="Junior + Knøtte" value={kpis.byKategori['Junior']||0} delta="9–14 år" accent="green"/>
        <KPI label="Voksen + Student" value={(kpis.byKategori['Voksen']||0)+(kpis.byKategori['Student']||0)} delta="16+ år" accent="blue"/>
        <KPI label="Kvinneandel" value={fmtPct(kpis.byKjonn.Kvinne/(kpis.byKjonn.Mann+kpis.byKjonn.Kvinne))} delta={`${kpis.byKjonn.Kvinne} av ${kpis.byKjonn.Mann+kpis.byKjonn.Kvinne}`} accent="coral"/>
      </div>

      <div className="section-h">Beltefordeling<span className="meta">graderingsstatus</span></div>
      <div className="grid-2-1">
        <Tile title="Belter — fordeling" corner="grading">
          <div style={{display:'flex', flexDirection:'column', gap:6, marginTop:8}}>
            {[
              {n:'Hvit', c:kpis.byBelt['Hvit']||0, color:'#EFEDF8'},
              {n:'Grå/Hvit', c:kpis.byBelt['Grå/Hvit']||0, color:'#9290A6'},
              {n:'Blå', c:(kpis.byBelt['Blå']||0)+(kpis.byBelt['Blått']||0), color:'#4F9BEA'},
              {n:'Lilla', c:kpis.byBelt['Lilla']||0, color:'#B06FD6'},
              {n:'Brun', c:kpis.byBelt['Brun']||0, color:'#B07A4A'},
              {n:'Sort', c:kpis.byBelt['Sort']||0, color:'#2B2A3C'},
            ].map((b,i)=>{
              const max = 93;
              return (
                <div key={i} className="bar-row">
                  <div className="name">
                    <span style={{width:10,height:10,background:b.color, border:'1px solid var(--border-strong)'}}/>
                    <span style={{textTransform:'uppercase',fontSize:10,letterSpacing:'.14em'}}>{b.n}</span>
                    <div className="meter"><div style={{width:(b.c/max)*100+'%', background:b.color}}/></div>
                  </div>
                  <span className="tabular" style={{textAlign:'right'}}>{b.c}</span>
                </div>
              );
            })}
          </div>
          <div className="dim" style={{fontSize:11, marginTop:14, lineHeight:1.6}}>
            93% er fortsatt på hvitt belte. En relativt ung medlemsbase — men en synlig pyramide av blå/lilla/sort som gir teknisk dybde til klubben.
          </div>
        </Tile>
        <Tile title="Vekst over år" corner="trend">
          <div style={{display:'flex', alignItems:'flex-end', gap:6, height: 180, padding: '8px 0'}}>
            {['2020','2021','2022','2023','2024','2025','2026'].map(y=>{
              const s = kpis.signupsPerYear[y]||0;
              const c = kpis.deactPerYear[y]||0;
              const max = Math.max(...Object.values(kpis.signupsPerYear));
              return (
                <div key={y} style={{flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:4}}>
                  <div className="dim" style={{fontSize:9}}>+{s}/-{c}</div>
                  <div style={{position:'relative', width:'100%', height: 130, display:'flex', flexDirection:'column', justifyContent:'flex-end'}}>
                    <div style={{height:(s/max)*130, background:'var(--amber)'}}/>
                    <div style={{height:(c/max)*130, background:'var(--coral)', opacity:.7}}/>
                  </div>
                  <div style={{fontSize:10, fontWeight:700}}>{y}</div>
                </div>
              );
            })}
          </div>
          <div style={{display:'flex', gap:12, fontSize:10, color:'var(--text-mut)', textTransform:'uppercase', letterSpacing:'.14em', marginTop:8}}>
            <span><span style={{display:'inline-block',width:8,height:8,background:'var(--amber)',marginRight:5}}/>nye</span>
            <span><span style={{display:'inline-block',width:8,height:8,background:'var(--coral)',marginRight:5}}/>sluttet</span>
          </div>
        </Tile>
      </div>

      <div className="section-h">Geografi<span className="meta">topp 12 postnummer i Bodø</span></div>
      <Tile title="postnumre" corner="map">
        <HBar data={Object.entries(kpis.byPostnr).sort((a,b)=>b[1]-a[1]).map(([k,v])=>({label:k+' · Bodø', value:v}))} color="#5A8DB0" height={14}/>
      </Tile>
    </div>
  );
}

function Oppmote({ kpis, charts }) {
  const t = kpis.totals;
  function palette(intensity) {
    if (intensity === 0) return 'rgba(255,255,255,.03)';
    return `rgba(123,110,246,${0.1 + intensity * 0.85})`;
  }
  return (
    <div>
      <div className="grid-4">
        <KPI label="Total check-ins" value={fmtN(t.totalCheckins)} delta="jan 2023 → apr 2026" accent="amber"/>
        <KPI label="Økter holdt" value={fmtN(t.sessionsTracked)} delta="2023 → i dag" accent="green"/>
        <KPI label="Snitt pr. økt" value={(t.totalCheckins/t.sessionsTracked).toFixed(1)} delta="deltagere" accent="blue"/>
        <KPI label="Mest populære" value={charts.classes[0].name} delta={`${charts.classes[0].avg.toFixed(1)} snitt`} deltaClass="amber" accent="coral"/>
      </div>

      <div className="section-h">Heatmap<span className="meta">snitt oppmøte · ukedag × time</span></div>
      <Tile title="når trener vi" corner="weekly">
        <Heatmap grid={charts.heatGrid} hours={charts.allHours} max={charts.maxAtt} palette={palette}/>
        <div className="dim" style={{fontSize:11, marginTop:12}}>Sterkeste pulser: torsdag 18 (1 071 estimerte check-ins) og tirsdag 18 (1 033) er klubbens hjerteslag — Erfaren-økter. Helga lever på Åpen Matte: lørdag og søndag 12 (~651 hver). Klokkeslett er estimert fra klassetype.</div>
      </Tile>

      <div className="section-h">Topp 10 mest dedikerte</div>
      <Tile title="leaderboard" corner="dedicated">
        <table className="t">
          <thead><tr><th>#</th><th>Navn</th><th className="num">Oppmøter</th><th className="num">Inviterte</th><th className="num">%</th></tr></thead>
          <tbody>
            {kpis.leaderboard.slice(0,10).map((m,i)=>(
              <tr key={m.navn}>
                <td className="dim tabular">{String(i+1).padStart(2,'0')}</td>
                <td><strong>{m.navn}</strong>{i===0 && <span className="tag amber" style={{marginLeft:8}}>leder</span>}{i===1 && <span className="tag green" style={{marginLeft:8}}>2.</span>}{i===2 && <span className="tag coral" style={{marginLeft:8}}>3.</span>}</td>
                <td className="num" style={{color:'var(--amber)', fontWeight:700}}>{m.deltatt}</td>
                <td className="num dim">{m.invitert}</td>
                <td className="num">{fmtPct(m.pct)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Tile>

      <div className="section-h">Klassepopularitet<span className="meta">snitt deltagere pr. økt</span></div>
      <Tile title="ranking" corner="popularity">
        <HBar data={charts.classes.map(c=>({label:c.name+' ('+c.sessions+' økter)', value:Math.round(c.avg*10)/10}))} color="var(--accent)" height={20}/>
      </Tile>

      <div className="section-h">Klubbens puls<span className="meta">ukentlig oppmøte over tid</span></div>
      <Tile title="weekly attendance" corner="long-range">
        <Spark data={Object.entries(kpis.weeklyAttendance).sort((a,b)=>a[0].localeCompare(b[0]))} accessor={d=>d[1]} height={140} color="#4D9A6B" fill="rgba(52,185,140,.15)"/>
      </Tile>
    </div>
  );
}

function Okonomi({ kpis, charts }) {
  const t = kpis.totals;
  const { okonomi, okonomiActions } = useMembers();
  const [impOpen, setImpOpen] = useState(false);
  const ok = okonomi;
  const latestKey = ok && ok.keys.length ? ok.keys[ok.keys.length-1] : null;
  const latest = latestKey ? ok.months[latestKey] : null;
  const maxNet = ok && ok.keys.length ? Math.max(1, ...ok.keys.map(k=>ok.months[k].netto)) : 1;
  return (
    <div>
      <div className="section-h">Faktiske utbetalinger<span className="meta">importert fra Spond · netto etter avgifter</span></div>
      {!ok ? <Tile title="laster">…</Tile> : (
      <>
      <div className="grid-4">
        <KPI label={latest? 'Netto · '+monthLabel(latestKey):'Netto'} value={latest?fmtN(latest.netto):'—'} unit=" kr" delta={latest?`${latest.antall} betalinger`:'ingen data'} accent="green"/>
        <KPI label="Brutto" value={latest?fmtN(latest.brutto):'—'} unit=" kr" delta="før avgifter" accent="amber"/>
        <KPI label="Spond-avgifter" value={latest?fmtN(latest.avgifter):'—'} unit=" kr" delta={latest&&latest.brutto?fmtPct(latest.avgifter/latest.brutto,1):''} deltaClass="down" accent="coral"/>
        <KPI label="Måneder i trend" value={ok.keys.length} delta={ok.keys.length>1 ? monthLabel(ok.keys[0])+' → '+monthLabel(latestKey) : 'importer flere for trend'} accent="blue"/>
      </div>

      <div className="section-h" style={{marginTop:26}}>Inntektstrend<span className="meta"><button className="btn primary sm" onClick={()=>setImpOpen(true)}>Importer økonomi</button></span></div>
      <Tile title="netto pr. måned" corner="faktisk">
        {ok.keys.length>0 ? (
          <div className="okbars">
            {ok.keys.map(k=>(
              <div key={k} className="okbar">
                <div className="okbar-v tabular">{fmtN(ok.months[k].netto/1000)}k</div>
                <div className="okbar-track"><div className="okbar-fill" style={{height:(ok.months[k].netto/maxNet)*100+'%'}}/></div>
                <div className="okbar-l" title={monthLabel(k)}>{String(k).slice(5)==='01' ? String(k).slice(0,4) : ''}</div>
              </div>
            ))}
          </div>
        ) : <div className="muted" style={{padding:24}}>Ingen importerte måneder ennå. Klikk «Importer økonomi».</div>}
        {ok.keys.length===1 && <div className="dim" style={{fontSize:11,marginTop:14,lineHeight:1.6}}>Bare én måned importert så langt — last opp flere Spond-eksporter (én pr. måned) for å bygge trenden over tid.</div>}
      </Tile>

      {latest && Object.keys(latest.byKategori).length>0 && (
        <>
        <div className="section-h" style={{marginTop:26}}>Inntekt pr. kategori<span className="meta">{monthLabel(latestKey)} · netto</span></div>
        <Tile title="netto pr. medlemstype" corner="kategori">
          <HBar data={Object.entries(latest.byKategori).sort((a,b)=>b[1]-a[1]).map(([k,v])=>({label:k, value:v}))} color="var(--green)" height={20}/>
        </Tile>
        </>
      )}
      </>
      )}

      <div className="section-h" style={{marginTop:32}}>Estimert kontingent<span className="meta">modellert fra medlemstall × pris</span></div>
      <div style={{padding:'14px 16px', borderRadius:'calc(16px * var(--rscale))', background:'var(--accent-bg)', marginBottom:20, fontSize:12, color:'var(--ink-soft)'}}>
        <span className="tag amber" style={{marginRight:10}}>estimat</span>
        Beregnet ut fra antall aktive medlemmer × pris pr. medlemstype. Junior-semesterpris (1500,-) fordelt over 6 mnd. Tar ikke hensyn til intro-kurs, drop-in eller arrangementsinntekter.
      </div>
      <div className="grid-4">
        <KPI label="Estimert MRR" value={fmtN(t.mrr)} unit=" kr" delta="månedlig kontingent" accent="amber"/>
        <KPI label="Estimert ARR" value={fmtN(t.arr)} unit=" kr" delta="× 12" accent="green"/>
        <KPI label="Snitt pr. medlem" value={fmtN(t.mrr/t.activeMembers)} unit=" kr/mnd" accent="blue"/>
        <KPI label="Betalende medlemmer" value={charts.pricing.filter(p=>p.monthly>0).reduce((s,p)=>s+p.count,0)} delta={`av ${t.activeMembers} aktive`} accent="coral"/>
      </div>
      <div className="section-h">Inntekt pr. medlemstype</div>
      <Tile title="pricing breakdown" corner="mrr">
        <table className="t">
          <thead><tr><th>Medlemstype</th><th className="num">Antall</th><th className="num">Pris/mnd</th><th className="num">MRR</th><th className="num">Andel</th></tr></thead>
          <tbody>
            {charts.pricing.map(p=>(
              <tr key={p.type}>
                <td>{p.type}</td>
                <td className="num">{p.count}</td>
                <td className="num">{p.monthly>0 ? fmtN(p.monthly)+' kr' : <span className="dim">—</span>}</td>
                <td className="num"><strong style={{color:'var(--amber)'}}>{fmtN(p.mrr)} kr</strong></td>
                <td className="num">{fmtPct(p.mrr/t.mrr)}</td>
              </tr>
            ))}
            <tr style={{borderTop:'1px solid var(--amber)'}}>
              <td><strong>Sum</strong></td>
              <td className="num"><strong>{t.activeMembers}</strong></td>
              <td/>
              <td className="num"><strong style={{color:'var(--amber)'}}>{fmtN(t.mrr)} kr</strong></td>
              <td className="num"><strong>100%</strong></td>
            </tr>
          </tbody>
        </table>
      </Tile>

      <div className="section-h">Sammensetning av inntekt</div>
      <div className="grid-1-2">
        <Tile title="MRR-mix" corner="donut">
          <Donut data={charts.pricing.filter(p=>p.mrr>0).map(p=>({label:p.type, value:p.mrr}))}
                 size={220} thickness={32} colors={COLORS}
                 centerValue={fmtN(t.mrr)} centerLabel="kr/mnd"/>
        </Tile>
        <Tile title="MRR pr. tier" corner="ranking">
          <HBar data={charts.pricing.filter(p=>p.mrr>0).map(p=>({label:p.type.split(' ').slice(0,3).join(' '), value:p.mrr}))} color="var(--accent)" height={22}/>
        </Tile>
      </div>
      {impOpen && <OkonomiImportModal onClose={()=>setImpOpen(false)}/>}
    </div>
  );
}

function Churn({ kpis, charts }) {
  const t = kpis.totals;
  return (
    <div>
      <div className="grid-4">
        <KPI label="Totalt deaktiverte" value={t.deactivated} delta="siden 2023" deltaClass="down" accent="coral"/>
        <KPI label="Sluttet — snitt tid" value={(t.avgTenureDaysChurned/30).toFixed(1)} unit=" mnd" accent="amber"/>
        <KPI label="Aktive — snitt tid" value={(t.avgTenureDaysActive/365).toFixed(1)} unit=" år" deltaClass="up" accent="green"/>
        <KPI label="Konv. intro→fast" value={fmtPct(kpis.conversion.rate)} delta={`${kpis.conversion.converted} / ${kpis.conversion.introTotal}`} accent="blue"/>
      </div>

      <div className="section-h">Kohort-retention<span className="meta">hvor mange fra hvert år trener fortsatt?</span></div>
      <Tile title="cohort" corner="retention">
        <CohortBar cohorts={charts.cohorts} color1="#34B98C" color2="rgba(242,130,95,.35)"/>
        <div style={{display:'flex', gap:14, fontSize:10, color:'var(--text-mut)', textTransform:'uppercase', letterSpacing:'.14em', marginTop:14}}>
          <span><span style={{display:'inline-block',width:8,height:8,background:'#34B98C',marginRight:6}}/>fortsatt aktive</span>
          <span><span style={{display:'inline-block',width:8,height:8,background:'rgba(242,130,95,.35)',marginRight:6}}/>sluttet</span>
        </div>
        <div className="dim" style={{fontSize:11, marginTop:14, lineHeight:1.6}}>
          Av 51 personer som meldte seg inn i 2021 trener {kpis.cohortByYear['2021']||0} fortsatt — det er {fmtPct((kpis.cohortByYear['2021']||0)/51)} 5-års-retention. Av 78 fra 2025 er {kpis.cohortByYear['2025']||0} fortsatt aktive ({fmtPct((kpis.cohortByYear['2025']||0)/78)}).
        </div>
      </Tile>

      <div className="section-h">Deaktiveringer pr. år</div>
      <Tile title="churn" corner="annual">
        <HBar data={Object.entries(kpis.deactPerYear).sort((a,b)=>a[0].localeCompare(b[0])).map(([k,v])=>({label:k, value:v}))} color="#C45838" height={22}/>
      </Tile>

      <div className="section-h">Konverteringsfunnel<span className="meta">intro-kurs → fast medlemskap</span></div>
      <Tile title="funnel" corner="conversion">
        <div style={{display:'flex', gap:24, padding:'10px 0', alignItems:'center'}}>
          <div style={{flex:1}}>
            <div className="muted" style={{fontSize:10, letterSpacing:'.18em', textTransform:'uppercase'}}>Trinn 1 — intro-kurs</div>
            <div style={{fontSize:36, fontWeight:700}}>{kpis.conversion.introTotal}</div>
            <div className="dim" style={{fontSize:11}}>registrerte intro-deltagere</div>
          </div>
          <div className="dim" style={{fontSize:24}}>→</div>
          <div style={{flex:1}}>
            <div className="muted" style={{fontSize:10, letterSpacing:'.18em', textTransform:'uppercase'}}>Trinn 2 — fast medlem nå</div>
            <div style={{fontSize:36, fontWeight:700, color:'var(--coral)'}}>{kpis.conversion.converted}</div>
            <div className="dim" style={{fontSize:11}}>fortsatt aktive</div>
          </div>
          <div style={{flex:1}}>
            <div className="muted" style={{fontSize:10, letterSpacing:'.18em', textTransform:'uppercase'}}>Konverteringsrate</div>
            <div style={{fontSize:36, fontWeight:700, color:'var(--coral)'}}>{fmtPct(kpis.conversion.rate)}</div>
            <div className="dim" style={{fontSize:11}}>navn-match-basert</div>
          </div>
        </div>
        <div className="dim" style={{fontSize:11, padding:14, borderTop:'1px solid var(--border)', marginTop:8}}>
          <strong>Merknad:</strong> intro-deltagere som senere ble fast medlem registreres trolig som <em>nye</em> medlemskap i Spond. Anbefaling: tag intro-kohorter eksplisitt så vi får ekte konverteringstall.
        </div>
      </Tile>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
window.KPI = KPI;
window.Tile = Tile;
root.render(<MembersProvider><App /></MembersProvider>);
