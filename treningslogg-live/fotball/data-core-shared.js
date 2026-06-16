/* ============================================================
   CORE — delt innhold for begge varianter
   Kilde: arket «Grunnmuren» (funksjonell grunnstyrke).
   Fire økter: tre med kettlebell, én med kroppsvekt.
   Begge varianter (Smia / Grunnmur) bruker samme økter,
   sitater og rekord-felt – kun identitet/tema er ulikt.
   ============================================================ */
window.CORE_GROUPS = [
  { key: "kb",    title: "Med kettlebell", sub: "Økt 1–3" },
  { key: "kropp", title: "Uten utstyr",    sub: "Økt 4" }
];

window.CORE_OKTER = [
  {
    key: "okt1", label: "Økt 1", title: "Grunnløftene", group: "kb",
    meta: "20–25 min · 1 kettlebell", accent: "green",
    intro: "Hele kroppen gjennom de fem grunnbevegelsene. Standardøkta – den du faller tilbake på når du bare vil ha det gjort.",
    parts: [
      { name: "Goblet-knebøy", time: "3×10", desc: "Kettlebell inntil brystet, rak rygg, ned til lårene er vannrette, knær ut i tåretning." },
      { name: "Kettlebell-markløft", time: "3×10", desc: "Hofte-hengsel med rak rygg, skyt hofta fram på vei opp. Bakkjeden gjør jobben." },
      { name: "Enarms roing", time: "3×10 /arm", desc: "I utfall, fri hånd på låret, dra kettlebellen mot hofta med albuen tett inntil. Rygg og holdning." },
      { name: "Stående press", time: "3×8 /arm", desc: "Press rolig over hodet fra brysthøyde, stram kjerne så du ikke svaier. Skuldre og overkropp." },
      { name: "Koffertbæring", time: "3×20 skritt /side", desc: "Kettlebell i én hånd, gå rett og rolig uten å lene deg. Kjernen og grepet." }
    ],
    note: "Kort på tid? Kutt til 2 sett per øvelse – ute på rundt 15 min med hele kroppen dekket. Spar et par reps på tanken; ikke bli så støl at neste økt ryker.",
    rekord: { desc: "Arbeidsvekt på kettlebellen (kg) når grunnløftene sitter med god teknikk.", placeholder: "kg", better: "higher" }
  },
  {
    key: "okt2", label: "Økt 2", title: "Kraft og puls", group: "kb",
    meta: "25–30 min · 1 kettlebell", accent: "green",
    intro: "Svingen er motoren: maksimal effekt på minimal tid, og pulsen kommer opp på kjøpet. For dagen du vil kjenne at du har trent uten å bruke en time.",
    parts: [
      { name: "Kettlebell-sving", time: "4×12", desc: "Hofta eksploderer ballen opp til brysthøyde, armene henger bare med. Rak rygg i bunn, full strekk på topp." },
      { name: "Goblet-knebøy", time: "3×10", desc: "Rolig ned, litt fart opp." },
      { name: "Skyvepress", time: "3×8 /arm", desc: "Lite spenst i knærne hjelper kettlebellen over hodet. Hele kroppen samarbeider." },
      { name: "Gående utfall", time: "3×8 /bein", desc: "Kettlebell ved brystet, kontrollerte steg framover, press opp gjennom fremre hæl." },
      { name: "Sideplanke", time: "3×30 sek /side", desc: "Rett linje fra hode til hæl, stramt og rolig." }
    ],
    note: "Kort på tid? Dropp utfall og sideplanke – kjør sving + knebøy + press som en rask sirkel ×3. Effektiv helkropp på et kvarter.",
    rekord: { desc: "Vekt på kettlebell-svingen (kg). Lett 4×12 med rak rygg = tyngre neste gang.", placeholder: "kg", better: "higher" }
  },
  {
    key: "okt3", label: "Økt 3", title: "Flyt", group: "kb",
    meta: "30–35 min · 1 kettlebell", accent: "coral",
    intro: "Den tøffeste – bevegelser bundet sammen til serier så hele kroppen jobber og pulsen holder seg oppe. Styrke og kondisjon i ett, for dagene med litt mer overskudd.",
    parts: [
      { name: "Sving", time: "3×12", desc: "Som oppvarming for kraft." },
      { name: "Frivending til goblet-knebøy", time: "3×8", desc: "Sving opp, fang inntil brystet, rett ned i knebøy, opp, og rolig ned igjen. Én flytende bevegelse." },
      { name: "Enarms press", time: "3×8 /arm", desc: "Rolig over hodet, stram kjerne mot svai i ryggen." },
      { name: "Baklengs utfall", time: "3×8 /bein", desc: "Kettlebell ved brystet, steg bakover ned, press opp. Snillere mot knærne, god balanse." },
      { name: "Bæring over hodet / i rack", time: "3×20 skritt", desc: "Rett kropp, kettlebell presset opp eller inntil brystet. Holdning og skulderstabilitet." },
      { name: "Hollow hold", time: "3×25 sek", desc: "Korsrygg ned i gulvet, skuldre og bein litt opp, stram mage." }
    ],
    note: "Kort på tid? Kjør de tre første (sving, frivending-knebøy, press) som en sirkel ×3 og hopp resten.",
    rekord: { desc: "Vekt du holdt flyt-seriene med (kg).", placeholder: "kg", better: "higher" }
  },
  {
    key: "okt4", label: "Økt 4", title: "Uten utstyr", group: "kropp",
    meta: "20–25 min · ingen utstyr", accent: "gold",
    intro: "Reise, hytte, hotell – eller bare en dag kettlebellen ikke er for hånden. Hele kroppen, ingen unnskyldninger.",
    parts: [
      { name: "Knebøy", time: "3×15", desc: "Dypt og rolig, rak rygg, brystet opp." },
      { name: "Push-ups", time: "3×10–15", desc: "Rett kropp, helt ned og opp. Tyngre: føttene hevet. Lettere: hendene på en benk." },
      { name: "Rumpeløft", time: "3×15", desc: "Hofta opp til rett linje skuldre–knær, klem på toppen. Ettbeins for mer." },
      { name: "Baklengs utfall", time: "3×10 /bein", desc: "Kontrollert ned og opp, rak overkropp." },
      { name: "Superman", time: "3×12", desc: "Løft armer, bryst og bein samtidig, hold et øyeblikk. Hele ryggen." },
      { name: "Planke", time: "3×30–45 sek", desc: "Rett og stram, rolig pust." }
    ],
    note: "Kort på tid? Kjør alt som én runde uten pause, hvil to minutter, ta én til – ferdig helkropp på under et kvarter.",
    rekord: { desc: "Lengste planke (sekunder). Lett på 45? Prøv 60.", placeholder: "sekunder", better: "higher" }
  }
];

window.CORE_QUOTES = [
  "Det handler ikke om den beste økta – det handler om den neste.",
  "Kontinuitet slår intensitet hver gang.",
  "Ferdig økt er mer verdt enn perfekt økt.",
  "20 minutter er en seier, ikke en nødløsning.",
  "Tre korte økter du gjennomfører slår det perfekte programmet du aldri rekker.",
  "Spar litt på tanken – da ryker ikke neste økt.",
  "Hele kroppen, få øvelser, ingen pynt.",
  "Målet er ikke en topp, men en bunn: å holde grunnstyrken ved like.",
  "Hold rekka i gang, godta de korte dagene, og la grunnmuren stå av seg selv."
];
