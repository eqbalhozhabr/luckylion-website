'use strict';
/* ============================================================
   Case 1 rooms. These are the BASE rooms; every moment of the
   case (see case.js `moments`) is a list of patches laid over them.
   Base = the discovery scene at 07:05.
   ============================================================ */

/* the framed mechanism drawing above the bed. count + marked gear make the music box code. */
const BLUEPRINT = {
  gears: [[8.5, 14, 4, 8], [13.8, 6, 3.2, 6], [19, 14, 4, 8], [24.2, 6, 3.2, 6], [29.5, 14, 4, 8]],
  mark: 2
};
BLUEPRINT.code = String(BLUEPRINT.gears.length) + String(BLUEPRINT.mark + 1);

const BEDROOM = {
  id: 'bedroom', name: 'اتاق خواب', slab: 'slab', rim: 'rim', hasRug: true,
  env: { curtains: 'closed', tod: 'morning', lampOn: false },
  pal: {
    slab: '#3a2c33', rim: '#3a2d36',
    wallB: '#86a6ab', wallBd: '#668a93', trim: '#d9c9a3',
    wood: '#6b4a3a', woodDk: '#3d2c2c', woodLt: '#9a6e48',
    floorA: '#c9bca3', floorB: '#b6a98f', grout: '#7d7262',
    cab: '#2f4b5d', cabLt: '#3d6279', navy: '#2b4a5e', bedwood: '#4a3433',
    blue: '#2f6f8f', blueLt: '#d3e8ec', pillow: '#ece7d8', sheet: '#d9d3c4',
    shade: '#5aa4a8', shadeOn: '#f8e4a6', brass: '#e0b04a', brassBox: '#c8963e',
    leaf: '#4f9a5b', leafLt: '#7cc07a', clay: '#b4623e', pouf: '#3b84a6',
    rug: '#3f9aa8', rugEdge: '#e6f1e8', ghost: '#f1f8f2',
    sky: '#17203a', skyLt: '#27345a', star: '#f5f0c8', moon: '#f4ecc0',
    curtain: '#d6b36a', curtainDk: '#a98a48', leak: '#fff3c4',
    frame: '#3a2a2a', ink: '#2a2132', bookA: '#c05a4a', bookB: '#e3c06a', bookC: '#4f7aa8',
    skin: '#e9b99a', hairGray: '#cfcfd6', chalk: '#f6f3e8',
    paper: '#f4ead0', herb: '#5f9a4c', cupBlue: '#3b7fb8', saucer: '#f1e8d3',
    tea: '#7a3e22', teaLow: '#a8764a', residue: '#efe9dc',
    slipper: '#b8483f', slipperIn: '#5a2a2e', sole: '#6b5a4a',
    bpBg: '#2a4f86', bpGrid: '#2f5a96', bpLine: '#cfe4ff', bpGear: '#7fa9dd', bpMark: '#ff5a4a'
  },
  floor: (st, room) => (x, y) => {
    const dx = x - 3.5, dy = y - 4.6;
    const q = (dx * 0.9 + dy * 0.2) * (dx * 0.9 + dy * 0.2) / (2.3 * 2.3) + (dy * 0.9 - dx * 0.2) * (dy * 0.9 - dx * 0.2) / (1.6 * 1.6);
    if (q <= 1) {
      const gx = (x - y) * 10 - (3.5 - 4.6) * 10, gy = (x + y) * 5 - (3.5 + 4.6) * 5;
      const hx = gx, vy = gy + 1;
      const head = (hx * hx + (vy + 3) * (vy + 3)) <= 36;
      const body = Math.abs(hx) <= 6 && vy >= -3 && vy <= 6 - (Math.abs(Math.floor(hx / 3)) % 2 === 0 ? 0 : 1.5);
      const eye = (Math.abs(Math.abs(hx) - 2.5) < 0.9) && Math.abs(vy + 3) < 0.9;
      if (head || body) return [eye ? col('ink', 0) : col('ghost', 0), 1];
      if (q > 0.8) return [col('rugEdge', 0), 1];
      return [(Math.floor(x * 5) + Math.floor(y * 5)) % 2 ? col('rug', 0.03) : col('rug', -0.03), 1];
    }
    const tx = Math.floor(x), ty = Math.floor(y);
    const fx = x - tx, fy = y - ty;
    if (fx < 0.08 || fy < 0.08) return col('grout', 0);
    const base = (tx + ty) % 2 ? 'floorA' : 'floorB';
    const n = hash2(Math.floor(x * 8), Math.floor(y * 8));
    return col(base, n < 0.05 ? 0.1 : n > 0.95 ? -0.1 : 0);
  },
  walls: (st, room) => {
    const env = room.env;
    const night = (ix, iz, w, h, seed) => {
      const t = iz / h; const n = hash2(ix + seed, iz);
      if (n > 0.965) return col('star', 0.1);
      return t > 0.55 ? col('skyLt', 0) : col('sky', 0);
    };
    const winPaint = (seed, moon) => (ix, iz, w, h) => {
      if (ix === 0 || ix === w - 1 || iz === h - 1) return col('woodDk', 0);
      if (ix < 2 || ix >= w - 2 || iz >= h - 2) return col('trim', 0);
      if (iz < 3) return col('trim', 0.2);
      if (env.curtains === 'closed') {
        if (iz >= h - 4) return col('brass', 0);
        if (env.tod === 'morning' && (ix === 2 || ix === w - 3 || iz === h - 5)) return col('leak', 0);
        const fold = (ix % 5);
        return fold === 0 ? col('curtainDk', 0) : fold === 1 ? col('curtain', 0.12) : col('curtain', 0);
      }
      if ((ix < 5 || ix >= w - 5) && iz < h - 3) return (ix + iz) % 4 === 0 ? col('curtainDk', 0) : col('curtain', 0);
      if (ix === Math.floor(w / 2) || iz === Math.floor(h / 2)) return col('trim', -0.1);
      if (moon && (ix - 14) * (ix - 14) + (iz - 14) * (iz - 14) <= 7) return col('moon', 0);
      return night(ix, iz, w, h, seed);
    };
    const gears = BLUEPRINT.gears;
    const lampOn = !!env.lampOn;
    return {
      L: {
        base: (u, z) => {
          if (z < 4) return col('woodDk', 0);
          if (z < 5) return col('woodDk', -0.4);
          if (z < 18) { const f = u * 2 - Math.floor(u * 2); return f < 0.08 ? col('wallBd', -0.25) : col('wallBd', 0); }
          if (z < 20) return col('trim', -0.1);
          const n = hash2(Math.floor(u * 10), Math.floor(z));
          return n < 0.05 ? col('wallB', 0.12) : n > 0.96 ? col('wallB', -0.08) : col('wallB', 0);
        },
        items: [
          { name: 'window', u0: 0.9, u1: 3.0, z0: 24, z1: 48, paint: winPaint(3, false) },
          { name: 'window', u0: 3.5, u1: 5.6, z0: 24, z1: 48, paint: winPaint(11, true) },
          { name: 'door:hall', u0: 6.0, u1: 8.0, z0: 0, z1: 42, paint: (ix, iz, w, h) => {
            if (ix < 2 || ix >= w - 2 || iz >= h - 2) return col('woodDk', -0.1);
            const midz = Math.floor(h / 2);
            const panel = ix >= 4 && ix < w - 4 && ((iz >= 4 && iz < midz - 3) || (iz >= midz + 3 && iz < h - 5));
            if (panel) { const edge = ix === 4 || iz === 4 || iz === midz + 3; return edge ? col('woodDk', 0) : col('wood', -0.05); }
            if (ix >= w - 6 && ix <= w - 5 && iz >= midz - 1 && iz <= midz) return col('brass', 0.1);
            return col('woodLt', -0.1);
          } }
        ]
      },
      R: {
        base: (u, z) => {
          if (z < 4) return col('woodDk', 0);
          if (z < 5) return col('woodDk', -0.4);
          if (z < 18) { const f = u * 2 - Math.floor(u * 2); return f < 0.08 ? col('wallBd', -0.3) : col('wallBd', -0.08); }
          if (z < 20) return col('trim', -0.15);
          const n = hash2(Math.floor(u * 10), Math.floor(z));
          return n < 0.05 ? col('wallB', 0.08) : n > 0.96 ? col('wallB', -0.12) : col('wallB', -0.06);
        },
        items: [
          { name: 'blueprint', u0: 4.0, u1: 7.8, z0: 26, z1: 48, paint: (ix, iz, w, h) => {
            if (ix < 2 || ix >= w - 2 || iz < 2 || iz >= h - 2) return col('frame', 0);
            for (let k = 0; k < gears.length; k++) {
              const G = gears[k], dx = ix - G[0], dz = iz - G[1], dist = Math.sqrt(dx * dx + dz * dz), r = G[2];
              const ang = Math.atan2(dz, dx), onTooth = dist > r && dist <= r + 1.3 && Math.abs(((ang / (Math.PI / 4)) % 1 + 1) % 1 - 0.5) > 0.3;
              if (dist <= r + 0.5 && dist > r - 0.9) return col('bpLine', 0);
              if (onTooth) return col('bpLine', 0);
              if (dist <= r - 0.9) {
                if (k === BLUEPRINT.mark && lampOn) return col('bpMark', dist < 1.5 ? 0.25 : 0);
                return dist < 1.2 ? col('bpLine', 0) : col('bpGear', -0.15);
              }
            }
            return (ix % 5 === 0 || iz % 5 === 0) ? col('bpGrid', 0) : col('bpBg', 0);
          } }
        ]
      }
    };
  },
  objects: [
    { id: 'bed', t: 'bed', hot: 'bed', x: 5.0, y: 0, w: 2.6, d: 4.3, body: 'chalk' },
    { id: 'nightstand', t: 'nightstand', hot: 'nightstand', x: 2.9, y: 0, w: 2.1, d: 1.5, h: 15 },
    { id: 'dresser', t: 'dresser', hot: 'dresser', x: 0, y: 0.9, w: 1.5, d: 4.7, h: 17 },
    { id: 'pouf', t: 'pouf', hot: 'pouf', x: 5.0, y: 5.4, w: 1.2, d: 1.2 },
    { id: 'plant', t: 'plant', hot: 'plant', x: 2.2, y: 6.6, w: 0.9, d: 0.9 },
    { id: 'slippers', t: 'slippers', hot: 'slippers', x: 0.55, y: 5.9, w: 1.35, d: 1.1, pose: 'scattered' }
  ],
  items: [
    { id: 'lamp', k: 'lamp', hot: 'lamp', on: 'nightstand', x: 3.4, y: 0.55, lit: false },
    { id: 'clock', k: 'clock', hot: 'clock', on: 'nightstand', x: 4.45, y: 0.62, time: '03:17', crownOut: true },
    { id: 'cup', k: 'cup', hot: 'cup', on: 'dresser', x: 0.8, y: 2.85, fill: 'residue' },
    { id: 'musicbox', k: 'musicbox', hot: 'musicbox', on: 'dresser', x: 0.35, y: 1.7, open: false, scratched: true }
  ],
  light: (st, t, room) => {
    const k = st.lampT, env = room.env;
    const base = env.tod === 'morning' ? [0.62, 0.6, 0.7] : [0.42, 0.5, 0.8], lit = [0.82, 0.82, 0.9];
    const amb = [0, 1, 2].map(i => base[i] + (lit[i] - base[i]) * k);
    const lampItem = room.items.find(i => i.id === 'lamp');
    const lp = P(lampItem.x, lampItem.y, 26), wp = P(0.3, 3.4, 34);
    return { amb, lights: [
      { sx: lp[0], sy: lp[1], r: 64, k: 0.95 * k, col: [0.95, 0.62, 0.26] },
      { sx: wp[0], sy: wp[1], r: 40, k: env.tod === 'morning' ? 0.1 : 0.2, col: [0.1, 0.2, 0.5] }
    ] };
  }
};

