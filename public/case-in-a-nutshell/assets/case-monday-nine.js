'use strict';
/* ============================================================
   Case 2 rooms, built from the space kit. The living room (Apartment 7)
   is the BASE scene as the caretaker found it at 07:52; the moments in
   case.js are patches laid over it. The time of day comes from env.time.
   ============================================================ */

const LIVING = makeSpace('living', {
  id: 'living', seed: 7, theme: 1, time: 'auto', fill: 0,
  doors: [{ slot: 'LC', to: 'lobby', kind: 'door' }],
  lay: () => ({
    fixed: true,
    R: [WP('bookshelf', 1.8, 0.6, { h: 42 }), WP('sofa', 3.0, 1.2), WP('floorlamp', 0.6, 0.6, { id: 'floorlamp' })],
    L: [WP('tvunit', 2.2, 1.0), WP('plant', 0.9, 0.9)],
    free: [
      OBJ('table', 3.0, 3.2, 2.0, 1.1, { id: 'table' }),
      OBJ('chair', 3.4, 4.45, 0.55, 0.55, { back: 'Y', id: 'chair1' }), OBJ('chair', 4.6, 4.45, 0.55, 0.55, { back: 'Y', id: 'chair2' }),
      OBJ('slippers', 0.5, 4.3, 1.35, 1.1, { id: 'slippers', pose: 'scattered' }),
      OBJ('plant', 6.7, 6.7, 0.9, 0.9),
      OBJ('chalk', 2.7, 1.25, 2.52, 1.82, { id: 'chalk', dir: 'x', s: 0.7 })
    ]
  }),
  items: [
    { id: 'cup', k: 'cup', hot: 'cup', on: 'table', x: 3.35, y: 3.75, fill: 'residue' },
    { id: 'cup2', k: 'cup', hot: 'cup2', on: 'table', x: 4.7, y: 3.75, fill: 'residue' }
  ]
});

const LOBBY = makeSpace('lobby', {
  id: 'lobby', seed: 3, theme: 0, time: 'night', fill: 0,
  doors: [{ slot: 'RC', to: 'living', kind: 'door' }, { slot: 'LB', to: 'basement', kind: 'door' }],
  lay: () => ({
    fixed: true,
    R: [WP('desk', 3.2, 1.3, { h: 17, id: 'desk' }), WP('plant', 0.9, 0.9)],
    L: [WP('sofa', 2.6, 1.1), WP('plant', 0.9, 0.9)],
    free: [OBJ('cat', 4.4, 3.6, 0.8, 0.8)]
  }),
  items: [
    { id: 'ledger', k: 'ledger', hot: 'ledger', on: 'desk', x: 0.85, y: 0.65 },
    { id: 'monitor', k: 'monitor', hot: 'monitor', on: 'desk', x: 1.95, y: 0.62 },
    { id: 'file', k: 'papers', hot: 'file', on: 'desk', x: 3.0, y: 0.85, cover: 'blue' }
  ]
});

const BASEMENT = makeSpace('basement', {
  id: 'basement', seed: 5, theme: 0, time: 'night', fill: 0,
  doors: [{ slot: 'LC', to: 'lobby', kind: 'door' }],
  lay: () => ({
    fixed: true,
    R: [WP('workbench', 2.6, 1.1, { id: 'workbench', bare: true }), WP('shelfunit', 2.0, 0.8, { h: 46 }), WP('boiler', 1.6, 1.6)],
    L: [WP('shelfunit', 2.4, 0.8, { h: 46 })],
    free: [OBJ('crates', 4.0, 4.4, 1.5, 1.5), OBJ('barrel', 6.4, 5.0, 1.2, 1.2, { h: 20 }), OBJ('boxes', 2.6, 5.6, 1.2, 1.2)]
  }),
  items: [
    { id: 'meter', k: 'meter', hot: 'meter', on: 'workbench', x: 0.95, y: 0.55 },
    { id: 'camscreen', k: 'monitor', hot: 'monitor', on: 'workbench', x: 2.0, y: 0.6 }
  ]
});

const ROOMS = { living: LIVING, lobby: LOBBY, basement: BASEMENT };

