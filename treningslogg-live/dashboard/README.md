# Klubbdashboard — løft.app/dashboard

Fullverdig klubbpanel for Bodø Jiu Jitsu. Samme stack som trener-appen
(React via Babel-standalone, ingen build-step), Daylight-tema.

## Status: Fase 2 (register + gradering + import mot Sheets)

UI-en kjører på `/dashboard`. **Medlemsregister, gradering og økonomi
leses/skrives mot Google Sheets** via Apps Script (`dashList`, `dashGrade`,
`dashUndoLast`, `dashImportRoster`, `dashImportOkonomi`) — samme `/api`-proxy
og Cloudflare Access som trener-appen. De aggregerte KPI-ene (oppmøte-heatmap,
kohort, leaderboard) leses fortsatt fra statisk `data/kpis.json`.

Backend-ark (opprettes av `_setupDashSheets` i Code.gs):

- `dash_members` — medlemsregister (gjeldende belte denormalisert).
- `dash_grading` — én rad per graderingshendelse (full historikk).
- `dash_okonomi` — faktiske månedstall fra Spond.
- `dash_settings` — driftsterskler for «I dag» (`key | value | oppdatert | av`).
- `dash_snapshots` — én rad per ISO-uke med aggregater. Ingen navn, ingen
  id-er, ingen økonomi.
- `dash_events` — hendelser som gir kontekst til grafene (ferie, gradering …).
- `dash_followup` — oppfølgingslogg for radene i «I dag».

**Fase 3 (økonomi-tilgang):** Økonomi går via en egen, skjermet rute
`functions/dashboard/okonomi.js` som sjekker innlogget Cloudflare Access-e-post
mot miljøvariabelen `STYRE_EMAILS`. Bare styre slipper gjennom til Apps Script
(`dashOkonomiList` / `dashImportOkonomi`) — andre får 403, og Økonomi-fanen +
MRR-estimatet skjules i frontend. Ruta er bevisst skilt fra `/api` så økonomi
senere kan løftes til en egen Cloudflare Access-app (slik `/fotball` er i dag).

> **Konfig:** sett `STYRE_EMAILS` (komma/mellomrom-separert) i Cloudflare Pages
> → Settings → Environment variables, inkl. din egen e-post. Er den tom, er
> økonomi skjult for alle.

**Fase 4 (delvis):**
- **Årsrapport-eksport** — «⤓ Årsrapport»-knapp i topplinja laster ned et
  tekstsammendrag (medlemmer, belter, graderinger i år, oppmøte; økonomi kun
  for styre).
- **JWT-herding (opt-in)** — `functions/dashboard/okonomi.js` kan verifisere
  Access-JWT-signaturen kryptografisk. Slås på med env-variablene
  `ACCESS_TEAM_DOMAIN` (+ valgfri `ACCESS_AUD`); uten dem brukes dagens
  e-post-header/claim.

**Fase 5 (terskler, snapshots, hendelser, oppfølging):**

- **Terskler i Sheets** — `stilleUker`, `gradMinOppmote`, `gradMinMnd`,
  `introUker` og `fallendeMinPrev4` ligger i `dash_settings` og redigeres i
  ⚙ Innstillinger. Alle ser verdiene, bare styre kan lagre. Tilgangen er
  frontend-styrt: Apps Script ser ikke den innloggede Access-brukeren, så
  «av»-kolonnen er en merkelapp, ikke et bevis. Svarer ikke Sheets, brukes
  `DASH_API.SETTING_DEFAULTS` og topplinja sier «bruker standardterskler».
  Standardverdiene finnes to steder — `DASH_SETTING_DEFAULTS` i Code.gs og
  `SETTING_DEFAULTS` i `api.js` — og må holdes i synk.
- **Ukentlige snapshots** — `dashTakeSnapshot_()` skriver én rad per ISO-uke
  (idempotent: samme uke overskrives). Definisjonene speiler frontend:
  aktive/fordelinger fra `mergeLiveKpis`, arbeidslistene fra `today-app.jsx`,
  fallende fra `memberTrendRows`. Kjør `_setupSnapshotTrigger` én gang for å
  sette den tidsstyrte triggeren (mandag kl. 06). Ingen tilbakefylling —
  historikken starter ved første kjøring.
- **Hendelser** — vises som loddrette markører på «Klubbens puls»
  (`Spark markers` + `dateAccessor`).
- **Oppfølging** — «Kontaktet» skjuler raden i 14 dager, «Utsett» i 30,
  «Notat» lar den stå. Hva som skjules regnes i frontend; arket er en ren
  logg, og historikken vises i medlemsprofilens tidslinje.

**Fase 6 (struktur):** Fanene er delt etter BRUK, ikke etter datadomene —
sju i stedet for ni:

| Fane | Innhold |
|---|---|
| I dag | Fire arbeidslister med oppfølging |
| Trender | Kontrollstripe (periode · sammenlign · gruppe), KPI-kort, puls, semester-overlay, grupper, topplister, kohort, funnel |
| Medlemmer | Sammenfoldbare «Fordelinger» + registeret |
| Kalender | Planlagte og loggede økter |
| Innhold | Tema- og gruppebalanse |
| Økonomi | Styre |
| Data | Innstillinger, import, avstemming, «Om dataene» |

- Oversikt + Oppmøte + Kohort & Churn er slått sammen til **Trender**;
  Medlemsstatistikk er blitt `<details>Fordelinger</details>` over registeret.
  Gamle hasher omdirigeres (`#oversikt`/`#oppmote`/`#churn` → `#trender`,
  `#statistikk` → `#register`).
- **Parametre i hashen:** `#trender?p=semester&c=ifjor&g=gi`. En visning kan
  deles som lenke og gjenskapes nøyaktig.
- **Semester:** vår = 1. jan–30. jun, høst = 1. aug–31. des (`SEM_VAR` /
  `SEM_HOST` i `trends-app.jsx`). Juli hører ikke til noe semester.
- **Aktive medlemmer bakover i tid** hentes fra `dash_snapshots`. Mangler
  snapshot for sammenligningsdatoen, viser kortet «—» med forklaring —
  aldri 0. `null` betyr «vet ikke», 0 betyr «ingen medlemmer».
- **Gruppefilter** finnes bare for økter i Sheets (`live.gruppeWeekly`).
  Spond-historikken er gruppert på klassenavn, ikke gruppe, så den historiske
  klassepopulariteten ligger under «Om dataene» i Data — ikke i Trender.
- **Snitt pr. økt** regnes med teller og nevner fra samme kilde, ellers deles
  Spond-historikk på Sheets-økter.
- **Mobil under 760 px:** sidefeltet byttes ut med bunnmeny (I dag · Trender ·
  Medlemmer · Kalender · Mer), KPI-ene går i to kolonner, kontrollstripa blir
  nedtrekk, og tabeller får egen vannrett scroll så siden aldri scroller
  sidelengs. Brekkpunktet er `SMAL_PX` i `dashboard-shared.jsx` og samme tall
  i media queryen i `index.html`.
- **Grupper** har én kilde på dashboard-siden: `DASH_GRUPPER` /
  `DASH_GRUPPE_LABEL` i `dashboard-shared.jsx` (speiler `M_GROUP` i
  `app/shared.js`, som dashboardet ikke laster).

Gjenstår:

- **Oppmøte-samkjøring** — slå sammen dashboardets historiske Spond-aggregat
  med trener-appens live loggede oppmøte (krever en beslutning om erstatte vs.
  blande, siden datasettene har ulik form og historikk).

> Merk: registeret er tomt til første månedlige import er kjørt fra
> «Importer»-knappen i Medlemmer-fanen.

## Datalag — ett byttepunkt

`api.js` (`window.DASH_API`) er **eneste sted** datakilden bestemmes:

- `fetchDash()` → register + økonomi fra `/api` (Sheets via Apps Script).
- `grade()` / `undoLast()` / `importRoster()` / `importOkonomi()` → skriving.
- `fetchKpis()` → statisk `data/kpis.json` for oppmøte-/historikk-aggregater.
  Medlemsbaserte tall (antall, kategori, kjønn, belte, alder, geografi,
  pris/MRR) regnes live fra registeret i `mergeLiveKpis()` (daylight-app.jsx),
  så de stemmer med faktisk medlemstall.
- Import-metadata (sist medlems-/økonomiimport + antall) vises i sidefeltet,
  hentet fra `dash_meta`.
- `fetchSettings()` / `saveSettings()`, `fetchSnapshots()` / `snapshotNow()`,
  `fetchEvents()` / `addEvent()` / `deleteEvent()` og `fetchFollowup()` /
  `addFollowup()` → `/api`. Alle fire lastes av `MembersProvider` og feiler
  mykt: en eldre Apps Script-deploy uten handlingene gir fallback-verdier i
  stedet for et svart dashboard.

Bytter man kilde senere er det her det gjøres — resten av appen er uendret
så lenge signaturene holdes like.

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
| `trends-app.jsx` | Trender: kontrollstripe, KPI-kort, semester-overlay |
| `data-tab.jsx` | Data-fanen: innstillinger, import, om dataene |
| `settings-panels.jsx` | Terskler, snapshots og hendelser (seksjoner i Data) |
| `tweaks-panel.jsx` | Tema-justering (font/farge/avrunding) |
| `data/*.json` | Anonymiserte demo-data (Fase 1) |
