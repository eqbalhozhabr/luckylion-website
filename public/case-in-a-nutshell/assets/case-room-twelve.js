'use strict';
/* ============================================================
   Case 5 rooms (Hotel Meridian), from the space kit. Room 12 is the base
   scene as the housekeeper found it at 07:10; moments are patches over it.
   ============================================================ */

const ROOM12 = makeSpace('bedroom', {
  id: 'room12', seed: 31, theme: 2, time: 'auto', fill: 0,
  doors: [{ slot: 'LC', to: 'corridor', kind: 'door' }],
  lay: () => ({
    fixed: true, R: [], L: [],
    free: [
      OBJ('bed', 5.0, 0, 2.6, 4.3, { body: 'chalk', id: 'bed' }),
      OBJ('nightstand', 3.2, 0, 1.7, 1.4, { h: 15, id: 'nightstand' }),
      OBJ('dresser', 0, 0.9, 1.5, 4.7, { h: 17, face: 'x', id: 'dresser', decor: false }),
      OBJ('slippers', 2.0, 5.0, 1.35, 1.1, { id: 'slippers', pose: 'scattered' }),
      OBJ('pouf', 4.6, 5.4, 1.2, 1.2)
    ]
  }),
  items: [
    { id: 'lamp', k: 'lamp', hot: 'lamp', on: 'nightstand', x: 3.7, y: 0.6, lit: false },
    { id: 'cup', k: 'cup', hot: 'cup', on: 'dresser', x: 0.8, y: 4.4, fill: 'residue' },
    { id: 'lockpanel', k: 'meter', hot: 'lockpanel', on: 'dresser', x: 0.8, y: 3.2 }
  ]
});

const CORRIDOR = makeSpace('hallway', {
  id: 'corridor', seed: 33, theme: 1, time: 'night', fill: 0,
  doors: [{ slot: 'LA', to: 'room12', kind: 'door' }, { slot: 'LC', to: 'stairs', kind: 'door' }, { slot: 'RC', to: 'lobby', kind: 'door' }],
  lay: () => ({
    fixed: true,
    R: [WP('desk', 3.2, 1.3, { h: 17, id: 'desk' }), WP('plant', 0.9, 0.9)],
    L: [],
    free: []
  }),
  items: [
    { id: 'monitor', k: 'monitor', hot: 'monitor', on: 'desk', x: 1.9, y: 0.62 }
  ]
});