/* ============================================================
   The corridor outside unit 4: reception desk with the visitor log and
   the courtyard camera, the key board, the building cat, and a locked
   door marked 7 (the thread to the next case).
   ============================================================ */
const KEYBOARD = {
  tags: [[3, '#6aa8d8'], [4, '#e0584a'], [5, '#7cc27a'], [6, '#e6b84a'], [7, '#b27ad6'], [8, '#d98a4a']],
  missing: 7 // this hook is empty
};

const HALLWAY = {
  id: 'hall', name: 'راهرو', slab: 'slab', rim: 'rim', env: {},
  pal: {
    slab: '#4a3a2c', rim: '#3f3126',
    plaster: '#e8d6ab', plasterR: '#d9c593', wains: '#d4793b', wainsDk: '#b25f28', trim: '#f2e6c4',
    wood: '#8b5a3b', woodDk: '#4f3326', woodLt: '#b9804d', doorLocked: '#5b3a4a',
    tileA: '#dccdaa', tileB: '#c6b793', grout: '#8a7a5f', runner: '#3d7f66', runnerEdge: '#e8dcb5',
    brass: '#e0b04a', ink: '#2a2132', paper: '#f4ead0', frame: '#3a2a2a',
    keyFelt: '#2f5a46', mailbox: '#7c8b96', mailboxDk: '#5b6873', orange: '#f08a2b', leafG: '#4f9a5b',
    ledgerCover: '#7a2f3a', crt: '#cdbf9c', camSky: '#1c2a44', camGround: '#33503a', camTap: '#6fb7e8', camMan: '#e08a2a', skin: '#e9b99a',
    cat: '#e89a4a', catBib: '#f4ead8', rose: '#e07a7a', clay: '#b4623e', leaf: '#4f9a5b', leafLt: '#7cc07a'
  },
  floor: (st, room) => (x, y) => {
    const tx = Math.floor(x), ty = Math.floor(y), fx = x - tx, fy = y - ty;
    if (y > 3.1 && y < 4.9) {
      if (y < 3.3 || y > 4.7) return col('runnerEdge', 0);
      return (Math.floor(x * 5) % 2) && (Math.floor(y * 5) % 2) ? col('runner', 0.06) : col('runner', -0.02);
    }
    if (fx < 0.08 || fy < 0.08) return col('grout', 0);
    const n = hash2(Math.floor(x * 8), Math.floor(y * 8));
    return col((tx + ty) % 2 ? 'tileA' : 'tileB', n < 0.05 ? 0.1 : n > 0.95 ? -0.1 : 0);
  },
  walls: (st, room) => {
    const wains = (side) => (u, z) => {
      const dk = side === 'R' ? -0.08 : 0;
      if (z < 4) return col('woodDk', 0);
      if (z < 5) return col('woodDk', -0.4);
      if (z < 20) { const f = u * 2 - Math.floor(u * 2); return f < 0.08 ? col('wainsDk', -0.2 + dk) : col('wains', dk); }
      if (z < 22) return col('trim', -0.1 + dk);
      const n = hash2(Math.floor(u * 10), Math.floor(z));
      return n < 0.05 ? col('plaster', 0.12 + dk) : n > 0.96 ? col('plaster', -0.08 + dk) : col(side === 'R' ? 'plasterR' : 'plaster', 0);
    };
    return {
      L: {
        base: wains('L'),
        items: [
          { name: 'door:unit7', u0: 1.4, u1: 3.4, z0: 0, z1: 42, paint: doorPaint(true) },
          { name: 'door:bedroom', u0: 5.2, u1: 7.2, z0: 0, z1: 42, paint: doorPaint(false) }
        ]
      },
      R: {
        base: wains('R'),
        items: [
          { name: 'sign', u0: 0.9, u1: 2.7, z0: 30, z1: 46, paint: (ix, iz, w, h) => {
            if (ix < 2 || ix >= w - 2 || iz < 2 || iz >= h - 2) return col('frame', 0);
            const dx = ix - 8, dz = iz - 7;
            if (dx * dx + dz * dz <= 14) return col('orange', dx + dz < -2 ? 0.2 : 0);          // the orange of "Narenjestan"
            if (ix >= 9 && ix <= 11 && iz >= 10 && iz <= 11) return col('leafG', 0);
            if ((iz === 6 || iz === 9) && ix > 12 && ix < w - 3) return col('ink', 0.5);
            return col('paper', 0);
          } },
          { name: 'keyboard', u0: 4.4, u1: 6.8, z0: 24, z1: 48, paint: (ix, iz, w, h) => {
            if (ix === 0 || ix === w - 1 || iz === 0 || iz === h - 1) return col('frame', 0);
            if (ix === 1 || ix === w - 2 || iz === 1 || iz === h - 2) return col('woodLt', 0);
            for (let k = 0; k < KEYBOARD.tags.length; k++) {
              const [unit, colr] = KEYBOARD.tags[k], row = k < 3 ? 0 : 1, cx = 3 + (k % 3) * 7, top = row === 0 ? 21 : 10;
              if (ix === cx + 2 && iz === top + 1) return col('brass', 0.2);                    // the hook
              if (unit === KEYBOARD.missing) continue;
              if (ix >= cx && ix <= cx + 4 && iz <= top && iz >= top - 6) {
                return (ix === cx + 2 && iz === top - 2) ? col('ink', 0.35) : col(colr, 0);
              }
              if (ix === cx + 2 && iz < top - 6 && iz >= top - 9) return col('brass', -0.1);    // key shaft
            }
            return col('keyFelt', ((ix + iz) % 5 === 0) ? 0.08 : 0);
          } },
          { name: 'mailboxes', u0: 6.9, u1: 7.9, z0: 20, z1: 44, paint: (ix, iz, w, h) => {
            if (ix === 0 || ix === w - 1 || iz === 0 || iz === h - 1) return col('mailboxDk', -0.3);
            if (ix % 5 === 0 || iz % 6 === 0) return col('mailboxDk', 0);
            if (ix % 5 === 3 && iz % 6 === 3) return col('ink', 0);
            return col('mailbox', 0);
          } }
        ]
      }
    };
  },
  objects: [
    { id: 'desk', t: 'desk', hot: 'desk', x: 0.5, y: 0, w: 3.4, d: 1.3, h: 17 },
    { id: 'cat', t: 'cat', hot: 'cat', x: 4.4, y: 3.6, w: 0.8, d: 0.8 },
    { id: 'plant', t: 'plant', hot: 'plant', x: 6.9, y: 6.7, w: 0.9, d: 0.9 }
  ],
  items: [
    { id: 'ledger', k: 'ledger', hot: 'ledger', on: 'desk', x: 1.3, y: 0.7 },
    { id: 'monitor', k: 'monitor', hot: 'monitor', on: 'desk', x: 2.7, y: 0.65 },
    { id: 'bell', k: 'bell', hot: 'bell', on: 'desk', x: 3.4, y: 0.95 }
  ],
  light: (st, t, room) => {
    const mp = P(2.7, 0.65, 24), cp = P(4, 4, 56);
    return { amb: [0.9, 0.86, 0.82], lights: [
      { sx: cp[0], sy: cp[1], r: 80, k: 0.28, col: [0.6, 0.45, 0.2] },
      { sx: mp[0], sy: mp[1], r: 26, k: 0.5, col: [0.15, 0.4, 0.5] }
    ] };
  }
};

