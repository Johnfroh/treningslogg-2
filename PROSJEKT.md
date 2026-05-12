# Treningslogg — Bodø BJJ

*Et internt verktøy for trenere ved Bodø Jiu Jitsu — sammendrag og status*

---

## TL;DR

Treningslogg er en internt utviklet web-app for trenere ved Bodø Jiu Jitsu. Den løser tre konkrete problemer som klubben hadde uten: **manuell og fragmentert økt-logging**, **manglende oversikt over hvem som har trent hva**, og **fravær av datagrunnlag for sesong-planlegging**. Den er produksjonsklar, kostnadsfritt drevet på Cloudflare + Google Sheets, og brukes av et lite trenerteam i daglig drift.

---

## Bakgrunn

Bodø BJJ er en kampsportklubb med ~80 medlemmer fordelt på ~25 økter i uka:
- Junior (barn)
- Grunnleggende BJJ
- Erfaren (gi/no-gi)
- Alle nivåer
- Åpen matte (egentrening)

Klubben hadde tidligere ingen sentral datakilde for hva som faktisk ble trent på, hvem som møtte opp, eller hvordan tema-dekning fordelte seg over tid. Oppmøte ble registrert i Spond (eksternt verktøy), men teknikkfokus og innhold ble ikke logget systematisk. Trenere planla "i hodet" og hadde liten innsikt i om enkelte medlemmer hadde dekningshull (f.eks. "jeg har aldri sett Tilde på en escape-økt").

### Hva problemet koster

Uten data:
- Beslutninger om hva som skal drilles neste uke baseres på magefølelse
- Medlemmer med ujevn oppmøte fanges sent (frafall identifiseres etter at de allerede har sluttet)
- Klubben har ingen historikk å vise frem til egne trenere, styre eller nye instruktører
- Tematisk balanse mellom posisjoner og handlinger er usynlig

---

## Løsning

En PWA-app (Progressive Web App) som lar trenere:

1. **Logge økter raskt på mobil** under eller rett etter trening — gruppe, tid, tittel, teknikk-tags, fri-tekst notat
2. **Planlegge fremover** — enkeltøkter eller hele recurring-serier (f.eks. "grunnleggende hver tirsdag og torsdag i 8 uker")
3. **Importere oppmøte fra Spond** — drag-and-drop av eksportert .xlsx, automatisk matching mot loggede økter
4. **Se planleggings-dashboard** med oppmøte-trender, tema-balanse, gruppe-snitt, hull i planen og frafall-risiko
5. **Følge opp deltakere individuelt** — historikk per medlem, hvilke tema de har vært gjennom, og tidlige signaler på frafall

Data lever i Google Sheets — klubben eier sin egen data, kan eksportere den når som helst, og er ikke låst til en leverandør.

---

## Produkt

### Mobilapp (PWA installert på trener-iPhone)

Daglig arbeidsflate for å logge og raskt planlegge:

- **Hjem** — dagens økter, klikkbar uke-strip, valg av dag
- **Dashboard** — periode-velger (7d/30d/90d/sesong), puls (snitt oppmøte + trend), forslag til neste økt (algoritme), tema-balanse (12 kjernetags), oppmøte per ukedag
- **Kalender** — månedlig oversikt, klikkbar for detaljer per dag
- **Deltakere** — rangert liste med trend-pil, 6-ukers sparkline per medlem, frafall-status (aktiv/stille/risiko/frafall basert på dager siden sist), tag-historikk
- **Logg-modal** — type-toggle (logg/planlegg), recurring planlegging med ukedag-velger, custom-tags ved fritekst-input

### Desktop-app

Dypere analyse på `treningslogg.pages.dev/desktop`:

- Samme datalag som mobil, bredere layout med sidebar (220px)
- 5-kolonne KPI-rad, 2-kolonne grid (forslag + gruppe / tema + ukedag)
- Frafall-summary-kort som proaktivt løfter frem medlemmer som trenger oppfølging
- Drag-zone Spond-import direkte i sidebar-overlay
- Periode-velger og gruppe-filter for analyse av spesifikke utsnitt

### Datalag

- **Google Sheets** som master database (ark for sessions, planned, members, attendance, trainers)
- **Apps Script** Web App som API mellom Sheets og frontend
- **Cloudflare Pages Function** som proxy så iOS PWA-er ikke blokkeres av cross-origin-restriksjoner (ITP)
- Idempotent oppmøte-import — samme fil kan lastes opp på nytt uten dubletter

---

## Teknisk arkitektur

```
┌─────────────────────────┐         ┌──────────────────────────────┐
│   Bruker (iPhone PWA    │         │      Google Sheets           │
│   eller desktop nett)   │         │  (sessions / planned /       │
└──────────┬──────────────┘         │   members / attendance)      │
           │                        └──────────┬───────────────────┘
           │ HTTPS                             │
           ▼                                   │
┌─────────────────────────┐                    │
│  Cloudflare Pages       │                    │
│  - PWA + desktop-app    │                    │
│  - Pages Function /api  │                    │
│    (proxy mot Apps      │                    │
│     Script — løser iOS  │                    │
│     ITP-blokkeringen)   │                    │
└──────────┬──────────────┘                    │
           │ HTTPS                             │
           ▼                                   │
┌─────────────────────────┐                    │
│  Google Apps Script     │◄───────────────────┘
│  Web App                │
│  - CRUD-operasjoner     │
│  - Spond-import         │
│  - Token-autorisering   │
└─────────────────────────┘
```

