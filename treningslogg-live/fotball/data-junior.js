/* ============================================================
   HEFTE: JUNIOR — «Sommerball»  (fotball-leker, 7–9 år)
   Lett, solrikt og leketøff. Ingen rekorder – bare touch og moro.
   ============================================================ */
window.BM_PROGRAMS = window.BM_PROGRAMS || {};
window.BM_PROGRAMS.junior = {
  id: "junior",
  brand: { name: "Sommerball", tagline: "Lek · Touch · Sommer", short: "Sommerball", age: "7–9 år", dot: "#ffd23e" },
  hero: { top: "Sommer", subLow: "kom i gang i sommer", subHigh: "fortsett – det går så bra!", unit: "uker", unitOne: "uke", suffix: "med lek" },
  meter: { low: "Skyet", high: "Solskinn" },
  weekGoalDefault: 2,
  navMid: "Leker",
  okterTitle: { pre: "Sommer", hl: "lekene", sub: "Tre leker · en ball og litt plass", brandsub: "Velg en lek" },
  recordsEnabled: false,
  recordTitle: "",
  quoteSource: "Fra heftet «Sommerball»",

  groups: [
    { key: "lek", title: "Sommerlekene", sub: "Tre leker" }
  ],

  theme: {
    "--app-bg": "radial-gradient(120% 88% at 50% 14%, #2f9fd6 0%, #176aa0 44%, #08395f 100%)",
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
      key: "lek1", label: "Lek 1", title: "Fargejakten", group: "lek",
      meta: "5–10 min · egen ball", accent: "green", skann: true,
      intro: "En voksen eller storesøsken roper en farge – og du fører ballen bort til noe i den fargen så fort du klarer, uten å miste den.",
      parts: [
        { name: "Spre fargene", time: "1 min", desc: "Legg ut kjegler eller ting i ulike farger rundt i hagen, på løkka eller på stranda." },
        { name: "Jakt på fargen", time: "5 min", desc: "Den voksne roper en farge. Før ballen bort til noe i den fargen – så fort du klarer, men uten å miste ballen." },
        { name: "Gjør det vrient", time: "3 min", desc: "Når det blir lett: to farger etter hverandre, eller «løp til motsatt farge av der du står»." },
        { name: "Skann-appen", time: "valgfritt", skann: true, desc: "Sett appen på et bord eller en stol – så blinker den fargen i stedet for at noen roper. Da må du kikke opp på skjermen mens du fører, akkurat som de store fotballspillerne gjør i kamp." }
      ],
      note: "Det viktigste er ikke å være raskest – det er å se seg rundt og holde ballen nær. Det er gøyest når alle ler.",
      rekord: null
    },
    {
      key: "lek2", label: "Lek 2", title: "Trafikklyset", group: "lek",
      meta: "5–10 min · egen ball", accent: "coral", skann: true,
      intro: "Grønt: før ballen i god fart. Gult: helt rolig, små touch oppå ballen. Rødt: stopp med foten på ballen. Den voksne bytter farge – og prøver å lure deg!",
      parts: [
        { name: "Grønt – kjør!", time: "2 min", desc: "Før ballen rundt i god fart. Hold ballen nær." },
        { name: "Gult – rolig", time: "2 min", desc: "Helt rolig, små touch med foten oppå ballen." },
        { name: "Rødt – stopp!", time: "2 min", desc: "Stopp med foten på ballen, helt stille. Bråstoppene er det morsomste – hold gult lenge, og så plutselig rødt!" },
        { name: "Skann-appen", time: "valgfritt", skann: true, desc: "La skann-appen vise fargen på skjermen. Da kan fargene bytte enda raskere, og du må følge med med øynene mens beina jobber." }
      ],
      note: "Rødt-stoppet er hemmeligheten: å ha foten klar oppå ballen er starten på all god ballkontroll.",
      rekord: null
    },
    {
      key: "lek3", label: "Lek 3", title: "Talltrollene", group: "lek",
      meta: "5–10 min · egen ball", accent: "gold", skann: true,
      intro: "Du fører ballen rundt. Når et tall dukker opp, gjør du så mange touch – og fortsetter.",
      parts: [
        { name: "Velg en touch", time: "1 min", desc: "Den voksne sier hvilken touch som gjelder: fem touch med sålen, tre små dytt med innsiden …" },
        { name: "Tallet bestemmer", time: "4 min", desc: "Når et tall dukker opp, gjør du så mange touch før du fører videre. «Talltrollet sier FEM! Fem såletouch før det slipper deg videre!»" },
        { name: "Tell høyt sammen", time: "3 min", desc: "Tell høyt sammen første gang. Det handler om mange berøringer og om å se opp – ikke om at alle teller helt likt." },
        { name: "Skann-appen", time: "valgfritt", skann: true, desc: "Skann-appen kan være talltrollet – den blinker tallet, du leser det og gjør touchene. Litt eldre? La tallet blinke bare et lite sekund, så må du fange det kjapt." }
      ],
      note: "Det handler om mange touch og om å se opp – ikke om at alle teller helt likt.",
      rekord: null
    }
  ],

  quotes: [
    "Det gøyeste er ikke å bli best. Det er å leke mye og le mye.",
    "Se deg rundt og hold ballen nær – så blir ballen vennen din.",
    "Det er gøyest når alle ler.",
    "Mange touch og mye moro. Det er hele greia.",
    "Løft blikket fra ballen – akkurat som de store gjør.",
    "Rødt-stoppet er hemmeligheten: ha foten klar oppå ballen.",
    "Ingen mål, ingen som taper. Bare ball og sommer."
  ],

  levels: [
    { xp: 0,   name: "Ny på løkka" },
    { xp: 50,  name: "Ballkompis" },
    { xp: 120, name: "Touch-samler" },
    { xp: 210, name: "Triksevenn" },
    { xp: 320, name: "Løkkeløve" },
    { xp: 450, name: "Sommerstjerne" }
  ],

  xpRules: { base: 20, allParts: 10, newRecord: 0 },

  badges: [
    { key: "forste",  name: "Første lek",  desc: "Spilte din første lek",      icon: "ball",     check: s => s.total >= 1 },
    { key: "farge",   name: "Fargejeger",  desc: "Fargejakten 3 ganger",       icon: "palette",  check: s => (s.types.lek1 || 0) >= 3 },
    { key: "trafikk", name: "Trafikksjef", desc: "Trafikklyset 3 ganger",      icon: "traffic",  check: s => (s.types.lek2 || 0) >= 3 },
    { key: "tall",    name: "Talltroll",   desc: "Talltrollene 3 ganger",      icon: "hash",     check: s => (s.types.lek3 || 0) >= 3 },
    { key: "alletre", name: "Alle tre",    desc: "Prøvd alle tre lekene",      icon: "star",     check: s => s.distinct >= 3 },
    { key: "uke1",    name: "Sommeruke",   desc: "Nådde ukemålet en uke",      icon: "sun",      check: s => s.weeksMet >= 1 },
    { key: "uke2",    name: "To på rad",   desc: "2 sommeruker på rad",        icon: "flame",    check: s => s.bestStreak >= 2 },
    { key: "ferie",   name: "Hele ferien", desc: "6 uker med lek",             icon: "calendar", check: s => s.bestStreak >= 6 },
    { key: "touch20", name: "Touch-konge", desc: "20 leker totalt",            num: "20",        check: s => s.total >= 20 }
  ]
};
