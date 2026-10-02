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
  bind: { 'office:phonelog': 'lure', 'office:recording': 'reading', 'office:statements': 'slip', 'office:keylog': 'cabinet', 'yard:camerapost': 'yard' },

  facts: {
    changed: { required: true, eliminates: [] },
    lure: { required: true, eliminates: [] },
    reading: { required: true, eliminates: ['lucia', 'gideon'] },
    slip: { required: true, eliminates: ['lucia', 'gideon'] },
    cabinet: { required: true, eliminates: ['wanda', 'gideon'] },
    yard: { required: true, eliminates: ['wanda'] },
    ladder: { required: false, eliminates: [] }
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
    yard: ['door:office', 'bin', 'bush', 'bench', 'camerapost', 'tree', 'flowerbed']
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
