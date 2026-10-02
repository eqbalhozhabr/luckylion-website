'use strict';
/* ============================================================
   Case 6 rooms (Night Express 417): every space is part of the train, cut away like a model railway car.
   Cabin 4 is the base scene as the conductor found it at 06:40; moments are patches over it.
   ============================================================ */

const CABIN = makeSpace('traincar', {
  id: 'cabin', seed: 41, theme: 2, time: 'auto', fill: 0, size: [8, 6],
  doors: [{ slot: 'LC', to: 'corridor', kind: 'door' }],
  lay: () => ({
    fixed: true, R: [], L: [],
    free: [
      OBJ('bed', 5.0, 0, 2.6, 4.3, { body: 'chalk', id: 'bed' }),
      OBJ('nightstand', 3.2, 0, 1.7, 1.4, { h: 15, id: 'nightstand' }),
      OBJ('dresser', 0, 0.9, 1.5, 2.8, { h: 17, face: 'x', id: 'dresser', decor: false }),
      OBJ('slippers', 2.0, 4.1, 1.35, 1.1, { id: 'slippers', pose: 'scattered' }),
      OBJ('pouf', 4.0, 4.2, 1.2, 1.2)
    ]
  }),
  items: [
    { id: 'lamp', k: 'lamp', hot: 'lamp', on: 'nightstand', x: 3.7, y: 0.6, lit: false },
    { id: 'cup', k: 'cup', hot: 'cup', on: 'dresser', x: 0.8, y: 3.3, fill: 'residue' },
    { id: 'lockpanel', k: 'meter', hot: 'lockpanel', on: 'dresser', x: 0.8, y: 2.45 }
  ]
});

const CORRIDOR = makeSpace('traincar', {
  id: 'corridor', seed: 43, theme: 1, time: 'night', fill: 0,
  doors: [{ slot: 'RA', to: 'cabin', kind: 'door' }, { slot: 'RC', to: 'van', kind: 'door' }, { slot: 'LA', to: 'diner', kind: 'door' }],
  lay: () => ({
    fixed: true, R: [], L: [],
    free: [
      OBJ('desk', 3.4, 0, 3.2, 1.3, { h: 17, face: 'y', id: 'desk' }),
      OBJ('plant', 7.2, 0.1, 0.9, 0.9),
      OBJ('boxes', 8.6, 2.4, 1.2, 1.2)
    ]
  }),
  items: [
    { id: 'monitor', k: 'monitor', hot: 'monitor', on: 'desk', x: 4.4, y: 0.62 }
  ]
});

const DINER = makeSpace('traincar', {
  id: 'diner', seed: 45, theme: 0, time: 'night', fill: 0,
  doors: [{ slot: 'LA', to: 'corridor', kind: 'door' }],
  lay: () => ({
    fixed: true,
    R: [WP('fridge', 0.9, 0.9, { gap: 0 }), WP('kcounter', 1.0, 0.95, { kind: 'stove', gap: 0 }), WP('kcounter', 2.0, 0.95, { kind: 'sink', gap: 0 }), WP('kcounter', 1.2, 0.95)],
    L: [],
    free: [
      OBJ('table', 7.0, 1.1, 2.0, 1.1, { id: 'table' }), OBJ('chair', 7.3, 2.35, 0.55, 0.55, { back: 'Y', id: 'chair1' }), OBJ('chair', 8.4, 2.35, 0.55, 0.55, { back: 'Y', id: 'chair2' }),
      OBJ('table', 3.6, 2.0, 2.0, 1.1, { id: 'table2' }), OBJ('chair', 3.9, 3.25, 0.55, 0.55, { back: 'Y', id: 'chair3' }), OBJ('chair', 5.0, 3.25, 0.55, 0.55, { back: 'Y', id: 'chair4' }),
      OBJ('bin', 0.5, 3.1, 0.7, 0.7)
    ]
  }),
  items: [
    { id: 'receipts', k: 'papers', hot: 'receipts', on: 'table', x: 7.35, y: 1.6 },
    { id: 'galleycam', k: 'monitor', hot: 'galleycam', on: 'table', x: 8.05, y: 1.6 },
    { id: 'menu', k: 'papers', hot: 'menu', on: 'table', x: 8.65, y: 1.6, cover: 'blue' }
  ]
});