const ROOMS = { bedroom: BEDROOM, hall: HALLWAY };

/* ============================================================
   Case 1 : "Three Seventeen"  (three-seventeen)

   Structure only. Every sentence the player reads lives in
   i18n/<locale>.json and is found by a key built from the ids
   below (suspect.<id>.statement, fact.<id>.text, hot.<room>.<name>.say ...).
   The TRUTH is structured (who was verifiably where, who signs with
   which letter, what changed after whom) and the clues are derived
   from it. tests/lint.mjs proves the case is solvable and has exactly
   one answer; tests/i18n.mjs proves every locale has every key.

   Times are 'HH:MM'. Anything before dayStart belongs to the next
   morning, so 03:17 comes after 23:15.
   ============================================================ */

/* what the bedroom looked like at 22:50, written as the *reverse* of what was tampered with */
const BEFORE_TAMPER = [
  { id: 'lamp', set: { lit: true } },
  { id: 'cup', set: { on: 'nightstand', x: 3.95, y: 1.12, fill: 'low' } },
  { id: 'slippers', set: { pose: 'tidy', x: 4.1, y: 2.9, w: 0.77, d: 0.7 } },
  { id: 'clock', set: { time: '22:50', crownOut: false } },
  { id: 'musicbox', set: { scratched: false } },
  { id: 'bed', set: { body: 'none' } }
];

