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

NUT_LAYOUT.boot(ROOMS, CASE, "night-train", {"version":1,"case":"night-train","rooms":{"cabin":{"size":[8,6],"objects":[{"id":"bed","type":"bed","hot":"bed","cell":[5,0],"footprint":[2.6,4.3],"props":{"body":"chalk"},"class":"locked","why":["zoom","patched"],"base":"197oww8"},{"id":"nightstand","type":"nightstand","hot":"nightstand","cell":[3.2,0],"footprint":[1.7,1.4],"props":{"h":15},"class":"free","base":"127nm2k"},{"id":"dresser","type":"dresser","hot":"dresser","cell":[0,0.9],"footprint":[1.5,2.8],"props":{"h":17,"face":"x","decor":false},"class":"free","base":"1k5mevw"},{"id":"slippers","type":"slippers","hot":"slippers","cell":[2,4.1],"footprint":[1.35,1.1],"props":{"pose":"scattered"},"class":"locked","why":["zoom","patched"],"base":"1hvjmu8"},{"id":"pouf5","type":"pouf","hot":"pouf","cell":[4,4.2],"footprint":[1.2,1.2],"class":"free","base":"csq3yr"},{"id":"trainrail6","type":"trainrail","hot":null,"cell":[0,5.86],"footprint":[8,0.14],"class":"free","base":"1jai8wj"},{"id":"trainrail7","type":"trainrail","hot":null,"cell":[7.86,0],"footprint":[0.14,6],"class":"free","base":"jvy1da"},{"id":"trainwheels8","type":"trainwheels","hot":null,"cell":[0,5.95],"footprint":[8,0.05],"class":"free","base":"1lgrtgn"}],"items":[{"id":"lamp","type":"lamp","hot":"lamp","host":"nightstand","offset":[0.5,0.6],"props":{"lit":false},"class":"locked","why":["zoom","patched"],"base":"12q8d1r"},{"id":"cup","type":"cup","hot":"cup","host":"dresser","offset":[0.8,2.4],"props":{"fill":"residue"},"class":"locked","why":["zoom","patched"],"base":"fdua08"},{"id":"lockpanel","type":"meter","hot":"lockpanel","host":"dresser","offset":[0.8,1.55],"class":"locked","why":["puzzle"],"base":"coicfg"}],"wall":[{"key":"L:door:corridor","wall":"L","name":"door:corridor","span":[3.9,5.9],"z":[0,42],"class":"free","base":"162la9j"}]},"corridor":{"size":[11,4],"objects":[{"id":"desk","type":"desk","hot":"desk","cell":[3.4,0],"footprint":[3.2,1.3],"props":{"h":17,"face":"y"},"class":"free","base":"1h9ds5f"},{"id":"plant2","type":"plant","hot":"plant","cell":[7.2,0.1],"footprint":[0.9,0.9],"class":"free","base":"bby7ef"},{"id":"boxes3","type":"boxes","hot":"boxes","cell":[8.6,2.4],"footprint":[1.2,1.2],"class":"free","base":"53d76u"},{"id":"trainrail4","type":"trainrail","hot":null,"cell":[0,3.86],"footprint":[11,0.14],"class":"free","base":"qqm4gn"},{"id":"trainrail5","type":"trainrail","hot":null,"cell":[10.86,0],"footprint":[0.14,4],"class":"free","base":"q2j5co"},{"id":"trainwheels6","type":"trainwheels","hot":null,"cell":[0,3.95],"footprint":[11,0.05],"class":"free","base":"gjgxor"}],"items":[{"id":"monitor","type":"monitor","hot":"monitor","host":"desk","offset":[1,0.62],"class":"locked","why":["puzzle","zoom"],"base":"14hf2kk"}],"wall":[{"key":"L:door:diner","wall":"L","name":"door:diner","span":[0.8,2.8],"z":[0,42],"class":"free","base":"1ndpk6p"},{"key":"R:door:cabin","wall":"R","name":"door:cabin","span":[0.8,2.8],"z":[0,42],"class":"free","base":"10sqqoh"},{"key":"R:door:van","wall":"R","name":"door:van","span":[8.9,10.9],"z":[0,42],"class":"locked","why":["puzzle"],"base":"fxf3va"}]},"diner":{"size":[11,4],"objects":[{"id":"fridge1","type":"fridge","hot":"fridge","cell":[0.25,0],"footprint":[0.9,0.9],"props":{"face":"y"},"class":"free","base":"11qq5yf"},{"id":"kcounter2","type":"kcounter","hot":"kcounter","cell":[1.15,0],"footprint":[1,0.95],"props":{"kind":"stove","face":"y"},"class":"free","base":"12vifqu"},{"id":"kcounter3","type":"kcounter","hot":"kcounter","cell":[2.15,0],"footprint":[2,0.95],"props":{"kind":"sink","face":"y"},"class":"free","base":"a5wmun"},{"id":"kcounter4","type":"kcounter","hot":"kcounter","cell":[4.15,0],"footprint":[1.2,0.95],"props":{"face":"y"},"class":"free","base":"9zufr6"},{"id":"table","type":"table","hot":"table","cell":[7,1.1],"footprint":[2,1.1],"class":"free","base":"1b42thz"},{"id":"chair1","type":"chair","hot":"chair","cell":[7.3,2.35],"footprint":[0.55,0.55],"props":{"back":"Y"},"class":"free","base":"15ffv46"},{"id":"chair2","type":"chair","hot":"chair","cell":[8.4,2.35],"footprint":[0.55,0.55],"props":{"back":"Y"},"class":"free","base":"1fwnq7v"},{"id":"table2","type":"table","hot":"table","cell":[3.6,2],"footprint":[2,1.1],"class":"free","base":"gq8l1t"},{"id":"chair3","type":"chair","hot":"chair","cell":[3.9,3.25],"footprint":[0.55,0.55],"props":{"back":"Y"},"class":"free","base":"rcez6a"},{"id":"chair4","type":"chair","hot":"chair","cell":[5,3.25],"footprint":[0.55,0.55],"props":{"back":"Y"},"class":"free","base":"b8vw56"},{"id":"bin11","type":"bin","hot":"bin","cell":[0.5,3.1],"footprint":[0.7,0.7],"class":"locked","why":["puzzle"],"base":"pb2wgg"},{"id":"trainrail12","type":"trainrail","hot":null,"cell":[0,3.86],"footprint":[11,0.14],"class":"free","base":"1dv7e3a"},{"id":"trainrail13","type":"trainrail","hot":null,"cell":[10.86,0],"footprint":[0.14,4],"class":"free","base":"qii5qp"},{"id":"trainwheels14","type":"trainwheels","hot":null,"cell":[0,3.95],"footprint":[11,0.05],"class":"free","base":"qkqc6"}],"items":[{"id":"receipts","type":"papers","hot":"receipts","host":"table","offset":[0.35,0.5],"class":"locked","why":["puzzle"],"base":"4qqifi"},{"id":"galleycam","type":"monitor","hot":"galleycam","host":"table","offset":[1.05,0.5],"class":"locked","why":["puzzle"],"base":"23034p"},{"id":"menu","type":"papers","hot":"menu","host":"table","offset":[1.65,0.5],"props":{"cover":"blue"},"class":"locked","why":["puzzle"],"base":"nkkml7"}],"wall":[{"key":"L:door:corridor","wall":"L","name":"door:corridor","span":[0.8,2.8],"z":[0,42],"class":"free","base":"1hfjd2r"}]},"van":{"size":[11,4],"objects":[{"id":"bench","type":"workbench","hot":"workbench","cell":[0.25,0],"footprint":[2.6,1.1],"props":{"bare":true,"face":"y"},"class":"free","base":"1mi54yr"},{"id":"shelfunit2","type":"shelfunit","hot":"shelfunit","cell":[3,0],"footprint":[2.2,0.8],"props":{"h":46,"face":"y"},"class":"free","base":"ub65i3"},{"id":"crates3","type":"crates","hot":"crates","cell":[5.6,1.2],"footprint":[1.5,1.5],"class":"locked","why":["puzzle"],"base":"1h6y10b"},{"id":"drum","type":"barrel","hot":"barrel","cell":[8.2,1.2],"footprint":[1.2,1.2],"props":{"h":20},"class":"free","base":"jmlx21"},{"id":"boxes5","type":"boxes","hot":"boxes","cell":[9.4,2.5],"footprint":[1.2,1.2],"class":"free","base":"g3pjle"},{"id":"crates6","type":"crates","hot":"crates","cell":[3.4,2.4],"footprint":[1.5,1.5],"class":"locked","why":["puzzle"],"base":"tc4loz"},{"id":"trainrail7","type":"trainrail","hot":null,"cell":[0,3.86],"footprint":[11,0.14],"class":"free","base":"v31bgk"},{"id":"trainrail8","type":"trainrail","hot":null,"cell":[10.86,0],"footprint":[0.14,4],"class":"free","base":"1x538r5"},{"id":"trainwheels9","type":"trainwheels","hot":null,"cell":[0,3.95],"footprint":[11,0.05],"class":"free","base":"1bm5xio"}],"items":[{"id":"punchclock","type":"meter","hot":"punchclock","host":"bench","offset":[0.75,0.55],"class":"locked","why":["puzzle"],"base":"7nlsdl"}],"wall":[{"key":"L:door:corridor","wall":"L","name":"door:corridor","span":[0.8,2.8],"z":[0,42],"class":"locked","why":["puzzle"],"base":"1hfjd2r"}]}}});