# Treningslogg (løft.app) — instruksjoner for Claude Code

Norsk prosjekt — svar på norsk, hold teknisk sjargong på et minimum.

## ⚠️ ALLTID: påminnelse ved endring av Code.gs

`treningslogg-live/apps-script/Code.gs` deployer **ikke** automatisk.
Git/Cloudflare deployer kun frontend — Apps Script er en manuelt
synkronisert kopi i brukerens Google-konto.

**Hver gang du endrer Code.gs, MÅ du eksplisitt minne brukeren på:**

1. Kopier hele Code.gs fra repoet → lim inn i Apps Script-editoren.
2. Lagre (Cmd/Ctrl+S).
3. **Deploy → Manage deployments → blyant → Version: New version → Deploy**
   — Save alene er IKKE nok; uten ny versjon kjører gammel kode.
4. Kjør eventuelle nye `_setup…`-funksjoner manuelt fra editor-dropdownen.
5. Test at både trener-appen (løft.app) og fotball-appen (løft.app/fotball)
   fortsatt kan lese og lagre.

Dette har stoppet prosessen flere ganger («unauthorized» / «unknown action»),
så ta det med i sluttmeldingen hver gang — selv om endringen virker liten.
Send gjerne fila med SendUserFile samtidig.

## Arkitektur (kort)

- **Frontend**: statisk HTML + JSX (Babel standalone, ingen build-step)
  i `treningslogg-live/`. Cloudflare Pages deployer fra `main`.
- **Trener-app**: `index.html` (mobil-PWA) + `desktop.html` — React,
  Daylight-tema (lyst, lavendel, Plus Jakarta Sans). Tokens i
  `app/shared.js` (`M`-objektet).
- **Fotball-app**: `fotball/` — vanilla JS, egen visuell identitet
  (kremfarget, Spectral/Bricolage). Egen API-rute `/fotball/api`.
- **Backend**: Google Sheets + Apps Script Web App (`apps-script/Code.gs`),
  proxy via Cloudflare Pages Functions (`functions/api.js` og
  `functions/fotball/api.js`).
- **Tilgang**: Cloudflare Zero Trust Access — trener-applikasjon for
  løft.app, egen applikasjon med egen e-postliste for `/fotball*`.

## Arbeidsregler

- Produksjon deployer fra `main`; arbeid skjer på feature-branch og
  brukeren merger PR selv. Minn brukeren på merge når endringer skal testes live.
- `SHARED_TOKEN` i Code.gs skal være identisk med `TOKEN` i `app/api.js`
  og `API_TOKEN` i `fotball/app-core.js`. Ikke gjeninnfør plassholder.
- Lint: `eslint treningslogg-live/ functions/` (flat-config i repo-rot,
  ingen npm install nødvendig). 0 errors før commit.
- Grupper i datamodellen: `junior / gi / nogi / åpen matte`.
  Nivå (`grunn/erfaren/mix/junior`) er tags, ikke grupper.
