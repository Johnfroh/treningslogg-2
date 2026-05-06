# Ikoner — bytt ut placeholder med klubblogo

Ikonene som ligger her nå er enkle generiske plassholdere. Når du har tid, bytt dem ut med ekte klubblogo i Canva.

## Eksakte filer som må erstattes

| Fil | Størrelse | Bruk |
|---|---|---|
| `icon-32.png` | 32×32 | Browser-favicon |
| `icon-180.png` | 180×180 | iOS touch icon |
| `apple-touch-icon.png` | 180×180 | iOS standardnavn (kopi av `icon-180.png`) |
| `icon-192.png` | 192×192 | PWA standard |
| `icon-512.png` | 512×512 | PWA stor (også "any" purpose) |
| `icon-maskable-512.png` | 512×512 | PWA Android adaptive — **må ha 30% padding rundt logoen** |

## Designkrav

- **Bakgrunn:** anthracite (#1F1A14) — gir best kontrast på iPhone hjemskjerm
- **Logo:** lys (BJJ-logo i hvit eller bone-farge)
- **Aksent:** valgfri, men hold den dempet
- **Maskable:** Android beskjærer ikoner i ulike former (rund, kvadrat, squircle). Logoen må holde seg innenfor en sirkel som dekker midtre 60% av ikonet. Tegn med padding!

## Slik gjør du det i Canva

1. **Lag master på 1024×1024**
   - Custom size → 1024 × 1024 px
   - Bakgrunn: legg på rektangel med farge #1F1A14, dekk hele canvas
   - Plasser klubblogo sentralt
   - Eksporter som PNG: `icon-master.png`

2. **Lag eksport-versjoner**

   Eksporter samme design i 5 størrelser:

   | Eksporter til | Filnavn |
   |---|---|
   | 32 × 32 | `icon-32.png` |
   | 180 × 180 | `icon-180.png` (kopier også til `apple-touch-icon.png`) |
   | 192 × 192 | `icon-192.png` |
   | 512 × 512 | `icon-512.png` |

   I Canva: File → Download → PNG → custom size.

3. **Lag maskable-versjon (egen design)**
   - Ny canvas 1024×1024 med samme bakgrunn
   - Krymp logoen så den ligger innenfor en sentrert sirkel med diameter = 60% av canvas (308 px radius)
   - Eksporter til 512×512 som `icon-maskable-512.png`

4. **Bytt ut filene i `icons/`-mappa**

5. **Redeploy** (Cloudflare Pages → re-upload, eller git push)

6. **På iPhone:** slett gammelt hjemskjerm-ikon, åpne URL i Safari på nytt, "Legg til på Hjemskjerm" igjen for å hente nytt ikon.

## Test maskable-versjonen

Bruk [maskable.app/editor](https://maskable.app/editor) — last opp `icon-maskable-512.png` og se hvordan den ser ut i ulike masker. Logoen skal ikke beskjæres i noen av variantene.
