# Treningslogg — fra prototype til live

Denne mappa er klar til å hostes statisk og koble seg til en Google Sheets-backend. Følg de tre fasene under i rekkefølge.

---

## Oversikt

```
┌──────────────────┐                  ┌─────────────────┐
│  iPhone (Safari) │  ──── HTTPS ───▶ │  Static host    │
│  Hjemskjerm-ikon │                  │  (Cloudflare    │
│  fullskjerm-app  │                  │   Pages)        │
└──────────────────┘                  └────────┬────────┘
                                               │
                                               │ fetch
                                               ▼
                                       ┌─────────────────┐
                                       │  Apps Script    │
                                       │  Web App        │
                                       └────────┬────────┘
                                                │
                                                ▼
                                       ┌─────────────────┐
                                       │  Google Sheets  │
                                       │  "Treningslogg" │
                                       └─────────────────┘
```

| Fase | Hva | Tid | Kan gå live etter? |
|---|---|---|---|
| 1 | Sheets + Apps Script + curl-test | 30 min | Backend funker isolert |
| 2 | Koble frontend til endpoint | 15 min | App kan logge til Sheets |
| 3 | Deploy + PWA-test på iPhone | 30 min | Trenerne kan ta i bruk |

---

## Fase 1 — Backend (Sheets + Apps Script)

### 1.1 Lag Google Sheets-fil

1. Gå til Google Drive (klubbens konto, ikke privat).
2. Ny → Google Sheets.
3. Gi den navn: **`Treningslogg — Bodø Jiu Jitsu`**.

Du trenger ikke lage faner manuelt — Apps Script gjør det.

### 1.2 Sett opp Apps Script

1. I Sheets-fila: **Extensions → Apps Script**.
2. Slett standardinnholdet i `Code.gs`.
3. Åpne `apps-script/Code.gs` i denne pakken og kopier alt.
4. Lim inn i Apps Script-editoren.
5. **Endre linje 23** — `SHARED_TOKEN`. Velg en tilfeldig streng. Eksempel:
   ```js
   const SHARED_TOKEN = 'bjj-T9mK2pQx-2026';
   ```
   Skriv ned denne — du trenger den i Fase 2.
6. Lagre (Cmd+S / Ctrl+S).

### 1.3 Initialiser Sheets-strukturen

1. I Apps Script-editoren: velg funksjonen `_testSetupSheets` fra dropdown øverst.
2. Klikk **Run**.
3. Aksepter tilganger første gang (Google viser advarsel — klikk "Advanced" → "Go to … (unsafe)" → fortsett. Dette er normalt for personlige Apps Script-prosjekter).
4. Sjekk Sheets-fila: 5 nye faner skal være opprettet (`sessions`, `planned`, `trainers`, `members`, `attendance`) hver med riktige headers.

### 1.4 Legg inn trenere

I `trainers`-fanen, fyll inn:

| id | name | active |
|---|---|---|
| ola | Ola | TRUE |
| marius | Marius | TRUE |
| kari | Kari | TRUE |

(Eller hvilke navn dere faktisk skal bruke. `id` må være lowercase uten mellomrom — det er en stabil nøkkel.)

### 1.5 Deploy som Web App

1. **Deploy → New deployment**.
2. Tannhjul-ikonet → velg **Web app**.
3. Felt:
   - Description: `Treningslogg API v1`
   - Execute as: **Me** (klubbens konto)
   - Who has access: **Anyone**
4. **Deploy**.
5. Kopier **Web app URL** — den ser ut som `https://script.google.com/macros/s/AKfyc.../exec`. Skriv den ned.

### 1.6 Test endpointet

Lim URL-en inn i nettleser med ping-action:

```
https://script.google.com/macros/s/AKfyc.../exec?action=ping&token=DIN-TOKEN
```

Forventet svar: `{"ok":true,"data":{"now":"2026-..."}}`

Hvis du får `{"ok":false,"error":"unauthorized"}` → token-mismatch. Sjekk at `SHARED_TOKEN` i Code.gs er likt det du puttet i URL-en.

✅ **Fase 1 ferdig.** Backend er live og fungerer isolert.

---

## Fase 2 — Koble frontend til endpoint

### 2.1 Rediger `app/api.js`

Åpne fila og finn linjene 11–12:

```js
const ENDPOINT = 'https://script.google.com/macros/s/PASTE_DEPLOYMENT_ID_HER/exec';
const TOKEN    = 'bjj-bodø-2026-bytt-meg';
```

Bytt med din Web app URL og din SHARED_TOKEN fra Fase 1.

### 2.2 Test lokalt

1. I terminal, fra denne mappa:
   ```bash
   python3 -m http.server 8000
   ```
   (Eller hvilken som helst annen statisk webserver.)
2. Åpne `http://localhost:8000` i nettleser.
3. Verifiser:
   - Appen laster uten feil i konsollen
   - Tweaks-panelet (klikk øverst til høyre) viser "synk fra Sheets"-knappen
   - Logg en testøkt → sjekk at den dukker opp i Sheets-fila innen sekunder

Hvis det ikke fungerer:
- Åpne devtools → Network → se hva fetch-kallet returnerer
- 401 = token-feil
- CORS-feil = sjekk at Apps Script er deployet som "Anyone" (ikke "Anyone with Google account")

