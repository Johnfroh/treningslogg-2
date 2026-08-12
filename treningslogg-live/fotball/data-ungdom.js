/* ============================================================
   HEFTE: UNGDOM — «Bygg motoren»  (fotball-egentrening, 13+)
   ============================================================ */
window.BM_PROGRAMS = window.BM_PROGRAMS || {};
window.BM_PROGRAMS.ungdom = {
  id: "ungdom",
  brand: { name: "Bygg motoren", tagline: "Kroppen · Blikkene · Ballen", short: "Bygg motoren", age: "Ungdom · 13+", dot: "#5fe0a0" },
  hero: { top: "Streak", subLow: "tenn den denne uka", subHigh: "hold gløden i live", unit: "uker", unitOne: "uke", suffix: "på rad" },
  meter: { low: "Frossen", high: "Tent" },
  weekGoalDefault: 3,
  navMid: "Økter",
  okterTitle: { pre: "Økt", hl: "ene", sub: "Én økt per dag · to–tre i uka er nok", brandsub: "Velg dagens økt" },
  recordsEnabled: true,
  recordTitle: "Beste rekorder",
  quoteSource: "Fra heftet «Vis at du vil ha den»",

  groups: [
    { key: "ball",  title: "Ball og blikk",      sub: "Økt 1–3" },
    { key: "bonus", title: "Økter med utstyr",   sub: "A–D" },
    { key: "fart",  title: "Fart og motor",      sub: "Fart 1–4" }
  ],

  theme: {
    "--app-bg": "radial-gradient(125% 80% at 50% 24%, #0f3a23 0%, #0a2114 46%, #050f0a 100%)",
    "--edge-bg": "#050f0a",
    "--display": "'Anton',sans-serif",
    "--ink": "#eafff0", "--ink-soft": "#bfe0cc",
    "--green": "#3ea86a", "--green-deep": "#2fa860", "--green-bright": "#5fe0a0",
    "--gold": "#e0992e", "--gold-bright": "#ffce8a",
    "--coral": "#da5b3b",
    "--muted": "#6a9a80", "--muted-2": "#5a8a70",
    "--line": "rgba(120,230,170,0.22)", "--line-strong": "rgba(120,230,170,0.4)",
    "--ice": "#8fd0ff", "--fire": "#ff8b2e",
    "--field": "rgba(12,32,22,0.72)",
    "--hero-grad": "linear-gradient(178deg,#e4f7ff 0%,#bfe6ff 36%,#ffe0a0 58%,#ff8b2e 100%)",
    "--fire-grad": "linear-gradient(90deg,#ff3d12 0%,#ff7a1e 55%,#ffce4a 100%)",
    "--ice-grad": "repeating-linear-gradient(115deg, rgba(190,230,255,.30) 0 11px, rgba(120,180,255,.13) 11px 22px)",
    "--edge-glow": "0 0 12px #ffd27a,0 0 22px #ff8b2e",
    "--rank-grad": "linear-gradient(90deg,rgba(40,160,90,.18),rgba(255,150,40,.08))",
    "--crest-frame": "linear-gradient(165deg,#ffe49a,#e0992e)",
    "--crest-inner": "linear-gradient(165deg,#2fa860,#16623a)"
  },
  confetti: ["#5fe0a0", "#ffce8a", "#da5b3b", "#3ea86a", "#e0992e"],

  progressStyle: "motor",
  avatarDefault: { base: "gutt", kitColor: "#2fa860",
                   equipped: { hode:"band_std", drakt:"kit_std", fottoy:"sko_std", tilbehor:"" } },
  equipment: [
    { id:"band_std", slot:"hode",  name:"Pannebånd",     base:true },
    { id:"kit_std",  slot:"drakt", name:"Standarddrakt", base:true },
    { id:"sko_std",  slot:"fottoy",name:"Standardsko",   base:true },
    { id:"visir_skann", slot:"hode",   name:"Skann-visir",   hint:"Skann-økt ×5",
      check:function(s){ return (s.types.okt2||0) >= 5; } },
    { id:"kit_proff",   slot:"drakt",  name:"Proff-drakt",   hint:"Nivå 5",
      check:function(s,lvl){ return lvl >= 5; } },
    { id:"sko_gull",    slot:"fottoy", name:"Gullsko",       hint:"25 økter",
      check:function(s){ return s.total >= 25; } },
    { id:"sko_lyn",     slot:"fottoy", name:"Lyn-sko",       hint:"Fartsskolen ×5",
      check:function(s){ return (s.types.fart1||0) >= 5; } },
    { id:"sko_sju",     slot:"fottoy", name:"Sjumilssko",    hint:"Nivå 8 «Full gass»",
      check:function(s,lvl){ return lvl >= 8; } },
    { id:"band_kaptein",slot:"tilbehor", name:"Kapteinsbind", hint:"4 uker på rad",
      check:function(s){ return s.bestStreak >= 4; } },
    { id:"merke_svakfot",slot:"tilbehor",name:"Svakfot-merke", hint:"Bonus B ×3",
      check:function(s){ return (s.types.bonusB||0) >= 3; } }
  ],

  okter: [
    {
      key: "okt1", label: "Økt 1", title: "Aldri samme touch to ganger", group: "ball",
      meta: "15–20 min · kun ball", accent: "green", skann: true,
      intro: "Regelen for hele økta: gjør aldri to like på rad.",
      rekord: { desc: "Lengste trikse-serie der ingen berøring er lik den forrige.", placeholder: "antall", better: "higher" },
      tiers: [
        { tier: 1, undertittel: "Touchmenyen", skann: false, parts: [
          { name: "Touchmeny", time: "8 min", desc: "Selvkast over hodehøyde – men hvert eneste mottak skal være nytt. Ny flate, ny høyde på kastet, ny retning ut av touchen, på ett bein, i ubalanse, etter et lite hopp, med ryggen til først. Blir et mottak stygt? Perfekt – det er der læringen skjer." },
          { name: "Bytt underlag", time: "5 min", desc: "Samme meny – men flytt deg. Tre minutter på gress, så grus, asfalt eller en skrå flate. Ujevnt underlag er en treningspartner: ballen oppfører seg aldri likt, og touchen din lærer å svare på alt." },
          { name: "Trikse-kaos", time: "5 min", desc: "Triksing der ingen berøring får bruke samme flate som den forrige. Fot–lår–fot er lov, fot–fot er ikke. Tell serien. Når den ryker: start på nytt, finn en ny vei gjennom." }
        ] },
        { tier: 2, undertittel: "Mindre plass, samme regel", skann: false,
          intro: "Samme regel som før: aldri to like på rad. Men nå krymper vi plassen og gir svakfoten like mye jobb. Mindre plass betyr at touchen din må bli enda mer presis – det er sånn det kjennes i kamp.",
          rekord: { desc: "Lengste serie mottak i 2×2-sonen uten at ballen stikker ut. Noter. Slå.", placeholder: "antall", better: "higher" },
          parts: [
          { name: "Touchmeny på halv plass", time: "8 min", desc: "Samme selvkast-meny, men i en sone på 2×2 meter. Ballen må dø innenfor sonen." },
          { name: "Svakfot-runden", time: "7 min", desc: "Hele menyen, kun svak fot. Den teller dobbelt i dag." },
          { name: "Meny i bevegelse", time: "8 min", desc: "Gå eller jogg rolig mens du kaster og tar imot – aldri stå stille i mottaket." },
          { name: "Pust og oppsummer", time: "2 min", desc: "Rolig ned. Hva satt best i dag?" }
        ] },
        { tier: 3, undertittel: "Klokka og skjermen bestemmer", skann: true,
          intro: "Nå skal variasjonen skje under tidspress. Du vet ikke hva som kommer, og du har ikke tid til å tenke deg om. Det er akkurat der kampene avgjøres.",
          rekord: { desc: "Beste 60-sekunder med kun godkjente mottak. Tell høyt.", placeholder: "antall", better: "higher" },
          parts: [
          { name: "Skjermstyrt touch", time: "10 min", skann: true, desc: "Skann-appen blinker flate eller retning idet ballen er i lufta – du gjør det den sier. Aldri samme to ganger." },
          { name: "60-sekunderen", time: "8 min", desc: "Så mange godkjente, ulike mottak du klarer på 60 sekunder. Tre runder, god pause mellom." },
          { name: "Svakfot-finale", time: "5 min", desc: "Siste runde kun svak fot." }
        ] }
      ]
    },
    {
      key: "okt2", label: "Økt 2", title: "Skann før du mottar", group: "ball",
      meta: "20 min · ball + 4–5 kjegler", accent: "green", skann: true,
      intro: "De beste ser seg over skulderen oftest – og timer blikket til når ballen er underveis.",
      rekord: { desc: "Antall fargeskann på rad der du både sa riktig farge og touchen traff retningen.", placeholder: "antall på rad", better: "higher" },
      tiers: [
        { tier: 1, undertittel: "Fargeskann", parts: [
          { name: "Fargeskann", time: "8 min", skann: true, desc: "Sett fire kjegler i ulike farger i en stor sirkel rundt deg, 5–8 meter unna – eller bruk skannverktøyet i appen: sett mobilen bak deg. Kast ballen til deg selv, og mens den er i luften: snu hodet, velg en kjegle/se fargen, og la førstetouchen ta ballen mot den. Si fargen høyt idet du tar touchen." },
          { name: "Dobbeltskann på halvvending", time: "7 min", desc: "Rygg mot en tenkt medspiller. Rull ballen fra deg, hent den – men før hvert mottak: to blikk over skulderen, ett over hver. Ta så førstetouchen ut i den retningen som var «mest åpen» i hodet ditt." },
          { name: "Føring med fritt blikk", time: "5 min", desc: "Driv ballen i et område og tell noe i omgivelsene mens du fører: vinduer, biler, trær. Si tallet høyt til slutt. Klarer du å telle riktig uten å miste ballen, eier føringen din seg selv." }
        ] },
        { tier: 2, undertittel: "Se mer, husk mer",
          intro: "På nivå 1 lærte du å se opp. Nå skal du se opp to ganger – og faktisk huske hva du så. De beste spillerne skanner flere ganger og oppdaterer bildet i hodet. Det er forskjellen på å titte og å se.",
          rekord: { desc: "Antall runder på rad med riktig husket bakfelt. Ti er bestått.", placeholder: "antall på rad", better: "higher" },
          parts: [
          { name: "Seks kjegler, dobbeltskann", time: "10 min", desc: "Som fargeskann, men med seks kjegler og to blikk før hvert mottak." },
          { name: "Husketesten", time: "8 min", desc: "Etter touchen – si høyt hvilke to farger som sto bak deg. Du trener hukommelsen i blikket, ikke bare blikket." },
          { name: "Føring med fritt blikk", time: "5 min", desc: "Som nivå 1, men tell to ting samtidig (f.eks. vinduer OG biler)." }
        ] },
        { tier: 3, undertittel: "Motsatt-regelen",
          intro: "Nå blir det vrient på ordentlig: du skal gjøre det motsatte av det skjermen sier. Høres rart ut – men det trener hjernen din til å velge, ikke bare reagere. Det er det som skiller en spiller som ser, fra en som forstår.",
          rekord: { desc: "Lengste serie riktige motsatt-valg uten å miste ballen.", placeholder: "antall på rad", better: "higher" },
          parts: [
          { name: "Motsatt farge", time: "10 min", skann: true, desc: "Appen blinker en farge – du spiller til en ANNEN kjegle enn den. Si høyt hvilken du valgte og hvorfor («rød var tatt»)." },
          { name: "Skann og avslutt", time: "10 min", desc: "Skann, mottak på halvvending, og avslutt mot et mål eller en port – alt i ett forløp." }
        ] }
      ]
    },
    {
      key: "okt3", label: "Økt 3", title: "Ødegaard-økta", group: "ball",
      meta: "20–30 min · ball + 3–4 kjegler", accent: "green",
      intro: "Fintene hans var ikke tilfeldige: de ble øvd inn systematisk, til de satt.",
      rekord: { desc: "Antall egne fintekjeder (dine kombinasjoner) som satt perfekt i dag.", placeholder: "antall", better: "higher" },
      tiers: [
        { tier: 1, undertittel: "Fintekjeder", parts: [
          { name: "Fintekjeder", time: "10 min", desc: "Én finte kan en forsvarer lese. To på rad kan han ikke. Sett sammen kjeder: oversteg inn i croqueta, kroppsfinte inn i utsidetouch. Tre kjeder, fem ganger hver – og viktigst: lag tre egne kombinasjoner som ingen har vist deg." },
          { name: "Begge-veier-regelen", time: "8 min", desc: "Hver kjede skal gå like mange ganger mot venstre som mot høyre. Forsvarere lærer fort hvilken vei du foretrekker – med mindre det ikke finnes en. Svak side teller dobbelt." },
          { name: "Kaosruta", time: "8 min", desc: "Fire kjegler som en rute på 8×8 meter. 60 sekunder fri føring og finting – men hver runde har en ny regel: kun utsiden av foten. Kun svak fot. Aldri samme fot to ganger på rad. Alltid en finte før hvert retningsbytte." }
        ] },
        { tier: 2, undertittel: "Kjeder i fart",
          intro: "Fintene sitter i ro. Nå skal de sitte i fart – for i kamp kommer forsvareren mot deg, ikke stående stille. Og regnskapet blir strengere: begge veier, hver gang.",
          rekord: { desc: "Flest godkjente kjeder i fart, likt fordelt begge veier.", placeholder: "antall", better: "higher" },
          parts: [
          { name: "Kjede i fart", time: "12 min", desc: "Driv i god fart mot kjeglen, fintekjede, eksploder ut. Begge veier, annenhver." },
          { name: "Strengt regnskap", time: "8 min", desc: "Fem kjeder venstre, fem høyre – bommer du på én side, nullstilles den siden." },
          { name: "Din egen kjede i fart", time: "6 min", desc: "Dine kombinasjoner fra nivå 1, nå i fart." }
        ] },
        { tier: 3, undertittel: "Skjermen velger finten", skann: true,
          intro: "Til nå har du bestemt finten på forhånd. I kamp får du ikke det – situasjonen bestemmer. Nå lar vi skjermen være situasjonen: den sier hvilken finte, i siste øyeblikk, og du må levere.",
          rekord: { desc: "Antall riktige reaksjoner på rad med kontroll ut av finten.", placeholder: "antall på rad", better: "higher" },
          parts: [
          { name: "Reaktiv finte", time: "12 min", skann: true, desc: "Driv mot kjeglen, appen blinker et symbol idet du nærmer deg = hvilken finte. Sett gjerne egne symboler for dine egne kjeder." },
          { name: "Reaktiv + avslutt", time: "10 min", desc: "Samme, men ut av finten går du på avslutning mot mål/port." }
        ] }
      ]
    },
    {
      key: "bonusA", label: "Bonus A", title: "Returnettet: mottak med hodet oppe", group: "bonus",
      meta: "20–30 min · ball + rebound-nett", accent: "gold", skann: true,
      intro: "Nettet gir deg en ball som kommer mot deg uten at du kontrollerer den helt.",
      rekord: { desc: "Lengste serie skann-returer med riktig tall OG riktig retning.", placeholder: "antall på rad", better: "higher" },
      tiers: [
        { tier: 1, undertittel: "Skann-retur", parts: [
          { name: "Skann-retur", time: "8 min", skann: true, desc: "Legg tre kjegler eller lapper med tall bak deg – eller bruk skannverktøyet i appen (tall-modus). Spill i nettet, og mens ballen er på vei tilbake: snu hodet, les ett tall, rop det høyt, og ta førstetouchen i den retningen." },
          { name: "Aldri samme retur", time: "8 min", desc: "Endre noe for hver eneste pasning i nettet: vinkel, kraft, avstand, fot. Da blir hver retur et nytt problem – og mottaket ditt lærer å svare på alt, ikke bare det perfekte." },
          { name: "Andreballen", time: "8 min", desc: "Spill hardt i nettet og la returen sprette én gang. Angrip spretten, ta ballen ned og spill en kontrollert pasning innen to touch. Dette er kampens vanligste kaossituasjon – ballen som ingen eier." }
        ] },
        { tier: 2, undertittel: "Retning på alt",
          intro: "På nivå 1 stoppet du ballen. Nå skal touchen ha en adresse: hvert mottak skal peke et sted. En touch som bare stopper ballen, er en touch som gir forsvareren tid.",
          rekord: { desc: "Lengste serie retninger uten «død» touch.", placeholder: "antall på rad", better: "higher" },
          parts: [
          { name: "Retningsbestemt retur", time: "10 min", desc: "Mottak fra nettet der førstetouchen alltid går til en side – veksle side, veksle fot." },
          { name: "Svakfot-serier", time: "7 min", desc: "Pasningsrytme, kun svak fot." },
          { name: "Volley-retur", time: "8 min", desc: "Returen tilbake i nettet uten at ballen er nedom bakken. Rolig kraft, treffpunkt over midten." }
        ] },
        { tier: 3, undertittel: "Kaos og avslutning",
          intro: "Nå kobler vi alt: blikk, mottak og avslutning – i uforutsigbar rekkefølge. Det ligner mest på kamp av alt du kan gjøre alene.",
          rekord: { desc: "Fulltreff av ti andreballer.", placeholder: "treff av 10", better: "higher" },
          parts: [
          { name: "Skann-retur med motsatt-regel", time: "10 min", skann: true, desc: "Tallene bak deg, appen sier ett tall – du går mot et ANNET og sier hvorfor." },
          { name: "Andreball til avslutning", time: "12 min", desc: "Hard pasning i nettet, la returen sprette, angrip og avslutt mot mål/port innen to touch." }
        ] }
      ]
    },
    {
      key: "bonusB", label: "Bonus B", title: "Veggen: kamptempo", group: "bonus",
      meta: "20–30 min · ball + ballvegg + teip/kritt", accent: "gold",
      intro: "Veggen er den ærligste treningspartneren som finnes.",
      rekord: { desc: "Beste 45-sekunder på én-touch (antall pasninger).", placeholder: "antall", better: "higher" },
      tiers: [
        { tier: 1, undertittel: "Kamptempo", parts: [
          { name: "Vegg-rondo", time: "8 min", desc: "Marker to soner på veggen med teip eller kritt, to–tre meter fra hverandre. Spill vekselvis på dem – men mottaket skal alltid tas med kroppen åpen mot neste merke, før ballen kommer." },
          { name: "45-sekunderen", time: "8 min", desc: "45 sekunder: maks antall vegg-pasninger med to touch. 45 sekunder pause. Så 45 sekunder én-touch. Tre runder av hver. Teknikk under tidspress er en annen ferdighet enn teknikk i fred." },
          { name: "Forkledningen", time: "7 min", desc: "Ta mottak der hele kroppen sier én retning – skulder, hofte, blikk – og touchen går motsatt. Motstanderen flytter seg på løgnen, ikke på ballen." },
          { name: "Svakfot-regnskapet", time: "5 min", desc: "Avslutt med alt over – halv avstand, kun svak fot. Fem minutter hver økt er nok: på et halvår har svakfoten din fått timer de andre aldri tar igjen." }
        ] },
        { tier: 2, undertittel: "Lengre, hardere, forkledd",
          intro: "Veggen er ærlig: slår du hardere, får du hardere tilbake. Nå flytter vi deg bakover, skrur opp tempoet og legger forkledning på flere mottak. Kroppen skal lyve oftere.",
          rekord: { desc: "Beste 45-sekunder på lang avstand med kun godkjente touch.", placeholder: "antall", better: "higher" },
          parts: [
          { name: "To-touch på lang avstand", time: "8 min", desc: "6–8 meter, hardere pasninger, fortsatt kontroll." },
          { name: "Forkledning på annethvert mottak", time: "10 min", desc: "Kroppen sier én vei, touchen går motsatt – annenhver gang, begge veier." },
          { name: "Merker langt fra hverandre", time: "7 min", desc: "Vegg-rondo med sonene 4–5 meter fra hverandre – større vending mellom hver." }
        ] },
        { tier: 3, undertittel: "Testdagen",
          intro: "Nivå 3 på veggen er enkelt og nådeløst: alt telles, og bare kvalitet teller. En touch som spretter feil, er ikke med i regnskapet. Det er sånn du finner ut hvor god du faktisk har blitt.",
          rekord: { desc: "Testtallene. Skriv alle tre – de er fremgangskurven din.", placeholder: "tre tall", better: "higher" },
          parts: [
          { name: "Kvalitetstest to-touch", time: "8 min", desc: "45 sek × 3 – kun mottak som dør der du vil, teller." },
          { name: "Kvalitetstest én-touch", time: "8 min", desc: "Samme regel." },
          { name: "Svakfot-sett", time: "7 min", desc: "Alt over, halvert avstand, kun svak fot." }
        ] }
      ]
    },
    {
      key: "bonusC", label: "Bonus C", title: "Skann-appen og kjeglene", group: "bonus",
      meta: "20 min · ball + 5 kjegler + skann-app på stativ", accent: "gold", skann: true,
      intro: "Nå gjør en skjerm jobben: appen blinker tall, farger eller piler du ikke kan forutse – løft blikket og les dem mens ballen ruller.",
      rekord: { desc: "Antall riktige reaksjoner på 90 sekunder uten å miste ballen.", placeholder: "antall på 90 sek", better: "higher" },
      tiers: [
        { tier: 1, undertittel: "Les og reager", parts: [
          { name: "Les og rop", time: "6 min", skann: true, desc: "Driv ballen rolig mellom fem kjegler i en bue. Sett skann-appen i øyehøyde (tall-modus) – den blinker et tall, løft blikket, les det, rop det høyt, fortsett føringen uten å stoppe. Kan du føre uten å se på ballen?" },
          { name: "Farge styrer retning", time: "7 min", skann: true, desc: "Gi hver kjegle en farge. Appen blinker en farge (farge-modus) – du fører ballen til den kjeglen, vender rundt den, og venter på neste farge mens ballen holdes i bevegelse. Oppfatt, velg, utfør." },
          { name: "Pil = vending", time: "7 min", skann: true, desc: "Appen blinker en pil – venstre, høyre, opp, ned (pil-modus). Gjør vendingen pilen viser, midt i føringen, så fort du klarer å lese den. Bland inn fintene fra Økt 3 når pilen peker bakover." }
        ] },
        { tier: 2, undertittel: "To regler samtidig",
          intro: "Én beskjed er lett. To samtidig er kamp. Nå betyr fargen hvor du skal, og tallet hva du gjør på veien. Hjernen din må sortere – mens ballen ruller.",
          rekord: { desc: "Riktige doble beskjeder på rad.", placeholder: "antall på rad", better: "higher" },
          parts: [
          { name: "Farge + tall", time: "12 min", skann: true, desc: "Fargen = kjeglen, tallet = antall touch på veien dit." },
          { name: "Raskere skift", time: "8 min", skann: true, desc: "Korte visninger, kortere pauser mellom." }
        ] },
        { tier: 3, undertittel: "Motsatt og husk",
          intro: "Toppnivået: du skal gjøre det motsatte av skjermen – og huske to beskjeder om gangen. Klarer du dette, er en vanlig beskjed i kamp søvnig lett.",
          rekord: { desc: "Lengste serie uten feil på to-i-minnet.", placeholder: "antall på rad", better: "higher" },
          parts: [
          { name: "Motsatt-regelen", time: "10 min", skann: true, desc: "Fargen som blinker er ALLTID feil kjegle. Velg en annen, si hvorfor." },
          { name: "To i minnet", time: "10 min", skann: true, desc: "Appen gir to kommandoer etter hverandre – utfør dem i riktig rekkefølge uten påminnelse." }
        ] }
      ]
    },
    {
      key: "bonusD", label: "Bonus D", title: "To mål, tre baller", group: "bonus",
      meta: "20–30 min · 3 baller + 2 småmål", accent: "gold", skann: true,
      intro: "Mange repetisjoner på kort tid bygger en avslutter. Sett de to målene 6–8 meter fra hverandre.",
      rekord: { desc: "Antall fulltreff av ti skudd der skjermen valgte siden.", placeholder: "treff av 10", better: "higher" },
      tiers: [
        { tier: 1, undertittel: "Tre baller, to mål", parts: [
          { name: "Tre på rad", time: "6 min", desc: "Tre baller på en linje. Avslutt alle tre så raskt du kan med god kvalitet – og veksle mål for hver ball: venstre, høyre, venstre. Det er vekslingen som trener deg." },
          { name: "Touch og avslutt", time: "8 min", desc: "Legg ballene litt unna. Spring til ballen, ta én touch som legger den til rette, og avslutt på andre touch. Aldri stoppe ballen først. To touch, mål – sånn scores de fleste mål." },
          { name: "Skjermen velger målet", time: "8 min", skann: true, desc: "Bruk skann-appen (pil- eller farge-modus) i det du tar siste touch: skjermen sier venstre eller høyre, og du avslutter dit – etter at du er i bevegelse. Les og bestem i siste øyeblikk." },
          { name: "Vinkeljakt", time: "5 min", desc: "Flytt deg rundt: skyt fra spiss vinkel, fra siden, etter en liten dragning innover. Samme to mål, men aldri samme vinkel to ganger." }
        ] },
        { tier: 2, undertittel: "Senere beskjed, vanskeligere mål",
          intro: "Keepere leser tidlige valg. Derfor skal beskjeden komme senere, og målet bli mindre: nå sikter du på soner, og noen mål SKAL komme på svak fot.",
          rekord: { desc: "Sonetreff av ti med sen beskjed.", placeholder: "treff av 10", better: "higher" },
          parts: [
          { name: "Sen beskjed", time: "10 min", skann: true, desc: "Skjermen/roperen sier side idet du tar siste touch – ikke før." },
          { name: "Soner i målet", time: "8 min", desc: "Heng en genser i hvert hjørne eller del målet i soner – kun sone-treff teller." },
          { name: "Svakfot-mål", time: "7 min", desc: "Tre av ti avslutninger skal være svak fot – du velger hvilke." }
        ] },
        { tier: 3, undertittel: "Beslutning når du er sliten",
          intro: "De fleste feilvalg i kamp skjer når pulsen er høy. Så nå trener vi akkurat det: kort spurt først, beslutning etterpå. Blir valget like godt når du puster tungt? Det er nivå 3.",
          rekord: { desc: "Kvalitetstreff av ti etter spurt.", placeholder: "treff av 10", better: "higher" },
          parts: [
          { name: "Sprint + avslutt", time: "12 min", skann: true, desc: "10–15 m spurt, direkte på ball, beskjed i siste touch, avslutt. Full pause mellom." },
          { name: "Tidsfrist", time: "10 min", desc: "Tre baller, 20 sekunder, alle skal på mål – men bare kvalitetstreff teller." }
        ] }
      ]
    },
    {
      key: "fart1", label: "Fart 1", title: "Fartsskolen", group: "fart",
      meta: "15 min · ingen utstyr", accent: "coral",
      intro: "Fart er teknikk før det er muskler. Sprinter du sliten, trener du kondisjon – ikke fart.",
      rekord: { desc: "Antall steg på 20 meter i full fart. Færre steg = bedre teknikk.", placeholder: "antall steg", better: "lower" },
      tiers: [
        { tier: 1, undertittel: "Start og teknikk", meta: "15 min", parts: [
          { name: "Aktivering", time: "3 min", desc: "Lette ankelhopp på stedet (stive ankler, korte kontakter), hælspark og rolige høye kneløft fremover. Du vekker fjæringen i leggene." },
          { name: "Teknikkskolen", time: "6 min", desc: "Veggdrillen: len deg mot en vegg i cirka 45 grader, kjør ett og ett kne raskt opp mot brystet. Så A-skip over 15 meter: kneet drives høyt, foten slår ned rett under deg. Tre runder av hver." },
          { name: "Akselerasjoner", time: "6 min", desc: "Fem til seks drag på 10–15 meter, maks innsats – og varier starten hver gang: stående, fallende, sidelengs, etter touch, etter hopp. Gå rolig tilbake mellom hvert drag. Føles beina tunge: avslutt." }
        ] },
        { tier: 2, undertittel: "Flygende fart", meta: "ca. 27 min · ute",
          intro: "Til nå har du trent starten. Nå trener vi toppfarten – med flygende sprint: du er allerede i fart når målingen begynner. Husk gullregelen: fart trenes fersk. Kjennes beina tunge, er økta ferdig.",
          rekord: { desc: "Tell steg på de 15 flygende meterne. Færre steg = lengre steg.", placeholder: "antall steg", better: "lower" },
          parts: [
          { name: "Aktivering + teknikk", time: "8 min", desc: "Som nivå 1." },
          { name: "Flygende sprint", time: "12 min", desc: "10 m rolig tilløp rett inn i 10–15 m maks fart. 4–5 drag, gå rolig tilbake = full pause." },
          { name: "Startvariasjon", time: "5 min", desc: "To–tre akselerasjoner fra nye, rare startposisjoner." }
        ],
          inne: { meta: "ca. 20 min", parts: [
            { name: "Veggdrill", time: "3 × 20 sek", desc: "Len deg mot veggen i cirka 45 grader, kjør ett og ett kne raskt opp mot brystet." },
            { name: "A-skip på stedet", time: "3 × 20 sek", desc: "Kneet drives høyt, foten slår ned rett under deg." },
            { name: "Ankelhopp", time: "3 × 15 sek", desc: "Stive ankler, korte kontakter." },
            { name: "Korte akselerasjoner", time: "6 stk", desc: "5–8 m i gang, kjeller eller garasje (så langt det er trygt), full pause mellom. Samme regel: aldri sliten, alltid skarp." }
          ] }
        },
        { tier: 3, undertittel: "Reaktiv fart", meta: "ca. 25 min · ute", skann: true,
          intro: "I kamp vet du aldri når spurten kommer – eller hvilken vei. Nå bestemmer skjermen: retning og start i siste øyeblikk. Fart + reaksjon = kampfart.",
          rekord: { desc: "Raskeste reaksjon uten feilstart – tell godkjente av åtte.", placeholder: "godkjente av 8", better: "higher" },
          parts: [
          { name: "Aktivering", time: "6 min", desc: "Ankelhopp, hælspark, høye kneløft – vekk fjæringen." },
          { name: "Reaktiv start", time: "10 min", skann: true, desc: "Stå klar, appen blinker en pil = retningen du spurter 10 m. 6–8 drag, full pause." },
          { name: "Sprint–vending–sprint", time: "7 min", desc: "10 m ut, skarp vending, 5 m tilbake. 4 drag. Lavt tyngdepunkt i vendingen." }
        ],
          inne: { meta: "ca. 20 min", parts: [
            { name: "Reaktiv retningstakt på stedet", time: "8 min", skann: true, desc: "Appen viser pil → første steg + to raske steg i retningen, tilbake." },
            { name: "Veggdrill med app-signal", time: "6 min", skann: true, desc: "Kjør kneet når skjermen blinker." },
            { name: "Ankelhopp og linjehopp", time: "4 min", desc: "Korte serier." }
          ] }
        }
      ]
    },
    {
      key: "fart2", label: "Fart 2", title: "Motorrommet", group: "fart",
      meta: "30 min · ball + 4 kjegler + stoppeklokke", accent: "coral",
      intro: "Kondisjon er den fysiske egenskapen som ikke venter på puberteten.",
      rekord: { desc: "Beste 5-10-5-tid (sekunder). Mobiltider er like unøyaktige hver uke – fremgangen er ekte.", placeholder: "sekunder", better: "lower" },
      tiers: [
        { tier: 1, undertittel: "Grunnmotoren", meta: "30 min", parts: [
          { name: "Oppvarming med ball", time: "5 min", desc: "Rolig føring som gradvis øker i tempo, med vendinger og retningsbytter underveis. Siste minuttet i nesten kampfart." },
          { name: "Spenstdosen", time: "4 min", desc: "Linjehopp: raskt frem og tilbake over en linje, 3 × 15 sekunder. Så sidehopp på ett bein, 2 × 10 per bein. Korte, kvikke bakkekontakter – tenk varm asfalt. Vondt i knær/hæler i vekstperioder? Kutt hoppene den uka." },
          { name: "5-10-5 med tid", time: "8 min", desc: "Tre kjegler på linje, fem meter mellom. Sprint 5 m høyre, snu, 10 m venstre, snu, 5 m tilbake. Ta tiden. Fire til seks forsøk med minst ett minutt pause. Lavt tyngdepunkt inn, eksplosivt ut." },
          { name: "30/30 med ball", time: "10 min", desc: "30 sekunder føring i høy fart – så høyt tempo du klarer med kontroll – så 30 sekunder rolig. Åtte til ti runder. Ryker touchen helt, senk farten ett hakk." },
          { name: "Nedjogg", time: "3 min", desc: "Rolig jogg eller gange med ballen i hendene. Pust ned. Tenk gjennom hva som satt best i dag – det er en del av økta." }
        ] },
        { tier: 2, undertittel: "Motor med ball, spenst ett hakk opp", meta: "ca. 30 min · ute",
          intro: "Samme motor, mer fotball: nå tar ballen med seg i alt. Og spensten går ett forsiktig hakk opp – forskning på spillere på din alder viser at hopptrening gjør deg raskere og kvikkere, så lenge dosen er liten og landingene er myke.",
          rekord: { desc: "5-10-5 med ball – og differansen til uten ball. Jo mindre gap, jo bedre.", placeholder: "sekunder", better: "lower" },
          parts: [
          { name: "Oppvarming med ball", time: "5 min", desc: "Rolig føring som øker i tempo, vendinger underveis." },
          { name: "Spenst nivå 2", time: "5 min", desc: "Hopp over en lav hindring (10–20 cm) frem/tilbake 3 × 10, sidehopp ett bein 2 × 8 per bein. Korte kontakter, myk landing. Vondt i knær/hæler i vekstuke = kutt hoppene." },
          { name: "5-10-5 MED ball", time: "8 min", desc: "Samme test, ballen med. 4 forsøk, tid med mobil." },
          { name: "30/30 med ball", time: "10 min", desc: "10 runder." },
          { name: "Nedjogg", time: "2 min", desc: "Rolig ned. Pust." }
        ],
          inne: { meta: "ca. 25 min", parts: [
            { name: "Såletouch-intervaller", time: "30/30 × 8", desc: "Myk ball eller innendørsball. Høyt tempo touch, rolig pause." },
            { name: "Linjehopp", time: "3 × 15 sek", desc: "Raskt frem og tilbake over en linje." },
            { name: "Skyggeføring i rommet", time: "2 × 2 min", desc: "Med vendinger." },
            { name: "Planke", time: "2 × 30 sek", desc: "Rett og stram, rolig pust." }
          ] }
        },
        { tier: 3, undertittel: "Gjentatte spurter", meta: "ca. 28 min · ute",
          intro: "Kamp er ikke én spurt – det er mange, med for kort pause mellom. Det heter gjentatt sprint, og det er den mest kampnære kondisjonen som finnes. Med ball, selvfølgelig.",
          rekord: { desc: "Differansen mellom raskeste og tregeste drag i en blokk. Liten differanse = stor motor.", placeholder: "sekunder", better: "lower" },
          parts: [
          { name: "Oppvarming med ball", time: "5 min", desc: "Rolig føring som øker i tempo." },
          { name: "RSA-blokk 1", time: "8 min", desc: "6 × 20 m føring i maks kontrollert fart, start hvert 30. sekund. 3 min pause." },
          { name: "RSA-blokk 2", time: "8 min", desc: "Samme en gang til. Målet er at siste drag er nesten like kvikt som første." },
          { name: "Bakkedrag hvis du har bakke", time: "5 min", desc: "4 × 30 m opp, gå ned. (Erstatter blokk 2 ved behov.)" },
          { name: "Nedjogg", time: "2 min", desc: "Rolig ned. Pust." }
        ],
          inne: { meta: "ca. 22 min", parts: [
            { name: "15/15-intervaller på stedet", time: "× 12", desc: "Høye kneløft eller rask skyggeløping 15 sek, rolig 15 sek." },
            { name: "Linjehopp", time: "3 × 15 sek", desc: "Korte, kvikke kontakter." },
            { name: "Såletouch-spurter", time: "6 × 20 sek", desc: "Med ball." },
            { name: "Rolig nedtrapping", time: "3 min", desc: "Samme mål: jevn kvalitet hele veien." }
          ] }
        }
      ]
    },
    {
      key: "fart3", label: "Fart 3", title: "Den rolige motoren", group: "fart",
      meta: "30 min · ingen utstyr", accent: "coral",
      intro: "Utholdenhet bygges godt i din alder, og hver rolige langtur legger motorkraft i banken. Hemmeligheten er kjedelig, men sann: den skal være lett — du skal kunne snakke i hele setninger mens du løper.",
      parts: [
        { name: "Mykstart", time: "5 min", desc: "Begynn med rask gange som glir over i rolig jogg. Ikke kast deg ut i tempo – la pulsen og pusten finne seg til rette først. De første minuttene skal kjennes nesten for lette." },
        { name: "Snakketempo", time: "20 min", desc: "Jevn, rolig jogg der du kan holde en samtale uten å hakke. Løp gjerne med en kompis – da blir snakketesten ekte. Tenk teknikk mens du løper: avslappede skuldre, løse hender, blikket frem, og lette, raske steg som lander under deg." },
        { name: "Stigningsløp", time: "5 min", desc: "Avslutt med fire til seks stigningsløp på rundt 60–80 meter: øk farten gradvis opp til cirka 80 prosent, hold et par sekunder, og la den gli rolig ned igjen. Gå rolig tilbake mellom hvert. Holder farten og den gode teknikken levende på slutten." }
      ],
      rekord: { desc: "Hvor langt du kom på 30 min på samme rute, samme rolige snakketempo. Målet er ikke å løpe fortere — men at det samme blir lettere.", placeholder: "meter / runder", better: "higher" }
    },
    {
      key: "fart4", label: "Fart 4", title: "Lek med farten", group: "fart",
      meta: "25–30 min · ingen utstyr", accent: "coral",
      intro: "Fartlek er svensk og betyr akkurat det det høres ut som: lek med farten. Den løpsøkta som ligner mest på fotball — kampen er aldri jevn, og her bestemmer du selv når det smeller til.",
      parts: [
        { name: "Oppvarming", time: "5 min", desc: "Rolig jogg til kroppen er varm – samme snakketempo som i Fart 3." },
        { name: "Fartsleken", time: "15–18 min", desc: "Fortsett å jogge rolig – men kast inn rykk du velger selv underveis. Spurt til den lyktestolpen. Hardt til neste tre. Så rolig jogg til du er ordentlig uthvilt igjen, før neste rykk. Varier lengden: noen rykk på fem sekunder, noen på tjue. Sikt på 8–12 rykk." },
        { name: "Bakkevarianten (valgfri)", time: "10 min", desc: "Bytt ut fartsleken hvis du har en bakke på 30–50 meter: spurt opp i god fart (10–15 sek), gå eller jogg rolig ned igjen, 6–8 ganger. Bakke bygger eksplosivitet og er snillere mot knærne enn flat sprint." },
        { name: "Nedjogg", time: "3–5 min", desc: "Rolig jogg eller gange til slutt. Pust ned, kjenn at beina var med på noe ekte i dag." }
      ],
      rekord: { desc: "Antall rykk med ordentlig fart og full pause mellom – eller antall bakkedrag der det siste var like kvikt som det første.", placeholder: "antall rykk", better: "higher" }
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
    { xp: 840, name: "Full gass" },
    { xp: 1080, name: "Turbo" },
    { xp: 1400, name: "Toppfart" }
  ],

  xpRules: { base: 20, allParts: 10, newRecord: 15 },

  badges: [
    { key: "igang",    name: "I gang",           desc: "Første økt ført",              icon: "whistle",   check: s => s.total >= 1 },
    { key: "fem",      name: "Femmer'n",         desc: "5 økter gjennomført",          num: "5",          check: s => s.total >= 5 },
    { key: "ti",       name: "Tosifret",         desc: "10 økter gjennomført",         num: "10",         check: s => s.total >= 10 },
    { key: "kvart",    name: "Kvarthundre",      desc: "25 økter gjennomført",         num: "25",         check: s => s.total >= 25 },
    { key: "femti",    name: "Halvhundre",       desc: "50 økter gjennomført",         num: "50",         check: s => s.total >= 50 },
    { key: "meny",     name: "Hele menyen",      desc: "Alle 9 øktene prøvd",          icon: "clipboard", check: s => s.distinct >= 9 },
    { key: "uke1",     name: "Uka i boks",       desc: "Første uke med ukemålet nådd", icon: "calcheck",  check: s => s.weeksMet >= 1 },
    { key: "streak2",  name: "To på rad",        desc: "2 uker på rad med ukemålet",   icon: "flame",     check: s => s.bestStreak >= 2 },
    { key: "streak4",  name: "Månedsmotor",      desc: "4 uker på rad med ukemålet",   icon: "calendar",  check: s => s.bestStreak >= 4 },
    { key: "streak8",  name: "Maskinen",         desc: "8 uker på rad med ukemålet",   icon: "gear",      check: s => s.bestStreak >= 8 },
    { key: "rekord1",  name: "Rekordjeger",      desc: "Slo din egen rekord",          icon: "trophy",    check: s => s.improvements >= 1 },
    { key: "rekord3",  name: "Kurven peker opp", desc: "3 rekordforbedringer",         icon: "chart",     check: s => s.improvements >= 3 }
  ]
};
