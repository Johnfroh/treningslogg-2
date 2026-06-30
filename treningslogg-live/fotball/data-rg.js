/* ============================================================
   HEFTE: RG — «Ball og rytme»  (rytmisk gymnastikk, ~9 år)
   Mykt, flytende og elegant. Ingen rekorder – flyt og kontroll.
   Hver aktivitet har TRINN: Trinn 1 = innholdet barnet kjenner, nye trinn
   låses opp ved gjentakelse (BM_NIVAA_TERSKEL). XP/streak/ukemål uberørt.
   ============================================================ */
window.BM_PROGRAMS = window.BM_PROGRAMS || {};
window.BM_PROGRAMS.rg = {
  id: "rg",
  brand: { name: "Ball og rytme", tagline: "Mykhet · Kontroll · Flyt", short: "Ball & rytme", age: "Turn · 9 år", dot: "#ff8fc4" },
  hero: { top: "Flyt", subLow: "begynn å øve i sommer", subHigh: "fortsett – det flyter fint!", unit: "uker", unitOne: "uke", suffix: "med øving" },
  meter: { low: "Stiv", high: "Flytende" },
  weekGoalDefault: 2,
  navMid: "Øvelser",
  okterTitle: { pre: "Aktivit", hl: "etene", sub: "Fire øvelser · turnballen og appen", brandsub: "Velg en øvelse" },
  recordsEnabled: true,
  recordTitle: "Beste rekorder",
  quoteSource: "Fra heftet «Ball og rytme»",

  groups: [
    { key: "akt",  title: "Aktivitetene", sub: "Fire øvelser" },
    { key: "kropp", title: "Kropp og tau", sub: "To øvelser" }
  ],

  theme: {
    "--app-bg": "radial-gradient(120% 86% at 50% 14%, #5a2a6e 0%, #391a4e 44%, #190b27 100%)",
    "--edge-bg": "#190b27",
    "--display": "'Marcellus',serif",
    "--ink": "#fdeffb", "--ink-soft": "#e3cdee",
    "--green": "#e85fa0", "--green-deep": "#d64f93", "--green-bright": "#ff8fc4",
    "--gold": "#d6a93f", "--gold-bright": "#f3cf76",
    "--coral": "#b98cff",
    "--muted": "#a98bbf", "--muted-2": "#8f6fa8",
    "--line": "rgba(220,170,235,0.22)", "--line-strong": "rgba(220,170,235,0.42)",
    "--ice": "#8fd6e0", "--fire": "#ff8fc4",
    "--field": "rgba(40,14,52,0.55)",
    "--hero-grad": "linear-gradient(178deg,#fff0fa 0%,#ffaed8 40%,#c89bff 100%)",
    "--fire-grad": "linear-gradient(90deg,#b98cff 0%,#ff8fc4 55%,#ffd0e8 100%)",
    "--ice-grad": "repeating-linear-gradient(115deg, rgba(180,235,225,.30) 0 11px, rgba(150,205,235,.14) 11px 22px)",
    "--edge-glow": "0 0 12px #ffc6e6,0 0 22px #ff8fc4",
    "--rank-grad": "linear-gradient(90deg,rgba(232,95,160,.18),rgba(185,140,255,.10))",
    "--crest-frame": "linear-gradient(165deg,#f3cf76,#d6a93f)",
    "--crest-inner": "linear-gradient(165deg,#e85fa0,#6a2f7a)"
  },
  confetti: ["#ff8fc4", "#b98cff", "#f3cf76", "#9fdcc8", "#ffd0e8", "#6fc8ff"],

  okter: [
    {
      key: "akt1", label: "Aktivitet 1", title: "Bli venn med ballen", group: "akt",
      meta: "10–15 min · turnballen", accent: "green", skann: true,
      intro: "Start rolig og kjenn på ballen. Det handler om mykhet og kontroll, ikke fart.",
      note: "Ballen skal hvile i den åpne hånden, aldri gripes med fingrene. Det er sånn ekte RG-gymnaster holder ballen.",
      rekord: null,
      tiers: [
        { tier: 1, undertittel: "Bli kjent med ballen", parts: [
          { name: "Trille på armene", time: "3 min", desc: "Trill ballen langs den ene armen, over skuldrene og ned den andre." },
          { name: "Balanse på åpen hånd", time: "3 min", desc: "Balanser ballen på den åpne hånden mens du reiser deg sakte opp. Tenk at hånden er en liten tallerken." },
          { name: "Åttetall rundt beina", time: "3 min", desc: "Trill ballen i en åtte rundt og mellom beina." },
          { name: "Myke spretter", time: "3 min", desc: "Små, myke spretter med én hånd – så bytt hånd." },
          { name: "Skann-appen", time: "valgfritt", skann: true, desc: "La appen blinke et tall – så mange myke spretter gjør du før neste. Blinker den en farge, kan hver farge bety en kroppsdel ballen skal trilles på: rød = armen, blå = ryggen, grønn = bakken foran deg." }
        ] },
        { tier: 2, undertittel: "Over kroppen", parts: [
          { name: "Trille over rygg og skuldre", time: "4 min", desc: "Trill ballen over den ene skulderen, bak nakken og ned den andre armen. Rolig og mykt." },
          { name: "Sprett under beinet", time: "3 min", desc: "Sprett ballen lavt under det ene beinet og fang den på andre siden." },
          { name: "Balanse i bevegelse", time: "4 min", desc: "Balanser ballen på den åpne hånden mens du går sakte eller snur deg." }
        ] },
        { tier: 3, undertittel: "Mønster og kontroll", parts: [
          { name: "Trille i mønster og fange", time: "5 min", desc: "Trill ballen på gulvet i et mønster – en sirkel eller en åtte – og fang den mykt i fart." },
          { name: "Balanse under et kroppselement", time: "4 min", desc: "Balanser ballen mens du fører et bein eller en arm rolig over eller rundt den." }
        ] }
      ]
    },
    {
      key: "akt2", label: "Aktivitet 2", title: "Kast og fang", group: "akt",
      meta: "10–15 min · turnballen", accent: "coral", skann: true,
      intro: "Kast ballen rett opp og fang den mykt med åpne hender – som om du tar imot et egg du ikke vil knuse.",
      note: "Se på ballen, ikke på hendene. Toppspillere i alle ballidretter fanger og mottar med blikket oppe – det starter her.",
      rekord: null,
      tiers: [
        { tier: 1, undertittel: "Kast og mykt mottak", parts: [
          { name: "Lave kast", time: "3 min", desc: "Begynn lavt. Mykt mottak med åpne hender hver gang." },
          { name: "Høye kast", time: "3 min", desc: "Kast gradvis høyere. Se på ballen hele veien ned, ikke på hendene." },
          { name: "Klapp og fang", time: "4 min", desc: "Kast, klapp én gang, og fang. Så: kast under det ene beinet. Fem fine av hvert før du går videre." },
          { name: "Skann-appen", time: "valgfritt", skann: true, desc: "Mens ballen er i luften, kikk raskt på skjermen. Tallet eller fargen forteller hva du gjør idet du fanger – en piruett, eller ned i en balanse. Du lærer å se deg rundt mens noe er i bevegelse." }
        ] },
        { tier: 2, undertittel: "Mottak uten å se", parts: [
          { name: "Vending før mottak", time: "4 min", desc: "Kast, gjør en halv vending eller et klapp, og fang ballen mykt." },
          { name: "Fange bak ryggen", time: "3 min", desc: "Kast rolig og fang ballen bak ryggen." },
          { name: "Fange uten å se på hendene", time: "4 min", desc: "Hold blikket fram og fang ballen på følelsen, ikke på synet av hendene." }
        ] },
        { tier: 3, undertittel: "Piruett og balanse", parts: [
          { name: "Kast, piruett, fang", time: "5 min", desc: "Kast ballen opp, gjør en hel piruett, og fang den mykt igjen." },
          { name: "Kast og land i balanse", time: "4 min", desc: "Kast ballen, og lande i en rolig balanse i det øyeblikket du fanger den." }
        ] }
      ]
    },
    {
      key: "akt3", label: "Aktivitet 3", title: "Ballen og kroppen", group: "akt",
      meta: "15 min · turnballen", accent: "green", skann: true,
      intro: "RG har fire familier av bevegelser: hopp, balanse, piruett og bølge. Gjør en av hver, med ballen som følgesvenn.",
      note: "Strekk fingre og tær, hold blikket løftet, og la bevegelsen flyte. I RG teller hvordan det ser ut like mye som hva du gjør.",
      rekord: null,
      tiers: [
        { tier: 1, undertittel: "De fire familiene", parts: [
          { name: "Hopp", time: "3 min", desc: "Et lite hopp mens du holder ballen fram." },
          { name: "Balanse", time: "3 min", desc: "Balanse på ett bein med ballen balansert på håndflaten." },
          { name: "Piruett", time: "3 min", desc: "En piruett med ballen inntil." },
          { name: "Bølge", time: "3 min", desc: "En myk bølge med armene der ballen triller fra hånd til hånd." },
          { name: "Skann-appen", time: "valgfritt", skann: true, desc: "Hver farge eller hvert symbol står for en bevegelsesfamilie: én = hopp, én = balanse, én = piruett, én = bølge. Appen blinker, og du gjør den bevegelsen – en reaksjonslek der du velger raskt og pent." }
        ] },
        { tier: 2, undertittel: "Koble sammen", parts: [
          { name: "Trilling til piruett", time: "4 min", desc: "Trill ballen langs armen og gå rett over i en piruett uten stopp." },
          { name: "Balanse på tå med ball over hodet", time: "4 min", desc: "Stå på tå med ballen løftet rolig over hodet. Hold blikket fram." }
        ] },
        { tier: 3, undertittel: "Flyt", parts: [
          { name: "To elementer i én flyt", time: "5 min", desc: "Bind sammen to kroppselementer – for eksempel piruett og balanse – i én sammenhengende flyt med ballen." }
        ] }
      ]
    },
    {
      key: "akt4", label: "Aktivitet 4", title: "Lag din egen serie", group: "akt",
      meta: "15 min · turnballen + musikk", accent: "gold", skann: true,
      intro: "Sett på en sang du liker. Sett sammen tre–fire ting du har øvd på, til en liten serie som flyter fra det ene til det andre.",
      note: "Egne serier er det som gjør en gymnast til sin egen. Akkurat som storebror lager sine egne finter, lager du dine egne bevegelser – de er dine.",
      rekord: null,
      tiers: [
        { tier: 1, undertittel: "Din første serie", parts: [
          { name: "Velg elementene", time: "3 min", desc: "For eksempel: trille på armen, kast og fang, en piruett, en balanse." },
          { name: "Øv på overgangene", time: "6 min", desc: "Øv på overgangene, ikke bare elementene. La det flyte fra det ene til det andre." },
          { name: "Vis den fram", time: "4 min", desc: "Kjør serien til den sitter, og vis den gjerne fram til familien. Bytt rekkefølge og lag en ny neste gang – det finnes ingen feil." },
          { name: "Skann-appen", time: "valgfritt", skann: true, desc: "La appen stokke serien: hvert symbol er et element, og rekkefølgen appen blinker er rekkefølgen du gjør dem i. En ny liten koreografi hver gang – både lek og ekte RG-trening på én gang." }
        ] },
        { tier: 2, undertittel: "Lengre serie", parts: [
          { name: "Fem–seks elementer", time: "6 min", desc: "Sett sammen 5–6 elementer med fine, rolige overganger." },
          { name: "Krav: kast og trilling", time: "4 min", desc: "Serien må inneholde minst ett kast og én trilling." }
        ] },
        { tier: 3, undertittel: "Hel serie", parts: [
          { name: "Alle fire familiene + redskap", time: "8 min", desc: "Lag en liten hel serie med alle fire familiene (hopp, balanse, piruett, bølge) og et redskap – ball eller tau." }
        ] }
      ]
    },
    {
      key: "akt5", label: "Aktivitet 5", title: "Sterk og myk", group: "kropp",
      meta: "15–20 min · matte eller mykt underlag", accent: "coral", skann: true,
      intro: "Bak hver fin RG-bevegelse ligger en sterk mage, en god holdning og en myk kropp. Denne økta bygger nettopp det – tre deler: styrke, spenst, og tøyelighet.",
      note: "Tøyelighet bygges over tid, ikke på én dag – og alltid på varme muskler. Strekk til det kjennes som et lett drag, aldri til det gjør vondt, og aldri rykk. Tving aldri en spagat; kroppen åpner seg av seg selv når du øver jevnt.",
      rekord: null,
      tiers: [
        { tier: 1, undertittel: "Styrke, spenst, tøy", parts: [
          { name: "Holdning og styrke", time: "5 min", desc: "Stå høy som en gymnast med stram mage og lange armer, hold i ti sekunder. Planke på albuene, rolig og rett i ryggen. Svane: ligg på magen og løft brystet mykt opp, kjenn at ryggen jobber." },
          { name: "Spenst", time: "4 min", desc: "Små, lette hopp med strake knær og spisset tå, og lett landing. Sprang fra fot til fot, som om du svever et lite øyeblikk." },
          { name: "Tøyelighet", time: "6 min", desc: "Spagat der du sklir så langt ut som det kjennes behagelig. Bro eller ryggbøy. Rolig fremoverbøy der du puster deg lengre ned. Hold hver tøyning rolig i 15–20 sekunder og pust." },
          { name: "Skann-appen", time: "valgfritt", skann: true, desc: "La appen blinke et tall = antall spenst-hopp eller sprang. Eller en farge for tøyningen: rød = spagat, blå = bro, grønn = fremoverbøy. Da blir det en liten lek mot skjermen." }
        ] },
        { tier: 2, undertittel: "Dypere", parts: [
          { name: "Lengre hold", time: "4 min", desc: "Hold planke og svane litt lenger enn sist – rolig pust hele veien." },
          { name: "Dypere spagat", time: "5 min", desc: "Skli litt lenger ned i spagaten enn sist. Alltid behagelig, aldri tving den." },
          { name: "Ettbeins balanse", time: "4 min", desc: "Balanse på ett bein, lengre og roligere. Hold blikket på ett punkt." }
        ] },
        { tier: 3, undertittel: "Mot bro", parts: [
          { name: "Bro fra stående med støtte", time: "6 min", desc: "Forsiktig progresjon mot bro fra stående – med støtte (en vegg eller en voksen). Styrt av din egen komfort, aldri tvunget. Stopp med en gang det ikke kjennes godt." }
        ] }
      ]
    },
    {
      key: "akt6", label: "Aktivitet 6", title: "Tauet", group: "kropp",
      meta: "15 min · hoppetau (gjerne mykt RG-tau)", accent: "gold", skann: true,
      intro: "Tauet er et av de fem redskapene i RG, og her er hopp det viktigste av alt. Tenk lett og høy, som om en usynlig tråd løfter deg opp fra issen.",
      note: "Knute i begge ender av tauet, og hold det løst i hendene. Rytme er målet – mykt og jevnt, ikke hardt.",
      rekord: { desc: "Lengste serie hopp gjennom tauet uten å rote.", placeholder: "antall hopp", better: "higher" },
      tiers: [
        { tier: 1, undertittel: "Sving og hopp", parts: [
          { name: "Sving og sirkler", time: "3 min", desc: "Sving tauet rolig fra side til side foran deg, stort og mykt – som en halvmåne i lufta. Så store sirkler med tauet på hver side av kroppen." },
          { name: "Hopp gjennom forover", time: "5 min", desc: "Små hopp gjennom tauet forover. Dette er det aller viktigste tau-elementet i RG, så her skal det bli mange. Hopp lett på forfoten, strake knær og spisset tå i svevet." },
          { name: "Hopp gjennom bakover", time: "4 min", desc: "Når det sitter forover, prøv å hoppe bakover. Tauet kommer fra andre siden – rytmen er den samme, men det krever litt mer fokus." },
          { name: "Sprang gjennom", time: "3 min", desc: "Kombiner et lite sprang eller svev gjennom tauet. Start sakte og la tauet bli en forlengelse av armen din." },
          { name: "Skann-appen", time: "valgfritt", skann: true, desc: "La skjermen blinke et tall = antall hopp gjennom tauet før neste øvelse. En pil kan bety forover eller bakover, og en farge kan bety sving eller hopp." }
        ] },
        { tier: 2, undertittel: "I bevegelse", parts: [
          { name: "Hopp i bevegelse", time: "5 min", desc: "Hopp gjennom tauet mens du beveger deg framover, ikke bare på stedet." },
          { name: "Raskere sving", time: "4 min", desc: "Øk tempoet i svingen, men hold rytmen myk og jevn." }
        ] },
        { tier: 3, undertittel: "Tau-koreografi", parts: [
          { name: "Kast og fang tauet", time: "4 min", desc: "Kast tauet rolig opp og fang det igjen mens du holder bevegelsen." },
          { name: "Kombinasjoner", time: "4 min", desc: "Bind sammen hopp, sprang og kast til en liten serie med tauet." }
        ] }
      ]
    }
  ],

  quotes: [
    "I turn teller hvordan noe ser ut like mye som hvor vanskelig det er.",
    "Ta det rolig, strekk deg langt, og la bevegelsene flyte.",
    "Ballen skal hvile i den åpne hånden – tenk at hånden er en liten tallerken.",
    "Se på ballen, ikke på hendene.",
    "Egne serier er det som gjør en gymnast til sin egen.",
    "Det fineste er ikke det vanskeligste – det er det som ser mykt og helt ut.",
    "Strekk fingre og tær, hold blikket løftet, og la bevegelsen flyte."
  ],

  levels: [
    { xp: 0,   name: "Første berøring" },
    { xp: 50,  name: "Ballvenn" },
    { xp: 120, name: "Mykhet" },
    { xp: 210, name: "Flyt" },
    { xp: 320, name: "Eleganse" },
    { xp: 450, name: "Egen stil" },
    { xp: 630, name: "Scenestjerne" }
  ],

  xpRules: { base: 20, allParts: 10, newRecord: 15 },

  badges: [
    { key: "forste",   name: "Første øvelse", desc: "Gjorde din første øvelse",     icon: "star",     check: s => s.total >= 1 },
    { key: "venn",     name: "Ballvenn",      desc: "Bli venn med ballen 3 ganger", icon: "heart",    check: s => (s.types.akt1 || 0) >= 3 },
    { key: "mottak",   name: "Mykt mottak",   desc: "Kast og fang 3 ganger",        icon: "ball",     check: s => (s.types.akt2 || 0) >= 3 },
    { key: "familier", name: "Fire familier", desc: "Gjorde Ballen og kroppen",     icon: "sparkle",  check: s => (s.types.akt3 || 0) >= 1 },
    { key: "koreograf",name: "Koreograf",     desc: "Lagde din egen serie",         icon: "music",    check: s => (s.types.akt4 || 0) >= 1 },
    { key: "sterkmyk", name: "Sterk og myk",  desc: "Sterk og myk 3 ganger",        icon: "sparkle",  check: s => (s.types.akt5 || 0) >= 3 },
    { key: "tau",      name: "Tauhopper",     desc: "Tauet 3 ganger",               icon: "ribbon",   check: s => (s.types.akt6 || 0) >= 3 },
    { key: "alleseks", name: "Alle seks",     desc: "Prøvd alle seks øvelser",      icon: "ribbon",   check: s => s.distinct >= 6 },
    { key: "rekord",   name: "Egen rekord",   desc: "Slo din egen rekord",          icon: "trophy",   check: s => s.improvements >= 1 },
    { key: "uke1",     name: "Øveuke",        desc: "Nådde ukemålet en uke",        icon: "sun",      check: s => s.weeksMet >= 1 },
    { key: "uke2",     name: "To på rad",     desc: "2 uker på rad",                icon: "flame",    check: s => s.bestStreak >= 2 },
    { key: "sommer",   name: "Hele sommeren", desc: "6 uker med øving",             icon: "calendar", check: s => s.bestStreak >= 6 }
  ]
};

// Self-normalize: Trinn 1 er den flate deløvelses-lista. Sett okt.parts =
// trinn 1 så alle eksisterende lesere (logg, eksport, detalj) virker uendret,
// uavhengig av om trinn-motoren er lastet.
window.BM_PROGRAMS.rg.okter.forEach(function (o) {
  if (o.tiers && o.tiers.length) o.parts = o.tiers[0].parts;
});
