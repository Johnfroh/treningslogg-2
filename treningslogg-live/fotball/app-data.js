/* ============================================================
   FAMILIEHEFTENE — register
   Hefter (program) deler samme motor, men har egne
   farger, nivåer, merker og innhold.
     ungdom  · «Bygg motoren»   (fotball, 13+)
     junior  · «Sommerball»     (fotball-leker, 7–9)
     rg      · «Ball og rytme»  (rytmisk gymnastikk, ~9)
     core_a  · «CORE · Smia»    (funksjonell grunnstyrke, voksen)
   Hvert datafil legger seg selv inn i window.BM_PROGRAMS.
   ============================================================ */
window.BM_PROGRAMS = window.BM_PROGRAMS || {};
window.BM_PROGRAM_ORDER = ["ungdom", "junior", "rg", "core_a"];

// Trinn-progresjon (junior + rg): antall gjennomføringer av samme økt før
// neste trinn låses opp. Én felles, lett-justerbar konstant. Trinn er en egen
// akse — XP, streak og ukemål er uberørt.
window.BM_NIVAA_TERSKEL = 5;

