/* Member profile slide-over + grading dialog + timeline.
   Uses window globals from belt-system.jsx and members-store.jsx. */
const { useState: useStateP } = React;

const INSTRUKTORER = ['Frank R. Dahl','John-Anders Frøhlich','Magnus Andersen','Andreas Høier'];
const todayP = () => new Date().toISOString().slice(0,10);
function fmtDate(iso){
  if(!iso) return '—';
  try { return new Date(iso).toLocaleDateString('nb-NO',{day:'numeric',month:'short',year:'numeric'}); }
  catch(e){ return iso; }
}
function tenure(iso){
  if(!iso) return '—';
  const y = (Date.now()-new Date(iso))/(365.25*86400000);
  return y<1 ? Math.round(y*12)+' mnd' : y.toFixed(1)+' år';
}
function initials(n){ return n.split(/\s+/).slice(0,2).map(w=>w[0]||'').join('').toUpperCase(); }

/* ---------- Grading dialog (single + bulk, stripe + belt) ---------- */
function GradeDialog({ targets, single, member, initialMode='belte', onClose }){
  const { actions } = useMembers();
  const isBulk = !single;
  const curBelt = single ? member.grading.current.belt : 'Hvit';
  const curStripes = single ? member.grading.current.stripes : 0;

  const [mode, setMode] = useStateP(initialMode); // 'stripe' | 'belte'
  const [belt, setBelt] = useStateP(single ? curBelt : 'Blå');
  const [stripes, setStripes] = useStateP(0);
  const [date, setDate] = useStateP(todayP());
  const [by, setBy] = useStateP(INSTRUKTORER[0]);
  const [note, setNote] = useStateP('');

  const canStripe = single ? curStripes < window.maxStripes : true;

  function apply(){
    if(mode==='stripe') actions.awardStripe(targets, { date, by, note });
    else actions.awardBelt(targets, { belt, stripes, date, by, note });
    onClose();
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e=>e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <div className="modal-kicker">{isBulk ? `Masse­gradering · ${targets.length} medlemmer` : 'Gradering'}</div>
            <div className="modal-title">{single ? member.navn : 'Gradér valgte'}</div>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Lukk">✕</button>
        </div>

        <div className="seg">
          <button className={mode==='stripe'?'on':''} disabled={single&&!canStripe} onClick={()=>setMode('stripe')}>+ Stripe</button>
          <button className={mode==='belte'?'on':''} onClick={()=>setMode('belte')}>Nytt belte</button>
        </div>

        {mode==='stripe' ? (
          <div className="dlg-body">
            {single ? (
              <div className="preview-row">
                <BeltGraphic belt={curBelt} stripes={Math.min(window.maxStripes,curStripes+1)} height={34} width={150}/>
                <div style={{fontSize:13}}>
                  <strong>{curBelt}</strong> · {curStripes} → <strong>{Math.min(window.maxStripes,curStripes+1)} striper</strong>
                </div>
              </div>
            ) : (
              <div className="hint">Gir <strong>+1 stripe</strong> til alle valgte (maks 4 — de som allerede har 4 hoppes over).</div>
            )}
          </div>
        ) : (
          <div className="dlg-body">
            <label className="fld">
              <span>Belte</span>
              <select value={belt} onChange={e=>setBelt(e.target.value)}>
                <optgroup label="Voksenbelter">{ADULT_BELTS.map(b=> <option key={b} value={b}>{b}</option>)}</optgroup>
                <optgroup label="Juniorbelter">{JUNIOR_BELTS.map(b=> <option key={b} value={b}>{b}</option>)}</optgroup>
              </select>
            </label>
            <div className="fld">
              <span>Striper ved tildeling</span>
              <Stepper value={stripes} onChange={setStripes}/>
            </div>
            <div className="preview-row">
              <BeltGraphic belt={belt} stripes={stripes} height={34} width={150}/>
              <div style={{fontSize:13}}><strong>{belt}</strong>{stripes>0?` · ${stripes} striper`:''}</div>
            </div>
          </div>
        )}

        <div className="dlg-grid2">
          <label className="fld">
            <span>Dato</span>
            <input type="date" value={date} max={todayP()} onChange={e=>setDate(e.target.value)}/>
          </label>
          <label className="fld">
            <span>Gradert av</span>
            <select value={by} onChange={e=>setBy(e.target.value)}>
              {INSTRUKTORER.map(n=> <option key={n} value={n}>{n}</option>)}
            </select>
          </label>
        </div>
        <label className="fld">
          <span>Notat <em className="opt">(valgfritt)</em></span>
          <input type="text" placeholder="f.eks. graderingsdag vår 2026" value={note} onChange={e=>setNote(e.target.value)}/>
        </label>

        <div className="modal-foot">
          <button className="btn ghost" onClick={onClose}>Avbryt</button>
          <button className="btn primary" onClick={apply}>
            {mode==='stripe' ? (isBulk?`Gi stripe til ${targets.length}`:'Registrer stripe') : (isBulk?`Sett belte for ${targets.length}`:'Registrer belte')}
          </button>
        </div>
      </div>
    </div>
  );
}

