# løft.app — prosjektoverview

*To selvstendige apper i ett repo, med felles datalag og tilgangsstyring.*

---

## TL;DR

Repoet `treningslogg-2` driver to apper på domenet `løft.app`:

- **Bygg motoren — trener-app for Bodø Jiu Jitsu** (`løft.app`, `løft.app/desktop`). PWA og desktop-dashboard som trenerne bruker daglig for å logge økter, planlegge fremover og importere oppmøte fra Spond. I produksjon, ~170 økter logget, 5 trenere.
- **Bygg motoren — fotball- og turn-egentrening** (`løft.app/fotball`). Egentreningsapp for ett barn av gangen, knyttet til familieheftene. Tre programmer som brukeren bytter mellom: fotball ungdom 13+, fotball-leker 7–9, og turn ~9 år. Egen identitet, egen logg per program.

Begge apper deler samme Google Sheets-database via samme Apps Script Web App. Tilgang styres av Cloudflare Zero Trust Access — ulike e-postlister per app. Driftskost: ~4 NOK/måned (amortisert domene).

---

## Repo-struktur

```
treningslogg-2/
├── CLAUDE.md                       — instrukser til Claude Code (faste regler)
├── PROSJEKT.md                     — denne fila
├── eslint.config.js                — flat-config, ingen npm install
│
├── functions/                      — Cloudflare Pages Functions
│   ├── api.js                      — proxy mot Apps Script (trener-app, /api)
│   └── fotball/
│       └── api.js                  — proxy mot Apps Script (fotball, /fotball/api)
│
└── treningslogg-live/              — alt som hostes statisk
    ├── _headers · _redirects       — caching, MIME, /fotball-routing
    ├── manifest.webmanifest        — PWA-manifest (trener)
    │
    ├── index.html                  — trener mobil-PWA entry
    ├── desktop.html                — trener desktop-dashboard entry
    │
    ├── app/                        — trener-app (React via Babel-standalone)
    │   ├── shared.js               — Daylight-tema, util, computeDashboard
    │   ├── data.js                 — grupper, tags, demo-data
    │   ├── api.js                  — klient mot Sheets
    │   ├── mobile.jsx              — hele mobil-appen
    │   ├── desktop.jsx             — hele desktop-appen
    │   └── components.jsx          — felles UI-deler
    │
    ├── fotball/                    — fotball-/turn-egentrening (vanilla JS)
    │   ├── index.html              — felles shell, tre programmer
    │   ├── app-data.js             — registry (BM_PROGRAMS, ORDER)
    │   ├── data-ungdom.js          — Bygg motoren (fotball 13+)
    │   ├── data-junior.js          — Sommerball (fotball 7–9)
    │   ├── data-rg.js              — Ball og rytme (turn ~9)
    │   ├── app-core.js             — API-laget, statistikk, dashboard
    │   ├── app-ui.js               — faner, øktdetalj, feiring
    │   └── skann.html              — skannverktøy (kamera/skjerm-modus)
    │
    └── apps-script/
        ├── Code.gs                 — backend (Sheets-Web-App)
        └── README.md               — deploy-sjekkliste
```

---

## Apper i detalj

### Trener-appen (BJJ)

**For hvem:** 5 trenere ved Bodø Jiu Jitsu. Hovedtrener bruker den daglig.

**Hva den gjør:**

- Loggføring av økter (mobil-PWA på treningssalen)
- Planlegging av kommende økter — enkeltvis eller recurring-serier
- Spond-import av oppmøtelister fra .xlsx
- Dashboard med oppmøte-trender, tema-balanse, frafallsrisiko per deltaker, forslag til neste økt
- Kalender, deltakerliste, gruppestatistikk

**Stil:** Daylight — lyst, lavendel-aksent, Plus Jakarta Sans, mykt avrundet.

**Datamodell (gruppe-aksen):** `junior · gi · nogi · åpen matte`. Nivå (`grunn · erfaren · mix · junior`) er tags, ikke grupper. Lagt opp slik etter at Spond-titler over tid driftet mest på nivå-skillet.

