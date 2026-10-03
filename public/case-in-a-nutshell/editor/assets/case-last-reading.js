'use strict';
/* ============================================================
   Case 3 rooms (Hartwell Library), from the space kit. The reading room
   (library) is the base scene as Wanda found it at 22:05; moments are
   patches over it.
   ============================================================ */

const LIBRARY = makeSpace('library', {
  id: 'library', seed: 11, theme: 0, time: 'auto', fill: 0,
  doors: [{ slot: 'RC', to: 'office', kind: 'door' }],
  lay: () => ({
    fixed: true,
    R: [WP('nook', 2.2, 1.1), WP('floorlamp', 0.6, 0.6, { id: 'floorlamp' })],
    L: [WP('armchair', 1.2, 1.2), WP('ladder', 0.9, 0.3, { h: 44, id: 'ladder' })],
    free: [
      OBJ('table', 3.2, 3.4, 1.8, 1.2, { id: 'table' }),
      OBJ('chair', 2.5, 3.6, 0.6, 0.6, { back: 'x', id: 'chair1' }), OBJ('chair', 5.3, 3.6, 0.6, 0.6, { back: 'X', id: 'chair2' }),
      OBJ('bookpile', 5.6, 1.6, 0.8, 0.6, { id: 'bookpile' }),
      OBJ('chalk', 0.6, 2.2, 1.82, 2.52, { id: 'chalk', dir: 'y', s: 0.7 })
    ]
  }),
  items: [
    { id: 'cup', k: 'cup', hot: 'cup', on: 'table', x: 4.5, y: 4.0, fill: 'residue' }
  ]
});

const OFFICE = makeSpace('office', {
  id: 'office', seed: 13, theme: 1, time: 'night', fill: 0,
  doors: [{ slot: 'RC', to: 'library', kind: 'door' }, { slot: 'LC', to: 'yard', kind: 'door' }],
  lay: () => ({
    fixed: true,
    R: [WP('desk', 3.2, 1.3, { h: 17, id: 'desk' }), WP('cabinet', 0.9, 0.9)],
    L: [WP('cabinet', 0.9, 0.9), WP('plant', 0.9, 0.9)],
    free: [OBJ('table', 3.2, 3.6, 2.0, 1.1, { id: 'table' }), OBJ('plant', 6.7, 6.7, 0.9, 0.9)]
  }),
  items: [
    { id: 'phonelog', k: 'ledger', hot: 'phonelog', on: 'desk', x: 0.85, y: 0.65 },
    { id: 'recording', k: 'monitor', hot: 'recording', on: 'desk', x: 1.95, y: 0.62 },
    { id: 'statements', k: 'papers', hot: 'statements', on: 'table', x: 3.9, y: 4.1, cover: 'blue' },
    { id: 'keylog', k: 'papers', hot: 'keylog', on: 'table', x: 4.9, y: 4.1 }
  ]
});

const YARD = makeSpace('yard', {
  id: 'yard', seed: 17, theme: 0, time: 'night', fill: 0,
  doors: [{ slot: 'RC', to: 'office', kind: 'door' }],
  lay: () => ({
    fixed: true,
    R: [WP('bush', 1.0, 1.0, { flowers: 'pink' }), WP('bench', 2.4, 0.8)],
    L: [WP('bin', 0.7, 0.7), WP('bin', 0.7, 0.7)],
    free: [OBJ('tree', 5.2, 3.0, 1.4, 1.4), OBJ('camerapost', 0.7, 5.8, 0.6, 0.6, { id: 'camerapost' }), OBJ('flowerbed', 4.0, 6.0, 1.8, 1.2)]
  }),
  items: []
});

const ROOMS = { library: LIBRARY, office: OFFICE, yard: YARD };