function Stepper({ value, onChange, min=0, max=4 }){
  return (
    <div className="stepper">
      <button onClick={()=>onChange(Math.max(min,value-1))} disabled={value<=min}>−</button>
      <span className="tabular">{value}</span>
      <button onClick={()=>onChange(Math.min(max,value+1))} disabled={value>=max}>+</button>
    </div>
  );
}

/* ---------- Timeline ---------- */
function Timeline({ history }){
  const items = [...history].reverse();
  return (
    <div className="timeline">
      {items.map((e,i)=>{
        const m = beltMeta(e.belt);
        const label = e.kind==='innmelding' ? 'Innmeldt i klubben'
          : e.kind==='belte' ? `Gradert til ${e.belt}`
          : e.kind==='stripe' ? `${e.stripes}. stripe` : 'Justert';
        return (
          <div className="tl-item" key={e.id||i}>
            <div className="tl-dot" style={{background:m.base, boxShadow:'inset 0 0 0 1px rgba(0,0,0,.15)'}}/>
            <div className="tl-body">
              <div className="tl-top">
                <strong>{label}</strong>
                <span className="tl-date">{fmtDate(e.date)}</span>
              </div>
              <div className="tl-sub">
                <BeltGraphic belt={e.belt} stripes={e.stripes} height={15} width={42}/>
                <span>{e.belt}{e.stripes?` · ${e.stripes} striper`:''}</span>
                {e.by && <span className="tl-by">· {e.by}</span>}
              </div>
              {e.note && <div className="tl-note">"{e.note}"</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ---------- Profile slide-over ---------- */
function MemberProfile({ member, onClose }){
  const { actions } = useMembers();
  const [dlg, setDlg] = useStateP(null); // 'stripe'|'belte'
  const g = member.grading;
  const minor = !!member.minor; // barn: kun fornavn + belte/oppmøte, ingen bakgrunnsdata
  const edited = actions.isEdited(member.id);
  const promotions = g.history.filter(e=>e.kind==='belte').length;

  return (
    <div className="slideover-backdrop" onClick={onClose}>
      <aside className="slideover" onClick={e=>e.stopPropagation()}>
        <div className="so-top">
          <button className="icon-btn" onClick={onClose} aria-label="Lukk">✕</button>
        </div>

        <div className="profile-hero">
          <div className="avatar" style={{background:beltMeta(g.current.belt).base}}>
            <span style={{color:beltMeta(g.current.belt).ink}}>{initials(member.navn)}</span>
          </div>
          <div style={{minWidth:0}}>
            <div className="ph-name">{member.navn}{edited && <span className="tag amber" style={{marginLeft:8,verticalAlign:'middle'}}>endret</span>}</div>
            <div className="ph-meta">
              <span className="tag green">{member.kategori}</span>
              <span>· medlem i {tenure(member.innmeldingsdato)}</span>
              {member.alder!=null && <span>· {member.alder} år</span>}
            </div>
          </div>
        </div>

        {/* Belt panel */}
        <div className="so-card">
          <div className="so-card-h">
            <span>Belte & gradering</span>
            {edited && <button className="mini-link" onClick={()=>actions.resetMember(member.id)}>tilbakestill</button>}
          </div>
          <div className="belt-hero">
            <BeltGraphic belt={g.current.belt} stripes={g.current.stripes} height={46}/>
          </div>
          <div className="belt-hero-meta">
            <div><strong style={{fontSize:16}}>{g.current.belt}</strong>{g.current.stripes>0 && <span className="muted"> · {g.current.stripes} {g.current.stripes===1?'stripe':'striper'}</span>}</div>
            <div className="muted" style={{fontSize:12}}>oppnådd {fmtDate(g.current.since)} · {promotions} graderinger totalt</div>
          </div>
          <div className="btn-row">
            <button className="btn primary sm" onClick={()=>setDlg('stripe')} disabled={g.current.stripes>=window.maxStripes}>+ Gi stripe</button>
            <button className="btn outline sm" onClick={()=>setDlg('belte')}>Gi nytt belte</button>
            <button className="btn ghost sm" onClick={()=>actions.undoLast(member.id)} disabled={g.history.length<=1}>Angre siste</button>
          </div>
          <div className="so-card-h" style={{marginTop:20,marginBottom:10}}><span>Graderingshistorikk</span></div>
          <Timeline history={g.history}/>
        </div>

        {/* Membership / payment — skjult for mindreårige */}
        {!minor && (
        <div className="so-card">
          <div className="so-card-h"><span>Medlemskap & betaling</span></div>
          <dl className="kv">
            <div><dt>Medlemstype</dt><dd>{member.medlemstype||'—'}</dd></div>
            <div><dt>Pris</dt><dd>{member.prisMnd?`${member.prisMnd} kr/mnd`:'—'}</dd></div>
            <div><dt>Innmeldt</dt><dd>{fmtDate(member.innmeldingsdato)}</dd></div>
            <div><dt>Kategori</dt><dd>{member.kategori}</dd></div>
          </dl>
        </div>
        )}

        {/* Attendance */}
        <div className="so-card">
          <div className="so-card-h"><span>Oppmøte</span></div>
          <dl className="kv">
            <div><dt>Registrerte oppmøter</dt><dd><strong style={{color:'var(--accent)'}}>{fmtN(member.oppmote.checkins)}</strong></dd></div>
            {member.oppmote.pct!=null && <div><dt>Oppmøteandel</dt><dd>{fmtPct(member.oppmote.pct)}</dd></div>}
            <div><dt>Sist sett</dt><dd>{fmtDate(member.oppmote.sisteOppmote)}</dd></div>
          </dl>
        </div>

        {/* Contact + guardians — skjult for mindreårige (personvern) */}
        {minor ? (
        <div className="so-card">
          <div className="so-card-h"><span>Personvern</span></div>
          <div className="muted" style={{fontSize:12.5, lineHeight:1.6}}>
            Dette er et mindreårig medlem. Klubben viser kun fornavn og
            treningsdata (belte, gradering, oppmøte) — kontaktinfo, adresse,
            fødselsdato og foresatte vises ikke her.
          </div>
        </div>
        ) : (
        <div className="so-card">
          <div className="so-card-h"><span>Kontakt</span></div>
          <dl className="kv">
            <div><dt>E-post</dt><dd style={{wordBreak:'break-all'}}>{member.epost||'—'}</dd></div>
            <div><dt>Mobil</dt><dd>{member.mobil||'—'}</dd></div>
            <div><dt>Adresse</dt><dd>{member.adresse? `${member.adresse}, ${member.postnr} ${member.poststed}`:'—'}</dd></div>
          </dl>
          {member.foresatte && member.foresatte.length>0 && (
            <div style={{marginTop:12}}>
              <div className="kv-h">Foresatte</div>
              {member.foresatte.map((f,i)=>(
                <div key={i} className="guardian">{f.navn}{f.tel?` · ${f.tel}`:''}</div>
              ))}
            </div>
          )}
        </div>
        )}
      </aside>

      {dlg && <GradeDialog single member={member} targets={[member.id]} initialMode={dlg} onClose={()=>setDlg(null)}/>}
    </div>
  );
}

Object.assign(window, { GradeDialog, MemberProfile, Timeline, Stepper, fmtDate, tenure, initials, INSTRUKTORER });