**URL:** `løft.app` (mobil-PWA, lagt til på hjemskjerm) og `løft.app/desktop`.

### Fotball-appen (Bygg motoren)

**For hvem:** Ett barn av gangen, knyttet til familieheftene som er laget av brukeren selv. Klargjort for flere barn senere via `user`-kolonne i Sheets.

**Tre programmer i samme app, byttes med topp-bytter:**

| Program | Brand | Alder | Stil | Fokus |
|---|---|---|---|---|
| `ungdom` | Bygg motoren | 13+ | Nattstadion, kalkstreker, Anton-skrift | Fotball, rekorder, sterk motor-metafor |
| `junior` | Sommerball | 7–9 | Solrik himmelblå, lys og leketøff | Fotball-leker, ingen rekorder, fokus på touch |
| `rg` | Ball og rytme | ~9 | Plomme/rosa/lilla, elegant Marcellus | Turn, flyt, ingen rekorder |

**Hva alle tre har:**

- Tre faner: Hjem (dashboard) · Økter (velg dagens) · Skann (egne kameramoduser)
- Sju til ni økter per program med deløvelser å krysse av
- XP, nivåer, klubb-crest-merker, **is→ild-streakbar** mot ukemålet
- **Autolås på ukemål** — når første økt er ført inn en uke, kan målet ikke senkes for å trikse fram en streak
- **Per-uke-lagring av ukemål** — historiske uker beholder terskelen de hadde, så streak ikke endres tilbakevirkende
- CSV-eksport av loggen som backup

**Felles skannverktøy:** Mobil settes bak spilleren under øvelsen. Skjermen blinker farger, tall, "Gi-håndlinger" eller piler — spilleren skal snu hodet og avlese / utføre. Brukes i Bonus C/D av ungdom-programmet og leke-øktene i junior.

**URL:** `løft.app/fotball/`.

---

## Felles arkitektur

```
   Bruker (iPhone PWA / desktop)
              │
              ▼
   ┌──────────────────────────┐
   │  Cloudflare Zero Trust   │   to applikasjoner med hver sin
   │  Access (e-post + PIN)   │   e-postliste — én for trenerne,
   └──────────────────────────┘   én for fotball-brukerne
              │
              ▼
   ┌──────────────────────────┐
   │  Cloudflare Pages        │   bygger fra main automatisk
   │  + Pages Functions       │   /api og /fotball/api proxer mot
   │                          │   Apps Script og slipper gjennom
   │                          │   iOS PWA-ITP-restriksjoner
   └──────────────────────────┘
              │
              ▼
   ┌──────────────────────────┐
   │  Apps Script Web App     │   én deployment, samme token
   │  (Code.gs)               │   for begge apper
   └──────────────────────────┘
              │
              ▼
   ┌──────────────────────────┐
   │  Google Sheets           │   alle data i én fil
   │  "Treningslogg —         │   (ulike faner per app)
   │  Bodø Jiu Jitsu"         │
   └──────────────────────────┘
```

**Frontend-stil for begge:** Statisk HTML/JS, ingen byggesteg. Trener-appen bruker React via Babel standalone i nettleseren; fotball-appen er vanilla JS. Bevisst valg — minimaliserer drift og avhengigheter.

**Cloudflare Pages Functions** løser to praktiske problemer på én gang:
- iOS PWA blokkerer cross-origin-kall direkte mot script.google.com (ITP) — proxy gjør alt same-origin
- Cloudflare Access kan beskytte hele `/api*` og `/fotball/api*` på samme måte som resten av løft.app — ikke noe API-endepunkt utenfor tilgangslisten

---

## Datalag (Google Sheets)

Én delt arbeidsbok. Tre kategorier av faner:

| Kategori | Fane | Innhold |
|---|---|---|
| **Trener-app** | `sessions` | Loggede økter (id, dato, gruppe, trener, tittel, tags, oppmøte) |
| | `planned` | Planlagte fremtidige økter |
| | `trainers` | Trenerliste (config) |
| | `members` | Medlemsliste, bygd opp av Spond-import |
| | `attendance` | Oppmøte per økt (mange-til-mange) |
| **Fotball-app** | `bm_entries` | Loggede økter for alle tre programmer (id, user, program, dato, økt, deløvelser, rekord, notat, XP) |
| | `bm_settings` | Innstillinger per (user, program), nøkkel/verdi (f.eks. `goal`) |
| | `bm_week_goals` | Ukemål låst per (user, program, uke) — for at streaks ikke skal endres tilbakevirkende |

**`user`-kolonnen er forberedt for skalering.** Tom verdi tolkes som single-user. Når dere får flere barn på fotballappen, fylles den med e-post fra Cloudflare Access, og bm-tabellene filtrerer per bruker automatisk.

---

## Tilgangsstyring

Cloudflare Zero Trust Access, to applikasjoner:

| Applikasjon | Beskytter | Hvem |
|---|---|---|
| Trener | `løft.app`, `løft.app/desktop`, `løft.app/api` | 5 trener-e-poster (allowlist) |
| Fotball | `løft.app/fotball*` (inkl. `/fotball/api`) | Brukerens egen e-post + ett barns voksenkonto |

Login: One-Time PIN via e-post, 1 måned session. Default-deny — adresser som ikke står på listen får ikke engang en PIN.

`SHARED_TOKEN` i Apps Script er andre forsvarslinje, ikke eneste forsvar. Står i klartekst i `app/api.js` og `fotball/app-core.js` (klient-kode) og må matche `SHARED_TOKEN` i `Code.gs`. Repo-versjonen av Code.gs har riktig verdi for å unngå at innliming overskriver tokenet.

---

## Bruk per nå

| Trener-app | Fotball-app |
|---|---|
| ~170 økter logget | I daglig drift fra juni 2026 |
| ~600 oppmøte-rader | Tre programmer aktive |
| ~80 unike medlemmer | Sønnens egentrening fra mai/juni |
| 5 trenere med innlogging | Klar for skalering til flere barn |
| Brukes daglig av hovedtrener | |

---

## Driftskost

**0 NOK/måned** i tjenester. ~50 NOK/år for domenet (Hostinger, prepaid til mai 2027).

| Tjeneste | Plan | Forbruk vs. tak |
|---|---|---|
| Cloudflare Pages | Free | ~50 av 100k requests/dag |
| Cloudflare Zero Trust | Free | ~7 av 50 brukere |
| Cloudflare DNS | Free | nameservers for løft.app |
| Google Apps Script | Free | ~30 sek av 6 min skript-tid/dag |
| Google Sheets | Free | én arbeidsbok |
| GitHub | Free | offentlig repo, CI via Cloudflare |

---

## Sikkerhet i kortform

| | |
|---|---|
| **Perimeter** | Cloudflare Access på alle ruter — ingen anonyme requests slipper gjennom til appen eller API-et |
| **Token** | Apps Script-token er andre forsvarslinje, ikke første |
| **Tilgangslister** | Default-deny, e-postbasert. Adminutløpsdato støttes (f.eks. revisor i tre måneder) |
| **MFA-modus** | Cloudflare OTP via e-post; kombineres med Apple/Google-passord på sønnens telefon |
| **Klient-data** | Bare midlertidig cache i localStorage. Sannhetskilden er alltid Sheets |
| **Audit-trail per trener** | Ikke implementert — kommer når trener-identifikasjon legges på (roadmap) |
| **GDPR-formaliteter** | Datavernerklæring og slettefrist ikke formelt skrevet ned ennå (roadmap) |

---

## Roadmap

### Levert siden start