const VAN = makeSpace('traincar', {
  id: 'van', seed: 47, theme: 1, time: 'night', fill: 0,
  doors: [{ slot: 'LA', to: 'corridor', kind: 'door' }],
  lay: () => ({
    fixed: true,
    R: [WP('workbench', 2.6, 1.1, { id: 'bench', bare: true }), WP('shelfunit', 2.2, 0.8, { h: 46 })],
    L: [],
    free: [OBJ('crates', 5.6, 1.2, 1.5, 1.5), OBJ('barrel', 8.2, 1.2, 1.2, 1.2, { h: 20, id: 'drum' }), OBJ('boxes', 9.4, 2.5, 1.2, 1.2), OBJ('crates', 3.4, 2.4, 1.5, 1.5)]
  }),
  items: [
    { id: 'punchclock', k: 'meter', hot: 'punchclock', on: 'bench', x: 1.0, y: 0.55 }
  ]
});

const ROOMS = { cabin: CABIN, corridor: CORRIDOR, diner: DINER, van: VAN };

/* ============================================================
   Case 6 : "Night Train"  (night-train)

   Boards, a hidden key, a locked door and a code lock as before. The new idea: a TIMETABLE.
   The doors between the cars are locked while the train runs and open only while it stands at a station;
   the one person who moved through the train did it in the eight minutes at Linden.

   TRUTH (Night Express 417, Saturday night):
     23:40  Alma Voss, an antiques appraiser, bolts herself into Cabin 4.
     01:05  Pavel (steward) brings her tea; it is laced with a sleeping powder.
     01:50  The train stops at Linden (until 01:58). The doors between the cars unlock.
     01:51  Pavel leaves the galley (coat on the hook) and crosses the vestibule: 15 + 30 + 25 s.
     01:52  The cabin is opened from outside with a staff key. 01:52-01:56: he is inside.
     01:54  Lila and the conductor are on the platform camera; Teodor buys a coffee in the dining car.
     01:55  The conductor punches her clock in the luggage van: four minutes from the cabin.
     01:56  The cabin is locked again from outside; 01:58 Pavel is back in the galley as the train pulls out.
     06:40  The conductor opens the cabin with the override: bolted, and it looks like a heart failure.
   ============================================================ */

