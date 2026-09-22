/* «I dag» — handlingslaget (P1). Fire arbeidslister avledet av eksisterende
   medlemsfelt (Sist sett, Sist gradert, oppmøtetall, ukestrend). Ingen nye
   datakilder. Terskler kommer fra dash_settings (Sheets) via props.
   Barnemaskering: kun fornavn for mindreårige, som ellers i dashboardet.
   Bruker globale KPI, Tile, MemberLink, memberTrendRows, useMembers, fmtN. */
const { useState: useTd } = React;

const TD_MS_DAY = 86400000;
// «Fallende oppmøte»: hvor mange oppmøter medlemmet må ha hatt i de FORRIGE
// fire ukene før et fall er verdt å reagere på. Under dette er utslagene for
// små til å bety noe — 1 → 0 er ikke en trend, det er en bortreist helg.
// Standardverdien ligger nå i dash_settings (fallendeMinPrev4); dette er
// fallback hvis Sheets ikke svarte.
const TD_FALL_MIN_PREV4 = 3;
// «Kontaktet» skjuler raden i to uker. Da rekker medlemmet å svare og komme
// på trening før lista maser igjen — men saken forsvinner ikke for godt.
const TD_KONTAKTET_DAGER = 14;
// «Utsett» er den lange knappen: én måned uten mas.
const TD_UTSETT_DAGER = 30;
// Grensen mellom «stille» og «borte». Under åtte uker er det som regel en
// skade, en eksamen eller en ferie — en telefon holder. Over åtte uker er
// det sjelden et oppmøteproblem lenger, men et medlemskap som må avklares,
// og da er det en annen samtale og en annen liste.
const TD_BORTE_UKER = 8;
// Hvor mange rader en liste viser før «Vis alle». Seks rader er omtrent det
// man rekker å gjøre noe med i én økt.
const TD_MAKS_RADER = 6;

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
// Navnet er allerede maskert i api.js (barn → «Fornavn E.»), så bruk det som
// er. Egen maskering her ga «Emil» ett sted og «Emil A.» et annet.
function tdName(m){ return m.navn || m.fornavn || 'Medlem'; }
// Lokal dato — toISOString() er UTC og gir «i går» før kl. 01/02 norsk tid.
function tdToday(){
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function tdPlussDager(n){
  const d = new Date(); d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

// Hvor lenge en oppfølgingshandling skjuler raden. Notat skjuler ingenting —
// da skal saken fortsatt stå der, bare med et notat på.
function tdSkjultTil(rad){
  if(!rad) return '';
  if(rad.status === 'utsatt') return rad.utsattTil || '';
  if(rad.status === 'kontaktet'){
    const d = new Date(rad.dato);
    if(isNaN(d.getTime())) return '';
    d.setDate(d.getDate() + TD_KONTAKTET_DAGER);
    return d.toISOString().slice(0,10);
  }
  return '';
}
// Siste handling pr. (medlem, liste) avgjør — en ny «kontaktet» nullstiller
// en gammel utsettelse, og omvendt.
function tdSkjulteIder(followup, liste){
  const siste = {};
  (followup || []).forEach(r => {
    if(r.liste !== liste) return;
    const f = siste[r.memberId];
    if(!f || String(r.dato) >= String(f.dato)) siste[r.memberId] = r;
  });
  const idag = tdToday();
  const ut = {};
  Object.keys(siste).forEach(id => {
    const til = tdSkjultTil(siste[id]);
    if(til && til > idag) ut[id] = { til, status: siste[id].status };
  });
  return ut;
}

/* ---------- Oppfølgingsknapper på en rad ---------- */
// Én synlig knapp for det man gjør ni av ti ganger, resten i en ⋯-meny.
// Tre knapper ved siden av hverandre brøt teksten på smale skjermer, og
// «Utsett 30 d» over to linjer ser ut som to knapper.
function TodayHandlinger({ member, liste, onHandling, busy, hovedNavn, hovedNotat }){
  const [notatAapen, setNotatAapen] = useTd(false);
  const [menyAapen, setMenyAapen] = useTd(false);
  const [tekst, setTekst] = useTd('');
  const stopp = e => e.stopPropagation();
  const hoved = () => onHandling(member.id, liste,
    hovedNotat ? { status:'kontaktet', notat: hovedNotat } : { status:'kontaktet' });
  return (
    <>
      <div style={{display:'flex', gap:6, justifyContent:'flex-end', position:'relative'}} onClick={stopp}>
        <button className="btn ghost xs nowrap" disabled={busy}
          title={`Skjuler raden i ${TD_KONTAKTET_DAGER} dager. Treffer medlemmet fortsatt kriteriet etterpå, kommer den tilbake.`}
          onClick={hoved}>✓ {hovedNavn || 'Kontaktet'}</button>
        <button className="btn ghost xs nowrap" disabled={busy} aria-label="Flere valg"
          title="Flere valg" onClick={()=>setMenyAapen(v=>!v)}>⋯</button>
        {menyAapen && (
          <div className="rad-meny" onMouseLeave={()=>setMenyAapen(false)}>
            <button disabled={busy} onClick={()=>{ setMenyAapen(false);
              onHandling(member.id, liste, { status:'utsatt', utsattTil: tdPlussDager(TD_UTSETT_DAGER) }); }}>
              Utsett {TD_UTSETT_DAGER} dager</button>
            <button disabled={busy} onClick={()=>{ setMenyAapen(false); setNotatAapen(true); }}>Notat</button>
          </div>
        )}
      </div>
      {notatAapen && (
        <div style={{display:'flex', gap:6, marginTop:6, justifyContent:'flex-end'}} onClick={stopp}>
          <input value={tekst} maxLength={500} autoFocus
            placeholder="Kort og saklig — ikke helseopplysninger"
            onChange={e=>setTekst(e.target.value)}
            onKeyDown={e=>{ if(e.key==='Enter' && tekst.trim()){ onHandling(member.id, liste, { status:'notat', notat:tekst.trim() }); setTekst(''); setNotatAapen(false); } }}
            style={{flex:1, maxWidth:320, border:'1px solid var(--line-strong)', borderRadius:'var(--r-sm)',
              padding:'6px 10px', font:'inherit', fontSize:12, background:'var(--card)', color:'var(--ink)'}}/>
          <button className="btn primary xs" disabled={busy || !tekst.trim()}
            onClick={()=>{ onHandling(member.id, liste, { status:'notat', notat:tekst.trim() }); setTekst(''); setNotatAapen(false); }}>Lagre</button>
          <button className="btn ghost xs" onClick={()=>{ setNotatAapen(false); setTekst(''); }}>✕</button>
        </div>
      )}
    </>
  );
}

function TodayList({ title, hint, accent, liste, rows, meta, empty, onOpen, skjulte, onHandling, busy,
  hovedNavn, hovedNotat, sammenfoldet }){
  const [visSkjulte, setVisSkjulte] = useTd(false);
  const [visAlle, setVisAlle] = useTd(false);
  const synlige = rows.filter(m => !skjulte[m.id]);
  const antSkjulte = rows.length - synlige.length;
  const alle = visSkjulte ? rows : synlige;
  // Lange lister lammer: seks rader er omtrent det man rekker i én økt.
  const vist = visAlle ? alle : alle.slice(0, TD_MAKS_RADER);
  const innhold = (
    <>
      <Tile title={`${synlige.length} ${synlige.length===1?'medlem':'medlemmer'}`}
        corner={antSkjulte > 0
          ? <button className="btn ghost xs nowrap" onClick={()=>setVisSkjulte(v=>!v)}>
              {visSkjulte ? 'Skjul fulgt opp' : `Vis skjulte (${antSkjulte})`}
            </button>
          : null}>
        {vist.length === 0 ? (
          <div className="dim" style={{fontSize:12}}>{empty}</div>
        ) : (
          <table className="t">
            <tbody>
              {vist.map(m => {
                const sk = skjulte[m.id];
                return (
                  <tr key={m.id} onClick={()=>onOpen(m.id)} style={{cursor:'pointer', opacity: sk ? .55 : 1}}>
                    <td style={{width:34}}>
                      <span style={{display:'inline-block',width:8,height:8,borderRadius:'50%',background:`var(--${accent})`}}/>
                    </td>
                    <td>
                      <MemberLink id={m.id}><strong>{tdName(m)}</strong></MemberLink>
                      <div className="dim" style={{fontSize:11}}>
                        {m.kategori}{m.grading&&m.grading.current?` · ${m.grading.current.belt}`:''}
                        {sk && ` · ${sk.status === 'utsatt' ? 'utsatt' : 'kontaktet'} — tilbake ${sk.til}`}
                      </div>
                    </td>
                    <td className="num dim" style={{whiteSpace:'nowrap'}}>{meta(m)}</td>
                    <td style={{textAlign:'right', width:150}}>
                      <TodayHandlinger member={m} liste={liste} onHandling={onHandling} busy={busy}
                        hovedNavn={hovedNavn} hovedNotat={hovedNotat}/>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        {alle.length > vist.length && (
          <button className="btn ghost xs nowrap" style={{marginTop:10}} onClick={()=>setVisAlle(true)}>
            Vis alle ({alle.length})
          </button>
        )}
        {visAlle && alle.length > TD_MAKS_RADER && (
          <button className="btn ghost xs nowrap" style={{marginTop:10}} onClick={()=>setVisAlle(false)}>Vis færre</button>
        )}
      </Tile>
    </>
  );
  // «Borte over 8 uker» er sammenfoldet: den skal være lett å finne, men ikke
  // det første man møter når man åpner «I dag».
  if (sammenfoldet) {
    return (
      <details className="td-fold">
        <summary>{title} <span className="dim">· {synlige.length} — {hint}</span></summary>
        {innhold}
      </details>
    );
  }
  return (
    <>
      <div className="section-h">{title}<span className="meta">{hint}</span></div>
      {innhold}
    </>
  );
}

function Today({ members, live, thresholds }){
  // Profilen åpnes via den globale kanalen (MemberOpenCtx), ikke lokal state —
  // samme profil som i toppliste, trender og medlemsregister.
  const { open: openMember } = useMemberOpen();
  const { followup, actions } = useMembers();
  const [busy, setBusy] = useTd(false);
  const [feil, setFeil] = useTd('');
  const list = members || [];
  const th = thresholds || {};
  const stilleUker = th.stilleUker || 3;
  const gradMinOppmote = th.gradMinOppmote || 30;
  const gradMinMnd = th.gradMinMnd || 6;
  const introUker = th.introUker || 2;
  const fallMinPrev4 = th.fallendeMinPrev4 || TD_FALL_MIN_PREV4;

  function handling(memberId, liste, extra){
    setBusy(true); setFeil('');
    actions.addFollowup({ memberId, liste, dato: tdToday(), ...extra })
      .catch(e => setFeil('Kunne ikke lagre oppfølging: ' + e.message))
      .then(() => setBusy(false));
  }

  // Introdeltakere har sin egen liste og sin egen samtale («kommer du
  // tilbake?», ikke «vi savner deg på matta»). De skal aldri dukke opp i
  // stille/borte/fallende i tillegg — ingen skal stå i to lister.
  const utenIntro = list.filter(m => m.kategori !== 'Introkurs');

  // 1) Stille: kjent «sist sett», borte mellom terskelen og åtte uker.
  //    (Medlemmer uten oppmøtedata utelates — det er datagap, ikke stillhet.)
  //    Sortert med de ferskeste først: de er lettest å få tilbake.
  const stille = utenIntro
    .filter(m => {
      const d = tdDaysSince(m.oppmote && m.oppmote.sisteOppmote);
      return d != null && d >= stilleUker*7 && d < TD_BORTE_UKER*7;
    })
    .sort((a,b) => tdDaysSince(a.oppmote.sisteOppmote) - tdDaysSince(b.oppmote.sisteOppmote));

  // 1b) Borte over åtte uker: ikke lenger et oppmøteproblem, men et
  //     medlemskap som må avklares.
  const borte = utenIntro
    .filter(m => {
      const d = tdDaysSince(m.oppmote && m.oppmote.sisteOppmote);
      return d != null && d >= TD_BORTE_UKER*7;
    })
    .sort((a,b) => tdDaysSince(b.oppmote.sisteOppmote) - tdDaysSince(a.oppmote.sisteOppmote));

  // 2) Graderingsklare: nok oppmøter SIDEN SIST GRADERING + lenge nok siden.
  //    Tidligere talte den alle oppmøter noensinne, mens rapporten talte fra
  //    forrige gradering — to lister som pekte på hver sine medlemmer. Begge
  //    bruker nå okterSidenGradering(). Sortbelte utelates (graderes i grader).
  const grad = list
    .filter(m => {
      const g = m.grading && m.grading.current; if(!g || g.belt === 'Sort') return false;
      const md = tdDaysSince(g.since); // dager siden sist gradert
      if(md == null || md < gradMinMnd*30) return false;
      return okterSidenGradering(live, m.id, g.since) >= gradMinOppmote;
    })
    .map(m => ({ ...m, siden: okterSidenGradering(live, m.id, m.grading.current.since) }))
    .sort((a,b) => b.siden - a.siden);

  // 3) Intro-oppfølging: introdeltakere som ikke har møtt nylig (eller aldri).
  const intro = list
    .filter(m => {
      if(m.kategori !== 'Introkurs') return false;
      const d = tdDaysSince(m.oppmote && m.oppmote.sisteOppmote);
      return d == null || d >= introUker*7;
    })
    .sort((a,b) => (tdDaysSince(b.oppmote && b.oppmote.sisteOppmote) || 9999) - (tdDaysSince(a.oppmote && a.oppmote.sisteOppmote) || 9999));

  // 4) Fallende oppmøte: samme «siste 4 uker vs. forrige 4» som Trend pr.
  //    medlem (delt funksjon i dashboard-shared.jsx). Medlemmer som allerede
  //    står under «Stille» vises ikke her — det er samme oppfølging to ganger.
  const iStilleEllerBorte = new Set(stille.concat(borte).map(m => m.id));
  const fallende = memberTrendRows(live, utenIntro)
    .filter(r => r.medlem && !iStilleEllerBorte.has(r.id) && r.last4 < r.prev4 && r.prev4 >= fallMinPrev4)
    .sort((a,b) => (a.last4-a.prev4) - (b.last4-b.prev4))
    .map(r => ({ ...r.medlem, fall: r }));
  const harTrend = !!(live && live.memberWeekly);

  // Skjulte rader pr. liste — én handling skjuler bare den lista den gjaldt.
  // «Borte» deler liste-nøkkel med «Stille» i dash_followup: backend godtar
  //  stille/intro/grad/fallende, og de to er to halvdeler av samme sak.
  const skjultStille = tdSkjulteIder(followup, 'stille');
  const skjultGrad = tdSkjulteIder(followup, 'grad');
  const skjultIntro = tdSkjulteIder(followup, 'intro');
  const skjultFall = tdSkjulteIder(followup, 'fallende');
  const synlige = (rows, skjult) => rows.filter(m => !skjult[m.id]).length;

  return (
    <div>
      <div className="grid-4">
        <KPI label="Stille medlemmer" value={fmtN(synlige(stille, skjultStille))} delta={`${stilleUker}–${TD_BORTE_UKER} uker uten oppmøte`} accent="coral"/>
        <KPI label="Graderingsklare" value={fmtN(synlige(grad, skjultGrad))} delta={`≥ ${gradMinOppmote} oppmøter siden gradering · ≥ ${gradMinMnd} mnd`} accent="green"/>
        <KPI label="Intro-oppfølging" value={fmtN(synlige(intro, skjultIntro))} delta={`introkurs · ikke møtt ≥ ${introUker} uker`} accent="amber"/>
        <KPI label="Fallende oppmøte" value={harTrend ? fmtN(synlige(fallende, skjultFall)) : '—'} delta={harTrend ? `siste 4 uker ned · fra ≥ ${fallMinPrev4}` : 'krever koblede oppmøter'} accent="blue"/>
      </div>

      <div className="dim" style={{fontSize:11, margin:'6px 2px 0', lineHeight:1.6}}>
        Listene bygger på «Sist sett», «Sist gradert» og oppmøtetall i registeret — ingen nye datakilder.
        Terskler endres i Innstillinger (⚙ øverst). Klikk en rad for å åpne medlemsprofilen;
        «Kontaktet» skjuler den i {TD_KONTAKTET_DAGER} dager, «Utsett» i {TD_UTSETT_DAGER}.
        Ingen står i mer enn én liste: introdeltakere holdes til sin egen, og den som
        er borte over {TD_BORTE_UKER} uker står ikke også som stille.
      </div>
      {feil && <div style={{fontSize:12, margin:'8px 2px 0', color:'var(--coral)'}}>{feil}</div>}

      <TodayList
        title="Stille medlemmer" hint={`${stilleUker}–${TD_BORTE_UKER} uker uten oppmøte · ferskeste først`} accent="coral"
        liste="stille" rows={stille} meta={m => tdRelSince(m.oppmote.sisteOppmote)}
        empty="Ingen stille medlemmer over terskelen — eller oppmøtedata mangler ennå."
        skjulte={skjultStille} onHandling={handling} busy={busy} onOpen={openMember}/>

      <TodayList
        title="Borte over 8 uker" hint={`≥ ${TD_BORTE_UKER} uker uten oppmøte · medlemskapet bør avklares`} accent="coral"
        liste="stille" rows={borte} meta={m => tdRelSince(m.oppmote.sisteOppmote)}
        empty="Ingen har vært borte så lenge."
        hovedNavn="Avklart" hovedNotat="Medlemskap til avklaring"
        sammenfoldet
        skjulte={skjultStille} onHandling={handling} busy={busy} onOpen={openMember}/>

      <TodayList
        title="Graderingsklare" hint={`≥ ${gradMinOppmote} oppmøter siden gradering · ≥ ${gradMinMnd} mnd`} accent="green"
        liste="grad" rows={grad} meta={m => `${fmtN(m.siden||0)} oppmøter siden gradering · sist gradert ${tdRelSince(m.grading.current.since)}`}
        empty="Ingen kandidater over terskelen akkurat nå."
        skjulte={skjultGrad} onHandling={handling} busy={busy} onOpen={openMember}/>

      <TodayList
        title="Intro-oppfølging" hint={`introkurs · ikke møtt ≥ ${introUker} uker`} accent="amber"
        liste="intro" rows={intro} meta={m => tdRelSince(m.oppmote && m.oppmote.sisteOppmote)}
        empty="Ingen intro-deltakere som trenger oppfølging."
        skjulte={skjultIntro} onHandling={handling} busy={busy} onOpen={openMember}/>

      <TodayList
        title="Fallende oppmøte" hint={`siste 4 uker mot forrige 4 · fra ≥ ${fallMinPrev4} oppmøter`} accent="blue"
        liste="fallende" rows={fallende} meta={m => `${m.fall.prev4} → ${m.fall.last4} oppmøter`}
        empty={harTrend
          ? 'Ingen med markert fall i oppmøte akkurat nå.'
          : 'Krever register-koblede oppmøter — kjør identitetsbroen under Oppmøte.'}
        skjulte={skjultFall} onHandling={handling} busy={busy} onOpen={openMember}/>
    </div>
  );
}

window.Today = Today;
window.tdSkjulteIder = tdSkjulteIder;
window.TD_BORTE_UKER = TD_BORTE_UKER;
window.TD_MAKS_RADER = TD_MAKS_RADER;