const CASE = {
  id: 'three-seventeen', no: 1, slug: 'three-seventeen',
  difficulty: 1, minutes: 12, dayStart: '18:00',
  intro: 3,

  victim: { portrait: { skin: '#e9b99a', hair: '#cfcfd6', style: 'short', glasses: true, mustache: '#e8e8ee', shirt: '#6b7d5a', collar: '#e8e0c8' } },

  suspects: [
    {
      id: 'maya', signs: ['B'],
      portrait: { skin: '#e3b08c', hair: '#2a1f2d', style: 'long', shirt: '#e9e1d0', collar: '#d46a5a', extra: 'paint' },
      verified: [
        { from: '20:50', to: '23:30', where: 'workshop', src: 'classmates' },
        { from: '20:50', to: '24:00', where: 'outside', src: 'visitor-log' }
      ]
    },
    {
      id: 'amara', signs: ['O'],
      portrait: { skin: '#b9825a', hair: '#2a1d1a', style: 'bun', shirt: '#5fb3b0', collar: '#e8f3f2' },
      verified: [{ from: '22:03', to: '24:00', where: 'outside', src: 'visitor-log' }]
    },
    {
      id: 'viktor', signs: ['R'], craft: 'clockmaker',
      portrait: { skin: '#e8c4a6', hair: '#9a9aa6', style: 'short', glasses: true, shirt: '#7a4b3a', collar: '#e8e0c8', extra: 'loupe' },
      verified: [{ from: '01:00', to: '05:00', where: 'hospital', src: 'hospital-record' }]
    },
    {
      id: 'mateo', signs: ['R'],
      portrait: { skin: '#c8936c', hair: '#2a2024', style: 'cap', cap: '#3a5d8a', mustache: '#2a2024', shirt: '#d98a2b', collar: '#b9701c' },
      verified: [{ from: '23:10', to: '23:55', where: 'yard', src: 'camera' }]
    }
  ],

  /* ----- the room at different moments (patches over the base scene) ----- */
  moments: [
    {
      id: 'maya', time: '20:50', who: 'maya',
      patches: BEFORE_TAMPER.concat([
        { env: { curtains: 'open', tod: 'night' } },
        { id: 'cup', remove: true },
        { id: 'clock', set: { time: '20:47' } }
      ])
    },
    {
      id: 'amara', time: '22:00', who: 'amara',
      patches: BEFORE_TAMPER.concat([
        { env: { curtains: 'closed', tod: 'night' } },
        { id: 'cup', set: { on: 'nightstand', x: 3.95, y: 1.12, fill: 'tea' } },
        { id: 'clock', set: { time: '21:58' } }
      ])
    },
    { id: 'viktor', time: '22:50', who: 'viktor', patches: BEFORE_TAMPER.concat([{ env: { curtains: 'closed', tod: 'night' } }]) },
    { id: 'scene', time: '07:05', who: null, patches: [] }
  ],

  /* ----- puzzle 1: what changed between Viktor's account and the scene ----- */
  diff: { a: 'viktor', b: 'scene', need: 3, ignore: ['bed'], items: ['lamp', 'cup', 'slippers', 'clock', 'musicbox'], notes: ['bed'] },

  /* ----- puzzle 2: the lying clock ----- */
  clock: { stoppedAt: '03:17', answer: ['viktor'] },

  /* ----- puzzle 3: the hallway ledgers. Cells: {s: suspect id} {k: text key} {t: time} or a literal ----- */
  hall: {
    window: ['23:15', '23:50'], answer: 'viktor',
    docs: {
      visitors: { cols: 4, rows: [[{ s: 'maya' }, { k: 'apt4' }, { t: '20:05' }, { t: '20:50' }], [{ s: 'amara' }, { k: 'apt4' }, { t: '21:15' }, { t: '22:03' }]] },
      keys: { cols: 4, rows: [[{ k: 'plumberKey' }, { t: '10:30' }, 'P', { t: '10:45' }], [{ k: 'apt4Key' }, { t: '23:15' }, 'R', { t: '23:50' }]], aside: true },
      camera: { frames: ['23:10', '23:25', '23:40', '23:55'] }
    }
  },

  /* ----- puzzle 4: the music box (code comes from the mechanism drawing, see rooms.js) ----- */
  lock: { digits: 2 },

  /* ----- facts: what the notebook can hold. `eliminates` is the logic the linter checks ----- */
  facts: {
    changed: { required: true, eliminates: [] },
    clock: { required: true, eliminates: ['maya', 'amara', 'mateo'] },
    key: { required: true, eliminates: ['maya', 'amara', 'mateo'] },
    motive: { required: true, eliminates: ['maya', 'amara', 'mateo'] },
    cup: { required: false, eliminates: ['amara'] },
    pillow: { required: false, eliminates: [] }
  },

  /* observations the player makes by tapping things in the scene */
  observe: { cup: { fact: 'cup' }, pillow: { fact: 'pillow' } },

  /* ----- the accusation board ----- */
  accuse: {
    who: { culprit: 'viktor', options: [{ id: 'maya', refutedBy: 'key' }, { id: 'amara', refutedBy: 'key' }, { id: 'viktor' }, { id: 'mateo', refutedBy: 'key' }] },
    how: { culprit: 'tea', options: [{ id: 'tea' }, { id: 'pillow', refutedBy: 'pillow' }, { id: 'slip', refutedBy: 'changed' }] },
    why: { culprit: 'design', options: [{ id: 'inherit', refutedBy: 'motive' }, { id: 'design' }, { id: 'rivalry', refutedBy: 'motive' }] }
  },

  /* ----- when solved ----- */
  verdict: { truth: 7, next: { no: 2 } },

  /* hotspots per room; texts: hot.<room>.<name>.label and .say (optionally .say.<momentId>, .say.lit/.dark, or .say.0 .1 ...) */
  rooms: ['bedroom', 'hall'],
  /* the map: where each space sits on the plan and which doors join them */
  map: { start: 'bedroom', nodes: [{ id: 'hall', x: 0, y: 0 }, { id: 'bedroom', x: 1, y: 0 }], edges: [['hall', 'bedroom']] },
  hots: {
    bedroom: ['bed', 'body', 'pillow', 'nightstand', 'window', 'dresser', 'plant', 'pouf', 'rug', 'slippers', 'blueprint', 'lamp', 'clock', 'cup', 'musicbox', 'door:hall'],
    hall: ['door:bedroom', 'door:unit7', 'sign', 'keyboard', 'mailboxes', 'desk', 'ledger', 'monitor', 'bell', 'cat', 'plant']
  },

  /* hint stages: the first stage whose `when` is true is the current one. Texts: hint.<index>.a (nudge) and .b (pointer) */
  hints: [
    { when: (f) => !f.changed },
    { when: (f) => !f.clock },
    { when: (f) => !f.key },
    { when: (f) => !f.motive },
    { when: () => true }
  ]
};

