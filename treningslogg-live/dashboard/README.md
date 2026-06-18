# Klubbdashboard — løft.app/dashboard

Fullverdig klubbpanel for Bodø Jiu Jitsu. Samme stack som trener-appen
(React via Babel-standalone, ingen build-step), Daylight-tema.

## Status: Fase 1 (skjelett + lesedata)

UI-en er integrert og kjører på `/dashboard` med **anonymiserte demo-data**.
Seks faner: Oversikt · Medlemmer · Medlemsstatistikk · Oppmøte · Økonomi ·
Kohort & Churn.

Gjenstår (kommende faser):

- **Fase 2** — register + gradering skriver til Google Sheets (ikke localStorage),
  månedlig medlemsimport mot backend.
- **Fase 3** — økonomi-import til Sheets, økonomi-fanen skjult pr. e-post,
  bygget separerbar så den senere kan flyttes til egen tilgangs-app (slik
  `/fotball` er skilt ut i dag).
- **Fase 4** — polering, konvergering av oppmøtedata med trener-appen, eksport.

## Datalag — ett byttepunkt

`api.js` (`window.DASH_API`) er **eneste sted** datakilden bestemmes:

- I dag: leser `data/*.json` (anonymiserte demo-data).
- Fase 2/3: bytt funksjonskroppene til kall mot `/api` (Google Sheets via
  Apps Script — samme proxy og samme Cloudflare Access som trener-appen).
  Resten av appen er uendret så lenge signaturene holdes like.

## Personvern (mindreårige)

`DASH_API.maskMember()` håndheves i datalaget: barn (Junior/Knøtte eller
alder < 16) vises **kun med fornavn**, uten bakgrunnsdata (kontakt, adresse,
fødselsdato, foresatte). Belte/gradering og oppmøte beholdes. Medlemsprofilen
skjuler kontakt- og betalingskort for barn.

Ekte persondata ligger **aldri** i dette repoet (det deployes offentlig via
Cloudflare) — kun i Google Sheets bak Access. Demo-dataene her er syntetiske.

## ⚠️ Cloudflare Access

Ruten `/dashboard*` må legges til i trener-applikasjonens tilgangsliste i
Cloudflare Zero Trust (samme app som løft.app for øvrig). Uten det er
dashboardet enten utilgjengelig eller utilstrekkelig beskyttet.

## Filer

| Fil | Ansvar |
|---|---|
| `index.html` | Entry — laster React, Babel, alle moduler |
| `api.js` | Datalag (byttepunkt kilde) + personvern-maskering |
| `dashboard-shared.jsx` | KPI-hook, charts-utregning, diagram-primitiver |
| `daylight-app.jsx` | App-skall, faner, Oversikt/Statistikk/Oppmøte/Økonomi/Churn |
| `belt-system.jsx` | IBJJF belter (voksen + junior), beltegrafikk |
| `members-store.jsx` | Medlems-/økonomi-state, gradering, import-actions, CSV |
| `register-app.jsx` | Medlemsfane: søk, inline belte-redigering, bulk-gradering |
| `register-profile.jsx` | Medlemsprofil, graderingsdialog, tidslinje |
| `xlsx-import.jsx` / `import-ui.jsx` | Månedlig medlemsimport (Spond) |
| `okonomi-import.jsx` | Månedlig økonomiimport (Spond-betalinger) |
| `tweaks-panel.jsx` | Tema-justering (font/farge/avrunding) |
| `data/*.json` | Anonymiserte demo-data (Fase 1) |