/* ============================================================
   Case 3 : "The Last Reading"  (last-reading)

   Built from boards like case 2. The new ideas here:
   - a LURE: a phone call from an empty desk sends the victim somewhere;
   - a KNOWLEDGE SLIP: someone says something in a statement that only
     certain people could have known at that time;
   - a travel table (walking times inside the villa).

   TRUTH (Saturday night, Hartwell Library):
     19:40  Lucia (guest author) takes a quiet minute in the reading room.
     20:30  Wanda dusts the reading room and leaves.
     20:40  The reading starts in the Great Hall. Lucia is on stage, Gideon is in the front row.
            Tomas is "at the sound desk" behind the curtain. Between 20:52 and 21:12 the desk only does timer presets.
     20:56  A call from the empty front desk rings Ingrid's office: "Wanda: water in the rare-book room." She goes.
     21:02  A thump from the library corridor on a hall mic. Ingrid dies on the reading-room floor; the ladder had been moved and the lamp put out.
     21:02  Wanda is on the yard camera, putting out the bins. 22:05 she finds Ingrid.
     22:30  Statements are taken. Tomas mentions "the audit on Monday" (the sealed letter is opened at 22:50).
   ============================================================ */

const CASE = {
  id: 'last-reading', no: 3, slug: 'last-reading',
  difficulty: 3, minutes: 28, dayStart: '18:00',
  intro: 3, sceneRoom: 'library',

  victim: { portrait: { skin: '#e8c4a6', hair: '#cfcfd6', style: 'bun', glasses: true, shirt: '#6a5a8a', collar: '#e8e0f0' } },

  suspects: [
    {
      id: 'tomas', keyAccess: true, knewAudit: true,
      portrait: { skin: '#e3b997', hair: '#3a2a22', style: 'short', glasses: true, shirt: '#5a6a7a', collar: '#e8e4d8' },
      proofs: [{ at: '20:52', kind: 'thing', src: 'sound desk timer' }, { at: '21:00', kind: 'thing', src: 'sound desk timer' }]
    },
    {
      id: 'lucia', keyAccess: true, knewAudit: false,
      portrait: { skin: '#d9a07c', hair: '#7a2f3a', style: 'long', shirt: '#b04a6a', collar: '#f0e0e0' },
      proofs: [{ at: '21:02', kind: 'person', src: 'hall camera' }]
    },
    {
      id: 'gideon', keyAccess: false, knewAudit: false,
      portrait: { skin: '#c8936c', hair: '#9a9aa6', style: 'short', mustache: '#9a9aa6', shirt: '#2f5a46', collar: '#e8e0c8' },
      proofs: [{ at: '21:02', kind: 'person', src: 'hall camera' }]
    },
    {
      id: 'wanda', keyAccess: false, knewAudit: true,
      portrait: { skin: '#e0b08c', hair: '#4a3a30', style: 'bun', shirt: '#4f7aa8', collar: '#dfe8f0' },
      proofs: [{ at: '21:02', kind: 'person', src: 'yard camera' }]
    }
  ],

  /* the numbers the boards must agree with (tests/lint.mjs recomputes every answer from these) */
  truth: { window: ['20:58', '21:10'], thump: '21:02', call: '20:56', walk: { deskFront: 25, frontLib: 40 }, presets: ['20:52', '21:00'], manual: '21:12' },
  herring: { suspect: 'lucia', motive: 'grudge' },

  /* ----- the reading room at three moments (patches over the 22:05 scene) ----- */
  moments: [
    {
      id: 'lucia', time: '19:40', who: 'lucia',
      patches: [
        { env: { time: 'night' } }, { id: 'chalk', remove: true }, { id: 'floorlamp', set: { lit: true } }, { id: 'ladder', set: { y: 1.6 } }, { id: 'bookpile', set: { x: 6.2, y: 1.0 } },
        { add: { id: 'shelflist', k: 'papers', hot: 'shelflist', on: 'table', x: 3.9, y: 3.95 }, item: true }
      ]
    },
    {
      id: 'wanda', time: '20:30', who: 'wanda',
      patches: [
        { env: { time: 'night' } }, { id: 'chalk', remove: true }, { id: 'floorlamp', set: { lit: true } }, { id: 'ladder', set: { y: 1.6 } }, { id: 'bookpile', set: { x: 6.2, y: 1.0 } },
        { add: { id: 'shelflist', k: 'papers', hot: 'shelflist', on: 'table', x: 3.9, y: 3.95 }, item: true }
      ]
    },
    { id: 'scene', time: '22:05', who: null, patches: [{ env: { time: 'night' } }] }
  ],

  diff: { a: 'wanda', b: 'scene', need: 3, ignore: ['chalk'], items: ['floorlamp', 'ladder', 'shelflist', 'bookpile'], notes: ['chalk'] },

  boards: {
    reading: {
      fact: 'reading', question: { kind: 'many', answer: ['lucia', 'gideon'] },
      truth: (s, V) => s.proofs.some((p) => p.kind === 'person' && p.at === V.thump && /hall/.test(p.src)), elim: 'selected',
      docs: {
        hall: { frames: [
          { t: '20:45', spec: { scene: 'hall', figs: [{ who: 'lucia', x: 46, base: 31, h: 24 }, { who: 'gideon', x: 16, base: 52, h: 16 }] } },
          { t: '21:02', spec: { scene: 'hall', figs: [{ who: 'lucia', x: 46, base: 31, h: 24 }, { who: 'gideon', x: 16, base: 52, h: 16 }] } },
          { t: '21:30', spec: { scene: 'hall', figs: [{ who: 'lucia', x: 46, base: 31, h: 24 }, { who: 'gideon', x: 16, base: 52, h: 16 }] } }
        ] },
        desk: { cols: 3, rows: [
          [{ t: '20:40' }, { k: 'src.manual' }, { k: 'ev.mic' }],
          [{ t: '20:52' }, { k: 'src.timer' }, { k: 'ev.presetB' }],
          [{ t: '21:00' }, { k: 'src.timer' }, { k: 'ev.presetC' }],
          [{ t: '21:02' }, { k: 'src.mic4' }, { k: 'ev.thump' }],
          [{ t: '21:12' }, { k: 'src.manual' }, { k: 'ev.fader' }]
        ] }
      }
    },
    lure: {
      fact: 'lure', question: { kind: 'choice', options: ['routine', 'called', 'book', 'leak'], answer: 'called' },
      docs: {
        calls: { cols: 4, rows: [
          [{ t: '18:20' }, { k: 'ph.front' }, { k: 'ph.caterer' }, '1:10'],
          [{ t: '20:56' }, { k: 'ph.front' }, { k: 'ph.director' }, '0:38'],
          [{ t: '22:06' }, { k: 'ph.cleaner' }, { k: 'ph.emergency' }, '1:30']
        ] },
        diary: { cols: 2, rows: [[{ t: '20:40' }, { k: 'dy.start' }], [{ t: '20:56' }, { k: 'dy.leak' }]] },
        walk: { cols: 2, rows: [[{ k: 'wk.a' }, '25'], [{ k: 'wk.b' }, '40'], [{ k: 'wk.c' }, '55'], [{ k: 'wk.d' }, '90']] }
      }
    },
    slip: {
      fact: 'slip', question: { kind: 'many', answer: ['tomas', 'wanda'] },
      truth: (s) => s.knewAudit, elim: 'unselected',
      docs: {
        statements: { cols: 3, rows: [
          [{ s: 'tomas' }, { t: '22:30' }, { k: 'q.tomas' }], [{ s: 'lucia' }, { t: '22:31' }, { k: 'q.lucia' }],
          [{ s: 'gideon' }, { t: '22:33' }, { k: 'q.gideon' }], [{ s: 'wanda' }, { t: '22:34' }, { k: 'q.wanda' }]
        ] },
        letter: { cols: 3, rows: [
          [{ k: 'lt.when1' }, { k: 'lt.who1' }, { k: 'lt.what1' }], [{ k: 'lt.when2' }, { k: 'lt.who2' }, { k: 'lt.what2' }], [{ t: '22:50' }, { k: 'lt.who3' }, { k: 'lt.what3' }]
        ] }
      }
    },
    cabinet: {
      fact: 'cabinet', question: { kind: 'many', answer: ['tomas', 'lucia'] },
      truth: (s) => s.keyAccess, elim: 'unselected',
      docs: {
        keys: { cols: 3, rows: [
          [{ k: 'kg.d1' }, { k: 'kg.assistant' }, { s: 'tomas' }], [{ k: 'kg.d2' }, { k: 'kg.assistant' }, { k: 'kg.lucia' }],
          [{ k: 'kg.d3' }, { k: 'kg.assistant' }, { s: 'tomas' }], [{ k: 'kg.d4' }, { k: 'kg.director' }, { k: 'kg.ingrid' }]
        ] },
        shelf: { cols: 2, rows: [[{ k: 'sh.a' }, { k: 'sh.av' }], [{ k: 'sh.b' }, { k: 'sh.bv' }], [{ k: 'sh.c' }, { k: 'sh.cv' }]] }
      }
    },
    yard: {
      fact: 'yard', question: { kind: 'one', answer: 'wanda' },
      truth: (s) => s.proofs.some((p) => p.kind === 'person' && /yard/.test(p.src)), elim: 'selected',
      docs: {
        camera: { frames: [
          { t: '20:55', spec: { scene: 'yard', figs: [{ who: 'wanda', x: 40, h: 34, hold: 'bin' }] } },
          { t: '21:02', spec: { scene: 'yard', figs: [{ who: 'wanda', x: 52, h: 34, hold: 'bin', flip: true }] } },
          { t: '21:10', spec: { scene: 'yard', figs: [{ who: 'wanda', x: 36, h: 34 }] } }
        ] },
        form: { cols: 2, rows: [[{ k: 'fm.job' }, { k: 'fm.jobv' }], [{ k: 'fm.time' }, { t: '20:55' }], [{ k: 'fm.done' }, { t: '21:10' }], [{ k: 'fm.sign' }, { s: 'wanda' }]] }
      }
    }
  },
  /* the puzzle layer: the yard door is locked until its key is found in the reading room */
  items: { yardkey: {} },
  finds: { 'library:nook': { give: 'yardkey' } },
  gates: { 'office:yard': { need: 'yardkey' } },
  /* the filing cabinet has a wire panel; the pairing is on a scrap of paper in the reading room */
  containers: { 'office:cabinet': { kind: 'wires', pairs: { red: 'square', blue: 'circle', green: 'triangle' }, decoys: { colors: ['yellow'], symbols: ['star'] }, fact: 'marked', clue: 'library:bookpile' } },
  bind: { 'office:phonelog': 'lure', 'office:recording': 'reading', 'office:statements': 'slip', 'office:keylog': 'cabinet', 'yard:camerapost': 'yard' },

  facts: {
    changed: { required: true, eliminates: [] },
    lure: { required: true, eliminates: [] },
    reading: { required: true, eliminates: ['lucia', 'gideon'] },
    slip: { required: true, eliminates: ['lucia', 'gideon'] },
    cabinet: { required: true, eliminates: ['wanda', 'gideon'] },
    yard: { required: true, eliminates: ['wanda'] },
    ladder: { required: false, eliminates: [] },
    marked: { required: false, eliminates: [] }
  },
  observe: { ladder: { fact: 'ladder' } },

  accuse: {
    who: { culprit: 'tomas', options: [{ id: 'tomas' }, { id: 'lucia', refutedBy: 'reading' }, { id: 'gideon', refutedBy: 'cabinet' }, { id: 'wanda', refutedBy: 'yard' }] },
    how: { culprit: 'lured', options: [{ id: 'lured' }, { id: 'accident', refutedBy: 'lure' }, { id: 'burglar', refutedBy: 'changed' }] },
    why: { culprit: 'exposure', options: [{ id: 'exposure' }, { id: 'grudge', refutedBy: 'reading' }, { id: 'greed', refutedBy: 'cabinet' }] }
  },

  verdict: { truth: 7, next: { no: 4 } },

  rooms: ['library', 'office', 'yard'],
  map: { start: 'library', nodes: [{ id: 'library', x: 0, y: 0 }, { id: 'office', x: 1, y: 0 }, { id: 'yard', x: 2, y: 0 }], edges: [['library', 'office'], ['office', 'yard']] },
  hots: {
    library: ['chalk', 'window', 'picture', 'door:office', 'armchair', 'nook', 'ladder', 'floorlamp', 'chair', 'bookpile', 'table', 'cup', 'shelflist'],
    office: ['window', 'door:yard', 'picture', 'door:library', 'cabinet', 'desk', 'phonelog', 'recording', 'plant', 'table', 'statements', 'keylog'],
    yard: ['window', 'door:office', 'bin', 'bush', 'bench', 'camerapost', 'tree', 'flowerbed']
  },

  hints: [
    { when: (f) => !f.changed },
    { when: (f) => !f.lure },
    { when: (f) => !f.reading },
    { when: (f) => !f.slip },
    { when: (f) => !f.cabinet },
    { when: (f) => !f.yard },
    { when: () => true }
  ]
};

