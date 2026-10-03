'use strict';
/* ============================================================
   Case 2 rooms (version 2), built from the space kit.
   Court (Orange Grove Court): the living room of Apartment 7 is the BASE scene as the caretaker found it at 07:52; moments are patches over it.
   HQ: the detective's office and the interview room. Hotel: the Lyra's lobby and bar, the second-floor corridor, room 214.
   ============================================================ */

const LIVING = makeSpace('living', {
  id: 'living', seed: 7, theme: 1, time: 'auto', fill: 0,
  doors: [{ slot: 'LC', to: 'lobby', kind: 'door' }],
  lay: () => ({
    fixed: true,
    R: [WP('bookshelf', 1.8, 0.6, { h: 42, id: 'shelf', surface: true }), WP('sofa', 3.0, 1.2), WP('floorlamp', 0.6, 0.6, { id: 'floorlamp' })],
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
    { id: 'cup', k: 'cup', hot: 'cup', on: 'table', x: 3.3, y: 3.85, fill: 'residue' },
    { id: 'cup2', k: 'cup', hot: 'cup2', on: 'table', x: 4.7, y: 3.85, fill: 'residue' },
    { id: 'magnifier', k: 'magnifier', hot: 'magnifier', on: 'table', x: 3.8, y: 3.45 },
    { id: 'cornertable', k: 'scuff', hot: 'cornertable', on: 'table', x: 4.7, y: 3.45 },
    { id: 'tiles', k: 'tiles', hot: 'tiles', on: 'shelf', x: 1.15, y: 0.3 }
  ]
});

const LOBBY = makeSpace('lobby', {
  id: 'lobby', seed: 3, theme: 0, time: 'night', fill: 0,
  doors: [{ slot: 'RC', to: 'living', kind: 'door' }, { slot: 'LB', to: 'basement', kind: 'door' }],
  wallItems: [{ wall: 'R', name: 'doormarks', u0: 4.4, u1: 5.8, z0: 26, z1: 46, paint: 'doormarks' }],
  lay: () => ({
    fixed: true,
    R: [WP('desk', 3.2, 1.3, { h: 17, id: 'desk' }), WP('plant', 0.9, 0.9)],
    L: [WP('sofa', 2.6, 1.1), WP('plant', 0.9, 0.9)],
    free: [OBJ('cat', 4.4, 3.6, 0.8, 0.8), OBJ('bin', 6.6, 2.2, 0.7, 0.7)]
  }),
  items: [
    { id: 'doorcontroller', k: 'meter', hot: 'doorcontroller', on: 'desk', x: 0.85, y: 0.65 },
    { id: 'monitor', k: 'monitor', hot: 'monitor', on: 'desk', x: 1.95, y: 0.62 }
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

/* ---------- police headquarters ---------- */
const HQ = makeSpace('office', {
  id: 'hq', seed: 51, theme: 2, time: 'night', fill: 0,
  doors: [{ slot: 'LC', to: 'interrog', kind: 'door' }],
  wallItems: [
    { wall: 'L', name: 'corkboard', u0: 1.4, u1: 4.9, z0: 22, z1: 48, paint: 'corkboard' },
    { wall: 'R', name: 'board', u0: 4.8, u1: 7.7, z0: 28, z1: 36, paint: 'timestrip' }
  ],
  lay: () => ({
    fixed: true,
    R: [WP('desk', 3.2, 1.3, { h: 17, id: 'desk' }), WP('cabinet', 0.9, 0.9)],
    L: [WP('plant', 0.9, 0.9)],
    free: [OBJ('cat', 4.4, 4.4, 0.8, 0.8)]
  }),
  items: [{ id: 'phone', k: 'phone', hot: 'phone', on: 'desk', x: 1.6, y: 0.7 }]
});
const INTERROG = makeSpace('office', {
  id: 'interrog', seed: 53, theme: 1, time: 'night', fill: 0, size: [7, 6], windows: false,
  doors: [{ slot: 'RC', to: 'hq', kind: 'door' }],
  wallItems: [{ wall: 'L', name: 'glass', u0: 1.0, u1: 4.2, z0: 22, z1: 46, paint: 'mirror' }],
  lay: () => ({
    fixed: true, R: [], L: [],
    free: [OBJ('table', 2.6, 2.2, 2.0, 1.1, { id: 'table' }), OBJ('chair', 2.9, 1.45, 0.55, 0.55, { back: 'y', id: 'chair1' }), OBJ('chair', 3.9, 3.5, 0.55, 0.55, { back: 'Y', id: 'chair2' })]
  }),
  items: [{ id: 'recorder', k: 'recorder', hot: 'recorder', on: 'table', x: 3.6, y: 2.75 }]
});

/* ---------- the Hotel Lyra ---------- */
const HLOBBY = makeSpace('lobby', {
  id: 'hlobby', seed: 55, theme: 2, time: 'night', fill: 0,
  doors: [{ slot: 'LC', to: 'hcorr', kind: 'door' }],
  wallItems: [{ wall: 'R', name: 'office', u0: 6.0, u1: 7.4, z0: 0, z1: 42, paint: 'staffdoor' }],
  lay: () => ({
    fixed: true,
    R: [WP('barcounter', 4.4, 0.9, { id: 'bar', hot: 'bar' }), WP('plant', 0.9, 0.9)],
    L: [WP('desk', 3.0, 1.3, { h: 17, id: 'desk' }), WP('rack', 1.4, 0.5, { id: 'rack' })],
    free: [OBJ('stool', 1.0, 1.4, 0.6, 0.6), OBJ('stool', 2.0, 1.4, 0.6, 0.6), OBJ('stool', 3.0, 1.4, 0.6, 0.6)]
  }),
  items: [
    { id: 'monitor', k: 'monitor', hot: 'monitor', on: 'desk', x: 0.6, y: 1.0 },
    { id: 'till', k: 'ledger', hot: 'till', on: 'desk', x: 0.6, y: 2.2 }
  ]
});
const HCORR = makeSpace('hallway', {
  id: 'hcorr', seed: 57, theme: 2, time: 'night', fill: 0,
  doors: [{ slot: 'RC', to: 'hlobby', kind: 'door' }, { slot: 'RA', to: 'room214', kind: 'door' }],
  wallItems: [
    { wall: 'R', name: 'plan', u0: 3.3, u1: 5.1, z0: 22, z1: 46, paint: 'plan' },
    { wall: 'L', name: 'sidedoor', u0: 3.4, u1: 5.0, z0: 0, z1: 42, paint: 'firedoor' },
    { wall: 'L', name: 'door212', u0: 0.8, u1: 2.4, z0: 0, z1: 42, paint: 'door', args: [false] }
  ],
  lay: () => ({ fixed: true, R: [], L: [], free: [OBJ('plant', 0.8, 4.6, 0.9, 0.9)] }),
  items: []
});
const ROOM214 = makeSpace('bedroom', {
  id: 'room214', seed: 59, theme: 0, time: 'night', fill: 0,
  doors: [{ slot: 'LC', to: 'hcorr', kind: 'door' }],
  lay: () => ({
    fixed: true, R: [], L: [],
    free: [
      OBJ('bed', 5.0, 0, 2.6, 4.3, { id: 'bed' }),
      OBJ('nightstand', 3.2, 0, 1.7, 1.4, { h: 15, id: 'nightstand' }),
      OBJ('tvunit', 0, 0.9, 1.0, 2.2, { face: 'x', id: 'tvunit' }),
      OBJ('table', 1.0, 4.4, 2.0, 1.1, { id: 'desk' }),
      OBJ('bin', 6.4, 5.4, 0.7, 0.7, { id: 'wastebin' })
    ]
  }),
  items: [
    { id: 'phone', k: 'phone', hot: 'phone', on: 'nightstand', x: 3.9, y: 0.7, on_: false },
    { id: 'gazette', k: 'papers', hot: 'gazette', on: 'desk', x: 1.8, y: 4.9 }
  ]
});

const ROOMS = { living: LIVING, lobby: LOBBY, basement: BASEMENT, hq: HQ, interrog: INTERROG, hlobby: HLOBBY, hcorr: HCORR, room214: ROOM214 };

/* ============================================================
   Case 2 : "Monday, 9 a.m."  (monday-nine), version 2

   Built from BOARDS and the engine-v2 primitives (needs, locks with lockout, interviews, a confrontation, place groups, a camera clock).
   `eliminates` on a fact is the logic the linter checks against the structured truth below
   (heights and footwear, fobs, the drive, the camera's clock offset ...), so the story cannot contradict itself.

   TRUTH (Saturday night):
     17:40  A bank courier brings Priya an envelope from the Guarantee Department; 17:44 she opens it at her door and goes white.
     18:55-19:25  Sofia (very high heels) visits Priya about the settlement and leaves; in the car she mentions the bank envelope to Daniel.
     19:30  Noor knocks about the kiln; Priya is comparing two signatures with a magnifier. 19:41 Noor leaves for her shift.
     20:35  Daniel and Sofia check in at Hotel Lyra (reception camera sees both). 60 min by car each way.
     20:50  Daniel leaves by the side door (no camera); phone and film stay in room 214.
     21:30  Sofia sits at the bar with two drinks, as he asked; at 22:10 she pays with his card.
     21:53  Priya buzzes in a visitor (the lobby camera stamps 21:47: it runs 6 minutes slow). 21:56 tea for two.
     22:04  An argument, a push; the lamp cord is pulled and the circuit trips. Mateo is on camera 2 at the boiler.
     22:21  The visitor leaves with the folder (lobby camera stamps 22:15), a soaked page of the Lyra Gazette dropped in the bin.
     23:22  Daniel comes back by the side door. 23:24 his key card opens room 214. 07:20 breakfast on camera.
   ============================================================ */

const CASE = {
  id: 'monday-nine', no: 2, slug: 'monday-nine',
  difficulty: 2, minutes: 30, dayStart: '18:00',
  intro: 3, sceneRoom: 'living',

  victim: { portrait: { skin: '#c99a78', hair: '#2a1d1f', style: 'bun', shirt: '#a85a4a', collar: '#e8d8c0', extra: 'paint' } },

  suspects: [
    {
      id: 'daniel', height: 188, shoe: 2, fob: false,
      portrait: { skin: '#e3b997', hair: '#4a3a30', style: 'short', shirt: '#4a5a6a', collar: '#e8e4d8', mustache: '#4a3a30', extra: 'openCollar' },
      /* every proof of where he was, and whether it is a PERSON seen or only a THING (card, phone, receipt, film) */
      proofs: [
        { at: '20:35', kind: 'person', src: 'reception camera' }, { at: '20:41', kind: 'thing', src: 'key card' }, { at: '20:48', kind: 'thing', src: 'tv system' },
        { at: '22:10', kind: 'thing', src: 'card receipt' }, { at: '22:00-07:00', kind: 'thing', src: 'phone mast' },
        { at: '23:24', kind: 'thing', src: 'key card' }, { at: '07:20', kind: 'person', src: 'breakfast camera' }
      ]
    },
    {
      id: 'sofia', height: 170, shoe: 12, fob: false,
      portrait: { skin: '#e8c4a6', hair: '#6a2e2e', style: 'long', shirt: '#6aa86a', collar: '#f0ead8', extra: 'coat' },
      proofs: [{ at: '20:35', kind: 'person', src: 'reception camera' }, { at: '21:35', kind: 'person', src: 'bar camera' }, { at: '22:10', kind: 'person', src: 'bar camera' }]
    },
    {
      id: 'noor', height: 165, shoe: 2, fob: true,
      portrait: { skin: '#b9825a', hair: '#1f1a1c', style: 'bun', shirt: '#5fb3b0', collar: '#e8f3f2', extra: 'scrubs' },
      proofs: []
    },
    {
      id: 'mateo', height: 182, shoe: 2, fob: true,
      portrait: { skin: '#c8936c', hair: '#2a2024', style: 'cap', cap: '#3a5d8a', mustache: '#2a2024', shirt: '#d98a2b', collar: '#b9701c', extra: 'hankie' },
      proofs: [{ at: '21:40', kind: 'person', src: 'basement camera' }, { at: '22:04', kind: 'person', src: 'basement camera' }, { at: '22:20', kind: 'person', src: 'basement camera' }]
    }
  ],
  people: { barman: { portrait: { skin: '#d9a07c', hair: '#4a3a30', style: 'short', shirt: '#2a3a5a', collar: '#e8e4d8', extra: 'apron' } } },

  /* ----- the numbers the boards must agree with (tests/checks/monday-nine.mjs and tests/lint-boards.mjs recompute every answer from these) ----- */
  truth: {
    window: ['21:50', '22:15'], trip: '22:04', visitorHeight: [180, 190], drive: 60, hotel: { out: '20:50', back: '23:22' },
    enter: '21:53', exit: '22:21', stay: 28,
    calibration: { board: 'leave', stamp: '21:47', log: '21:53', exitStamp: '22:15', exit: '22:21' },
    kiln: { cones: [['red', '06', 'square'], ['yellow', '04', 'circle'], ['green', '6', 'triangle'], ['blue', '10', 'star']], decoy: ['black', 'cross'] }
  },
  herring: { suspect: 'sofia', motive: 'jealousy' },
  lint: {
    oneProofOk: ['sofia'], h24: true, maxElim: 2,
    order: ['changed', 'window', 'buzz', 'figure', 'boiler', 'leave', 'paper', 'bar'], matrix: [4, 4, 2, 2, 2, 2, 2, 1]
  },

  /* ----- the living room at three moments (patches over the 07:52 scene) ----- */
  moments: [
    {
      id: 'sofia', time: '19:10', who: 'sofia',
      patches: [
        { env: { time: 'night' } }, { id: 'chalk', remove: true }, { id: 'floorlamp', set: { lit: true } }, { id: 'slippers', set: { pose: 'tidy' } },
        { id: 'cup2', remove: true }, { id: 'cup', set: { fill: 'tea' } },
        { add: { id: 'papers', k: 'papers', hot: 'papers', on: 'table', x: 4.2, y: 3.72 }, item: true }
      ]
    },
    {
      id: 'noor', time: '19:30', who: 'noor',
      patches: [
        { env: { time: 'night' } }, { id: 'chalk', remove: true }, { id: 'floorlamp', set: { lit: true } }, { id: 'slippers', set: { pose: 'tidy' } },
        { id: 'cup2', remove: true },
        { add: { id: 'papers', k: 'papers', hot: 'papers', on: 'table', x: 4.15, y: 3.72, pair: true }, item: true }
      ]
    },
    { id: 'scene', time: '07:52', who: null, patches: [] }
  ],

  /* ----- puzzle 1: what changed between Noor's visit and the morning ----- */
  diff: { a: 'noor', b: 'scene', need: 3, ignore: ['chalk'], items: ['floorlamp', 'slippers', 'cup2', 'papers'], notes: ['chalk'] },

  boards: {
    /* ---- the meter ---- */
    window: {
      fact: 'window', question: { kind: 'choice', options: ['early', 'evening', 'late', 'dawn'], answer: 'evening' },
      docs: {
        meter: { cols: 3, rows: [
          [{ t: '18:55' }, { k: 'circ.lights' }, { k: 'ev.on' }],
          [{ t: '19:12' }, { k: 'circ.kettle' }, { k: 'ev.kettle2' }],
          [{ t: '20:14' }, { k: 'circ.tv' }, { k: 'ev.onwall' }],
          [{ t: '21:56' }, { k: 'circ.kettle' }, { k: 'ev.kettle3' }],
          [{ t: '21:59' }, { k: 'circ.tv' }, { k: 'ev.offwall' }],
          [{ t: '22:04' }, { k: 'circ.lamp' }, { k: 'ev.short' }],
          [{ t: '07:52' }, { k: 'circ.hall' }, { k: 'ev.on' }]
        ] }
      }
    },
    /* ---- the door controller (a time lock opens it) ---- */
    buzz: {
      fact: 'buzz', question: { kind: 'many', answer: ['sofia', 'daniel'] }, truth: (s) => !s.fob, elim: 'unselected',
      docs: {
        visitors: { cols: 4, rows: [
          [{ k: 'who.courier' }, { t: '17:40' }, { t: '17:46' }, { k: 'rem.courier' }],
          [{ s: 'sofia' }, { t: '18:55' }, { t: '19:25' }, { k: 'rem.sofia' }]
        ] },
        doors: { cols: 3, rows: [
          [{ t: '19:41' }, { k: 'ev.fobout' }, { k: 'fob.noor' }],
          [{ t: '21:36' }, { k: 'ev.fobbase' }, { k: 'fob.mateo' }],
          [{ t: '21:53' }, { k: 'ev.buzzed' }, { k: 'fob.none' }],
          [{ t: '22:21' }, { k: 'ev.exit' }, { k: 'fob.none' }],
          [{ t: '06:38' }, { k: 'ev.fobin' }, { k: 'fob.noor' }],
          [{ t: '07:52' }, { k: 'ev.fobin' }, { k: 'fob.mateo' }]
        ] }
      }
    },
    /* ---- the lobby camera, six minutes slow ---- */
    leave: {
      fact: 'leave', question: { kind: 'choice', options: ['cam', 'back', 'real', 'over'], answer: 'real' },
      docs: {
        camera: { clock: { offsetMin: -6 }, frames: [
          { t: '21:44', spec: { scene: 'lobby', ruler: false, figs: [{ who: 'x', x: 10, h: 37, hood: true, hold: 'page' }] } },
          { t: '21:47', spec: { scene: 'lobby', blink: true, figs: [{ who: 'x', x: 38, h: 37, hood: true, hold: 'crumple' }] } },
          { t: '21:49', spec: { scene: 'lobby', bin: true, drop: true, figs: [{ who: 'x', x: 22, h: 37, hood: true }] } },
          { t: '22:15', spec: { scene: 'lobby', figs: [{ who: 'x', x: 38, h: 37, hood: true, hold: 'tube', flip: true }] } }
        ] },
        log: { cols: 3, rows: [
          [{ t: '21:53' }, { k: 'ev.buzzed' }, { k: 'fob.none' }],
          [{ t: '22:21' }, { k: 'ev.exit' }, { k: 'fob.none' }]
        ] }
      }
    },
    /* ---- the height marks ---- */
    figure: {
      fact: 'figure', question: { kind: 'many', answer: ['sofia', 'daniel', 'mateo'] }, truth: (s, V) => s.height + s.shoe >= V.visitorHeight[0] && s.height + s.shoe <= V.visitorHeight[1], elim: 'unselected',
      docs: {
        marks: { frames: [{ t: '21:55', spec: { scene: 'lobby', ruler: true, figs: [{ who: 'x', x: 70, h: 37, hood: true }] } }] },
        heights: { cols: 2, rows: [[{ s: 'daniel' }, '188'], [{ s: 'mateo' }, '182'], [{ s: 'sofia' }, '170'], [{ s: 'noor' }, '165']] }
      }
    },
    /* ---- the basement camera ---- */
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
    /* ---- the soaked page in the lobby bin ---- */
    paper: {
      fact: 'paper', question: { kind: 'choice', options: ['resident', 'guest', 'shop', 'bank'], answer: 'guest' },
      docs: {
        soaked: { frames: [{ t: '', spec: { scene: 'gazette', figs: [] } }] },
        back: { frames: [{ t: '', spec: { scene: 'gazette', back: true, figs: [] } }] }
      }
    },
    /* ---- the hotel: who paid at the bar ---- */
    bar: {
      fact: 'bar', question: { kind: 'one', answer: 'sofia' }, truth: (s) => s.proofs.some((p) => p.kind === 'person' && /bar/.test(p.src)), elim: 'selected',
      docs: {
        cameras: { frames: [
          { t: '20:35', spec: { scene: 'reception', figs: [{ who: 'daniel', x: 18, h: 38 }, { who: 'sofia', x: 36, h: 32, flip: true }] } },
          { t: '21:35', spec: { scene: 'bar', figs: [{ who: 'sofia', x: 40, h: 32, flip: true }] } },
          { t: '22:10', spec: { scene: 'bar', figs: [{ who: 'sofia', x: 40, h: 32, hold: 'card', flip: true }, { who: 'barman', x: 70, h: 35 }] } },
          { t: '07:20', spec: { scene: 'dining', figs: [{ who: 'daniel', x: 34, h: 38 }] } }
        ] },
        records: { cols: 3, rows: [
          [{ t: '20:41' }, { k: 'rec.open214' }, { k: 'src.key' }],
          [{ t: '20:48' }, { k: 'rec.filmstart' }, { k: 'src.tv' }],
          [{ t: '22:00' }, { k: 'rec.mast' }, { k: 'src.mast' }],
          [{ t: '22:10' }, { k: 'rec.tab' }, { k: 'src.receipt' }],
          [{ t: '22:34' }, { k: 'rec.filmend' }, { k: 'src.tv' }],
          [{ t: '23:24' }, { k: 'rec.open214' }, { k: 'src.key' }],
          [{ t: '06:55' }, { k: 'rec.open214' }, { k: 'src.key' }]
        ] }
      }
    },
    /* ---- the corridor plan: the side door ---- */
    door: {
      fact: 'door', question: { kind: 'choice', options: ['main', 'terrace', 'side', 'lift'], answer: 'side' },
      docs: {
        plan: { cols: 4, rows: [
          [{ k: 'ex.main' }, { k: 'exd.main' }, { k: 'cam.reception' }, { k: 'op.free' }],
          [{ k: 'ex.terrace' }, { k: 'exd.terrace' }, { k: 'cam.bar' }, { k: 'op.free' }],
          [{ k: 'ex.side' }, { k: 'exd.side' }, { k: 'cam.none' }, { k: 'op.inside' }],
          [{ k: 'ex.lift' }, { k: 'exd.lift' }, { k: 'cam.none' }, { k: 'op.card' }]
        ] },
        sensors: { cols: 2, rows: [[{ t: '20:50' }, { k: 'sn.open' }], [{ t: '23:22' }, { k: 'sn.open' }], [{ k: 'sn.tonight' }, { k: 'sn.lift' }]] }
      }
    },
    /* ---- the timeline strip ---- */
    timing: {
      fact: 'timing', question: { kind: 'choice', options: ['zero', 'thirtytwo', 'ninetytwo', 'all'], answer: 'thirtytwo' },
      docs: {
        sensor: { cols: 2, rows: [[{ t: '20:50' }, { k: 'sn.open' }], [{ t: '23:22' }, { k: 'sn.open' }]] },
        stay: { cols: 3, rows: [[{ t: '21:53' }, { k: 'ev.buzzed' }, { k: 'fob.none' }], [{ t: '22:21' }, { k: 'ev.exit' }, { k: 'fob.none' }]] }
      }
    },
    /* ---- the torn page (a jigsaw) ---- */
    torn: {
      fact: 'torn', question: { kind: 'choice', options: ['yes', 'no'], answer: 'yes' },
      docs: { page: { jigsaw: { piece: [4, 1, 3, 0, 4], stub: [2, 5, 3, 6, 2], rotation: 90, start: [22, -18] } } }
    },
    /* ---- the two signatures (spot the difference) ---- */
    signature: {
      fact: 'signature', question: { kind: 'spot' },
      docs: {
        sigs: { spot: { a: 'sample', b: 'guarantee', need: 3, diffs: [{ id: 'leg', x: 30, y: 16, w: 20, h: 18 }, { id: 'dot', x: 72, y: 9, w: 6, h: 9 }, { id: 'pen', x: 4, y: 6, w: 18, h: 26 }, { id: 'stamp', x: 80, y: 2, w: 12, h: 12 }] } }
      }
    },
    /* ---- things to read (no question) ---- */
    tiles: {
      fact: null, question: { kind: 'none' },
      docs: { tiles: { frames: [0, 1, 2, 3, 4].map((i) => ({ t: String(i + 1), spec: { scene: 'tiles', tile: i, figs: [] } })) } }
    },
    kiln: {
      fact: null, question: { kind: 'none' },
      docs: { chart: { cols: 2, rows: [[{ k: 'gl.red' }, { t: '06' }], [{ k: 'gl.yellow' }, { t: '04' }], [{ k: 'gl.green' }, { t: '6' }], [{ k: 'gl.blue' }, { t: '10' }], [{ k: 'gl.black' }, { k: 'gl.discard' }]] } }
    }
  },
  bind: {
    'basement:meter': 'window', 'lobby:monitor': 'leave', 'lobby:doormarks': 'figure', 'basement:monitor': 'boiler', 'lobby:bin': 'paper',
    'hlobby:monitor': 'bar', 'hcorr:plan': 'door', 'hq:board': 'timing', 'room214:bin': 'torn', 'living:magnifier': 'signature',
    'living:tiles': 'tiles', 'basement:shelfunit': 'kiln'
  },

  /* ----- the puzzle layer ----- */
  items: { basementkey: {}, backofficekey: {}, mastercard: {} },
  finds: { 'lobby:rug': { give: 'basementkey' } },
  gates: { 'lobby:basement': { need: 'basementkey' }, 'hcorr:room214': { need: 'mastercard', needs: { facts: ['door'] } } },
  containers: {
    'lobby:doorcontroller': { kind: 'wheels', wheels: [{ range: '00-23' }, { range: '00-59' }], accept: { timeRange: ['21:50', '22:15'] }, lockout: { tries: 3, seconds: 20 }, needs: { facts: ['window'], say: 'needs.controller' }, prize: { board: 'buzz' } },
    'living:tvunit': { kind: 'symbols', slots: 4, alphabet: ['square', 'circle', 'triangle', 'cross', 'star'], code: ['square', 'circle', 'triangle', 'star'], lockout: { tries: 3, seconds: 20 }, clue: ['living:tiles', 'basement:shelfunit'], prize: { fact: 'forgery' } }
  },
  /* what a thing needs before it answers (facts, items, flags) */
  needs: {
    'lobby:monitor': { facts: ['window'] }, 'lobby:doormarks': { facts: ['window'] }, 'basement:monitor': { facts: ['window'] },
    'lobby:bin': { facts: ['buzz'] },
    'hlobby:monitor': { items: ['backofficekey'], say: 'needs.office' }, 'hlobby:office': { items: ['backofficekey'], say: 'needs.office' },
    'hcorr:plan': { facts: ['bar'] }, 'hq:board': { facts: ['door'] }
  },
  /* the telephone in the detective's office: steps in order */
  calls: {
    'hq:phone': [
      { needs: { facts: ['paper'] }, say: 'call.hq.phone.0', locked: 'call.hq.phone.none', opens: 'hotel' },
      { needs: { facts: ['door'] }, say: 'call.hq.phone.1', grants: 'mastercard' }
    ]
  },
  places: {
    court: { rooms: ['living', 'lobby', 'basement'] },
    hq: { rooms: ['hq', 'interrog'] },
    hotel: { rooms: ['hlobby', 'hcorr', 'room214'], needs: { flags: ['hotel'] } }
  },
  cork: 'hq:corkboard',

  /* ----- interviews (testimony: clues and baits, never eliminates anyone) ----- */
  interviews: {
    noor: {
      scene: 'stairwell', needs: { facts: ['window'] },
      questions: [
        { id: 'q1', kind: 'clue', ask: 'int.noor.q1.ask', answer: 'int.noor.q1.answer', mood: 'normal', phrases: [{ id: 'p1', note: 'int.noor.q1.p1.note' }] },
        { id: 'q2', kind: 'bait', dismissedBy: 'bar', ask: 'int.noor.q2.ask', answer: 'int.noor.q2.answer', mood: 'guarded', phrases: [{ id: 'p1', note: 'int.noor.q2.p1.note' }, { id: 'p2', note: 'int.noor.q2.p2.note' }] },
        { id: 'q3', kind: 'neutral', ask: 'int.noor.q3.ask', answer: 'int.noor.q3.answer', mood: 'normal', phrases: [] }
      ]
    },
    mateo: {
      scene: 'boilerroom', needs: { facts: ['window'] },
      questions: [
        { id: 'q1', kind: 'clue', ask: 'int.mateo.q1.ask', answer: 'int.mateo.q1.answer', mood: 'normal', phrases: [{ id: 'p1', note: 'int.mateo.q1.p1.note' }, { id: 'p2', note: 'int.mateo.q1.p2.note' }] },
        { id: 'q2', kind: 'bait', dismissedBy: 'boiler', ask: 'int.mateo.q2.ask', answer: 'int.mateo.q2.answer', mood: 'guarded', phrases: [{ id: 'p1', note: 'int.mateo.q2.p1.note' }] },
        { id: 'q3', kind: 'mechanic', ask: 'int.mateo.q3.ask', answer: 'int.mateo.q3.answer', mood: 'normal', phrases: [] }
      ]
    },
    barman: {
      scene: 'hotelbar',
      questions: [
        { id: 'q1', kind: 'bait', dismissedBy: 'bar', ask: 'int.barman.q1.ask', answer: 'int.barman.q1.answer', mood: 'normal', phrases: [{ id: 'p1', note: 'int.barman.q1.p1.note' }, { id: 'p2', note: 'int.barman.q1.p2.note' }] },
        { id: 'q2', kind: 'clue', ask: 'int.barman.q2.ask', answer: 'int.barman.q2.answer', mood: 'normal', phrases: [{ id: 'p1', grants: 'backofficekey' }] },
        { id: 'q3', kind: 'neutral', ask: 'int.barman.q3.ask', answer: 'int.barman.q3.answer', mood: 'normal', phrases: [{ id: 'p1', note: 'int.barman.q3.p1.note' }] }
      ]
    },
    sofia: {
      scene: 'interrog', needs: { facts: ['bar'] },
      questions: [
        { id: 'q1', kind: 'neutral', ask: 'int.sofia.q1.ask', answer: 'int.sofia.q1.answer', mood: 'guarded', phrases: [{ id: 'p1', note: 'int.sofia.q1.p1.note' }] },
        { id: 'q2', kind: 'clue', ask: 'int.sofia.q2.ask', answer: 'int.sofia.q2.answer', mood: 'normal', phrases: [{ id: 'p1', note: 'int.sofia.q2.p1.note' }] },
        { id: 'q3', kind: 'neutral', ask: 'int.sofia.q3.ask', answer: 'int.sofia.q3.answer', mood: 'shaken', phrases: [{ id: 'p1', note: 'int.sofia.q3.p1.note' }] }
      ]
    }
  },
  talk: { 'hlobby:bar': ['barman'], 'interrog:chair': ['sofia', 'daniel'] },
  confrontations: {
    daniel: {
      scene: 'interrog', needs: { facts: ['door'] },
      claims: [
        { id: 'A', say: 'conf.daniel.A.say', accept: ['paper', 'torn', 'leave'], broken: 'conf.daniel.A.broken' },
        { id: 'B', say: 'conf.daniel.B.say', accept: ['bar'], broken: 'conf.daniel.B.broken' },
        { id: 'C', say: 'conf.daniel.C.say', accept: ['door', 'timing'], broken: 'conf.daniel.C.broken' }
      ],
      finale: { say: 'conf.daniel.finale', extra: [{ ifFact: 'forgery', say: 'conf.daniel.finale.forgery' }] },
      grants: 'confession'
    }
  },

  /* ----- facts. `eliminates` is checked by tests/lint.mjs against the truth above ----- */
  facts: {
    changed: { required: true, eliminates: [] },
    window: { required: true, eliminates: [] },
    buzz: { required: true, eliminates: ['mateo', 'noor'] },
    paper: { required: true, eliminates: [] },
    bar: { required: true, eliminates: ['sofia'] },
    door: { required: true, eliminates: [] },
    leave: { required: false, eliminates: [] },
    figure: { required: false, eliminates: ['noor'] },
    boiler: { required: false, eliminates: ['mateo'] },
    timing: { required: false, eliminates: [] },
    torn: { required: false, eliminates: [] },
    guest: { required: false, eliminates: [] },
    forgery: { required: false, eliminates: [] },
    signature: { required: false, eliminates: [] },
    corner: { required: false, eliminates: [] }
  },
  observe: { cup2: { fact: 'guest' }, cornertable: { fact: 'corner' } },

  accuse: {
    who: { culprit: 'daniel', options: [{ id: 'daniel' }, { id: 'sofia', refutedBy: 'bar' }, { id: 'noor', refutedBy: 'buzz' }, { id: 'mateo', refutedBy: 'buzz' }] },
    how: { culprit: 'guest', options: [{ id: 'guest' }, { id: 'burglar', refutedBy: 'changed' }, { id: 'fall', refutedBy: 'buzz' }] },
    why: { culprit: 'forgery', options: [{ id: 'forgery' }, { id: 'jealousy', refutedBy: 'changed' }, { id: 'lease', refutedBy: 'buzz' }] }
  },

  verdict: { truth: 9, next: { no: 3 } },

  rooms: ['living', 'lobby', 'basement', 'hq', 'interrog', 'hlobby', 'hcorr', 'room214'],
  map: {
    start: 'living',
    nodes: [
      { id: 'living', x: 0, y: 0 }, { id: 'lobby', x: 1, y: 0 }, { id: 'basement', x: 2, y: 0 },
      { id: 'hq', x: 0, y: 0 }, { id: 'interrog', x: 1, y: 0 },
      { id: 'hlobby', x: 0, y: 0 }, { id: 'hcorr', x: 1, y: 0 }, { id: 'room214', x: 2, y: 0 }
    ],
    edges: [['living', 'lobby'], ['lobby', 'basement'], ['hq', 'interrog'], ['hlobby', 'hcorr'], ['hcorr', 'room214']]
  },
  hots: {
    living: ['chalk', 'rug', 'window', 'door:lobby', 'bookshelf', 'tiles', 'tvunit', 'tv', 'plant', 'sofa', 'floorlamp', 'slippers', 'table', 'cup', 'cup2', 'papers', 'magnifier', 'cornertable', 'chair'],
    lobby: ['rug', 'window', 'door:living', 'door:basement', 'sofa', 'desk', 'doorcontroller', 'monitor', 'doormarks', 'bin', 'plant', 'cat'],
    basement: ['picture', 'door:lobby', 'vent', 'shelfunit', 'workbench', 'meter', 'monitor', 'boiler', 'boxes', 'crates', 'barrel'],
    hq: ['corkboard', 'board', 'door:interrog', 'window', 'desk', 'phone', 'plant', 'cabinet', 'cat'],
    interrog: ['glass', 'door:hq', 'chair', 'table', 'recorder'],
    hlobby: ['rug', 'window', 'door:hcorr', 'office', 'bar', 'stool', 'desk', 'monitor', 'till', 'rack', 'plant'],
    hcorr: ['sidedoor', 'door212', 'plan', 'door:hlobby', 'door:room214', 'plant'],
    room214: ['rug', 'window', 'door:hcorr', 'tvunit', 'tv', 'nightstand', 'phone', 'table', 'gazette', 'bed', 'pillow', 'bin']
  },

  hints: [
    { when: (f) => !f.changed },
    { when: (f) => !f.window },
    { when: (f) => !f.buzz },
    { when: (f) => !f.paper },
    { when: (f, S) => !(S && S.visited && S.visited.includes('hlobby')) },
    { when: (f) => !f.bar },
    { when: (f) => !f.door },
    { when: () => true }
  ]
};

NUT_LAYOUT.boot(ROOMS, CASE, "monday-nine", {"version":1,"case":"monday-nine","rooms":{"living":{"size":[8,8],"objects":[{"id":"shelf","type":"bookshelf","hot":"bookshelf","cell":[0.25,0],"footprint":[1.8,0.6],"props":{"h":42,"surface":true,"face":"y"},"class":"free","base":"gg5xjb"},{"id":"sofa2","type":"sofa","hot":"sofa","cell":[2.2,0],"footprint":[3,1.2],"props":{"face":"y"},"class":"free","base":"1c0sx7p"},{"id":"floorlamp","type":"floorlamp","hot":"floorlamp","cell":[5.35,0],"footprint":[0.6,0.6],"props":{"face":"y"},"class":"locked","why":["patched"],"base":"1pevap1"},{"id":"tvunit4","type":"tvunit","hot":"tvunit","cell":[0,0.7],"footprint":[1,2.2],"props":{"face":"x"},"class":"locked","why":["puzzle"],"base":"7rlgzv"},{"id":"plant5","type":"plant","hot":"plant","cell":[0,3.05],"footprint":[0.9,0.9],"props":{"face":"x"},"class":"free","base":"u7r9m3"},{"id":"table","type":"table","hot":"table","cell":[3,3.2],"footprint":[2,1.1],"class":"free","base":"1ml4hi0"},{"id":"chair1","type":"chair","hot":"chair","cell":[3.4,4.45],"footprint":[0.55,0.55],"props":{"back":"Y"},"class":"free","base":"1eyhhbw"},{"id":"chair2","type":"chair","hot":"chair","cell":[4.6,4.45],"footprint":[0.55,0.55],"props":{"back":"Y"},"class":"free","base":"b1qiwc"},{"id":"slippers","type":"slippers","hot":"slippers","cell":[0.5,4.3],"footprint":[1.35,1.1],"props":{"pose":"scattered"},"class":"locked","why":["zoom","patched"],"base":"w4ea7r"},{"id":"plant10","type":"plant","hot":"plant","cell":[6.7,6.7],"footprint":[0.9,0.9],"class":"free","base":"18xut10"},{"id":"chalk","type":"chalk","hot":"chalk","cell":[2.7,1.25],"footprint":[2.52,1.82],"props":{"dir":"x","s":0.7},"class":"locked","why":["patched"],"base":"g3r1sn"}],"items":[{"id":"cup","type":"cup","hot":"cup","host":"table","offset":[0.3,0.65],"props":{"fill":"residue"},"class":"locked","why":["zoom","patched"],"base":"ugcq6k"},{"id":"cup2","type":"cup","hot":"cup2","host":"table","offset":[1.7,0.65],"props":{"fill":"residue"},"class":"locked","why":["patched"],"base":"xyexcz"},{"id":"magnifier","type":"magnifier","hot":"magnifier","host":"table","offset":[0.8,0.25],"class":"locked","why":["puzzle"],"base":"1p28f0p"},{"id":"cornertable","type":"scuff","hot":"cornertable","host":"table","offset":[1.7,0.25],"class":"free","base":"r5ovqo"},{"id":"tiles","type":"tiles","hot":"tiles","host":"shelf","offset":[0.9,0.3],"class":"locked","why":["puzzle"],"base":"1pe7byn"}],"wall":[{"key":"L:window","wall":"L","name":"window","span":[0.8,2.8],"z":[24,48],"class":"free","base":"1yoqh87"},{"key":"L:window#2","wall":"L","name":"window","span":[3.2,5.2],"z":[24,48],"class":"free","base":"1nat7c6"},{"key":"L:door:lobby","wall":"L","name":"door:lobby","span":[5.9,7.9],"z":[0,42],"class":"free","base":"1gaqah"},{"key":"R:window","wall":"R","name":"window","span":[3.2,5.2],"z":[24,48],"class":"free","base":"j41tmj"},{"key":"R:window#2","wall":"R","name":"window","span":[5.6,7.6],"z":[24,48],"class":"free","base":"1nxtgey"}]},"lobby":{"size":[8,8],"objects":[{"id":"desk","type":"desk","hot":"desk","cell":[0.25,0],"footprint":[3.2,1.3],"props":{"h":17,"face":"y"},"class":"free","base":"1k3f2k9"},{"id":"plant2","type":"plant","hot":"plant","cell":[3.6,0],"footprint":[0.9,0.9],"props":{"face":"y"},"class":"free","base":"1od9wag"},{"id":"sofa3","type":"sofa","hot":"sofa","cell":[0,1.4],"footprint":[1.1,2.6],"props":{"face":"x"},"class":"free","base":"ld49i2"},{"id":"plant4","type":"plant","hot":"plant","cell":[0,6.85],"footprint":[0.9,0.9],"props":{"face":"x"},"class":"free","base":"12t8dqp"},{"id":"cat5","type":"cat","hot":"cat","cell":[4.4,3.6],"footprint":[0.8,0.8],"class":"locked","why":["zoom"],"base":"uodiwa"},{"id":"bin6","type":"bin","hot":"bin","cell":[6.6,2.2],"footprint":[0.7,0.7],"class":"locked","why":["puzzle"],"base":"1nsrdez"}],"items":[{"id":"doorcontroller","type":"meter","hot":"doorcontroller","host":"desk","offset":[0.6,0.65],"class":"locked","why":["puzzle"],"base":"5phvex"},{"id":"monitor","type":"monitor","hot":"monitor","host":"desk","offset":[1.7,0.62],"class":"locked","why":["puzzle","zoom"],"base":"x7dxvv"}],"wall":[{"key":"L:window","wall":"L","name":"window","span":[0.8,2.8],"z":[24,48],"class":"free","base":"1yoqh87"},{"key":"L:door:basement","wall":"L","name":"door:basement","span":[4.6,6.6],"z":[0,42],"class":"locked","why":["puzzle"],"base":"1mjgkp"},{"key":"R:window","wall":"R","name":"window","span":[0.8,2.8],"z":[24,48],"class":"free","base":"9r6oub"},{"key":"R:doormarks","wall":"R","name":"doormarks","span":[4.4,5.8],"z":[26,46],"class":"locked","why":["puzzle"],"base":"1wa2rsu"},{"key":"R:door:living","wall":"R","name":"door:living","span":[5.9,7.9],"z":[0,42],"class":"free","base":"1gnpj7x"}]},"basement":{"size":[8,8],"objects":[{"id":"workbench","type":"workbench","hot":"workbench","cell":[0.25,0],"footprint":[2.6,1.1],"props":{"bare":true,"face":"y"},"class":"free","base":"ihj6h4"},{"id":"shelfunit2","type":"shelfunit","hot":"shelfunit","cell":[3,0],"footprint":[2,0.8],"props":{"h":46,"face":"y"},"class":"locked","why":["puzzle"],"base":"994dnz"},{"id":"boiler3","type":"boiler","hot":"boiler","cell":[5.15,0],"footprint":[1.6,1.6],"props":{"face":"y"},"class":"free","base":"1hk55gj"},{"id":"shelfunit4","type":"shelfunit","hot":"shelfunit","cell":[0,1.2],"footprint":[0.8,2.4],"props":{"h":46,"face":"x"},"class":"locked","why":["puzzle"],"base":"1bbvc9o"},{"id":"crates5","type":"crates","hot":"crates","cell":[4,4.4],"footprint":[1.5,1.5],"class":"free","base":"1avmy4b"},{"id":"barrel6","type":"barrel","hot":"barrel","cell":[6.4,5],"footprint":[1.2,1.2],"props":{"h":20},"class":"free","base":"p81tnz"},{"id":"boxes7","type":"boxes","hot":"boxes","cell":[2.6,5.6],"footprint":[1.2,1.2],"class":"free","base":"1wiwjdh"}],"items":[{"id":"meter","type":"meter","hot":"meter","host":"workbench","offset":[0.7,0.55],"class":"locked","why":["puzzle"],"base":"1xmttqn"},{"id":"camscreen","type":"monitor","hot":"monitor","host":"workbench","offset":[1.75,0.6],"class":"locked","why":["puzzle","zoom"],"base":"3zko2n"}],"wall":[{"key":"L:picture","wall":"L","name":"picture","span":[1.2,2.4],"z":[28,44],"class":"free","base":"1e03hpi"},{"key":"L:picture#2","wall":"L","name":"picture","span":[3.6,4.8],"z":[28,44],"class":"free","base":"uu9o51"},{"key":"L:door:lobby","wall":"L","name":"door:lobby","span":[5.9,7.9],"z":[0,42],"class":"locked","why":["puzzle"],"base":"1gaqah"},{"key":"R:picture","wall":"R","name":"picture","span":[1.2,2.4],"z":[28,44],"class":"free","base":"1kg2poq"},{"key":"R:picture#2","wall":"R","name":"picture","span":[3.6,4.8],"z":[28,44],"class":"free","base":"1c9buvl"},{"key":"R:picture#3","wall":"R","name":"picture","span":[6,7.2],"z":[28,44],"class":"free","base":"3shcx4"},{"key":"R:vent","wall":"R","name":"vent","span":[6.2,7.2],"z":[30,40],"class":"free","base":"10v80n3"}]},"hq":{"size":[8,8],"objects":[{"id":"desk","type":"desk","hot":"desk","cell":[0.25,0],"footprint":[3.2,1.3],"props":{"h":17,"face":"y"},"class":"free","base":"1k3f2k9"},{"id":"cabinet2","type":"cabinet","hot":"cabinet","cell":[3.6,0],"footprint":[0.9,0.9],"props":{"face":"y"},"class":"free","base":"wcso1f"},{"id":"plant3","type":"plant","hot":"plant","cell":[0,1.4],"footprint":[0.9,0.9],"props":{"face":"x"},"class":"free","base":"1tvikw4"},{"id":"cat4","type":"cat","hot":"cat","cell":[4.4,4.4],"footprint":[0.8,0.8],"class":"locked","why":["zoom"],"base":"1bybn1q"}],"items":[{"id":"phone","type":"phone","hot":"phone","host":"desk","offset":[1.35,0.7],"class":"locked","why":["puzzle"],"base":"1w0a1p3"}],"wall":[{"key":"L:corkboard","wall":"L","name":"corkboard","span":[1.4,4.9],"z":[22,48],"class":"locked","why":["puzzle"],"base":"ckcj67"},{"key":"L:door:interrog","wall":"L","name":"door:interrog","span":[5.9,7.9],"z":[0,42],"class":"free","base":"pyq783"},{"key":"R:window","wall":"R","name":"window","span":[0.8,2.8],"z":[24,48],"class":"free","base":"9r6oub"},{"key":"R:board","wall":"R","name":"board","span":[4.8,7.7],"z":[28,36],"class":"locked","why":["puzzle"],"base":"yzkd2y"}]},"interrog":{"size":[7,6],"objects":[{"id":"table","type":"table","hot":"table","cell":[2.6,2.2],"footprint":[2,1.1],"class":"free","base":"j7jxbs"},{"id":"chair1","type":"chair","hot":"chair","cell":[2.9,1.45],"footprint":[0.55,0.55],"props":{"back":"y"},"class":"locked","why":["puzzle"],"base":"1a7anl1"},{"id":"chair2","type":"chair","hot":"chair","cell":[3.9,3.5],"footprint":[0.55,0.55],"props":{"back":"Y"},"class":"locked","why":["puzzle"],"base":"5nxpfr"}],"items":[{"id":"recorder","type":"recorder","hot":"recorder","host":"table","offset":[1,0.55],"class":"free","base":"1dvmwot"}],"wall":[{"key":"L:glass","wall":"L","name":"glass","span":[1,4.2],"z":[22,46],"class":"free","base":"uhc716"},{"key":"R:door:hq","wall":"R","name":"door:hq","span":[4.9,6.9],"z":[0,42],"class":"free","base":"1bbeltp"}]},"hlobby":{"size":[8,8],"objects":[{"id":"bar","type":"barcounter","hot":"bar","cell":[0.25,0],"footprint":[4.4,0.9],"props":{"face":"y"},"class":"locked","why":["puzzle"],"base":"1ai9aen"},{"id":"plant2","type":"plant","hot":"plant","cell":[4.8,0],"footprint":[0.9,0.9],"props":{"face":"y"},"class":"free","base":"13hn8nj"},{"id":"desk","type":"desk","hot":"desk","cell":[0,1],"footprint":[1.3,3],"props":{"h":17,"face":"x"},"class":"free","base":"1jw0lrs"},{"id":"rack","type":"rack","hot":"rack","cell":[0,4.15],"footprint":[0.5,1.4],"props":{"face":"x"},"class":"free","base":"6opire"},{"id":"stool5","type":"stool","hot":"stool","cell":[1,1.4],"footprint":[0.6,0.6],"class":"free","base":"gklmlk"},{"id":"stool6","type":"stool","hot":"stool","cell":[2,1.4],"footprint":[0.6,0.6],"class":"free","base":"9vdu2k"},{"id":"stool7","type":"stool","hot":"stool","cell":[3,1.4],"footprint":[0.6,0.6],"class":"free","base":"1yl4nbs"}],"items":[{"id":"monitor","type":"monitor","hot":"monitor","host":"desk","offset":[0.6,0],"class":"locked","why":["puzzle","zoom"],"base":"z6lhin"},{"id":"till","type":"ledger","hot":"till","host":"desk","offset":[0.6,1.2],"class":"free","base":"1lmkn7p"}],"wall":[{"key":"L:window","wall":"L","name":"window","span":[0.8,2.8],"z":[24,48],"class":"free","base":"1yoqh87"},{"key":"L:window#2","wall":"L","name":"window","span":[3.2,5.2],"z":[24,48],"class":"free","base":"1nat7c6"},{"key":"L:door:hcorr","wall":"L","name":"door:hcorr","span":[5.9,7.9],"z":[0,42],"class":"free","base":"19hoard"},{"key":"R:window","wall":"R","name":"window","span":[0.8,2.8],"z":[24,48],"class":"free","base":"9r6oub"},{"key":"R:window#2","wall":"R","name":"window","span":[3.2,5.2],"z":[24,48],"class":"free","base":"93jbhy"},{"key":"R:office","wall":"R","name":"office","span":[6,7.4],"z":[0,42],"class":"locked","why":["puzzle"],"base":"1hjcywy"}]},"hcorr":{"size":[8,6],"objects":[{"id":"plant1","type":"plant","hot":"plant","cell":[0.8,4.6],"footprint":[0.9,0.9],"class":"free","base":"1c9oyjq"}],"items":[],"wall":[{"key":"L:sidedoor","wall":"L","name":"sidedoor","span":[3.4,5],"z":[0,42],"class":"free","base":"1v3ceo3"},{"key":"L:door212","wall":"L","name":"door212","span":[0.8,2.4],"z":[0,42],"class":"free","base":"1878te1"},{"key":"R:plan","wall":"R","name":"plan","span":[3.3,5.1],"z":[22,46],"class":"locked","why":["puzzle"],"base":"wrid21"},{"key":"R:door:hlobby","wall":"R","name":"door:hlobby","span":[5.9,7.9],"z":[0,42],"class":"free","base":"1zhxvf"},{"key":"R:door:room214","wall":"R","name":"door:room214","span":[0.8,2.8],"z":[0,42],"class":"locked","why":["puzzle"],"base":"4t8h21"}]},"room214":{"size":[8,8],"objects":[{"id":"bed","type":"bed","hot":"bed","cell":[5,0],"footprint":[2.6,4.3],"class":"locked","why":["zoom"],"base":"gjh13z"},{"id":"nightstand","type":"nightstand","hot":"nightstand","cell":[3.2,0],"footprint":[1.7,1.4],"props":{"h":15},"class":"free","base":"127nm2k"},{"id":"tvunit","type":"tvunit","hot":"tvunit","cell":[0,0.9],"footprint":[1,2.2],"props":{"face":"x"},"class":"free","base":"1dnutpn"},{"id":"desk","type":"table","hot":"table","cell":[1,4.4],"footprint":[2,1.1],"class":"free","base":"ws18ym"},{"id":"wastebin","type":"bin","hot":"bin","cell":[6.4,5.4],"footprint":[0.7,0.7],"class":"locked","why":["puzzle"],"base":"1a1mo8q"}],"items":[{"id":"phone","type":"phone","hot":"phone","host":"nightstand","offset":[0.7,0.7],"props":{"on_":false},"class":"free","base":"8wynyz"},{"id":"gazette","type":"papers","hot":"gazette","host":"desk","offset":[0.8,0.5],"class":"free","base":"o1jsxt"}],"wall":[{"key":"L:window","wall":"L","name":"window","span":[3.2,5.2],"z":[24,48],"class":"free","base":"wts7e7"},{"key":"L:door:hcorr","wall":"L","name":"door:hcorr","span":[5.9,7.9],"z":[0,42],"class":"locked","why":["puzzle"],"base":"19hoard"},{"key":"R:window","wall":"R","name":"window","span":[3.2,5.2],"z":[24,48],"class":"free","base":"j41tmj"},{"key":"R:window#2","wall":"R","name":"window","span":[5.6,7.6],"z":[24,48],"class":"free","base":"1nxtgey"}]}}});