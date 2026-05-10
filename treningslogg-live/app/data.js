// Mock data for Treningslogg MVP
window.TL_DATA = (function () {
  const groups = ['junior', 'grunnleggende', 'erfaren', 'alle nivåer', 'åpen matte'];
  const groupShort = { 'junior': 'jr', 'grunnleggende': 'grunn', 'erfaren': 'erf', 'alle nivåer': 'alle', 'åpen matte': 'åpen' };

  const trainers = [
    { id: 'marius', name: 'marius' },
    { id: 'ola',    name: 'ola' },
    { id: 'kari',   name: 'kari' },
    { id: 'jens',   name: 'jens' },
  ];

  // Kjernetags — kontrollert vokabular for dashboard og statistikk.
  // Posisjoner = "hvor du er", handlinger = "hva du gjør".
  // Trener kan fortsatt skape egne fritekst-tags i logge-skjemaet,
  // men dashboardet aggregerer kun på core-tags.
  const tags = [
    // Posisjoner
    { id: 'guard',        label: 'guard',        kind: 'position', core: true },
    { id: 'mount',        label: 'mount',        kind: 'position', core: true },
    { id: 'sidekontroll', label: 'sidekontroll', kind: 'position', core: true },
    { id: 'back',         label: 'back',         kind: 'position', core: true },
    { id: 'c2c',          label: 'C2C',          kind: 'position', core: true },
    { id: 'c2b',          label: 'C2B',          kind: 'position', core: true },
    // Handlinger
    { id: 'passing',      label: 'passing',      kind: 'action',   core: true },
    { id: 'escapes',      label: 'escapes',      kind: 'action',   core: true },
    { id: 'submissions',  label: 'submissions',  kind: 'action',   core: true },
    { id: 'takedowns',    label: 'takedowns',    kind: 'action',   core: true },
    { id: 'sweeps',       label: 'sweeps',       kind: 'action',   core: true },
    { id: 'pins',         label: 'pins',         kind: 'action',   core: true },
  ];

  // sessions: dato (YYYY-MM-DD), tid, gruppe, trener, tittel, innhold, tags, oppmøte
  const sessions = [
    { id: 's-23', date: '2026-05-04', time: '18:00', group: 'grunnleggende', trainer: 'ola',    title: 'half guard — underhook',
      content: 'oppvarming m/ shrimp og hip escape. teknikk: half guard m/ underhook, knee shield basics. drilling 3×5 min. lett sparring fra half guard.',
      tags: ['guard', 'half-guard', 'fundamentals'], attendance: 14 },
    { id: 's-22', date: '2026-04-30', time: '19:00', group: 'erfaren',       trainer: 'marius', title: 'leg lock entries — ashi garami',
      content: 'entries fra single leg x og 50/50. fokus på hofte-posisjon. drilling 4×4. spesifikk sparring kun fra leg entanglements.',
      tags: ['submissions', 'leg-lock'], attendance: 11 },
    { id: 's-21', date: '2026-04-28', time: '18:00', group: 'grunnleggende', trainer: 'ola',    title: 'closed guard — kimura setup',
      content: 'kimura grip fra closed guard, sweep eller submission. partner-drill 3×5. avsluttet med åpen rolling 15 min.',
      tags: ['guard', 'submissions', 'kimura', 'closed-guard'], attendance: 14 },
    { id: 's-20', date: '2026-04-27', time: '17:00', group: 'junior',        trainer: 'kari',   title: 'fall + posisjon-spill',
      content: 'fallteknikk forfra/bakfra. posisjon-tag (mount, side control, back). avsluttet med leker.',
      tags: ['mount', 'sidekontroll', 'back', 'fundamentals'], attendance: 18 },
    { id: 's-19', date: '2026-04-25', time: '11:00', group: 'åpen matte',  trainer: '',       title: 'åpen matte',
      content: 'åpen rolling — fri trening, ingen instruktør. fokus på flyt og posisjons-bytter.',
      tags: ['sparring'], attendance: 9 },
    { id: 's-18', date: '2026-04-23', time: '19:00', group: 'erfaren',       trainer: 'marius', title: 'back take fra turtle',
      content: 'krabbe fra turtle, hooks in, body triangle. submission: rear naked choke + bow and arrow.',
      tags: ['back', 'submissions', 'takedowns'], attendance: 12 },
    { id: 's-17', date: '2026-04-21', time: '18:00', group: 'grunnleggende', trainer: 'ola',    title: 'mount — maintenance',
      content: 'high mount vs low mount. grapes, knee elbow, frame. hold-ned drill 2 min hver.',
      tags: ['mount', 'fundamentals'], attendance: 13 },
    { id: 's-16', date: '2026-04-20', time: '17:00', group: 'junior',        trainer: 'kari',   title: 'shrimp + bridge',
      content: 'grunnbevegelser. teknisk shrimp, bridge, combo. partner-drill.',
      tags: ['fundamentals', 'drill'], attendance: 16 },
    { id: 's-15', date: '2026-04-18', time: '11:00', group: 'åpen matte',  trainer: '',       title: 'åpen matte',
      content: 'åpen sparring — fri trening. fokus: rotere partnere, lette runder.',
      tags: ['sparring'], attendance: 11 },
    { id: 's-14', date: '2026-04-16', time: '19:00', group: 'erfaren',       trainer: 'marius', title: 'half guard sweeps',
      content: 'old school sweep, plan b, deep half. drilling. kort sparring fra half guard.',
      tags: ['guard', 'half-guard', 'sweep'], attendance: 10 },
    { id: 's-13', date: '2026-04-14', time: '18:00', group: 'grunnleggende', trainer: 'ola',    title: 'side control escapes',
      content: 'escape til guard, escape til knees. frame, shrimp, bridge. live drill.',
      tags: ['sidekontroll', 'escapes', 'fundamentals'], attendance: 15 },
    { id: 's-12', date: '2026-04-13', time: '17:00', group: 'junior',        trainer: 'kari',   title: 'pinning posisjoner',
      content: 'lære side, mount, north-south. holde-ned konkurranse.',
      tags: ['mount', 'sidekontroll', 'fundamentals'], attendance: 14 },
    { id: 's-11', date: '2026-04-11', time: '11:00', group: 'åpen matte',  trainer: '',       title: 'åpen matte',
      content: 'fri trening — lett rolling. teknikk-spørsmål-runde først.',
      tags: ['sparring'], attendance: 8 },
    { id: 's-10', date: '2026-04-09', time: '19:00', group: 'erfaren',       trainer: 'marius', title: 'guard passing — folding pass',
      content: 'folding pass, knee cut combo. drill og spesifikk sparring.',
      tags: ['passing'], attendance: 11 },
    { id: 's-09', date: '2026-04-07', time: '18:00', group: 'grunnleggende', trainer: 'ola',    title: 'closed guard maintenance',
      content: 'pummel, posture break, control sleeve+collar. introduksjon til scissor sweep.',
      tags: ['guard', 'closed-guard', 'fundamentals'], attendance: 12 },
  ];

  // planlagte fremtidige økter (uten innhold ennå)
  const planned = [
    { id: 'p-1', date: '2026-05-05', time: '19:00', group: 'grunnleggende', trainer: 'ola' },
    { id: 'p-2', date: '2026-05-05', time: '20:30', group: 'erfaren',       trainer: 'marius', title: 'guard retention' },
    { id: 'p-3', date: '2026-05-07', time: '19:00', group: 'erfaren',       trainer: 'marius' },
    { id: 'p-4', date: '2026-05-09', time: '11:00', group: 'åpen matte',  trainer: '' },
    { id: 'p-5', date: '2026-05-11', time: '18:00', group: 'grunnleggende', trainer: 'ola' },
    { id: 'p-6', date: '2026-05-12', time: '17:00', group: 'junior',        trainer: 'kari' },
    { id: 'p-7', date: '2026-05-12', time: '19:00', group: 'erfaren',       trainer: 'marius' },
    { id: 'p-8', date: '2026-05-14', time: '19:00', group: 'erfaren',       trainer: 'marius' },
  ];

  // deltakere (fra spond) — kun navn for demo
  const members = [
    'anders kristoffersen', 'birgit solheim', 'christian holm',
    'dag olsen', 'eirik tronstad', 'frida lie', 'gunnar berge',
    'henrik aas', 'ida pettersen', 'jakob ness',
    'kari øvrebø', 'lars hansen', 'maria bø', 'nils dahl',
  ];

  return { groups, groupShort, trainers, tags, sessions, planned, members };
})();