NUT_LAYOUT.boot(ROOMS, CASE, "last-reading", {"version":1,"case":"last-reading","rooms":{"library":{"size":[8,8],"objects":[{"id":"nook1","type":"nook","hot":"nook","cell":[0.25,0],"footprint":[2.2,1.1],"props":{"face":"y"},"class":"locked","why":["puzzle"],"base":"10igvj7"},{"id":"floorlamp","type":"floorlamp","hot":"floorlamp","cell":[2.6,0],"footprint":[0.6,0.6],"props":{"face":"y"},"class":"locked","why":["patched"],"base":"17a0i7k"},{"id":"armchair3","type":"armchair","hot":"armchair","cell":[0,1.2],"footprint":[1.2,1.2],"props":{"face":"x"},"class":"free","base":"6c30ig"},{"id":"ladder","type":"ladder","hot":"ladder","cell":[0,2.55],"footprint":[0.3,0.9],"props":{"h":44,"face":"x"},"class":"locked","why":["patched"],"base":"1a7wx4l"},{"id":"table","type":"table","hot":"table","cell":[3.2,3.4],"footprint":[1.8,1.2],"class":"free","base":"1f95o2w"},{"id":"chair1","type":"chair","hot":"chair","cell":[2.5,3.6],"footprint":[0.6,0.6],"props":{"back":"x"},"class":"free","base":"mlv00f"},{"id":"chair2","type":"chair","hot":"chair","cell":[5.3,3.6],"footprint":[0.6,0.6],"props":{"back":"X"},"class":"free","base":"1121rat"},{"id":"bookpile","type":"bookpile","hot":"bookpile","cell":[5.6,1.6],"footprint":[0.8,0.6],"class":"locked","why":["puzzle","patched"],"base":"kvmz2n"},{"id":"chalk","type":"chalk","hot":"chalk","cell":[0.6,2.2],"footprint":[1.82,2.52],"props":{"dir":"y","s":0.7},"class":"locked","why":["patched"],"base":"asc961"}],"items":[{"id":"cup","type":"cup","hot":"cup","host":"table","offset":[1.3,0.6],"props":{"fill":"residue"},"class":"locked","why":["zoom"],"base":"xp2mpa"}],"wall":[{"key":"L:window","wall":"L","name":"window","span":[0.8,2.8],"z":[24,48],"class":"free","base":"1yoqh87"},{"key":"L:picture","wall":"L","name":"picture","span":[3.6,4.8],"z":[28,44],"class":"free","base":"egykt6"},{"key":"R:window","wall":"R","name":"window","span":[0.8,2.8],"z":[24,48],"class":"free","base":"9r6oub"},{"key":"R:window#2","wall":"R","name":"window","span":[3.2,5.2],"z":[24,48],"class":"free","base":"93jbhy"},{"key":"R:door:office","wall":"R","name":"door:office","span":[5.9,7.9],"z":[0,42],"class":"free","base":"1uj0mif"}]},"office":{"size":[8,8],"objects":[{"id":"desk","type":"desk","hot":"desk","cell":[0.25,0],"footprint":[3.2,1.3],"props":{"h":17,"face":"y"},"class":"free","base":"1k3f2k9"},{"id":"cabinet2","type":"cabinet","hot":"cabinet","cell":[3.6,0],"footprint":[0.9,0.9],"props":{"face":"y"},"class":"locked","why":["puzzle"],"base":"wcso1f"},{"id":"cabinet3","type":"cabinet","hot":"cabinet","cell":[0,1.4],"footprint":[0.9,0.9],"props":{"face":"x"},"class":"locked","why":["puzzle"],"base":"zpxi1r"},{"id":"plant4","type":"plant","hot":"plant","cell":[0,2.45],"footprint":[0.9,0.9],"props":{"face":"x"},"class":"free","base":"1gs4409"},{"id":"table","type":"table","hot":"table","cell":[3.2,3.6],"footprint":[2,1.1],"class":"free","base":"j1pm1g"},{"id":"plant6","type":"plant","hot":"plant","cell":[6.7,6.7],"footprint":[0.9,0.9],"class":"free","base":"u8co0r"}],"items":[{"id":"phonelog","type":"ledger","hot":"phonelog","host":"desk","offset":[0.6,0.65],"class":"locked","why":["puzzle"],"base":"8yuy1f"},{"id":"recording","type":"monitor","hot":"recording","host":"desk","offset":[1.7,0.62],"class":"locked","why":["puzzle"],"base":"e8c23t"},{"id":"statements","type":"papers","hot":"statements","host":"table","offset":[0.7,0.5],"props":{"cover":"blue"},"class":"locked","why":["puzzle"],"base":"18zl3o"},{"id":"keylog","type":"papers","hot":"keylog","host":"table","offset":[1.7,0.5],"class":"locked","why":["puzzle"],"base":"w5bdg"}],"wall":[{"key":"L:window","wall":"L","name":"window","span":[0.8,2.8],"z":[24,48],"class":"free","base":"1yoqh87"},{"key":"L:window#2","wall":"L","name":"window","span":[3.2,5.2],"z":[24,48],"class":"free","base":"1nat7c6"},{"key":"L:door:yard","wall":"L","name":"door:yard","span":[5.9,7.9],"z":[0,42],"class":"locked","why":["puzzle"],"base":"1xdbmg7"},{"key":"R:picture","wall":"R","name":"picture","span":[1.2,2.4],"z":[28,44],"class":"free","base":"1kg2poq"},{"key":"R:window","wall":"R","name":"window","span":[3.2,5.2],"z":[24,48],"class":"free","base":"j41tmj"},{"key":"R:door:library","wall":"R","name":"door:library","span":[5.9,7.9],"z":[0,42],"class":"free","base":"epggc9"}]},"yard":{"size":[8,8],"objects":[{"id":"bush1","type":"bush","hot":"bush","cell":[0.25,0],"footprint":[1,1],"props":{"flowers":"pink","face":"y"},"class":"free","base":"1g27nme"},{"id":"bench2","type":"bench","hot":"bench","cell":[1.4,0],"footprint":[2.4,0.8],"props":{"face":"y"},"class":"free","base":"159mklj"},{"id":"bin3","type":"bin","hot":"bin","cell":[0,1.1],"footprint":[0.7,0.7],"props":{"face":"x"},"class":"free","base":"aq39b3"},{"id":"bin4","type":"bin","hot":"bin","cell":[0,1.95],"footprint":[0.7,0.7],"props":{"face":"x"},"class":"free","base":"xfj35n"},{"id":"tree5","type":"tree","hot":"tree","cell":[5.2,3],"footprint":[1.4,1.4],"class":"free","base":"t2e6jr"},{"id":"camerapost","type":"camerapost","hot":"camerapost","cell":[0.7,5.8],"footprint":[0.6,0.6],"class":"locked","why":["puzzle"],"base":"1aw6xsn"},{"id":"flowerbed7","type":"flowerbed","hot":"flowerbed","cell":[4,6],"footprint":[1.8,1.2],"class":"free","base":"1peth6v"}],"items":[],"wall":[{"key":"R:window","wall":"R","name":"window","span":[0.8,2.8],"z":[24,48],"class":"free","base":"9r6oub"},{"key":"R:window#2","wall":"R","name":"window","span":[3.2,5.2],"z":[24,48],"class":"free","base":"93jbhy"},{"key":"R:door:office","wall":"R","name":"door:office","span":[5.9,7.9],"z":[0,42],"class":"locked","why":["puzzle"],"base":"1uj0mif"}]}}});