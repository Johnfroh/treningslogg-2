/* ============================================================
   CORE · VARIANT A — «Smia»  (funksjonell grunnstyrke, voksen)
   Identitet: smie / jern. Varm ember-oransje på kull-svart.
   Nivåene følger varmen i en smie: Kald → Glødende → Smidd.
   ============================================================ */
window.BM_PROGRAMS = window.BM_PROGRAMS || {};
window.BM_PROGRAMS.core_a = {
  id: "core_a",
  brand: { name: "CORE", tagline: "Smia · grunnstyrke", short: "CORE · Smia", age: "Smia · A", dot: "#ff8a3d" },
  hero: { top: "Streak", subLow: "tenn smia denne uka", subHigh: "hold gløden i smia", unit: "uker", unitOne: "uke", suffix: "på rad" },
  meter: { low: "Kald", high: "Glødende" },
  weekGoalDefault: 3,
  navMid: "Økter",
  okterTitle: { pre: "Øk", hl: "tene", sub: "Fire økter · tre med kettlebell, én med kroppsvekt", brandsub: "Velg dagens økt" },
  recordsEnabled: true,
  recordTitle: "Beste tall",
  quoteSource: "Fra arket «Grunnmuren»",

  groups: window.CORE_GROUPS,

  theme: {
    "--app-bg": "radial-gradient(125% 80% at 50% 20%, #3a1410 0%, #1c0c0a 46%, #0a0605 100%)",
    "--edge-bg": "#0a0605",
    "--display": "'Anton',sans-serif",
    "--ink": "#fff2ea", "--ink-soft": "#e6c9bb",
    "--green": "#d9531f", "--green-deep": "#b8430f", "--green-bright": "#ff8a3d",
    "--gold": "#d99a2e", "--gold-bright": "#ffcf7a",
    "--coral": "#c43d2a",
    "--muted": "#9a7d70", "--muted-2": "#7d6356",
    "--line": "rgba(255,150,90,0.20)", "--line-strong": "rgba(255,150,90,0.42)",
    "--ice": "#7fb0d8", "--fire": "#ff7a2e",
    "--field": "rgba(40,18,12,0.72)",
    "--hero-grad": "linear-gradient(178deg,#cfe0ee 0%,#ffd6a0 45%,#ff7a2e 100%)",
    "--fire-grad": "linear-gradient(90deg,#ff3d12 0%,#ff7a1e 55%,#ffce4a 100%)",
    "--ice-grad": "repeating-linear-gradient(115deg, rgba(190,225,255,.26) 0 11px, rgba(140,180,225,.12) 11px 22px)",
    "--edge-glow": "0 0 12px #ffce7a,0 0 22px #ff7a2e",
    "--rank-grad": "linear-gradient(90deg,rgba(217,83,31,.20),rgba(255,200,90,.08))",
    "--crest-frame": "linear-gradient(165deg,#ffd98f,#d9892e)",
    "--crest-inner": "linear-gradient(165deg,#c4471a,#5a1f0e)"
  },
  confetti: ["#ff8a3d", "#ffcf7a", "#c43d2a", "#d9531f", "#ffce4a"],

  okter: window.CORE_OKTER,
  quotes: window.CORE_QUOTES,

  levels: [
    { xp: 0,    name: "Kald" },
    { xp: 60,   name: "Tenning" },
    { xp: 150,  name: "Varm" },
    { xp: 280,  name: "Glødende" },
    { xp: 440,  name: "Smibar" },
    { xp: 640,  name: "Herdet" },
    { xp: 880,  name: "Smidd" },
    { xp: 1150, name: "Stål" }
  ],

  xpRules: { base: 20, allParts: 10, newRecord: 15 },

  badges: [
    { key: "igang",   name: "I gang",        desc: "Første økt ført",              icon: "kettlebell", check: s => s.total >= 1 },
    { key: "fem",     name: "Femmer'n",      desc: "5 økter gjennomført",          num: "5",           check: s => s.total >= 5 },
    { key: "ti",      name: "Tosifret",      desc: "10 økter gjennomført",         num: "10",          check: s => s.total >= 10 },
    { key: "kvart",   name: "Kvarthundre",   desc: "25 økter gjennomført",         num: "25",          check: s => s.total >= 25 },
    { key: "femti",   name: "Halvhundre",    desc: "50 økter gjennomført",         num: "50",          check: s => s.total >= 50 },
    { key: "alle",    name: "Hele arket",    desc: "Alle fire øktene prøvd",       icon: "clipboard",  check: s => s.distinct >= 4 },
    { key: "uke1",    name: "Uka i boks",    desc: "Første uke med ukemålet nådd", icon: "calcheck",   check: s => s.weeksMet >= 1 },
    { key: "streak2", name: "To på rad",     desc: "2 uker på rad med ukemålet",   icon: "flame",      check: s => s.bestStreak >= 2 },
    { key: "streak4", name: "Månedssmie",    desc: "4 uker på rad med ukemålet",   icon: "calendar",   check: s => s.bestStreak >= 4 },
    { key: "streak8", name: "Herdet",        desc: "8 uker på rad med ukemålet",   icon: "anvil",      check: s => s.bestStreak >= 8 },
    { key: "rekord1", name: "Tyngre",        desc: "Slo ditt eget tall",           icon: "trophy",     check: s => s.improvements >= 1 },
    { key: "rekord3", name: "Kurven opp",    desc: "3 forbedringer",               icon: "chart",      check: s => s.improvements >= 3 }
  ]
};
