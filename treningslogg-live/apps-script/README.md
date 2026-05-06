# Apps Script — backend

Dette er backenden for Treningslogg. Apps Script eksponerer Google Sheets som en HTTPS-endpoint mobil-appen kan kalle.

## Deploy (15 minutter)

1. Lag eller åpne Sheets-fila som skal være database (se `../SHEETS-MAL.md` for struktur).
2. **Extensions** → **Apps Script**.
3. Slett standard `Code.gs`-innholdet og lim inn `Code.gs` fra denne mappa.
4. Endre `SHARED_TOKEN` på linje 23 til noe ingen vil gjette. Husk denne — du skal bruke samme verdi i `app/api.js`.
5. Lagre (disk-ikon eller Cmd+S).
6. **Run** → velg funksjonen `_testSetupSheets` → **Run**. Aksepter tilganger første gang. Alle nødvendige ark blir opprettet med riktige headers.
7. **Deploy** → **New deployment**.
   - Type: **Web app**
   - Description: `Treningslogg API v1`
   - Execute as: **Me** (din konto)
   - Who has access: **Anyone**
8. Klikk **Deploy**. Kopier **Web app URL**. Den ser ut som `https://script.google.com/macros/s/AKfyc.../exec`.

## Test endpointet før du kobler til frontend

Lim inn URL-en i nettleser med din token:

```
https://script.google.com/macros/s/AKfyc.../exec?action=ping&token=DIN-TOKEN
```

Forventet svar: `{"ok":true,"data":{"now":"2026-05-06T..."}}`

## Re-deploy etter endringer

Apps Script bruker versjonering. Hver gang du endrer `Code.gs`:

- **Deploy** → **Manage deployments** → blyant-ikon på din deployment → Version: **New version** → Deploy.
- URL-en endres **ikke**. Fortsett å bruke samme URL i frontend.

## Feilsøking

| Symptom | Årsak | Løsning |
|---|---|---|
| `unauthorized` | Token mismatch | Sjekk at `SHARED_TOKEN` i Code.gs matcher `TOKEN` i app/api.js |
| `Authorization is required` | Første kjøring | Run `_testSetupSheets` manuelt fra editoren og aksepter tilganger |
| CORS-feil i konsollen | Ingen — Apps Script-deployments med "Anyone" støtter CORS | Sjekk at deployment er Web app, ikke API executable |
| Tomme svar | Sheet-fane mangler | Run `_testSetupSheets` igjen |