/* ============================================================
   Case 2 : "Monday, 9 a.m."  (monday-nine)

   Structure only (see case 1 for the idea). This case is built from
   BOARDS: each board is a few documents and one question, and answering
   it earns one fact. `eliminates` on a fact is the logic the linter checks
   against the structured truth below (who is verifiably where, who has a fob,
   how tall everyone is ...), so the story cannot contradict itself.

   TRUTH (Saturday night):
     18:55-19:25  Sofia visits Priya about the Monday signing and leaves.
     19:41        Noor leaves for her night shift (fob out).
     20:35        Daniel and Sofia check in at Hotel Lyra (reception camera sees both). 60 min by car.
     20:50        Daniel slips out alone; his phone and key card stay in the room.
     21:53        Priya buzzes in a visitor from the intercom. 21:56 two cups of tea. 22:04 she dies; the lamp cord is pulled.
     22:10        In the hotel bar Sofia pays the tab with Daniel's card, as he asked.
     22:21        The visitor leaves with a roll of papers. 23:24 Daniel's key card opens his hotel room.
   ============================================================ */

const CASE = {
  id: 'monday-nine', no: 2, slug: 'monday-nine',
  difficulty: 2, minutes: 25, dayStart: '18:00',
  intro: 3, sceneRoom: 'living',

  victim: { portrait: { skin: '#c99a78', hair: '#2a1d1f', style: 'bun', shirt: '#a85a4a', collar: '#e8d8c0', extra: 'paint' } },

  suspects: [
    {
      id: 'daniel', height: 188, fob: false,
      portrait: { skin: '#e3b997', hair: '#4a3a30', style: 'short', shirt: '#4a5a6a', collar: '#e8e4d8', mustache: '#4a3a30' },
      /* every proof of where he was, and whether it is a PERSON seen or only a THING (card, phone, key) */
      proofs: [
        { at: '20:35', kind: 'person', src: 'reception camera' }, { at: '20:41', kind: 'thing', src: 'key card' },
        { at: '22:10', kind: 'thing', src: 'card receipt' }, { at: '22:00-07:00', kind: 'thing', src: 'phone mast' },
        { at: '23:24', kind: 'thing', src: 'key card' }, { at: '07:20', kind: 'person', src: 'breakfast camera' }
      ]
    },
    {
      id: 'sofia', height: 160, fob: false,
      portrait: { skin: '#e8c4a6', hair: '#6a2e2e', style: 'long', shirt: '#6aa86a', collar: '#f0ead8' },
      proofs: [{ at: '20:35', kind: 'person', src: 'reception camera' }, { at: '22:10', kind: 'person', src: 'bar camera' }]
    },
    {
      id: 'noor', height: 165, fob: true,
      portrait: { skin: '#b9825a', hair: '#1f1a1c', style: 'bun', shirt: '#5fb3b0', collar: '#e8f3f2' },
      proofs: []
    },
    {
      id: 'mateo', height: 182, fob: true,
      portrait: { skin: '#c8936c', hair: '#2a2024', style: 'cap', cap: '#3a5d8a', mustache: '#2a2024', shirt: '#d98a2b', collar: '#b9701c' },
      proofs: [{ at: '21:40', kind: 'person', src: 'basement camera' }, { at: '22:04', kind: 'person', src: 'basement camera' }, { at: '22:20', kind: 'person', src: 'basement camera' }]
    }
  ],

  /* ----- the numbers the boards must agree with (tests/lint.mjs recomputes every answer from these) ----- */
  truth: { window: ['21:50', '22:15'], trip: '22:04', visitorHeight: [180, 190], drive: 60, hotel: { out: '20:50', back: '23:24' } },

  /* ----- the living room at three moments (patches over the 07:52 scene) ----- */
  moments: [
    {
      id: 'sofia', time: '19:10', who: 'sofia',
      patches: [
        { env: { time: 'night' } }, { id: 'chalk', remove: true }, { id: 'floorlamp', set: { lit: true } }, { id: 'slippers', set: { pose: 'tidy' } },
        { id: 'cup2', remove: true }, { id: 'cup', set: { fill: 'tea' } },
        { add: { id: 'papers', k: 'papers', hot: 'papers', on: 'table', x: 4.0, y: 3.65 }, item: true }
      ]
    },
    {
      id: 'noor', time: '19:35', who: 'noor',
      patches: [
        { env: { time: 'night' } }, { id: 'chalk', remove: true }, { id: 'floorlamp', set: { lit: true } }, { id: 'slippers', set: { pose: 'tidy' } },
        { id: 'cup2', remove: true },
        { add: { id: 'papers', k: 'papers', hot: 'papers', on: 'table', x: 4.0, y: 3.65 }, item: true }
      ]
    },
    { id: 'scene', time: '07:52', who: null, patches: [] }
  ],

  /* ----- puzzle 1: what changed between Noor's visit and the morning ----- */
  diff: { a: 'noor', b: 'scene', need: 3, ignore: ['chalk'], items: ['floorlamp', 'slippers', 'cup2', 'papers'], notes: ['chalk'] },

  herring: { suspect: 'sofia', motive: 'jealousy' },

  /* ----- the boards ----- */
  boards: {
    window: {
      fact: 'window', question: { kind: 'choice', options: ['early', 'evening', 'late', 'dawn'], answer: 'evening' },
      docs: {
        meter: { cols: 3, rows: [
          [{ t: '18:55' }, { k: 'circ.lights' }, { k: 'ev.on' }],
          [{ t: '19:12' }, { k: 'circ.kettle' }, { k: 'ev.kettle1' }],
          [{ t: '21:56' }, { k: 'circ.kettle' }, { k: 'ev.kettle3' }],
          [{ t: '21:59' }, { k: 'circ.tv' }, { k: 'ev.off' }],
          [{ t: '22:04' }, { k: 'circ.lamp' }, { k: 'ev.short' }],
          [{ t: '07:52' }, { k: 'circ.hall' }, { k: 'ev.on' }]
        ] }
      }
    },
    buzz: {
      fact: 'buzz', question: { kind: 'many', answer: ['sofia', 'daniel'] }, truth: (s) => !s.fob, elim: 'unselected',
      docs: {
        visitors: { cols: 3, rows: [[{ k: 'who.courier' }, { t: '17:40' }, { t: '17:46' }], [{ s: 'sofia' }, { t: '18:55' }, { t: '19:25' }]] },
        doors: { cols: 3, rows: [
          [{ t: '19:41' }, { k: 'ev.fobout' }, { k: 'who.noor' }],
          [{ t: '21:36' }, { k: 'ev.fobbase' }, { k: 'who.mateo' }],
          [{ t: '21:53' }, { k: 'ev.buzzed' }, { k: 'who.none' }],
          [{ t: '22:21' }, { k: 'ev.exit' }, { k: 'who.none' }],
          [{ t: '06:38' }, { k: 'ev.fobin' }, { k: 'who.noor' }],
          [{ t: '07:52' }, { k: 'ev.fobin' }, { k: 'who.mateo' }]
        ] }
      }
    },
    figure: {
      fact: 'figure', question: { kind: 'many', answer: ['mateo', 'daniel'] }, truth: (s, V) => s.height >= V.visitorHeight[0] && s.height <= V.visitorHeight[1], elim: 'unselected',
      docs: {
        camera: { frames: [
          { t: '21:51', spec: { scene: 'lobby', ruler: true, figs: [{ who: 'x', x: 8, h: 37, hood: true, hold: 'umbrella' }] } },
          { t: '21:53', spec: { scene: 'lobby', ruler: true, figs: [{ who: 'x', x: 38, h: 37, hood: true, hold: 'umbrella' }] } },
          { t: '21:55', spec: { scene: 'lobby', ruler: true, figs: [{ who: 'x', x: 70, h: 37, hood: true }] } },
          { t: '22:21', spec: { scene: 'lobby', ruler: true, figs: [{ who: 'x', x: 38, h: 37, hood: true, hold: 'tube', flip: true }] } }
        ] },
        heights: { cols: 2, rows: [[{ s: 'daniel' }, '188'], [{ s: 'mateo' }, '182'], [{ s: 'noor' }, '165'], [{ s: 'sofia' }, '160']] }
      }
    },
    boiler: {
      fact: 'boiler', question: { kind: 'one', answer: 'mateo' }, truth: (s, V) => s.proofs.some((p) => p.kind === 'person' && p.at === V.trip && /basement/.test(p.src)), elim: 'selected',
      docs: {
        camera: { frames: [
          { t: '21:40', spec: { scene: 'basement', figs: [{ who: 'mateo', x: 30, h: 36, hold: 'wrench' }] } },
          { t: '22:04', spec: { scene: 'basement', figs: [{ who: 'mateo', x: 38, h: 36, hold: 'wrench', flip: true }] } },
          { t: '22:20', spec: { scene: 'basement', figs: [{ who: 'mateo', x: 42, h: 36 }] } }
        ] },
        sheet: { cols: 2, rows: [[{ k: 'sheet.job' }, { k: 'sheet.jobv' }], [{ k: 'sheet.start' }, { t: '21:38' }], [{ k: 'sheet.end' }, { t: '22:35' }], [{ k: 'sheet.sign' }, { s: 'mateo' }]] }
      }
    },
    bar: {
      fact: 'bar', question: { kind: 'one', answer: 'sofia' }, truth: (s) => s.proofs.some((p) => p.kind === 'person' && /bar/.test(p.src)), elim: 'selected',
      docs: {
        camera: { frames: [
          { t: '20:35', spec: { scene: 'reception', figs: [{ who: 'daniel', x: 18, h: 38 }, { who: 'sofia', x: 36, h: 32, flip: true }] } },
          { t: '22:10', spec: { scene: 'bar', figs: [{ who: 'sofia', x: 40, h: 32, hold: 'card', flip: true }, { who: 'x', x: 70, h: 35 }] } },
          { t: '07:20', spec: { scene: 'dining', figs: [{ who: 'daniel', x: 34, h: 38 }] } }
        ] },
        records: { cols: 3, rows: [
          [{ t: '20:41' }, { k: 'rec.open' }, { k: 'src.key' }],
          [{ t: '22:10' }, { k: 'rec.tab' }, { k: 'src.receipt' }],
          [{ t: '22:00' }, { k: 'rec.phone' }, { k: 'src.mast' }],
          [{ t: '23:24' }, { k: 'rec.open' }, { k: 'src.key' }],
          [{ t: '06:55' }, { k: 'rec.open' }, { k: 'src.key' }]
        ] }
      }
    }
  },
  /* the puzzle layer: the basement is locked until its key is found, and a code drawer holds an optional extra fact */
  items: { basementkey: {} },
  finds: { 'lobby:rug': { give: 'basementkey' } },
  gates: { 'lobby:basement': { need: 'basementkey' } },
  containers: { 'living:tvunit': { kind: 'keypad', code: '734', fact: 'pledge', clue: 'basement:shelfunit' } },
  /* which thing opens which board */
  bind: { 'basement:meter': 'window', 'lobby:ledger': 'buzz', 'lobby:monitor': 'figure', 'basement:monitor': 'boiler', 'lobby:file': 'bar' },

  /* ----- facts. `eliminates` is checked by tests/lint.mjs against the truth above ----- */
  facts: {
    changed: { required: true, eliminates: [] },
    window: { required: true, eliminates: [] },
    buzz: { required: true, eliminates: ['mateo', 'noor'] },
    figure: { required: true, eliminates: ['sofia', 'noor'] },
    boiler: { required: true, eliminates: ['mateo'] },
    bar: { required: true, eliminates: ['sofia'] },
    guest: { required: false, eliminates: [] },
    pledge: { required: false, eliminates: [] }
  },
  observe: { cup2: { fact: 'guest' } },

  accuse: {
    who: { culprit: 'daniel', options: [{ id: 'daniel' }, { id: 'sofia', refutedBy: 'bar' }, { id: 'noor', refutedBy: 'buzz' }, { id: 'mateo', refutedBy: 'boiler' }] },
    how: { culprit: 'guest', options: [{ id: 'guest' }, { id: 'burglar', refutedBy: 'changed' }, { id: 'fall', refutedBy: 'figure' }] },
    why: { culprit: 'deadline', options: [{ id: 'deadline' }, { id: 'jealousy', refutedBy: 'changed' }, { id: 'lease', refutedBy: 'buzz' }] }
  },

  verdict: { truth: 7, next: { no: 3 } },

  rooms: ['living', 'lobby', 'basement'],
  map: { start: 'living', nodes: [{ id: 'living', x: 0, y: 0 }, { id: 'lobby', x: 1, y: 0 }, { id: 'basement', x: 2, y: 0 }], edges: [['living', 'lobby'], ['lobby', 'basement']] },
  hots: {
    living: ['chalk', 'rug', 'window', 'door:lobby', 'bookshelf', 'tvunit', 'tv', 'plant', 'sofa', 'floorlamp', 'slippers', 'table', 'cup', 'cup2', 'papers', 'chair'],
    lobby: ['rug', 'window', 'door:living', 'door:basement', 'sofa', 'desk', 'ledger', 'monitor', 'file', 'plant', 'cat'],
    basement: ['picture', 'door:lobby', 'vent', 'shelfunit', 'workbench', 'meter', 'monitor', 'boiler', 'boxes', 'crates', 'barrel']
  },

  hints: [
    { when: (f) => !f.changed },
    { when: (f) => !f.window },
    { when: (f) => !f.buzz },
    { when: (f) => !f.figure },
    { when: (f) => !f.boiler },
    { when: (f) => !f.bar },
    { when: () => true }
  ]
};
