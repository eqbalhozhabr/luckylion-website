'use strict';
/* ============================================================
   Case 4 rooms (Aldermere House), from the space kit. The greenhouse is
   the base scene as Mabel found it at 06:40; moments are patches over it.
   env.wet = the mist has soaked the floor (the chalk's own footprint stays dry).
   ============================================================ */

const GREENHOUSE = makeSpace('greenhouse', {
  id: 'greenhouse', seed: 21, theme: 0, time: 'auto', fill: 0, env: { wet: true },
  doors: [{ slot: 'RC', to: 'kitchen', kind: 'door' }, { slot: 'LC', to: 'yard', kind: 'door' }, { slot: 'LA', to: 'shed', kind: 'door' }],
  lay: () => ({
    fixed: true,
    R: [WP('plantbench', 2.4, 0.9, { id: 'bench1' }), WP('plantbench', 1.6, 0.9, { id: 'bench2' })],
    L: [],
    free: [
      OBJ('floorlamp', 6.8, 2.6, 0.6, 0.6, { id: 'growlamp' }),
      OBJ('planter', 6.5, 4.3, 0.9, 0.9, { id: 'orchid' }),
      OBJ('ladder', 3.9, 4.6, 1.8, 0.5, { h: 44, face: 'y', id: 'ladder', lying: true }),
      OBJ('wateringcan', 5.4, 5.0, 1.2, 0.5, { id: 'can', spilled: true }),
      OBJ('chalk', 2.0, 1.9, 3.24, 2.34, { id: 'chalk', dir: 'x', s: 0.9 })
    ]
  }),
  items: [
    { id: 'cup', k: 'cup', hot: 'cup', on: 'bench1', x: 2.15, y: 0.45, fill: 'residue' },
    { id: 'mistmeter', k: 'meter', hot: 'mistmeter', on: 'bench2', x: 3.9, y: 0.45 }
  ]
});

const KITCHEN = makeSpace('kitchen', {
  id: 'kitchen', seed: 23, theme: 0, time: 'night', fill: 0,
  doors: [{ slot: 'LC', to: 'greenhouse', kind: 'door' }],
  lay: () => ({
    fixed: true,
    R: [WP('fridge', 0.9, 0.9, { gap: 0 }), WP('kcounter', 1.0, 0.95, { kind: 'stove', gap: 0 }), WP('kcounter', 2.0, 0.95, { kind: 'sink', gap: 0 }), WP('kcounter', 1.2, 0.95)],
    L: [WP('kcounter', 2.4, 0.95, { gap: 0 }), WP('bin', 0.7, 0.7)],
    free: [OBJ('table', 3.2, 3.6, 2.0, 1.1, { id: 'table' }), OBJ('chair', 3.5, 4.8, 0.55, 0.55, { back: 'Y', id: 'chair1' }), OBJ('chair', 4.6, 4.8, 0.55, 0.55, { back: 'Y', id: 'chair2' })]
  }),
  items: [
    { id: 'phone', k: 'phone', hot: 'phone', on: 'table', x: 3.7, y: 4.1 },
    { id: 'keylist', k: 'papers', hot: 'keylist', on: 'table', x: 4.7, y: 4.1 }
  ]
});

const SHED = makeSpace('storage', {
  id: 'shed', seed: 25, theme: 0, time: 'night', fill: 0,
  doors: [{ slot: 'RC', to: 'greenhouse', kind: 'door' }],
  lay: () => ({
    fixed: true,
    R: [WP('workbench', 2.6, 1.1, { id: 'bench', bare: true }), WP('shelfunit', 2.2, 0.8, { h: 46 })],
    L: [WP('shelfunit', 2.4, 0.8, { h: 46 }), WP('boxes', 1.2, 1.2)],
    free: [OBJ('barrel', 5.0, 4.2, 1.2, 1.2, { h: 20, id: 'raincask' }), OBJ('crates', 2.8, 4.8, 1.5, 1.5)]
  }),
  items: [
    { id: 'notebook', k: 'papers', hot: 'notebook', on: 'bench', x: 1.0, y: 0.55 },
    { id: 'report', k: 'papers', hot: 'report', on: 'bench', x: 2.0, y: 0.55, cover: 'blue' }
  ]
});

