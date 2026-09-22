/* Data-fanen — alt som handler om datagrunnlaget, ett sted.

   Før lå dette spredt: avstemming nederst i Oppmøte, import i en modal bak
   en knapp, terskler i en annen modal bak ⚙, og «Om dataene» i en tredje
   fane. Alle fire svarer på samme spørsmål — «stemmer tallene, og hvor
   kommer de fra?» — så de hører sammen.

   Bruker globale fra settings-panels.jsx (TerskelSkjema, SnapshotPanel,
   HendelsePanel), data-panel.jsx (ImportOversikt) og daylight-app.jsx
   (Avstemming, OmDataene, Tile). */
const { useState: useDt } = React;

function DataFane({ kpis, charts, live, meta, isStyre, terskler, brukerStandard, checkins, okter }) {
  const [seksjon, setSeksjon] = useDt('innstillinger');
  const faner = [
    ['innstillinger', 'Innstillinger'],
    ['import', 'Import'],
    ['grunnlag', 'Om dataene'],
  ];
  return (
    <div>
      <div className="seg" style={{ maxWidth: 520 }}>
        {faner.map(([id, navn]) => (
          <button key={id} className={seksjon === id ? 'on' : ''} onClick={() => setSeksjon(id)}>{navn}</button>
        ))}
      </div>

      {seksjon === 'innstillinger' && (
        <>
          <div className="section-h" id="innstillinger" style={{ scrollMarginTop: 80 }}>Terskler
            <span className="meta">styrer hvem som havner i «I dag»-listene</span></div>
          <Tile title="Terskler" corner={isStyre ? 'styre kan endre' : 'kun lesing'}>
            <TerskelSkjema isStyre={isStyre} settings={terskler} brukerStandard={brukerStandard} />
          </Tile>

          <div className="section-h">Ukentlig snapshot<span className="meta">historikk som ellers går tapt</span></div>
          <Tile title="Snapshots" corner="mandag kl. 06">
            <SnapshotPanel isStyre={isStyre} />
          </Tile>

          <div className="section-h">Hendelser<span className="meta">markører på Klubbens puls</span></div>
          <Tile title="Hendelser" corner="ferie · gradering · arrangement">
            <HendelsePanel isStyre={isStyre} />
          </Tile>
        </>
      )}

      {seksjon === 'import' && (
        <>
          <div className="section-h">Importer<span className="meta">medlemmer · oppmøte · økonomi · Vipps</span></div>
          <Tile title="Datakilder" corner="månedlig">
            <ImportOversikt meta={meta} isStyre={isStyre} />
          </Tile>
          {isStyre
            ? <Avstemming />
            : (
              <>
                <div className="section-h">Oppmøte-avstemming</div>
                <Tile title="Identitetsbro" corner="styre">
                  <div className="dim" style={{ fontSize: 12, lineHeight: 1.6 }}>
                    Koblingen mellom oppmøte-navn og medlemsregisteret gjøres av styret.
                    {live && live.unmatched > 0 && <> Akkurat nå mangler <strong style={{ color: 'var(--coral)' }}>{fmtN(live.unmatched)} oppmøter</strong> kobling.</>}
                  </div>
                </Tile>
              </>
            )}
        </>
      )}

      {seksjon === 'grunnlag' && (
        <>
          <div className="section-h">Om dataene<span className="meta">hva tallene bygger på</span></div>
          <OmDataene kpis={kpis} live={live} meta={meta} isStyre={isStyre}
            checkins={checkins} okter={okter} apen />

          <div className="section-h">Klassepopularitet<span className="meta">historisk klassetype (Spond) · frosset grunnlag</span></div>
          <Tile title="Rangering" corner="historisk">
            <HBar data={charts.classes.map(c => ({ label: c.name + ' (' + c.sessions + ' økter)', value: Math.round(c.avg * 10) / 10 }))}
              color="var(--accent)" height={20} />
            <div className="dim" style={{ fontSize: 11, marginTop: 12, lineHeight: 1.6 }}>
              Dette er det frosne Spond-grunnlaget, gruppert på klassenavn. Trener-appen
              grupperer på treningsgruppe, og de to tallene betyr ikke det samme — derfor
              står klassepopulariteten her, ved siden av resten av forbeholdene, og ikke
              i Trender sammen med live-tallene.
            </div>
          </Tile>
        </>
      )}
    </div>
  );
}

window.DataFane = DataFane;