✅ **Fase 2 ferdig.** App og backend snakker sammen.

---

## Fase 3 — Hosting + PWA-test på iPhone

### 3.1 Hosting (anbefalt: Cloudflare Pages — gratis, raskest)

**Alternativ A: Drag-and-drop (enklest, ingen Git)**

1. Gå til [pages.cloudflare.com](https://pages.cloudflare.com) → Sign up (gratis).
2. **Create a project** → **Direct upload**.
3. Project name: `treningslogg-bjj` (blir til `treningslogg-bjj.pages.dev`).
4. Dra hele denne mappa (`treningslogg-live/`) inn.
5. Klikk Deploy. Etter ~30 sek får du URL: `https://treningslogg-bjj.pages.dev`.

**Alternativ B: GitHub-kobling (anbefalt for v2 og senere)**

1. Last opp mappa til et privat GitHub-repo.
2. Cloudflare Pages → Connect to Git → velg repoet.
3. Build settings: ingen (statisk site).
4. Senere endringer pusher du via Git → auto-deploy.

**Alternativ C: Custom domene**

I Cloudflare Pages: project → Custom domains → Add. Legg inn f.eks. `trening.bodojiujitsu.no`. Cloudflare gir deg DNS-instruksene som skal inn hos PRO ISP. (Eller flytt DNS-en til Cloudflare for det subdomenet.)

### 3.2 Test PWA på iPhone

1. Åpne URL-en i Safari på iPhone (ikke Chrome).
2. Trykk **Del-ikonet** (firkant med pil opp).
3. Scroll ned → **Legg til på Hjemskjerm**.
4. Endre evt. navn til "Treningslogg".
5. Trykk **Legg til**.
6. Lukk Safari. Trykk på det nye ikonet på hjemskjerm.

Forventet:
- Appen åpner i fullskjerm uten Safari-bar.
- Ikonet er det vi laget (eller ditt egne hvis du har byttet, se `icons/README.md`).
- Appen oppfører seg som en native app.

### 3.3 Inviter de tre trenerne

Send dem URL-en i Spond/SMS:

> Hei! Treningslogg-appen er klar.
>
> 1. Åpne lenken i Safari på iPhone: `https://...`
> 2. Trykk del-ikonet → Legg til på Hjemskjerm
> 3. Det blir et eget ikon på hjemskjerm.
> 4. Velg deg selv fra trener-listen når du logger en økt.
>
> Spørsmål? Send melding.

✅ **Fase 3 ferdig.** Appen er live og i bruk.

---

## Vedlikehold

| Oppgave | Hvordan |
|---|---|
| Legge til trener | Rediger `trainers`-fanen i Sheets. Trenerne ser endringen neste gang appen åpnes. |
| Rette feil i en logget økt | Rediger `sessions`-fanen direkte. Trener åpner appen → Tweaks → "synk fra Sheets". |
| Bytte ut ikoner | Lag nye PNGs i Canva (samme filnavn, samme størrelser), erstatt i `icons/`-mappa, redeploy. |
| Endre Code.gs | Apps Script editor → endre → Deploy → Manage deployments → Edit (blyant) → Version: New version → Deploy. **URL endres ikke.** |
| Backup | File → Version history i Sheets. Eller File → Make a copy ukentlig. |

## Senere: V1.1

Når denne MVP-en har vært i drift et par uker og dere vet hva som fungerer:

- Spond-import (desktop) — koden finnes i `app/import.jsx`, må kobles til ny endpoint i Code.gs (`importAttendance`)
- Slett-knapp i UI (endpoint finnes allerede: `deleteSession`)
- Service worker for offline-bruk
- Søk og filtrering på tvers av økter

## Filstruktur

```
treningslogg-live/
├── README.md                      ← du leser den
├── SHEETS-MAL.md                  ← Sheets-strukturreferanse
├── index.html                     ← entry point (PWA-meta + script-loading)
├── manifest.webmanifest           ← PWA manifest
├── tweaks-panel.jsx               ← utseende-justerer (uendret fra prototype)
├── logo-light.png                 ← klubblogo
│
├── app/
│   ├── api.js                     ← NY: backend-klient (Sheets via Apps Script)
│   ├── data.js                    ← statisk konfig (grupper, tags, fallback-data)
│   ├── mobile.jsx                 ← MODIFISERT: Sheets-tilkoblet (var: localStorage)
│   ├── components.jsx             ← desktop-komponenter (uendret)
│   ├── import.jsx                 ← Spond-parser (uendret, kobles til senere)
│   └── mobile-mockups.jsx         ← (uendret)
│
├── apps-script/
│   ├── Code.gs                    ← NY: Apps Script Web App
│   └── README.md                  ← deploy-instruks
│
├── design/
│   └── tokens.css                 ← designsystem (uendret)
│
└── icons/
    ├── icon-32.png                ← favicon
    ├── icon-180.png               ← iOS-touch-ikon
    ├── apple-touch-icon.png       ← samme, Apples standardnavn
    ├── icon-192.png               ← Android/PWA standard
    ├── icon-512.png               ← PWA "any" purpose
    └── icon-maskable-512.png      ← PWA "maskable" (Android adaptive)
```