const YARD = makeSpace('yard', {
  id: 'yard', seed: 27, theme: 0, time: 'night', fill: 0,
  doors: [{ slot: 'RC', to: 'greenhouse', kind: 'door' }],
  lay: () => ({
    fixed: true,
    R: [WP('bush', 1.0, 1.0, { flowers: 'pink' }), WP('bench', 2.4, 0.8)],
    L: [WP('bin', 0.7, 0.7)],
    free: [OBJ('tree', 5.2, 3.0, 1.4, 1.4), OBJ('camerapost', 0.7, 5.8, 0.6, 0.6, { id: 'camerapost' }), OBJ('flowerbed', 3.6, 6.0, 1.8, 1.2, { id: 'flowerbed' })]
  }),
  items: []
});

const ROOMS = { greenhouse: GREENHOUSE, kitchen: KITCHEN, yard: YARD, shed: SHED };

/* ============================================================
   Case 4 : "The Greenhouse"  (the-greenhouse)

   Boards, keys and a hidden key like cases 2 and 3. The new ideas:
   - a NATURE CLOCK: the mist system soaked the floor at 22:00, but the ground under
     the body is dry, so she was lying there before the mist (the "accident at 22:30" is a staging);
   - an IGNORANCE PROOF: the spilled can holds tap water, but Beatrix only ever used rainwater,
     and everyone who knows her garden would have filled it from the barrel.

   TRUTH (Saturday night, Aldermere House):
     20:08  Rowan brings Beatrix tea (greenhouse door opened with a key). 20:12 he leaves.
     20:10  Mabel leaves by the side gate; the gate locks itself at 20:12 until 06:00.
     20:36  Julian lets himself in with his old key. A quarrel about Monday's new will. 20:39 she falls and dies.
     20:40  Rowan and Cordelia are at the dinner table, in a photo with a time stamp.
     20:41  Julian leaves. He tips the ladder, spills a can of TAP water and knocks the orchid pot over: "she fell while checking the mist".
     22:00  The mist runs over the whole floor, except under the body. 06:40 Mabel finds her.
   ============================================================ */

