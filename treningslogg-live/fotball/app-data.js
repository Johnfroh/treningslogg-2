/* ============================================================
   BYGG MOTOREN — appdata
   Økter, deløvelser, rekorder, nivåer, badges, sitater.
   Eksponerer window.BM_DATA.
   ============================================================ */
window.BM_DATA = {

  okter: [
    {
      key: "okt1", label: "Økt 1", title: "Aldri samme touch to ganger",
      meta: "15–20 min · kun ball", accent: "green",
      intro: "Regelen for hele økta: gjør aldri to like på rad.",
      parts: [
        { name: "Touchmeny", time: "8 min", desc: "Selvkast over hodehøyde – men hvert eneste mottak skal være nytt. Ny flate, ny høyde på kastet, ny retning ut av touchen, på ett bein, i ubalanse, etter et lite hopp, med ryggen til først. Blir et mottak stygt? Perfekt – det er der læringen skjer." },
        { name: "Bytt underlag", time: "5 min", desc: "Samme meny – men flytt deg. Tre minutter på gress, så grus, asfalt eller en skrå flate. Ujevnt underlag er en treningspartner: ballen oppfører seg aldri likt, og touchen din lærer å svare på alt." },
        { name: "Trikse-kaos", time: "5 min", desc: "Triksing der ingen berøring får bruke samme flate som den forrige. Fot–lår–fot er lov, fot–fot er ikke. Tell serien. Når den ryker: start på nytt, finn en ny vei gjennom." }
      ],
      rekord: { desc: "Lengste trikse-serie der ingen berøring er lik den forrige.", placeholder: "antall", better: "higher" }
    },
    {
      key: "okt2", label: "Økt 2", title: "Skann før du mottar",
      meta: "20 min · ball + 4–5 kjegler", accent: "green", skann: true,
      intro: "De beste ser seg over skulderen oftest – og timer blikket til når ballen er underveis.",
      parts: [
        { name: "Fargeskann", time: "8 min", skann: true, desc: "Sett fire kjegler i ulike farger i en stor sirkel rundt deg, 5–8 meter unna – eller bruk skannverktøyet i appen: sett mobilen bak deg. Kast ballen til deg selv, og mens den er i luften: snu hodet, velg en kjegle/se fargen, og la førstetouchen ta ballen mot den. Si fargen høyt idet du tar touchen." },
        { name: "Dobbeltskann på halvvending", time: "7 min", desc: "Rygg mot en tenkt medspiller. Rull ballen fra deg, hent den – men før hvert mottak: to blikk over skulderen, ett over hver. Ta så førstetouchen ut i den retningen som var «mest åpen» i hodet ditt." },
        { name: "Føring med fritt blikk", time: "5 min", desc: "Driv ballen i et område og tell noe i omgivelsene mens du fører: vinduer, biler, trær. Si tallet høyt til slutt. Klarer du å telle riktig uten å miste ballen, eier føringen din seg selv." }
      ],
      rekord: { desc: "Antall fargeskann på rad der du både sa riktig farge og touchen traff retningen.", placeholder: "antall på rad", better: "higher" }
    },
    {
      key: "okt3", label: "Økt 3", title: "Ødegaard-økta",
      meta: "20–30 min · ball + 3–4 kjegler", accent: "green",
      intro: "Fintene hans var ikke tilfeldige: de ble øvd inn systematisk, til de satt.",
      parts: [
        { name: "Fintekjeder", time: "10 min", desc: "Én finte kan en forsvarer lese. To på rad kan han ikke. Sett sammen kjeder: oversteg inn i croqueta, kroppsfinte inn i utsidetouch. Tre kjeder, fem ganger hver – og viktigst: lag tre egne kombinasjoner som ingen har vist deg." },
        { name: "Begge-veier-regelen", time: "8 min", desc: "Hver kjede skal gå like mange ganger mot venstre som mot høyre. Forsvarere lærer fort hvilken vei du foretrekker – med mindre det ikke finnes en. Svak side teller dobbelt." },
        { name: "Kaosruta", time: "8 min", desc: "Fire kjegler som en rute på 8×8 meter. 60 sekunder fri føring og finting – men hver runde har en ny regel: kun utsiden av foten. Kun svak fot. Aldri samme fot to ganger på rad. Alltid en finte før hvert retningsbytte." }
      ],
      rekord: { desc: "Antall egne fintekjeder (dine kombinasjoner) som satt perfekt i dag.", placeholder: "antall", better: "higher" }
    },
    {
      key: "bonusA", label: "Bonus A", title: "Returnettet: mottak med hodet oppe",
      meta: "20–30 min · ball + rebound-nett", accent: "gold", skann: true,
      intro: "Nettet gir deg en ball som kommer mot deg uten at du kontrollerer den helt.",
      parts: [
        { name: "Skann-retur", time: "8 min", skann: true, desc: "Legg tre kjegler eller lapper med tall bak deg – eller bruk skannverktøyet i appen (tall-modus). Spill i nettet, og mens ballen er på vei tilbake: snu hodet, les ett tall, rop det høyt, og ta førstetouchen i den retningen." },
        { name: "Aldri samme retur", time: "8 min", desc: "Endre noe for hver eneste pasning i nettet: vinkel, kraft, avstand, fot. Da blir hver retur et nytt problem – og mottaket ditt lærer å svare på alt, ikke bare det perfekte." },
        { name: "Andreballen", time: "8 min", desc: "Spill hardt i nettet og la returen sprette én gang. Angrip spretten, ta ballen ned og spill en kontrollert pasning innen to touch. Dette er kampens vanligste kaossituasjon – ballen som ingen eier." }
      ],
      rekord: { desc: "Lengste serie skann-returer med riktig tall OG riktig retning.", placeholder: "antall på rad", better: "higher" }
    },
    {
      key: "bonusB", label: "Bonus B", title: "Veggen: kamptempo",
      meta: "20–30 min · ball + ballvegg + teip/kritt", accent: "gold",
      intro: "Veggen er den ærligste treningspartneren som finnes.",
      parts: [
        { name: "Vegg-rondo", time: "8 min", desc: "Marker to soner på veggen med teip eller kritt, to–tre meter fra hverandre. Spill vekselvis på dem – men mottaket skal alltid tas med kroppen åpen mot neste merke, før ballen kommer." },
        { name: "45-sekunderen", time: "8 min", desc: "45 sekunder: maks antall vegg-pasninger med to touch. 45 sekunder pause. Så 45 sekunder én-touch. Tre runder av hver. Teknikk under tidspress er en annen ferdighet enn teknikk i fred." },
        { name: "Forkledningen", time: "7 min", desc: "Ta mottak der hele kroppen sier én retning – skulder, hofte, blikk – og touchen går motsatt. Motstanderen flytter seg på løgnen, ikke på ballen." },
        { name: "Svakfot-regnskapet", time: "5 min", desc: "Avslutt med alt over – halv avstand, kun svak fot. Fem minutter hver økt er nok: på et halvår har svakfoten din fått timer de andre aldri tar igjen." }
      ],
      rekord: { desc: "Beste 45-sekunder på én-touch (antall pasninger).", placeholder: "antall", better: "higher" }
    },
    {
      key: "bonusC", label: "Bonus C", title: "Skann-appen og kjeglene",
      meta: "20 min · ball + 5 kjegler + skann-app på stativ", accent: "gold", skann: true,
      intro: "Nå gjør en skjerm jobben: appen blinker tall, farger eller piler du ikke kan forutse – løft blikket og les dem mens ballen ruller.",
      parts: [
        { name: "Les og rop", time: "6 min", skann: true, desc: "Driv ballen rolig mellom fem kjegler i en bue. Sett skann-appen i øyehøyde (tall-modus) – den blinker et tall, løft blikket, les det, rop det høyt, fortsett føringen uten å stoppe. Kan du føre uten å se på ballen?" },
        { name: "Farge styrer retning", time: "7 min", skann: true, desc: "Gi hver kjegle en farge. Appen blinker en farge (farge-modus) – du fører ballen til den kjeglen, vender rundt den, og venter på neste farge mens ballen holdes i bevegelse. Oppfatt, velg, utfør." },
        { name: "Pil = vending", time: "7 min", skann: true, desc: "Appen blinker en pil – venstre, høyre, opp, ned (pil-modus). Gjør vendingen pilen viser, midt i føringen, så fort du klarer å lese den. Bland inn fintene fra Økt 3 når pilen peker bakover." }
      ],
      rekord: { desc: "Antall riktige reaksjoner på 90 sekunder uten å miste ballen.", placeholder: "antall på 90 sek", better: "higher" }
    },
    {
      key: "bonusD", label: "Bonus D", title: "To mål, tre baller",
      meta: "20–30 min · 3 baller + 2 småmål", accent: "gold", skann: true,
      intro: "Mange repetisjoner på kort tid bygger en avslutter. Sett de to målene 6–8 meter fra hverandre.",
      parts: [
        { name: "Tre på rad", time: "6 min", desc: "Tre baller på en linje. Avslutt alle tre så raskt du kan med god kvalitet – og veksle mål for hver ball: venstre, høyre, venstre. Det er vekslingen som trener deg." },
        { name: "Touch og avslutt", time: "8 min", desc: "Legg ballene litt unna. Spring til ballen, ta én touch som legger den til rette, og avslutt på andre touch. Aldri stoppe ballen først. To touch, mål – sånn scores de fleste mål." },
        { name: "Skjermen velger målet", time: "8 min", skann: true, desc: "Bruk skann-appen (pil- eller farge-modus) i det du tar siste touch: skjermen sier venstre eller høyre, og du avslutter dit – etter at du er i bevegelse. Les og bestem i siste øyeblikk." },
        { name: "Vinkeljakt", time: "5 min", desc: "Flytt deg rundt: skyt fra spiss vinkel, fra siden, etter en liten dragning innover. Samme to mål, men aldri samme vinkel to ganger." }
      ],
      rekord: { desc: "Antall fulltreff av ti skudd der skjermen valgte siden.", placeholder: "treff av 10", better: "higher" }
    },
    {
      key: "fart1", label: "Fart 1", title: "Fartsskolen",
      meta: "15 min · ingen utstyr", accent: "coral",
      intro: "Fart er teknikk før det er muskler. Sprinter du sliten, trener du kondisjon – ikke fart.",
      parts: [
        { name: "Aktivering", time: "3 min", desc: "Lette ankelhopp på stedet (stive ankler, korte kontakter), hælspark og rolige høye kneløft fremover. Du vekker fjæringen i leggene." },
        { name: "Teknikkskolen", time: "6 min", desc: "Veggdrillen: len deg mot en vegg i cirka 45 grader, kjør ett og ett kne raskt opp mot brystet. Så A-skip over 15 meter: kneet drives høyt, foten slår ned rett under deg. Tre runder av hver." },
        { name: "Akselerasjoner", time: "6 min", desc: "Fem til seks drag på 10–15 meter, maks innsats – og varier starten hver gang: stående, fallende, sidelengs, etter touch, etter hopp. Gå rolig tilbake mellom hvert drag. Føles beina tunge: avslutt." }
      ],
      rekord: { desc: "Antall steg på 20 meter i full fart. Færre steg = bedre teknikk.", placeholder: "antall steg", better: "lower" }
    },
    {
      key: "fart2", label: "Fart 2", title: "Motorrommet",
      meta: "30 min · ball + 4 kjegler + stoppeklokke", accent: "coral",
      intro: "Kondisjon er den fysiske egenskapen som ikke venter på puberteten.",
      parts: [
        { name: "Oppvarming med ball", time: "5 min", desc: "Rolig føring som gradvis øker i tempo, med vendinger og retningsbytter underveis. Siste minuttet i nesten kampfart." },
        { name: "Spenstdosen", time: "4 min", desc: "Linjehopp: raskt frem og tilbake over en linje, 3 × 15 sekunder. Så sidehopp på ett bein, 2 × 10 per bein. Korte, kvikke bakkekontakter – tenk varm asfalt. Vondt i knær/hæler i vekstperioder? Kutt hoppene den uka." },
        { name: "5-10-5 med tid", time: "8 min", desc: "Tre kjegler på linje, fem meter mellom. Sprint 5 m høyre, snu, 10 m venstre, snu, 5 m tilbake. Ta tiden. Fire til seks forsøk med minst ett minutt pause. Lavt tyngdepunkt inn, eksplosivt ut." },
        { name: "30/30 med ball", time: "10 min", desc: "30 sekunder føring i høy fart – så høyt tempo du klarer med kontroll – så 30 sekunder rolig. Åtte til ti runder. Ryker touchen helt, senk farten ett hakk." },
        { name: "Nedjogg", time: "3 min", desc: "Rolig jogg eller gange med ballen i hendene. Pust ned. Tenk gjennom hva som satt best i dag – det er en del av økta." }
      ],
      rekord: { desc: "Beste 5-10-5-tid (sekunder). Mobiltider er like unøyaktige hver uke – fremgangen er ekte.", placeholder: "sekunder", better: "lower" }
    }
  ],

  quotes: [
    "Du bygger motoren nå. Karosseriet kommer senere.",
    "Vis at du vil ha den. Resten kommer.",
    "Fremgang går i bølger. En tung økt betyr ikke at du har falt tilbake – det betyr at du er midt i utviklingen.",
    "Egentrening er stedet uten publikum. Det er her motoren lages.",
    "Sammenlign deg bakover, ikke sidelengs. Riktig målestokk er deg selv for tre måneder siden.",
    "Møt opp for deg selv – spesielt de dagene det butter.",
    "Fart trenes fersk. Motor trenes sliten. De blandes aldri.",
    "Aldri samme repetisjon to ganger. Hjernen bygger løsninger, ikke bare bevegelser."
  ],

  levels: [
    { xp: 0,   name: "Tenning" },
    { xp: 60,  name: "Tomgang" },
    { xp: 140, name: "Førstegir" },
    { xp: 240, name: "Andregir" },
    { xp: 360, name: "Tredjegir" },
    { xp: 500, name: "Fjerdegir" },
    { xp: 660, name: "Femtegir" },
    { xp: 840, name: "Full gass" }
  ],

  /* XP-regler */
  xpRules: { base: 20, allParts: 10, newRecord: 15 },

  badges: [
    { key: "igang",    name: "I gang",          desc: "Første økt ført",                    icon:"whistle",  check: s => s.total >= 1 },
    { key: "fem",      name: "Femmer'n",        desc: "5 økter gjennomført",                num:"5",        check: s => s.total >= 5 },
    { key: "ti",       name: "Tosifret",        desc: "10 økter gjennomført",               num:"10",       check: s => s.total >= 10 },
    { key: "kvart",    name: "Kvarthundre",     desc: "25 økter gjennomført",               num:"25",       check: s => s.total >= 25 },
    { key: "femti",    name: "Halvhundre",      desc: "50 økter gjennomført",               num:"50",       check: s => s.total >= 50 },
    { key: "meny",     name: "Hele menyen",     desc: "Alle 9 øktene prøvd",                icon:"clipboard", check: s => s.distinct >= 9 },
    { key: "uke1",     name: "Uka i boks",      desc: "Første uke med ukemålet nådd",       icon:"calcheck", check: s => s.weeksMet >= 1 },
    { key: "streak2",  name: "To på rad",       desc: "2 uker på rad med ukemålet",         icon:"flame",   check: s => s.bestStreak >= 2 },
    { key: "streak4",  name: "Månedsmotor",     desc: "4 uker på rad med ukemålet",         icon:"calendar", check: s => s.bestStreak >= 4 },
    { key: "streak8",  name: "Maskinen",        desc: "8 uker på rad med ukemålet",         icon:"gear",    check: s => s.bestStreak >= 8 },
    { key: "rekord1",  name: "Rekordjeger",     desc: "Slo din egen rekord",                icon:"trophy",  check: s => s.improvements >= 1 },
    { key: "rekord3",  name: "Kurven peker opp", desc: "3 rekordforbedringer",              icon:"chart",   check: s => s.improvements >= 3 }
  ]
};