### Stack
- **Frontend:** vanilla React (via Babel-standalone i nettleser, ingen build-step)
- **Tema:** "Steel" mørk design — Roboto Mono, kobber-aksent, varm svart, ingen avrundinger
- **Deploy:** Cloudflare Pages med automatisk deploy fra GitHub `main`
- **Auto-update:** sjekker ETag på `index.html` ved fokus, reloader hvis ny build er deployet (kritisk for iOS PWA)

### Designspråk
Importert fra en separat "Claude Design"-prosess hvor klubben kunne iterere på UI før implementering. Steel-temaet er konsekvent på tvers av mobil og desktop, men layout og densitet er optimalisert per skjerm.

---

## Status

| Komponent | Status |
|---|---|
| Mobil PWA (alle skjermer) | Produksjon |
| Desktop full app | Produksjon |
| Cloudflare deploy + auto-update | Stabil |
| Google Sheets-integrasjon | Stabil |
| Spond-import (.xlsx) | Stabil |
| Periode-velger, frafall-tracking | Levert |
| Eget domene (løft.app) | **Live** |
| Innlogging / tilgangskontroll | **Live (Cloudflare Zero Trust)** |
| Trener-identifikasjon i appen | Ikke startet |
| GDPR-formaliteter (datavernerklæring etc.) | Ikke startet |

### Bruk per i dag
- ~170 økter logget
- ~600 oppmøte-rader (medlem × økt)
- ~80 unike medlemmer
- 5 trenere med innlogging
- Brukes daglig av hovedtrener for logging + planlegging

### URL-er
- **`https://løft.app/`** — mobil/PWA (Cloudflare Access-beskyttet)
- **`https://løft.app/desktop`** — desktop-skall
- **`https://løft.app/import`** — Spond-importer (eldre flyt, beholdt for backup)
- **`https://løft.app/api`** — proxy mot Apps Script (beskyttet via Cloudflare Access)

### Sikkerhet — som ble satt opp i mai 2026
- **Cloudflare Zero Trust Access** beskytter alle ruter på `løft.app`
- Tilgang krever **One-Time PIN på e-post** (24-timers sesjon)
- **Allowlist:** 5 trener-e-poster eksplisitt godkjent — alle andre nektes automatisk (default-deny)
- Apps Script-tokenet er fortsatt i koden, men kan ikke nås uten først å passere Access — perimeter-sikkerhet beskytter mot uautorisert lesing

### Driftskost
**0 NOK/måned** under nåværende skala.
- Cloudflare Pages free tier (100k requests/dag — vi bruker ~50)
- Cloudflare Zero Trust free tier (≤50 brukere — vi bruker 5)
- Google Sheets / Apps Script free tier (6 min skript-tid/dag — vi bruker ~30 sek)
- Hostinger domene `løft.app` (~50 NOK/år, prepaid til mai 2027)

---

## Differensiering

Tilsvarende verktøy i markedet:
- **Spond / TeamSnap** — oppmøte-tracking, men ingen teknisk teknikk-logging og ingen planleggings-dashboard
- **BJJ-spesifikke apps (BJJ Tracker, Submeta)** — fokus på individuell utøver (egen progresjon), ikke på trener-planlegging av klubbens program
- **Excel/papir** — det folk faktisk bruker. Lavt friksjon, ingen aggregering, ingen indikatorer

Vår posisjon: **trener-først planleggings-verktøy** der dataene som logges underveis blir til konkrete planleggings-anbefalinger. Tom dashboard er ikke verdt noe; vi har designet for at logging i forbifarten bygger opp et meningsfullt datagrunnlag over uker.

---

## Roadmap

### Levert siden forrige status (mai 2026)
- **Eget domene** løft.app live (med Punycode-håndtering av ø)
- **Cloudflare Zero Trust Access** med allowlist av 5 trener-e-poster
- Perimeter-sikkerhet for både PWA, desktop og `/api`

### Neste opp
- **Trener-identifikasjon i appen** — etter Cloudflare-login vet vi at brukeren er "noen i klubben", men ikke hvem. En enkel "hvem er du?"-velger ved første åpning gjør at `trainer`-feltet auto-fylles og logg-handlinger kan auditeres per person.
- **GDPR-formaliteter** — datavernerklæring publisert i appen, prosessoravtale med Google verifisert (Sheets/Apps Script), retten-til-sletting-prosess definert.

