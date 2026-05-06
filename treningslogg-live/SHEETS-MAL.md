# Google Sheets-struktur — Treningslogg

Apps Script-koden lager arkene automatisk når du kjører `_testSetupSheets`. Denne fila beskriver hva som ender opp i Sheets, og hvordan du kan bruke det direkte.

## Filnavn (anbefalt)

`Treningslogg — Bodø Jiu Jitsu`

Lag fila i klubbens Google Drive (ikke en privat konto). Apps Script kjører som den som deployer, så den brukeren må ha redigeringsrett.

## Faner

### `sessions` — loggede økter

| id | date | time | group | trainer | title | content | tags | attendance | createdAt | updatedAt |
|---|---|---|---|---|---|---|---|---|---|---|
| s-1714... | 2026-05-04 | 18:00 | grunnleggende | ola | half guard — underhook | oppvarming m/ shrimp ... | guard\|half-guard\|drill | 14 | 2026-05-04T16:30:00.000Z | 2026-05-04T16:30:00.000Z |

- `id` genereres av Apps Script (`s-<timestamp>`). Ikke endre manuelt med mindre du vet hva du gjør.
- `tags` lagres som pipe-separert streng (`guard|drill|kimura`). Apps Script konverterer til/fra array.
- `attendance` er totalt antall deltakere. Kan være tom eller settes ved Spond-import.

### `planned` — planlagte fremtidige økter

| id | date | time | group | trainer | title |
|---|---|---|---|---|---|
| p-1714... | 2026-05-09 | 11:00 | åpen matte |  |  |

Når en planlagt økt logges, sletter appen rad fra `planned` og legger til i `sessions`.

### `trainers` — trenerliste (config)

| id | name | active |
|---|---|---|
| ola | Ola | TRUE |
| marius | Marius | TRUE |
| kari | Kari | TRUE |

- Disse vises i dropdown ved logging av økt.
- Sett `active=FALSE` for å skjule en trener uten å miste historikk.
- Du kan redigere denne fanen direkte i Sheets — appen henter listen ved oppstart.

### `members` — medlemsliste (fra Spond)

| name | aliases | active |
|---|---|---|
| anders kristoffersen |  | TRUE |
| ola olsen | ola o.\|ola olsen jr | TRUE |

- Bygges opp av Spond-import. Du trenger ikke fylle inn manuelt.
- `aliases` er pipe-separert liste over historiske skrivemåter (post-MVP, kan stå tom nå).

### `attendance` — mange-til-mange (oppmøte)

| sessionId | memberName | importedAt |
|---|---|---|
| s-1714... | ola olsen | 2026-05-05T07:30:00.000Z |

Brukes av desktop-Spond-import. Frontend leser ikke denne ennå (kommer i v1.1).

## Bruk Sheets som admin-grensesnitt

Det fine med dette oppsettet er at fila *er* admin-vista:

- **Rette skrivefeil i en gammel økt:** åpne `sessions`, rett tittelen, ferdig.
- **Slette en feil-logget økt:** høyreklikk rad → Delete row. (Eller bruk delete-endpoint senere når UI har det.)
- **Massere data:** filter, sorter, legg til hjelpekolonner — Apps Script bryr seg ikke om det.
- **Legge til trener:** legg til rad i `trainers`-fanen, neste app-åpning ser den.

## Backup

Sheets versjonshistorikk gir gratis backup. **File → Version history → See version history**. Hvis noen ødelegger noe, ruller du tilbake.

For ekstra trygghet: **File → Make a copy** ukentlig.