const CASE = {
  id: 'night-train', no: 6, slug: 'night-train',
  difficulty: 4, minutes: 30, dayStart: '18:00',
  intro: 3, sceneRoom: 'cabin',

  victim: { portrait: { skin: '#e3b997', hair: '#a8a8b4', style: 'bun', shirt: '#5a3a5a', collar: '#e8e4d8' } },

  suspects: [
    {
      id: 'pavel', hasKey: true,
      portrait: { skin: '#e0b08c', hair: '#3a2a22', style: 'short', shirt: '#7a2f3a', collar: '#f0e0e0', mustache: '#3a2a22' },
      proofs: []
    },
    {
      id: 'irena', hasKey: true,
      portrait: { skin: '#e8c4a6', hair: '#6a6a74', style: 'bun', cap: '#2a3a5a', shirt: '#2a3a5a', collar: '#e8e4d8' },
      proofs: [{ at: '01:54', kind: 'person', src: 'platform camera' }, { at: '01:55', kind: 'thing', src: 'punch clock' }]
    },
    {
      id: 'teodor', hasKey: false,
      portrait: { skin: '#d9a07c', hair: '#8a8a96', style: 'short', glasses: true, shirt: '#4a6a5a', collar: '#e8e4d8' },
      proofs: [{ at: '01:54', kind: 'thing', src: 'vending receipt' }]
    },
    {
      id: 'lila', hasKey: false,
      portrait: { skin: '#e8c4a6', hair: '#b9602a', style: 'long', shirt: '#5a8a9a', collar: '#e0f0f0' },
      proofs: [{ at: '01:54', kind: 'person', src: 'platform camera' }]
    }
  ],

  /* the numbers the boards must agree with (tests/lint.mjs recomputes every answer from these) */
  truth: { window: ['01:52', '01:56'], moment: '01:54', receipt: '01:54', punch: '01:55', stop: ['01:50', '01:58'], gone: '01:51', back: '01:58', walk: { galleyVest: 15, cross: 30, toCabin: 25, diner: 180, van: 240 } },
  herring: { suspect: 'lila', motive: 'secret' },

  moments: [
    {
      id: 'lila', time: '23:45', who: 'lila',
      patches: [
        { env: { time: 'night' } }, { id: 'bed', set: { body: 'none' } }, { id: 'lamp', set: { lit: true } }, { id: 'slippers', set: { pose: 'tidy' } },
        { id: 'cup', set: { on: 'nightstand', x: 4.6, y: 0.95, fill: 'empty' } },
        { add: { id: 'catalog', k: 'papers', hot: 'catalog', on: 'dresser', x: 0.8, y: 1.6 }, item: true }
      ]
    },
    {
      id: 'pavel', time: '01:05', who: 'pavel',
      patches: [
        { env: { time: 'night' } }, { id: 'bed', set: { body: 'none' } }, { id: 'lamp', set: { lit: true } }, { id: 'slippers', set: { pose: 'tidy' } },
        { id: 'cup', set: { on: 'nightstand', x: 4.6, y: 0.95, fill: 'tea' } },
        { add: { id: 'catalog', k: 'papers', hot: 'catalog', on: 'dresser', x: 0.8, y: 1.6 }, item: true }
      ]
    },
    { id: 'scene', time: '06:40', who: null, patches: [{ env: { time: 'day' } }] }
  ],

  diff: { a: 'pavel', b: 'scene', need: 3, ignore: ['bed'], items: ['lamp', 'cup', 'slippers', 'catalog'], notes: ['bed'] },

  boards: {
    lock: {
      fact: 'lock', question: { kind: 'many', answer: ['pavel', 'irena'] },
      truth: (s) => s.hasKey, elim: 'unselected',
      docs: {
        log: { cols: 2, rows: [[{ t: '23:40' }, { k: 'lg.bolt' }], [{ t: '01:52' }, { k: 'lg.key' }], [{ t: '01:56' }, { k: 'lg.keylock' }], [{ t: '06:40' }, { k: 'lg.override' }]] },
        keys: { cols: 3, rows: [[{ k: 'cd.k1' }, { s: 'irena' }, { k: 'cd.all' }], [{ k: 'cd.k2' }, { s: 'pavel' }, { k: 'cd.all' }], [{ k: 'cd.k3' }, { k: 'cd.alma' }, { k: 'cd.own4' }], [{ k: 'cd.k4' }, { s: 'teodor' }, { k: 'cd.own5' }], [{ k: 'cd.k5' }, { s: 'lila' }, { k: 'cd.own3' }]] }
      }
    },
    platform: {
      fact: 'platform', question: { kind: 'many', answer: ['irena', 'lila'] },
      truth: (s, V) => s.proofs.some((p) => p.kind === 'person' && p.at === V.moment && /platform/.test(p.src)), elim: 'selected',
      docs: {
        camera: { frames: [
          { t: '01:51', spec: { scene: 'platform', figs: [{ who: 'irena', x: 14, base: 50, h: 30, hold: 'lantern' }, { who: 'lila', x: 58, base: 52, h: 28 }] } },
          { t: '01:54', spec: { scene: 'platform', figs: [{ who: 'irena', x: 14, base: 50, h: 30, hold: 'lantern' }, { who: 'lila', x: 58, base: 52, h: 28 }] } },
          { t: '01:58', spec: { scene: 'platform', figs: [{ who: 'irena', x: 30, base: 50, h: 30, hold: 'lantern' }, { who: 'lila', x: 66, base: 52, h: 28 }] } }
        ] },
        times: { cols: 2, rows: [[{ k: 'tt.arr' }, '01:50'], [{ k: 'tt.dep' }, '01:58'], [{ k: 'tt.next' }, '03:12']] }
      }
    },
    receipt: {
      fact: 'receipt', question: { kind: 'one', answer: 'teodor' },
      truth: (s) => s.proofs.some((p) => p.kind === 'thing' && /receipt/.test(p.src)), elim: 'selected',
      docs: {
        machine: { cols: 3, rows: [[{ t: '23:12' }, { s: 'lila' }, { k: 'rc.tea' }], [{ t: '01:54' }, { s: 'teodor' }, { k: 'rc.coffee' }], [{ t: '03:40' }, { k: 'rc.crew' }, { k: 'rc.water' }]] },
        cars: { cols: 2, rows: [[{ k: 'cr.a' }, '180'], [{ k: 'cr.b' }, '240']] }
      }
    },
    clock: {
      fact: 'clock', question: { kind: 'one', answer: 'irena' },
      truth: (s) => s.proofs.some((p) => p.kind === 'thing' && /punch clock/.test(p.src)), elim: 'selected',
      docs: {
        punches: { cols: 3, rows: [[{ t: '01:05' }, { k: 'pc.round' }, { k: 'pc.van' }], [{ t: '01:55' }, { k: 'pc.round' }, { k: 'pc.van' }], [{ t: '03:00' }, { k: 'pc.round' }, { k: 'pc.van' }]] },
        rounds: { cols: 2, rows: [[{ k: 'rd.a' }, '30'], [{ k: 'rd.b' }, '240']] }
      }
    },
    route: {
      fact: 'route', question: { kind: 'choice', options: ['never', 'moving', 'stop', 'roof'], answer: 'stop' },
      docs: {
        galley: { frames: [
          { t: '01:48', spec: { scene: 'galley', figs: [{ who: 'pavel', x: 40, h: 34 }] } },
          { t: '01:53', spec: { scene: 'galley', figs: [] } },
          { t: '01:59', spec: { scene: 'galley', figs: [{ who: 'pavel', x: 40, h: 34 }] } }
        ] },
        plan: { cols: 2, rows: [[{ k: 'pl.a' }, { k: 'pl.av' }], [{ k: 'pl.b' }, { k: 'pl.bv' }], [{ k: 'pl.c' }, { k: 'pl.cv' }]] },
        doors: { cols: 2, rows: [[{ k: 'dr.a' }, { k: 'dr.av' }], [{ k: 'dr.b' }, { k: 'dr.bv' }], [{ k: 'dr.c' }, { k: 'dr.cv' }]] }
      }
    }
  },
  bind: { 'cabin:lockpanel': 'lock', 'corridor:monitor': 'platform', 'diner:receipts': 'receipt', 'van:punchclock': 'clock', 'diner:galleycam': 'route' },

  /* the luggage van is staff-only; its key is taped under the bin in the diner. The strongbox in the van opens with the train's number, printed on the menu. */
  items: { vankey: {} },
  finds: { 'diner:bin': { give: 'vankey' } },
  gates: { 'corridor:van': { need: 'vankey' } },
  containers: { 'van:crates': { kind: 'wheels', code: '417', fact: 'ledger', clue: 'diner:menu' } },

  facts: {
    changed: { required: true, eliminates: [] },
    route: { required: true, eliminates: [] },
    lock: { required: true, eliminates: ['teodor', 'lila'] },
    platform: { required: true, eliminates: ['irena', 'lila'] },
    receipt: { required: true, eliminates: ['teodor'] },
    clock: { required: true, eliminates: ['irena'] },
    catalog: { required: false, eliminates: [] },
    ledger: { required: false, eliminates: [] }
  },
  observe: { dresser: { fact: 'catalog' } },

  accuse: {
    who: { culprit: 'pavel', options: [{ id: 'pavel' }, { id: 'irena', refutedBy: 'clock' }, { id: 'teodor', refutedBy: 'receipt' }, { id: 'lila', refutedBy: 'platform' }] },
    how: { culprit: 'staged', options: [{ id: 'staged' }, { id: 'natural', refutedBy: 'lock' }, { id: 'stranger', refutedBy: 'platform' }] },
    why: { culprit: 'cover', options: [{ id: 'cover' }, { id: 'secret', refutedBy: 'platform' }, { id: 'career', refutedBy: 'clock' }] }
  },

  verdict: { truth: 7, next: { no: 7 } },

  rooms: ['cabin', 'corridor', 'diner', 'van'],
  map: { start: 'cabin', nodes: [{ id: 'diner', x: 0, y: 0 }, { id: 'corridor', x: 1, y: 0 }, { id: 'cabin', x: 2, y: 0 }, { id: 'van', x: 1, y: 1 }], edges: [['diner', 'corridor'], ['corridor', 'cabin'], ['corridor', 'van']] },
  hots: {
    cabin: ['door:corridor', 'dresser', 'catalog', 'lockpanel', 'nightstand', 'lamp', 'cup', 'slippers', 'bed', 'pillow', 'pouf', 'body'],
    corridor: ['door:cabin', 'door:van', 'door:diner', 'desk', 'monitor', 'plant', 'boxes'],
    diner: ['door:corridor', 'fridge', 'kcounter', 'bin', 'table', 'receipts', 'galleycam', 'menu', 'chair'],
    van: ['door:corridor', 'workbench', 'punchclock', 'shelfunit', 'crates', 'barrel', 'boxes']
  },

  hints: [
    { when: (f) => !f.changed },
    { when: (f) => !f.lock },
    { when: (f) => !f.platform },
    { when: (f) => !f.receipt },
    { when: (f) => !f.clock },
    { when: (f) => !f.route },
    { when: () => true }
  ]
};