### Kort sikt (kvalitet)
- Slette planlagt økt direkte uten plan-fill-konvertering
- Slette en hel recurring-serie
- Rediger planlagt uten å konvertere til logg
- Renere bekreftelses-dialog (i dag `window.confirm()`)
- Flytt Apps Script-token til Cloudflare Pages environment-variabel (i stedet for hardkodet i koden)

### Mellomlang sikt (verdi)
- Smartere forslag-algoritme (krysser gruppe + tag + beste ukedag)
- Globalt søk på økter
- Per-medlem grad/belte-felt (hvit-blå-lilla-brun-svart)
- Konkurranseresultater-felt
- "Send melding"-CTA fra frafall-risiko (e-post eller utklippstavle)

### Langsiktig (ikke prioritert ennå)
- Medlems-fasede visning (medlem ser egen historikk)
- Spond-toveis-sync (skrive ny økt til Spond direkte fra app)
- Eksport til klubbens årsrapport (PDF/CSV)

---

## Risiko

### Sikkerhet — vesentlig endret siden forrige status
**Tidligere åpent:** delt token i URL, ingen perimeter-auth, medlemsnavn eksponert til alle med URL.

**Nå mitigert:**
- **Cloudflare Zero Trust Access** beskytter alle ruter (PWA, desktop, `/api`). Kun e-poster på allowlist får tilgang — alle andre nektes automatisk (default-deny).
- Apps Script-tokenet er fortsatt i koden, men kan ikke nås uten først å passere Access. Tokenet er nå en "andre forsvars-linje" snarere enn eneste forsvar.

**Fortsatt åpent:**
- **Ingen audit-trail per trener** — vi vet at "noen i klubben" klikket lagre, men ikke hvem. Trener-identifikasjon i appen er neste steg.
- **Avgangstrener-flyt** — når en trener slutter må deres e-post fjernes manuelt fra Cloudflare-allowlisten. Ingen automasjon. Lav risiko siden ≤5 personer.
- **GDPR-formaliteter** — selve datalagringen følger Google-vilkår, men klubben har ingen formell datavernerklæring publisert. Bør formaliseres før appen brukes mer offentlig.

### Avhengighet (medium)
- Apps Script er proprietær Google-tjeneste. Hvis Google fjerner gratis-tier eller endrer terms, må vi flytte.
- Cloudflare Zero Trust gratis-plan ≤50 brukere — godt over vårt nåværende behov (5 trenere), men hvis vi åpner for medlemmer trenger vi å vurdere plan/arkitektur.
- Spond .xlsx-format kan endre seg uten varsel. Parser-en er defensiv, men ikke skuddsikker.

### Skala (lav)
- Nåværende design holder fint for én klubb. Hvis flere klubber adopterer, trenger vi multi-tenant arkitektur og en database. Ikke et problem nå.

### Kunnskaps-konsentrasjon (medium)
- Hele systemet er bygd og forstått av én person + AI-assistent (Claude Code). Hvis vedlikeholdspersonen blir borte, må neste utvikler lese seg inn på arkitekturen.
- Mitigering: kommentarer i koden er på norsk og forklarer hvorfor (ikke bare hva), README-er, og denne dokumentasjonen.

---

## Læring underveis

Verdt å nevne for noen som vurderer lignende prosjekter:

1. **iOS PWA er ikke "bare en nettside"**. ITP, cache-aggressivitet og redirect-håndtering har skapt flere bugs enn alle andre komponenter til sammen. Cloudflare-proxy var nødvendig for å få Apps Script til å virke fra installert PWA.

2. **Tema-arbeid lønner seg sent**. Vi flyttet fra "soft & rund" til "Steel" en god stund inn i prosjektet. Eksplisitt design-tokens i `shared.js` gjorde det praktisk overkommelig.

3. **Kjernetags er bedre enn fritekst-tags** for planleggings-data. 12 kontrollerte tags + fritekst i innholds-feltet gir nyttige aggregater og fleksibilitet.

4. **Sheets som database holder lenger enn man tror**. Lett å revidere, ingen migrasjons-frykt, klubben kan eksportere når som helst.

---

## Avhengigheter

| Tjeneste | Bruk | Plan | Kost |
|---|---|---|---|
| Cloudflare Pages | Hosting, deploy, Functions | Free | 0 |
| Cloudflare Zero Trust | Tilgangskontroll (One-Time PIN) | Free (≤50 brukere) | 0 |
| Cloudflare DNS | Nameservers for løft.app | Free | 0 |
| Google Apps Script | API mot Sheets | Free | 0 |
| Google Sheets | Database | Free | 0 |
| GitHub | Kildekode + CI via Cloudflare | Free | 0 |
| Hostinger | Domeneregistrering (løft.app) | Prepaid 2 år | ~50 NOK/år |
| Spond | Oppmøtekilde (kun import) | Klubbens eksisterende lisens | n/a |

Total månedlig driftskost: **~4 NOK** (kun amortisert domene-kost). Reelt månedlig fakturerbart: **0 NOK**.

---

*Sist oppdatert: mai 2026 — etter at løft.app gikk live med Cloudflare Zero Trust Access.*