NUT_LAYOUT.boot(ROOMS, CASE, "three-seventeen", {"version":1,"case":"three-seventeen","rooms":{"bedroom":{"size":[8,8],"objects":[{"id":"bed","type":"bed","hot":"bed","cell":[5,0],"footprint":[2.6,4.3],"props":{"body":"chalk"},"class":"locked","why":["zoom","patched"],"base":"197oww8"},{"id":"nightstand","type":"nightstand","hot":"nightstand","cell":[2.9,0],"footprint":[2.1,1.5],"props":{"h":15},"class":"free","base":"zwi3oe"},{"id":"dresser","type":"dresser","hot":"dresser","cell":[0,0.9],"footprint":[1.5,4.7],"props":{"h":17},"class":"free","base":"189ns6s"},{"id":"pouf","type":"pouf","hot":"pouf","cell":[5,5.4],"footprint":[1.2,1.2],"class":"free","base":"qaf950"},{"id":"plant","type":"plant","hot":"plant","cell":[2.2,6.6],"footprint":[0.9,0.9],"class":"free","base":"zjsrqz"},{"id":"slippers","type":"slippers","hot":"slippers","cell":[0.55,5.9],"footprint":[1.35,1.1],"props":{"pose":"scattered"},"class":"locked","why":["zoom","patched"],"base":"i76mt9"}],"items":[{"id":"lamp","type":"lamp","hot":"lamp","host":"nightstand","offset":[0.5,0.55],"props":{"lit":false},"class":"locked","why":["zoom","patched"],"base":"2swesx"},{"id":"clock","type":"clock","hot":"clock","host":"nightstand","offset":[1.55,0.62],"props":{"time":"03:17","crownOut":true},"class":"locked","why":["zoom","patched"],"base":"uq5quw"},{"id":"cup","type":"cup","hot":"cup","host":"dresser","offset":[0.8,1.95],"props":{"fill":"residue"},"class":"locked","why":["zoom","patched"],"base":"1ec1eep"},{"id":"musicbox","type":"musicbox","hot":"musicbox","host":"dresser","offset":[0.35,0.8],"props":{"open":false,"scratched":true},"class":"locked","why":["zoom","patched"],"base":"1eoog4u"}],"wall":[{"key":"L:window","wall":"L","name":"window","span":[0.9,3],"z":[24,48],"class":"free","base":"1tef3jh"},{"key":"L:window#2","wall":"L","name":"window","span":[3.5,5.6],"z":[24,48],"class":"free","base":"1x0zum5"},{"key":"L:door:hall","wall":"L","name":"door:hall","span":[6,8],"z":[0,42],"class":"free","base":"1mr9kdl"},{"key":"R:blueprint","wall":"R","name":"blueprint","span":[4,7.8],"z":[26,48],"class":"locked","why":["zoom"],"base":"14hvhju"}]},"hall":{"size":[8,8],"objects":[{"id":"desk","type":"desk","hot":"desk","cell":[0.5,0],"footprint":[3.4,1.3],"props":{"h":17},"class":"free","base":"1zp9p7"},{"id":"cat","type":"cat","hot":"cat","cell":[4.4,3.6],"footprint":[0.8,0.8],"class":"locked","why":["zoom"],"base":"1j05g0f"},{"id":"plant","type":"plant","hot":"plant","cell":[6.9,6.7],"footprint":[0.9,0.9],"class":"free","base":"1vnh9xl"}],"items":[{"id":"ledger","type":"ledger","hot":"ledger","host":"desk","offset":[0.8,0.7],"class":"locked","why":["zoom"],"base":"1eh99vn"},{"id":"monitor","type":"monitor","hot":"monitor","host":"desk","offset":[2.2,0.65],"class":"locked","why":["zoom"],"base":"ynt8xu"},{"id":"bell","type":"bell","hot":"bell","host":"desk","offset":[2.9,0.95],"class":"free","base":"11ow2eh"}],"wall":[{"key":"L:door:unit7","wall":"L","name":"door:unit7","span":[1.4,3.4],"z":[0,42],"class":"free","base":"wg8hfx"},{"key":"L:door:bedroom","wall":"L","name":"door:bedroom","span":[5.2,7.2],"z":[0,42],"class":"free","base":"1udr359"},{"key":"R:sign","wall":"R","name":"sign","span":[0.9,2.7],"z":[30,46],"class":"free","base":"l0xzz0"},{"key":"R:keyboard","wall":"R","name":"keyboard","span":[4.4,6.8],"z":[24,48],"class":"locked","why":["zoom"],"base":"erjtg3"},{"key":"R:mailboxes","wall":"R","name":"mailboxes","span":[6.9,7.9],"z":[20,44],"class":"free","base":"v0e6h2"}]}}});