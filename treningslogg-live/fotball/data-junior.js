/* ============================================================
   HEFTE: JUNIOR — «Sommerball» v2  (fotball-leker, 7–9 år)
   Fire økter for sommeren — for barn som har funnet trikse-gleden.
   Rekorder på trikseserier (Trikseskolen + Kompisøkta), ellers ren lek.
   ============================================================ */
window.BM_PROGRAMS = window.BM_PROGRAMS || {};
window.BM_PROGRAMS.junior = {
  id: "junior",
  brand: { name: "Sommerball", tagline: "Sommer · Touch · Triks", short: "Sommerball", age: "7–9 år", dot: "#ffd23e" },
  hero: { top: "Sommer", subLow: "kom i gang i sommer", subHigh: "fortsett – det går så bra!", unit: "uker", unitOne: "uke", suffix: "med ball" },
  meter: { low: "Skyet", high: "Solskinn" },
  weekGoalDefault: 2,
  navMid: "Økter",
  okterTitle: { pre: "Sommer", hl: "ballen", sub: "Fire økter · en ball og litt plass", brandsub: "Velg en økt" },
  recordsEnabled: true,
  recordTitle: "Beste rekorder",
  quoteSource: "Fra heftet «Sommerball»",

  groups: [
    { key: "lek", title: "Sommeralt", sub: "Fire økter" }
  ],

  theme: {
    "--app-bg": "radial-gradient(120% 88% at 50% 14%, #2f9fd6 0%, #176aa0 44%, #08395f 100%)",
    "--edge-bg": "#08395f",
    "--display": "'Anton',sans-serif",
    "--ink": "#fffdf5", "--ink-soft": "#dff1ff",
    "--green": "#ffb43d", "--green-deep": "#ff9e2e", "--green-bright": "#ffd23e",
    "--gold": "#46c06a", "--gold-bright": "#7be08f",
    "--coral": "#ff5d6c",
    "--muted": "#9fd4f0", "--muted-2": "#7fbfe0",
    "--line": "rgba(180,230,255,0.26)", "--line-strong": "rgba(180,230,255,0.46)",
    "--ice": "#cfeaff", "--fire": "#ffd23e",
    "--field": "rgba(8,46,78,0.5)",
    "--hero-grad": "linear-gradient(178deg,#fff3b0 0%,#ffd23e 45%,#ff8a3d 100%)",
    "--fire-grad": "linear-gradient(90deg,#ff9e2e 0%,#ffd23e 55%,#fff3b0 100%)",
    "--ice-grad": "repeating-linear-gradient(115deg, rgba(205,235,255,.36) 0 11px, rgba(160,210,245,.16) 11px 22px)",
    "--edge-glow": "0 0 12px #ffe07a,0 0 22px #ffb43d",
    "--rank-grad": "linear-gradient(90deg,rgba(255,180,61,.22),rgba(70,192,106,.10))",
    "--crest-frame": "linear-gradient(165deg,#ffe07a,#ff9e2e)",
    "--crest-inner": "linear-gradient(165deg,#2f9fd6,#0c4b78)"
  },
  confetti: ["#ffd23e", "#ff8a3d", "#46c06a", "#ff5d6c", "#7be08f", "#8fe0ff"],

  okter: [
    {
      key: "lek1", label: "Økt 1", title: "Sålemesteren", group: "lek",
      meta: "10–15 min · egen ball", accent: "green", skann: true,
      intro: "En farge ropes eller blinkes – og du fører ballen dit. Men på veien skal du rulle ballen fram og tilbake med sålen og gjøre minst én vending bakover.",
      parts: [
        { name: "Spre fargene", time: "2 min", desc: "Spre kjegler i ulike farger rundt i hagen, på løkka eller på stranda." },
        { name: "Sålerull og vending", time: "5 min", desc: "En farge ropes (eller blinkes på skjermen) – du fører ballen dit. På veien: rull ballen fram og tilbake med sålen og gjør minst én vending bakover (dra ballen bakover med sålen, snu deg, fortsett). Ved kjeglen: en rolig såledragning rundt før neste farge." },
        { name: "Variér vendingene", time: "4 min", desc: "Krev ulike vendinger: såledrag bakover, V-dragning (dra inn med sålen, dytt ut med innsiden), og utsidevending. Rolig og kontrollert – ballen skal være som limt til foten." },
        { name: "Skann-appen", time: "valgfritt", skann: true, desc: "La skjermen blinke fargen. For deg som er rask: en pil viser hvilken vei du skal vende før du fortsetter." }
      ],
      note: "Det er ikke farten som teller, men kontrollen. God sålekontroll er starten på alt annet i fotball – og du er allerede godt i gang.",
      rekord: null
    },
    {
      key: "lek2", label: "Økt 2", title: "Trikseskolen", group: "lek",
      meta: "10–15 min · egen ball", accent: "gold", skann: true,
      intro: "Vipp opp, hold gående, og tell. Terping er hele hemmeligheten – verken Messi eller Ronaldo ble født med dette.",
      parts: [
        { name: "Vipp opp fra bakken", time: "3 min", desc: "Legg foten litt under ballen og løft den rolig opp. Øv med begge bein. Når du klarer det: vipp opp og ta imot med hendene." },
        { name: "Ett touch og grip", time: "3 min", desc: "Vipp opp, ett touch med foten, og grip ballen før den treffer bakken. Bygg på steg for steg, og ikke ha hastverk." },
        { name: "Trikseserie", time: "5 min", desc: "Vipp opp og hold ballen gående så lenge du klarer – fot, lår, hode, fot igjen. NFF sitt teknikkmerke teller ett tilslag med hver kroppsdel, så veksle: fot, lår, fot igjen." },
        { name: "Skann-appen", time: "valgfritt", skann: true, desc: "Skjermen blinker et tall = målet ditt for triksingen denne runden. Eller en farge for kroppsdelen: rød = fot, blå = lår, grønn = hode." }
      ],
      note: "NFF sitt teknikkmerke krever faktisk at du vipper opp ballen med foten på de øverste gradene – så nå trener du mot et ekte merke.",
      rekord: { desc: "Flest trikk på rad uten at ballen treffer bakken.", placeholder: "antall trikk", better: "higher" }
    },
    {
      key: "lek3", label: "Økt 3", title: "Trafikklyset", group: "lek",
      meta: "10–15 min · egen ball", accent: "coral", skann: true,
      intro: "Grønt: kjør! Gult: rolig på stedet. Rødt: stopp. Blått: vipp opp og grip. Den voksne (eller skjermen) bytter farger – og prøver å lure deg.",
      parts: [
        { name: "Grønt – kjør", time: "2 min", desc: "Før ballen rundt i god fart. Hold ballen nær." },
        { name: "Gult – rolig", time: "2 min", desc: "Sålerulling fram og tilbake og små dragninger bakover. Helt rolig på stedet." },
        { name: "Rødt – stopp", time: "2 min", desc: "Foten oppå ballen, helt stille. Moroa ligger i bråstoppene – hold gult lenge, så plutselig rødt!" },
        { name: "Blått – vipp opp", time: "3 min", desc: "Vipp ballen opp fra bakken og grip den. Ny farge fra heftet — den krever at du har øvd på Trikseskolen." },
        { name: "Skann-appen", time: "valgfritt", skann: true, desc: "La skann-appen vise fargen. Da kan fargene skifte raskere enn en stemme klarer, og du må følge med med øynene mens beina og ballen jobber." }
      ],
      note: "Rødt-stoppet og sålekontrollen er grunnmuren. Vis fram den fineste, roligste sålerullingen din – ikke bare den raskeste starten.",
      rekord: null
    },
    {
      key: "lek4", label: "Økt 4", title: "Kompisøkta", group: "lek",
      meta: "10–15 min · to stykker · ball", accent: "green", skann: true,
      intro: "Spill mot en venn er den beste treningen som finnes – mest moro, og flest situasjoner som ligner ekte fotball. Velg en eller flere av disse.",
      parts: [
        { name: "Pasningsrytme", time: "3 min", desc: "Spill ballen mellom dere og beveg dere – først to touch, så ett. Lett, jevnt tempo." },
        { name: "Trikse-tennis", time: "4 min", desc: "Hold ballen gående i lufta mellom dere uten at den treffer bakken (eller med ett sprett imellom). Tell serien." },
        { name: "1 mot 1", time: "4 min", desc: "Liten firkant uten mål – kjemp om å beholde ballen lengst. Eller med mål: én angriper, én forsvarer, så bytt. Vegg og avslutning hvis dere har et mål: spill kompisen, få den i retur, og avslutt." },
        { name: "Skann-appen", time: "valgfritt", skann: true, desc: "La skjermen bestemme: den kan blinke hvem som angriper, eller hvilket hjørne du skal sikte i. Da må dere begge følge med og reagere kjapt." }
      ],
      note: "Lite mål gir mer presisjon, stort mål mer fart og kraft. Det viktigste er at det blir mange situasjoner og mye latter.",
      rekord: { desc: "Lengste trikse-tennis-serie sammen.", placeholder: "antall touch", better: "higher" }
    }
  ],

  quotes: [
    "Det gøyeste er ikke å bli best – det er å lære nye ting og kjenne at ballen blir vennen din.",
    "Vipp opp, hold den gående, og ha det moro.",
    "Terping er hele hemmeligheten – verken Messi eller Ronaldo ble født med dette.",
    "Det er ikke farten som teller, men kontrollen.",
    "Sålekontrollen er starten på alt annet i fotball.",
    "Spill mot en venn er den beste treningen som finnes.",
    "Bommer du, er det bare å le og fortsette."
  ],

  levels: [
    { xp: 0,   name: "Ny på løkka" },
    { xp: 50,  name: "Ballkompis" },
    { xp: 120, name: "Touch-samler" },
    { xp: 210, name: "Triksevenn" },
    { xp: 320, name: "Løkkeløve" },
    { xp: 450, name: "Sommerstjerne" }
  ],

  xpRules: { base: 20, allParts: 10, newRecord: 15 },

  badges: [
    { key: "forste",   name: "Første økt",   desc: "Spilte din første økt",       icon: "ball",     check: s => s.total >= 1 },
    { key: "sale",     name: "Sålemester",   desc: "Sålemesteren 3 ganger",       icon: "palette",  check: s => (s.types.lek1 || 0) >= 3 },
    { key: "trikse",   name: "Trikseskolen", desc: "Trikseskolen 3 ganger",       icon: "sparkle",  check: s => (s.types.lek2 || 0) >= 3 },
    { key: "lys",      name: "Trafikksjef",  desc: "Trafikklyset 3 ganger",       icon: "traffic",  check: s => (s.types.lek3 || 0) >= 3 },
    { key: "kompis",   name: "Kompis",       desc: "Kompisøkta 3 ganger",         icon: "heart",    check: s => (s.types.lek4 || 0) >= 3 },
    { key: "allefire", name: "Alle fire",    desc: "Prøvd alle fire øktene",      icon: "star",     check: s => s.distinct >= 4 },
    { key: "rekord",   name: "Rekordbyttet", desc: "Slo din egen rekord",         icon: "trophy",   check: s => s.improvements >= 1 },
    { key: "uke1",     name: "Sommeruke",    desc: "Nådde ukemålet en uke",       icon: "sun",      check: s => s.weeksMet >= 1 },
    { key: "uke2",     name: "To på rad",    desc: "2 sommeruker på rad",         icon: "flame",    check: s => s.bestStreak >= 2 },
    { key: "ferie",    name: "Hele ferien",  desc: "6 uker med ball",             icon: "calendar", check: s => s.bestStreak >= 6 },
    { key: "touch20",  name: "Touch-konge",  desc: "20 økter totalt",             num: "20",        check: s => s.total >= 20 }
  ]
};