- **Trener-app**: ny gruppemodell (junior/gi/nogi/åpen matte + nivå-tags), per-rad-valg i Spond-import, redigere/slette planlagte uten konvertering, Daylight-tema, to-stegs slette-bekreftelse, autospinner ved sync
- **Fotball-app**: tre programmer med bytter, autolås av ukemål, per-uke-lagring av streak-terskel, klubb-crest-merker med is→ild-bar
- **Begge**: Cloudflare Access med to applikasjoner, deploy-pipeline fra GitHub `main`, CLAUDE.md-instrukser så ingen sesjon glemmer Apps Script-redeploy

### Nært i tid

- **Trener-identifikasjon i appen** — Cloudflare vet "noen på listen" logget, ikke hvem. Auto-fyller `trainer`-feltet og åpner for audit per person.
- **Profilvelger på fotball-appen** — for når dere får barn nr. 2. Backend er allerede klar via `user`-kolonnen; det er en frontend-jobb.
- **GDPR-formaliteter** — kort skriftlig dataerklæring publisert i appen, slettefrist for utmeldte medlemmer (forslag: 5 år).

### Mellomlang sikt

- Styre-/økonomi-dashboard på `løft.app/styre` med egen tilgangsliste (skissert tidligere, ikke startet)
- Smartere forslagsalgoritme på trener-dashbordet
- Globalt søk på loggede økter
- Per-medlem belte-/gradfelt
- "Send melding"-CTA fra frafallsrisiko

### Langsiktig

- Medlemsfasade (medlem ser sin egen historikk)
- To-veis Spond-sync
- PDF/CSV-eksport til klubbens årsrapport

---

## Risiko og avhengigheter

| Risiko | Nivå | Mitigering |
|---|---|---|
| Apps Script-tjenesten endrer vilkår eller fjerner gratis-tier | Medium | Tjenesten er stabil; vi flytter hvis det skjer |
| Spond .xlsx-format endrer seg uten varsel | Medium | Parser er defensiv, men ikke skuddsikker. Per-rad-valg ved import fanger uventede titler |
| Cloudflare Free-tier-grense (50 brukere) | Lav | Vi er på 7. Hvis vi åpner for medlemmer på sikt må vi vurdere plan |
| Kunnskaps-konsentrasjon (én person + AI bygger) | Medium | CLAUDE.md med faste arbeidsregler, alle endringer i offentlig Git med norske commitmeldinger, README-er som forklarer |
| GDPR-eksponering ved skalering | Medium | Single-user inntil videre; med flere barn må profilvelger og slettesyklus på plass |

---

## Læring underveis

Verdt å nevne for noen som vurderer lignende prosjekter:

1. **iOS PWA er ikke "bare en nettside"**. ITP, cache-aggressivitet og redirect-håndtering har skapt flest bugs av alle komponentene. Cloudflare-proxy var nødvendig for Apps Script fra installert PWA.

2. **Apps Script deployer ikke fra Git.** Code.gs er en manuelt synkronisert kopi. Glemt redeploy har stoppet prosessen flere ganger med kryptiske `unauthorized`/`unknown action`-feil. CLAUDE.md har nå en regel som tvinger Claude til å påminne hver gang fila endres.

3. **Tema-arbeid lønner seg sent**. Trener-appen ble flyttet fra Steel til Daylight et godt stykke inn i prosjektet. Eksplisitte design-tokens i `shared.js` gjorde overgangen overkommelig.

4. **Kjernetags er bedre enn fritekst-tags** for planleggingsdata. Kontrollerte vokabularer + fritekst i innholdsfeltet gir nyttige aggregater og fleksibilitet.

5. **Sheets som database holder lenger enn man tror.** Lett å revidere, ingen migrasjonsfrykt, klubben kan eksportere når som helst.

6. **Single-user nå, design for flere senere.** Fotball-appen ble bygd med `user`-kolonne fra dag én, selv om den er tom. Da blir overgangen til flere brukere et lite frontend-grep — ikke en backend-migrering.

---

*Sist oppdatert: juni 2026 — etter at fotball-appen fikk tre programmer (Bygg motoren / Sommerball / Ball og rytme).*