const CASE = {
  id: 'the-greenhouse', no: 4, slug: 'the-greenhouse',
  difficulty: 3, minutes: 28, dayStart: '18:00',
  intro: 3, sceneRoom: 'greenhouse',

  victim: { portrait: { skin: '#e3b997', hair: '#e8e8ee', style: 'bun', glasses: true, shirt: '#6a8a5a', collar: '#f0ead8' } },

  suspects: [
    {
      id: 'julian', keyAccess: true, knowsRain: false,
      portrait: { skin: '#e8c4a6', hair: '#6a5a48', style: 'short', shirt: '#7a4b3a', collar: '#e8e0c8', mustache: '#6a5a48' },
      proofs: []
    },
    {
      id: 'rowan', keyAccess: true, knowsRain: true,
      portrait: { skin: '#d9a07c', hair: '#3a2a22', style: 'short', shirt: '#5a8a6a', collar: '#e8f0e0' },
      proofs: [{ at: '20:40', kind: 'person', src: 'dinner photo' }]
    },
    {
      id: 'cordelia', keyAccess: false, knowsRain: false,
      portrait: { skin: '#e0b08c', hair: '#8a3a3a', style: 'long', shirt: '#a85a7a', collar: '#f0e0e8' },
      proofs: [{ at: '20:40', kind: 'person', src: 'dinner photo' }]
    },
    {
      id: 'mabel', keyAccess: true, knowsRain: true,
      portrait: { skin: '#c8936c', hair: '#1f1a1c', style: 'bun', shirt: '#4f7aa8', collar: '#dfe8f0' },
      proofs: [{ at: '20:10', kind: 'person', src: 'gate camera' }]
    }
  ],

  /* the numbers the boards must agree with (tests/lint.mjs recomputes every answer from these) */
  truth: { window: ['20:36', '20:41'], moment: '20:40', mist: '22:00', gateOut: '20:10', padlock: '20:12', claimed: '22:30' },
  herring: { suspect: 'rowan', motive: 'greenhouse' },

  moments: [
    {
      id: 'mabel', time: '19:50', who: 'mabel',
      patches: [
        { env: { time: 'night', wet: false } }, { id: 'chalk', remove: true }, { id: 'growlamp', set: { lit: true } }, { id: 'ladder', set: { x: 4.6, y: 0, w: 0.9, d: 0.3, lying: false } },
        { id: 'can', set: { spilled: false, x: 4.5, y: 1.2, w: 0.6, d: 0.6 } }, { id: 'orchid', set: { x: 1.2, y: 4.7 } }, { id: 'cup', remove: true }
      ]
    },
    {
      id: 'rowan', time: '20:15', who: 'rowan',
      patches: [
        { env: { time: 'night', wet: false } }, { id: 'chalk', remove: true }, { id: 'growlamp', set: { lit: true } }, { id: 'ladder', set: { x: 4.6, y: 0, w: 0.9, d: 0.3, lying: false } },
        { id: 'can', set: { spilled: false, x: 4.5, y: 1.2, w: 0.6, d: 0.6 } }, { id: 'orchid', set: { x: 1.2, y: 4.7 } }
      ]
    },
    { id: 'scene', time: '06:40', who: null, patches: [{ env: { time: 'day' } }] }
  ],

  diff: { a: 'rowan', b: 'scene', need: 3, ignore: ['chalk'], items: ['floorlamp', 'ladder', 'wateringcan', 'planter'], notes: ['chalk'] },

  boards: {
    dry: {
      fact: 'dry', question: { kind: 'choice', options: ['alone', 'visit', 'dawn', 'midnight'], answer: 'visit' },
      docs: {
        mist: { cols: 3, rows: [[{ t: '22:00' }, { k: 'ev.mist' }, '5'], [{ t: '06:00' }, { k: 'ev.mist' }, '5']] },
        floor: { frames: [{ t: '06:50', spec: { scene: 'glassfloor', figs: [] } }] },
        doorlog: { cols: 2, rows: [
          [{ t: '20:08' }, { k: 'ev.keyin' }], [{ t: '20:12' }, { k: 'ev.thumb' }], [{ t: '20:36' }, { k: 'ev.keyin' }], [{ t: '20:41' }, { k: 'ev.thumb' }], [{ t: '06:40' }, { k: 'ev.keyin' }]
        ] }
      }
    },
    water: {
      fact: 'water', question: { kind: 'many', answer: ['mabel', 'rowan'] },
      truth: (s) => s.knowsRain, elim: 'selected',
      docs: {
        notebook: { cols: 2, rows: [[{ k: 'nb.a' }, { k: 'nb.av' }], [{ k: 'nb.b' }, { k: 'nb.bv' }], [{ k: 'nb.c' }, { k: 'nb.cv' }]] },
        report: { cols: 2, rows: [[{ k: 'rp.a' }, { k: 'rp.av' }], [{ k: 'rp.b' }, { k: 'rp.bv' }], [{ k: 'rp.c' }, { k: 'rp.cv' }]] },
        rota: { cols: 2, rows: [[{ s: 'mabel' }, { k: 'ro.mabel' }], [{ s: 'rowan' }, { k: 'ro.rowan' }], [{ s: 'cordelia' }, { k: 'ro.cordelia' }], [{ s: 'julian' }, { k: 'ro.julian' }]] }
      }
    },
    gate: {
      fact: 'gate', question: { kind: 'one', answer: 'mabel' },
      truth: (s) => s.proofs.some((p) => p.kind === 'person' && /gate/.test(p.src)), elim: 'selected',
      docs: {
        camera: { frames: [
          { t: '20:08', spec: { scene: 'gate', figs: [{ who: 'mabel', x: 20, h: 34, hold: 'bag' }] } },
          { t: '20:10', spec: { scene: 'gate', figs: [{ who: 'mabel', x: 46, h: 34, hold: 'bag' }] } },
          { t: '20:14', spec: { scene: 'gate', figs: [] } }
        ] },
        lock: { cols: 3, rows: [[{ k: 'lk.side' }, { t: '20:12' }, { t: '06:00' }], [{ k: 'lk.main' }, { t: '18:00' }, { t: '07:00' }]] }
      }
    },
    table: {
      fact: 'table', question: { kind: 'many', answer: ['rowan', 'cordelia'] },
      truth: (s, V) => s.proofs.some((p) => p.kind === 'person' && p.at === V.moment && /dinner/.test(p.src)), elim: 'selected',
      docs: {
        photos: { frames: [
          { t: '20:20', spec: { scene: 'dining', figs: [{ who: 'rowan', x: 26, h: 36 }, { who: 'cordelia', x: 50, h: 34, flip: true }] } },
          { t: '20:40', spec: { scene: 'dining', figs: [{ who: 'rowan', x: 28, h: 36 }, { who: 'cordelia', x: 48, h: 34, flip: true }] } },
          { t: '21:00', spec: { scene: 'dining', figs: [{ who: 'rowan', x: 30, h: 36 }, { who: 'cordelia', x: 46, h: 34, flip: true }] } }
        ] },
        meta: { cols: 3, rows: [[{ k: 'ph.p1' }, { t: '20:20' }, { k: 'ph.dev' }], [{ k: 'ph.p2' }, { t: '20:40' }, { k: 'ph.dev' }], [{ k: 'ph.p3' }, { t: '21:00' }, { k: 'ph.dev' }]] }
      }
    },
    door: {
      fact: 'door', question: { kind: 'many', answer: ['mabel', 'rowan', 'julian'] },
      truth: (s) => s.keyAccess, elim: 'unselected',
      docs: {
        keys: { cols: 3, rows: [
          [{ k: 'kg.beatrix' }, { k: 'kg.master' }, { k: 'kg.held' }], [{ s: 'mabel' }, { k: 'kg.gardener' }, { k: 'kg.held' }], [{ s: 'rowan' }, { k: 'kg.grandson' }, { k: 'kg.held' }],
          [{ s: 'julian' }, { k: 'kg.old' }, { k: 'kg.never' }], [{ s: 'cordelia' }, { k: 'kg.daughter' }, { k: 'kg.returned' }]
        ] }
      }
    }
  },
  bind: { 'greenhouse:mistmeter': 'dry', 'shed:notebook': 'water', 'shed:report': 'water', 'yard:camerapost': 'gate', 'kitchen:phone': 'table', 'kitchen:keylist': 'door' },

  /* the shed is padlocked; its key is under a pot in the yard's flowerbed */
  items: { shedkey: {} },
  finds: { 'yard:flowerbed': { give: 'shedkey' } },
  gates: { 'greenhouse:shed': { need: 'shedkey' } },
  /* behind the fridge is the fuse box for the mist, lights and heating; its spring setting is on a card in the shed */
  containers: { 'kitchen:fridge': { kind: 'fuses', pattern: '101', fact: 'fused', clue: 'shed:crates' } },

  facts: {
    changed: { required: true, eliminates: [] },
    dry: { required: true, eliminates: [] },
    water: { required: true, eliminates: ['rowan', 'mabel'] },
    gate: { required: true, eliminates: ['mabel'] },
    table: { required: true, eliminates: ['rowan', 'cordelia'] },
    door: { required: true, eliminates: ['cordelia'] },
    ladder: { required: false, eliminates: [] },
    fused: { required: false, eliminates: [] }
  },
  observe: { ladder: { fact: 'ladder' } },

  accuse: {
    who: { culprit: 'julian', options: [{ id: 'julian' }, { id: 'rowan', refutedBy: 'table' }, { id: 'cordelia', refutedBy: 'door' }, { id: 'mabel', refutedBy: 'gate' }] },
    how: { culprit: 'staged', options: [{ id: 'staged' }, { id: 'fall', refutedBy: 'dry' }, { id: 'burglar', refutedBy: 'door' }] },
    why: { culprit: 'will', options: [{ id: 'will' }, { id: 'greenhouse', refutedBy: 'table' }, { id: 'job', refutedBy: 'gate' }] }
  },

  verdict: { truth: 7, next: { no: 5 } },

  rooms: ['greenhouse', 'kitchen', 'yard', 'shed'],
  map: { start: 'greenhouse', nodes: [{ id: 'kitchen', x: 0, y: 0 }, { id: 'greenhouse', x: 1, y: 0 }, { id: 'yard', x: 2, y: 0 }, { id: 'shed', x: 1, y: 1 }], edges: [['kitchen', 'greenhouse'], ['greenhouse', 'yard'], ['greenhouse', 'shed']] },
  hots: {
    greenhouse: ['door:yard', 'door:shed', 'door:kitchen', 'plantbench', 'mistmeter', 'ladder', 'planter', 'wateringcan', 'floorlamp', 'cup', 'chalk'],
    kitchen: ['window', 'door:greenhouse', 'fridge', 'kcounter', 'bin', 'table', 'phone', 'keylist', 'chair'],
    yard: ['window', 'door:greenhouse', 'bush', 'bin', 'bench', 'camerapost', 'tree', 'flowerbed'],
    shed: ['window', 'door:greenhouse', 'workbench', 'notebook', 'report', 'shelfunit', 'boxes', 'crates', 'barrel']
  },

  hints: [
    { when: (f) => !f.changed },
    { when: (f) => !f.dry },
    { when: (f) => !f.water },
    { when: (f) => !f.gate },
    { when: (f) => !f.table },
    { when: (f) => !f.door },
    { when: () => true }
  ]
};

