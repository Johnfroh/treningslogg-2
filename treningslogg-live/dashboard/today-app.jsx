/* «I dag» — handlingslaget (P1). Tre arbeidslister avledet av eksisterende
   medlemsfelt (Sist sett, Sist gradert, oppmøtetall). Ingen nye datakilder.
   Terskler kommer fra Tweaks-panelet via props. Barnemaskering: kun fornavn
   for mindreårige, som ellers i dashboardet.
   Bruker globale KPI, Tile, MemberProfile, fmtN. */
const { useState: useTd } = React;

const TD_MS_DAY = 86400000;
function tdDaysSince(iso){
  if(!iso) return null;
  const t = new Date(iso).getTime();
  if(isNaN(t)) return null;
  return Math.floor((Date.now() - t) / TD_MS_DAY);
}
// Vennlig «siden»-tekst. null = ingen registrert dato.
function tdRelSince(iso){
  const d = tdDaysSince(iso);
  if(d == null) return 'aldri registrert';
  if(d <= 0) return 'i dag';
  if(d < 14) return d + ' dager siden';
  if(d < 60) return Math.round(d/7) + ' uker siden';
  return Math.round(d/30.4) + ' mnd siden';
}
// Barnemaskering: mindreårige vises kun med fornavn.
function tdName(m){
  if(m.minor) return m.fornavn || String(m.navn||'').split(/\s+/)[0] || 'Medlem';
  return m.navn;
}

function TodayList({ title, hint, accent, rows, meta, empty, onOpen }){
  return (
    <>
      <div className="section-h">{title}<span className="meta">{hint}</span></div>
      <Tile title={`${rows.length} ${rows.length===1?'medlem':'medlemmer'}`} corner={accent}>
        {rows.length === 0 ? (
          <div className="dim" style={{fontSize:12}}>{empty}</div>
        ) : (
          <table className="t">
            <tbody>
              {rows.map(m => (
                <tr key={m.id} onClick={()=>onOpen(m.id)} style={{cursor:'pointer'}}>
                  <td style={{width:34}}>
                    <span style={{display:'inline-block',width:8,height:8,borderRadius:'50%',background:`var(--${accent})`}}/>
                  </td>
                  <td>
                    <strong>{tdName(m)}</strong>
                    <div className="dim" style={{fontSize:11}}>{m.kategori}{m.grading&&m.grading.current?` · ${m.grading.current.belt}`:''}</div>
                  </td>
                  <td className="num dim" style={{whiteSpace:'nowrap'}}>{meta(m)}</td>
                  <td style={{width:60,textAlign:'right'}}><span className="dim" style={{fontSize:11}}>åpne →</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Tile>
    </>
  );
}

function Today({ members, thresholds }){
  const [openId, setOpenId] = useTd(null);
  const list = members || [];
  const th = thresholds || {};
  const stilleUker = th.stilleUker || 3;
  const gradMinOppmote = th.gradMinOppmote || 30;
  const gradMinMnd = th.gradMinMnd || 6;
  const introUker = th.introUker || 2;

  // 1) Stille medlemmer: kjent «sist sett», men ikke sett på ≥ X uker.
  //    (Medlemmer uten oppmøtedata utelates — det er datagap, ikke stillhet.)
  const stille = list
    .filter(m => { const d = tdDaysSince(m.oppmote && m.oppmote.sisteOppmote); return d != null && d >= stilleUker*7; })
    .sort((a,b) => tdDaysSince(b.oppmote.sisteOppmote) - tdDaysSince(a.oppmote.sisteOppmote));

  // 2) Graderingsklare: nok oppmøter + lenge siden forrige gradering.
  //    Sortbelte utelates (graderes i grader, ikke nye belter her).
  const grad = list
    .filter(m => {
      const g = m.grading && m.grading.current; if(!g || g.belt === 'Sort') return false;
      const ck = (m.oppmote && m.oppmote.checkins) || 0;
      const md = tdDaysSince(g.since); // dager siden sist gradert
      return ck >= gradMinOppmote && md != null && md >= gradMinMnd*30;
    })
    .sort((a,b) => ((b.oppmote.checkins||0) - (a.oppmote.checkins||0)));

  // 3) Intro-oppfølging: introdeltakere som ikke har møtt nylig (eller aldri).
  const intro = list
    .filter(m => {
      if(m.kategori !== 'Introkurs') return false;
      const d = tdDaysSince(m.oppmote && m.oppmote.sisteOppmote);
      return d == null || d >= introUker*7;
    })
    .sort((a,b) => (tdDaysSince(b.oppmote && b.oppmote.sisteOppmote) || 9999) - (tdDaysSince(a.oppmote && a.oppmote.sisteOppmote) || 9999));

  const openMember = list.find(m => m.id === openId);

  return (
    <div>
      <div className="grid-4">
        <KPI label="Stille medlemmer" value={fmtN(stille.length)} delta={`ikke sett ≥ ${stilleUker} uker`} accent="coral"/>
        <KPI label="Graderingsklare" value={fmtN(grad.length)} delta={`≥ ${gradMinOppmote} oppmøter · ≥ ${gradMinMnd} mnd`} accent="green"/>
        <KPI label="Intro-oppfølging" value={fmtN(intro.length)} delta={`introkurs · ikke møtt ≥ ${introUker} uker`} accent="amber"/>
        <KPI label="Medlemmer totalt" value={fmtN(list.length)} delta="i registeret" accent="blue"/>
      </div>

      <div className="dim" style={{fontSize:11, margin:'6px 2px 0', lineHeight:1.6}}>
        Listene bygger på «Sist sett», «Sist gradert» og oppmøtetall i registeret — ingen nye datakilder.
        Terskler justeres i Tweaks-panelet. Klikk en rad for å åpne medlemsprofilen.
      </div>

      <TodayList
        title="Stille medlemmer" hint={`aktive · ikke sett på ≥ ${stilleUker} uker`} accent="coral"
        rows={stille} meta={m => tdRelSince(m.oppmote.sisteOppmote)}
        empty="Ingen stille medlemmer over terskelen — eller oppmøtedata mangler ennå."
        onOpen={setOpenId}/>

      <TodayList
        title="Graderingsklare" hint={`≥ ${gradMinOppmote} oppmøter · ≥ ${gradMinMnd} mnd siden gradering`} accent="green"
        rows={grad} meta={m => `${fmtN(m.oppmote.checkins||0)} oppmøter · sist gradert ${tdRelSince(m.grading.current.since)}`}
        empty="Ingen kandidater over terskelen akkurat nå."
        onOpen={setOpenId}/>

      <TodayList
        title="Intro-oppfølging" hint={`introkurs · ikke møtt ≥ ${introUker} uker`} accent="amber"
        rows={intro} meta={m => tdRelSince(m.oppmote && m.oppmote.sisteOppmote)}
        empty="Ingen intro-deltakere som trenger oppfølging."
        onOpen={setOpenId}/>

      {openMember && <MemberProfile member={openMember} onClose={()=>setOpenId(null)}/>}
    </div>
  );
}

window.Today = Today;