const LOBBY = makeSpace('lobby', {
  id: 'lobby', seed: 35, theme: 1, time: 'night', fill: 0,
  doors: [{ slot: 'RC', to: 'corridor', kind: 'door' }],
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

const STAIRS = makeSpace('stairs', {
  id: 'stairs', seed: 37, theme: 2, time: 'night', fill: 0,
  doors: [{ slot: 'LA', to: 'corridor', kind: 'door' }],
  lay: () => ({ fixed: true, R: [WP('stairs', 5.2, 1.5, { steps: 8 })], L: [WP('bench', 2.0, 0.8)], free: [OBJ('plant', 6.6, 4.4, 0.9, 0.9)] })
});

const ROOMS = { room12: ROOM12, corridor: CORRIDOR, lobby: LOBBY, stairs: STAIRS };

/* ============================================================
   Case 5 : "Room 12"  (room-twelve)

   Boards, a hidden key and a locked door as before. The new ideas:
   - a BUILDING GRAPH with walking times: who could get from where to where while a camera was looking elsewhere;
   - a card system that logs WHERE a card was swiped: one card cannot be in two places a minute apart.

   TRUTH (Saturday night, Hotel Meridian):
     23:30  Leonard Grey, the auditor, locks himself into Room 12 (deadbolt, inside).
     23:59  Nadia (night receptionist) leaves the desk, takes the service stairs (20 s + 35 s + 25 s).
     00:01  The Room 12 lock is opened from outside with a master card. 00:01-00:04: she is inside.
     00:02  The manager's card #1 is swiped at the ballroom store: it is in the ballroom, three minutes away.
     00:03  Felicity, from Room 11, goes for ice: the corridor camera sees her and an empty corridor.
     00:04  Room 12 is locked again from outside with a card. 00:06 Nadia is back at the desk.
     07:10  The housekeeper opens the door with the override: locked, and the room looks like a suicide.
   ============================================================ */

const CASE = {
  id: 'room-twelve', no: 5, slug: 'room-twelve',
  difficulty: 4, minutes: 28, dayStart: '18:00',
  intro: 3, sceneRoom: 'room12',

  victim: { portrait: { skin: '#e3b997', hair: '#8a8a96', style: 'short', glasses: true, shirt: '#4a5a7a', collar: '#e8e4d8' } },

  suspects: [
    {
      id: 'nadia', hasCard: true,
      portrait: { skin: '#e8c4a6', hair: '#2a1d1a', style: 'bun', shirt: '#7a2f3a', collar: '#f0e0e0' },
      proofs: []
    },
    {
      id: 'kenji', hasCard: true,
      portrait: { skin: '#e0b08c', hair: '#1f1a1c', style: 'short', shirt: '#3a4a5a', collar: '#e8e4d8', mustache: '#1f1a1c' },
      proofs: [{ at: '00:01', kind: 'person', src: 'ballroom camera' }, { at: '00:02', kind: 'thing', src: 'card swipe' }]
    },
    {
      id: 'oskar', hasCard: false,
      portrait: { skin: '#d9a07c', hair: '#6a4a2a', style: 'cap', cap: '#7a2f3a', shirt: '#a85a4a', collar: '#e8d8c0' },
      proofs: [{ at: '00:01', kind: 'person', src: 'ballroom camera' }]
    },
    {
      id: 'felicity', hasCard: false,
      portrait: { skin: '#e8c4a6', hair: '#8a5a3a', style: 'long', shirt: '#5a8a9a', collar: '#e0f0f0' },
      proofs: [{ at: '00:03', kind: 'person', src: 'corridor camera' }]
    }
  ],

  /* the numbers the boards must agree with (tests/lint.mjs recomputes every answer from these) */
  truth: { window: ['00:01', '00:04'], moment: '00:01', swipe: '00:02', ice: '00:03', deskGone: '23:59', deskBack: '00:06', walk: { deskStairs: 20, climb: 35, door: 25, ballroom: 180 } },
  herring: { suspect: 'felicity', motive: 'secret' },

  moments: [
    {
      id: 'felicity', time: '21:30', who: 'felicity',
      patches: [
        { env: { time: 'night' } }, { id: 'bed', set: { body: 'none' } }, { id: 'lamp', set: { lit: true } }, { id: 'slippers', set: { pose: 'tidy' } },
        { id: 'cup', set: { on: 'nightstand', x: 4.6, y: 0.95, fill: 'tea' } },
        { add: { id: 'audit', k: 'papers', hot: 'audit', on: 'dresser', x: 0.8, y: 2.0 }, item: true }
      ]
    },
    {
      id: 'oskar', time: '22:45', who: 'oskar',
      patches: [
        { env: { time: 'night' } }, { id: 'bed', set: { body: 'none' } }, { id: 'lamp', set: { lit: true } }, { id: 'slippers', set: { pose: 'tidy' } },
        { id: 'cup', set: { on: 'nightstand', x: 4.6, y: 0.95, fill: 'low' } },
        { add: { id: 'audit', k: 'papers', hot: 'audit', on: 'dresser', x: 0.8, y: 2.0 }, item: true }
      ]
    },
    { id: 'scene', time: '07:10', who: null, patches: [{ env: { time: 'day' } }] }
  ],

  diff: { a: 'oskar', b: 'scene', need: 3, ignore: ['bed'], items: ['lamp', 'cup', 'slippers', 'audit'], notes: ['bed'] },

  boards: {
    lock: {
      fact: 'lock', question: { kind: 'many', answer: ['nadia', 'kenji'] },
      truth: (s) => s.hasCard, elim: 'unselected',
      docs: {
        log: { cols: 2, rows: [[{ t: '23:30' }, { k: 'lg.bolt' }], [{ t: '00:01' }, { k: 'lg.card' }], [{ t: '00:04' }, { k: 'lg.cardlock' }], [{ t: '07:10' }, { k: 'lg.override' }]] },
        cards: { cols: 3, rows: [[{ k: 'cd.c1' }, { s: 'kenji' }, { k: 'cd.master' }], [{ k: 'cd.c2' }, { s: 'nadia' }, { k: 'cd.master' }], [{ k: 'cd.c3' }, { k: 'cd.rosa' }, { k: 'cd.master' }], [{ k: 'cd.c4' }, { s: 'oskar' }, { k: 'cd.lift' }]] }
      }
    },
    ballroom: {
      fact: 'ballroom', question: { kind: 'many', answer: ['kenji', 'oskar'] },
      truth: (s, V) => s.proofs.some((p) => p.kind === 'person' && p.at === V.moment && /ballroom/.test(p.src)), elim: 'selected',
      docs: {
        camera: { frames: [
          { t: '23:50', spec: { scene: 'ballroom', figs: [{ who: 'kenji', x: 44, base: 31, h: 24 }, { who: 'oskar', x: 14, base: 52, h: 18 }] } },
          { t: '00:01', spec: { scene: 'ballroom', figs: [{ who: 'kenji', x: 44, base: 31, h: 24 }, { who: 'oskar', x: 14, base: 52, h: 18 }] } },
          { t: '00:10', spec: { scene: 'ballroom', figs: [{ who: 'kenji', x: 44, base: 31, h: 24 }, { who: 'oskar', x: 74, base: 52, h: 18 }] } }
        ] }
      }
    },
    cards: {
      fact: 'cards', question: { kind: 'one', answer: 'kenji' },
      truth: (s) => s.proofs.some((p) => p.kind === 'thing' && /card swipe/.test(p.src)), elim: 'selected',
      docs: {
        swipes: { cols: 3, rows: [[{ t: '23:20' }, { k: 'cd.c2' }, { k: 'sw.desk' }], [{ t: '00:02' }, { k: 'cd.c1' }, { k: 'sw.ballroom' }], [{ t: '00:05' }, { k: 'cd.c2' }, { k: 'sw.desk' }]] },
        walks: { cols: 2, rows: [[{ k: 'wk.a' }, '20'], [{ k: 'wk.b' }, '35'], [{ k: 'wk.c' }, '25'], [{ k: 'wk.d' }, '180']] }
      }
    },
    corridor: {
      fact: 'corridor', question: { kind: 'one', answer: 'felicity' },
      truth: (s) => s.proofs.some((p) => p.kind === 'person' && /corridor/.test(p.src)), elim: 'selected',
      docs: {
        camera: { frames: [
          { t: '23:58', spec: { scene: 'corridor', figs: [] } },
          { t: '00:01', spec: { scene: 'corridor', figs: [] } },
          { t: '00:03', spec: { scene: 'corridor', figs: [{ who: 'felicity', x: 40, h: 32, hold: 'bin' }] } }
        ] },
        elevator: { cols: 2, rows: [[{ t: '23:10' }, { k: 'el.trip' }], [{ t: '07:05' }, { k: 'el.trip' }]] }
      }
    },
    route: {
      fact: 'route', question: { kind: 'choice', options: ['never', 'elevator', 'stairs', 'window'], answer: 'stairs' },
      docs: {
        desk: { frames: [
          { t: '23:56', spec: { scene: 'desk', figs: [{ who: 'nadia', x: 40, h: 34 }] } },
          { t: '00:00', spec: { scene: 'desk', figs: [] } },
          { t: '00:06', spec: { scene: 'desk', figs: [{ who: 'nadia', x: 40, h: 34 }] } }
        ] },
        plan: { cols: 2, rows: [[{ k: 'pl.a' }, { k: 'pl.av' }], [{ k: 'pl.b' }, { k: 'pl.bv' }], [{ k: 'pl.c' }, { k: 'pl.cv' }]] }
      }
    }
  },
  bind: { 'room12:lockpanel': 'lock', 'lobby:monitor': 'ballroom', 'lobby:ledger': 'cards', 'corridor:monitor': 'corridor', 'lobby:file': 'route' },

  /* the service stairs are locked; the staff key is taped under the corridor plant's saucer */
  items: { stairkey: {} },
  finds: { 'corridor:plant': { give: 'stairkey' } },
  gates: { 'corridor:stairs': { need: 'stairkey' } },

  facts: {
    changed: { required: true, eliminates: [] },
    route: { required: true, eliminates: [] },
    lock: { required: true, eliminates: ['oskar', 'felicity'] },
    ballroom: { required: true, eliminates: ['kenji', 'oskar'] },
    cards: { required: true, eliminates: ['kenji'] },
    corridor: { required: true, eliminates: ['felicity'] },
    audit: { required: false, eliminates: [] }
  },
  observe: { dresser: { fact: 'audit' } },

  accuse: {
    who: { culprit: 'nadia', options: [{ id: 'nadia' }, { id: 'kenji', refutedBy: 'cards' }, { id: 'oskar', refutedBy: 'lock' }, { id: 'felicity', refutedBy: 'corridor' }] },
    how: { culprit: 'staged', options: [{ id: 'staged' }, { id: 'suicide', refutedBy: 'lock' }, { id: 'stranger', refutedBy: 'corridor' }] },
    why: { culprit: 'cover', options: [{ id: 'cover' }, { id: 'secret', refutedBy: 'corridor' }, { id: 'career', refutedBy: 'ballroom' }] }
  },

  verdict: { truth: 7, next: { no: 6 } },

  rooms: ['lobby', 'corridor', 'room12', 'stairs'],
  map: { start: 'room12', nodes: [{ id: 'lobby', x: 0, y: 0 }, { id: 'corridor', x: 1, y: 0 }, { id: 'room12', x: 2, y: 0 }, { id: 'stairs', x: 1, y: 1 }], edges: [['lobby', 'corridor'], ['corridor', 'room12'], ['corridor', 'stairs']] },
  hots: {
    room12: ['rug', 'window', 'door:corridor', 'dresser', 'audit', 'lockpanel', 'nightstand', 'lamp', 'cup', 'slippers', 'bed', 'pillow', 'pouf', 'body'],
    corridor: ['door:room12', 'door:stairs', 'window', 'door:lobby', 'desk', 'monitor', 'plant'],
    lobby: ['rug', 'window', 'mailboxes', 'door:corridor', 'desk', 'ledger', 'monitor', 'file', 'sofa', 'plant', 'cat'],
    stairs: ['door:corridor', 'stairs', 'bench', 'plant']
  },

  hints: [
    { when: (f) => !f.changed },
    { when: (f) => !f.lock },
    { when: (f) => !f.ballroom },
    { when: (f) => !f.cards },
    { when: (f) => !f.corridor },
    { when: (f) => !f.route },
    { when: () => true }
  ]
};