NUT_LAYOUT.boot(ROOMS, CASE, "the-greenhouse", {"version":1,"case":"the-greenhouse","rooms":{"greenhouse":{"size":[8,6],"objects":[{"id":"bench1","type":"plantbench","hot":"plantbench","cell":[0.25,0],"footprint":[2.4,0.9],"props":{"face":"y"},"class":"free","base":"1k0tllj"},{"id":"bench2","type":"plantbench","hot":"plantbench","cell":[2.8,0],"footprint":[1.6,0.9],"props":{"face":"y"},"class":"free","base":"1nqh502"},{"id":"growlamp","type":"floorlamp","hot":"floorlamp","cell":[6.8,2.6],"footprint":[0.6,0.6],"class":"locked","why":["patched"],"base":"qn3iqz"},{"id":"orchid","type":"planter","hot":"planter","cell":[6.5,4.3],"footprint":[0.9,0.9],"class":"locked","why":["patched"],"base":"qq4k0j"},{"id":"ladder","type":"ladder","hot":"ladder","cell":[3.9,4.6],"footprint":[1.8,0.5],"props":{"h":44,"face":"y","lying":true},"class":"locked","why":["patched"],"base":"1e5jw5b"},{"id":"can","type":"wateringcan","hot":"wateringcan","cell":[5.4,5],"footprint":[1.2,0.5],"props":{"spilled":true},"class":"locked","why":["patched"],"base":"1svwb0p"},{"id":"chalk","type":"chalk","hot":"chalk","cell":[2,1.9],"footprint":[3.24,2.34],"props":{"dir":"x","s":0.9},"class":"locked","why":["patched"],"base":"85szt0"}],"items":[{"id":"cup","type":"cup","hot":"cup","host":"bench1","offset":[1.9,0.45],"props":{"fill":"residue"},"class":"locked","why":["zoom","patched"],"base":"c0pf52"},{"id":"mistmeter","type":"meter","hot":"mistmeter","host":"bench2","offset":[1.1,0.45],"class":"locked","why":["puzzle"],"base":"19b62qe"}],"wall":[{"key":"L:door:yard","wall":"L","name":"door:yard","span":[3.9,5.9],"z":[0,42],"class":"free","base":"1apfaf7"},{"key":"L:door:shed","wall":"L","name":"door:shed","span":[0.8,2.8],"z":[0,42],"class":"locked","why":["puzzle"],"base":"jassjj"},{"key":"R:door:kitchen","wall":"R","name":"door:kitchen","span":[5.9,7.9],"z":[0,42],"class":"free","base":"s8amah"}]},"kitchen":{"size":[8,8],"objects":[{"id":"fridge1","type":"fridge","hot":"fridge","cell":[0.25,0],"footprint":[0.9,0.9],"props":{"face":"y"},"class":"locked","why":["puzzle"],"base":"11qq5yf"},{"id":"kcounter2","type":"kcounter","hot":"kcounter","cell":[1.15,0],"footprint":[1,0.95],"props":{"kind":"stove","face":"y"},"class":"free","base":"12vifqu"},{"id":"kcounter3","type":"kcounter","hot":"kcounter","cell":[2.15,0],"footprint":[2,0.95],"props":{"kind":"sink","face":"y"},"class":"free","base":"a5wmun"},{"id":"kcounter4","type":"kcounter","hot":"kcounter","cell":[4.15,0],"footprint":[1.2,0.95],"props":{"face":"y"},"class":"free","base":"9zufr6"},{"id":"kcounter5","type":"kcounter","hot":"kcounter","cell":[0,1],"footprint":[0.95,2.4],"props":{"face":"x"},"class":"free","base":"1sgy1a4"},{"id":"bin6","type":"bin","hot":"bin","cell":[0,3.4],"footprint":[0.7,0.7],"props":{"face":"x"},"class":"free","base":"35plr1"},{"id":"table","type":"table","hot":"table","cell":[3.2,3.6],"footprint":[2,1.1],"class":"free","base":"j1pm1g"},{"id":"chair1","type":"chair","hot":"chair","cell":[3.5,4.8],"footprint":[0.55,0.55],"props":{"back":"Y"},"class":"free","base":"1u3r264"},{"id":"chair2","type":"chair","hot":"chair","cell":[4.6,4.8],"footprint":[0.55,0.55],"props":{"back":"Y"},"class":"free","base":"17knogp"}],"items":[{"id":"phone","type":"phone","hot":"phone","host":"table","offset":[0.5,0.5],"class":"locked","why":["puzzle"],"base":"e5nt9m"},{"id":"keylist","type":"papers","hot":"keylist","host":"table","offset":[1.5,0.5],"class":"locked","why":["puzzle"],"base":"mrue4a"}],"wall":[{"key":"L:window","wall":"L","name":"window","span":[0.8,2.8],"z":[24,48],"class":"free","base":"1yoqh87"},{"key":"L:window#2","wall":"L","name":"window","span":[3.2,5.2],"z":[24,48],"class":"free","base":"1nat7c6"},{"key":"L:door:greenhouse","wall":"L","name":"door:greenhouse","span":[5.9,7.9],"z":[0,42],"class":"free","base":"1beyyg9"},{"key":"R:window","wall":"R","name":"window","span":[0.8,2.8],"z":[24,48],"class":"free","base":"9r6oub"},{"key":"R:window#2","wall":"R","name":"window","span":[3.2,5.2],"z":[24,48],"class":"free","base":"93jbhy"},{"key":"R:window#3","wall":"R","name":"window","span":[5.6,7.6],"z":[24,48],"class":"free","base":"khqwuh"}]},"yard":{"size":[8,8],"objects":[{"id":"bush1","type":"bush","hot":"bush","cell":[0.25,0],"footprint":[1,1],"props":{"flowers":"pink","face":"y"},"class":"free","base":"1g27nme"},{"id":"bench2","type":"bench","hot":"bench","cell":[1.4,0],"footprint":[2.4,0.8],"props":{"face":"y"},"class":"free","base":"159mklj"},{"id":"bin3","type":"bin","hot":"bin","cell":[0,1.1],"footprint":[0.7,0.7],"props":{"face":"x"},"class":"free","base":"aq39b3"},{"id":"tree4","type":"tree","hot":"tree","cell":[5.2,3],"footprint":[1.4,1.4],"class":"free","base":"w1w64o"},{"id":"camerapost","type":"camerapost","hot":"camerapost","cell":[0.7,5.8],"footprint":[0.6,0.6],"class":"locked","why":["puzzle"],"base":"1aw6xsn"},{"id":"flowerbed","type":"flowerbed","hot":"flowerbed","cell":[3.6,6],"footprint":[1.8,1.2],"class":"locked","why":["puzzle"],"base":"1wz4lzr"}],"items":[],"wall":[{"key":"R:window","wall":"R","name":"window","span":[3.2,5.2],"z":[24,48],"class":"free","base":"j41tmj"},{"key":"R:door:greenhouse","wall":"R","name":"door:greenhouse","span":[5.9,7.9],"z":[0,42],"class":"free","base":"1plfesl"}]},"shed":{"size":[7,7],"objects":[{"id":"bench","type":"workbench","hot":"workbench","cell":[0.25,0],"footprint":[2.6,1.1],"props":{"bare":true,"face":"y"},"class":"free","base":"1mi54yr"},{"id":"shelfunit2","type":"shelfunit","hot":"shelfunit","cell":[0,1.2],"footprint":[0.8,2.4],"props":{"h":46,"face":"x"},"class":"free","base":"1sfw6bm"},{"id":"boxes3","type":"boxes","hot":"boxes","cell":[0,3.75],"footprint":[1.2,1.2],"props":{"face":"x"},"class":"free","base":"tffdty"},{"id":"raincask","type":"barrel","hot":"barrel","cell":[5,4.2],"footprint":[1.2,1.2],"props":{"h":20},"class":"free","base":"mjd4yl"},{"id":"crates5","type":"crates","hot":"crates","cell":[2.8,4.8],"footprint":[1.5,1.5],"class":"locked","why":["puzzle"],"base":"1xdo173"}],"items":[{"id":"notebook","type":"papers","hot":"notebook","host":"bench","offset":[0.75,0.55],"class":"locked","why":["puzzle"],"base":"1d554ol"},{"id":"report","type":"papers","hot":"report","host":"bench","offset":[1.75,0.55],"props":{"cover":"blue"},"class":"locked","why":["puzzle"],"base":"1mp3kjz"}],"wall":[{"key":"L:window","wall":"L","name":"window","span":[0.8,2.8],"z":[24,48],"class":"free","base":"1yoqh87"},{"key":"R:window","wall":"R","name":"window","span":[0.8,2.8],"z":[24,48],"class":"free","base":"9r6oub"},{"key":"R:door:greenhouse","wall":"R","name":"door:greenhouse","span":[4.9,6.9],"z":[0,42],"class":"locked","why":["puzzle"],"base":"1axyfdt"}]}}});