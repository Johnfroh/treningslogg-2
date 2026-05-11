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
| Innlogging / brukere | Ikke startet |

### Bruk per i dag
- ~170 økter logget
- ~600 oppmøte-rader (medlem × økt)
- ~80 unike medlemmer
- 5 trenere
- Brukes daglig av hovedtrener for logging + planlegging

### Driftskost
**0 NOK/måned** under nåværende skala. Avhenger av at:
- Cloudflare Pages free tier (100k requests/dag — vi bruker ~50)
- Google Sheets / Apps Script free tier (6 min skript-tid/dag — vi bruker ~30 sek)
- Ingen tredjepart abonnement
- Domenet `pages.dev` er gratis subdomene

---

## Differensiering

Tilsvarende verktøy i markedet:
- **Spond / TeamSnap** — oppmøte-tracking, men ingen teknisk teknikk-logging og ingen planleggings-dashboard
- **BJJ-spesifikke apps (BJJ Tracker, Submeta)** — fokus på individuell utøver (egen progresjon), ikke på trener-planlegging av klubbens program
- **Excel/papir** — det folk faktisk bruker. Lavt friksjon, ingen aggregering, ingen indikatorer

Vår posisjon: **trener-først planleggings-verktøy** der dataene som logges underveis blir til konkrete planleggings-anbefalinger. Tom dashboard er ikke verdt noe; vi har designet for at logging i forbifarten bygger opp et meningsfullt datagrunnlag over uker.

---

## Roadmap

### Neste opp (er ikke startet)
- **Innlogging og tilgangskontroll** — Cloudflare Zero Trust Access for å begrense hvem som kan bruke appen, samt trener-identifikasjon i logg-modal for audit
- **GDPR-vurdering** — datavernerklæring, retten til sletting, prosessoravtale med Google verifisert

### Kort sikt (kvalitet)
- Slette planlagt økt direkte uten plan-fill-konvertering
- Slette en hel recurring-serie
- Rediger planlagt uten å konvertere til logg
- Renere bekreftelses-dialog (i dag `window.confirm()`)

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

### Sikkerhet (åpent)
- Eneste autentisering i dag er en delt token i URL. Lekker tokenet, har den finneren full lese/skrive-tilgang.
- Medlemsnavn er personopplysninger under norsk GDPR — i dag eksponert til alle som har URL.
- Cloudflare-proxyen logger ikke individuelle handlinger; ingen audit-trail.

**Mitigering planlagt:** Cloudflare Zero Trust Access for perimeter-auth, trener-PIN inne i appen for audit. Estimat: 1–2 dagers arbeid.

### Avhengighet (medium)
- Apps Script er proprietær Google-tjeneste. Hvis Google fjerner gratis-tier eller endrer terms, må vi flytte.
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
| Google Apps Script | API mot Sheets | Free | 0 |
| Google Sheets | Database | Free | 0 |
| GitHub | Kildekode + CI via Cloudflare | Free | 0 |
| Spond | Oppmøtekilde (kun import) | Klubbens eksisterende lisens | n/a |

Total månedlig driftskost: **0 NOK**.

---

*Sist oppdatert: mai 2026*
