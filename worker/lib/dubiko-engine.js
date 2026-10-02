// GENERATED: a copy of Dubiko's src/engine.js (the rules and validateCity), so the Worker can check a submitted city.
// Re-copy it whenever the game's rules change. It registers itself as globalThis.Dubiko.
/* Dubiko - core rules: pieces, geometry, the city code, validation.
 *
 * Plain script shared by the page, the worker and Node (tools/). Everything
 * hangs off one global, `Dubiko`, so the same file loads with a <script> tag,
 * importScripts() or require().
 */
(function (root) {
  'use strict';
  const D = root.Dubiko = root.Dubiko || {};

  /* ---------------------------------------------------------------- rng */
  function mulberry32(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  const rngInt = (rng, n) => Math.floor(rng() * n);
  const rngPick = (rng, arr) => arr[rngInt(rng, arr.length)];
  function rngShuffle(rng, arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = rngInt(rng, i + 1);
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
  function hash2(a, b) {
    let h = (Math.imul(a | 0, 374761393) + Math.imul(b | 0, 668265263)) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return (h ^ (h >>> 16)) >>> 0;
  }

  /* -------------------------------------------------------------- types */
  const TYPES = {
    H: { fa: 'مسکونی', en: 'Housing', icon: '🏠', color: '#e9b872' },
    P: { fa: 'پارک', en: 'Park', icon: '🌴', color: '#79c17e' },
    M: { fa: 'مرکز خرید', en: 'Mall', icon: '🏬', color: '#dc8fb8' },
    O: { fa: 'برج اداری', en: 'Tower', icon: '🏙️', color: '#7ea7dc' },
    F: { fa: 'صنعتی', en: 'Industry', icon: '🏭', color: '#a6a6a6' },
    G: { fa: 'پمپ‌بنزین', en: 'Gas station', icon: '⛽', color: '#e8826c' },
    T: { fa: 'مترو', en: 'Metro', icon: '🚇', color: '#9583dc' },
    C: { fa: 'بیمارستان', en: 'Hospital', icon: '🏥', color: '#f0f3f5' },
    S: { fa: 'ورزشگاه', en: 'Stadium', icon: '🏟️', color: '#86c99f' },
    R: { fa: 'اسکله', en: 'Pier', icon: '⚓', color: '#b58f5d' },
    /* Dubai landmarks: one of a kind, always handed to the player already in place */
    K: { fa: 'برج خلیفه', en: 'Burj Khalifa', icon: '🗼', color: '#b7c5d8', landmark: true },
    Y: { fa: 'دبی فریم', en: 'Dubai Frame', icon: '🖼️', color: '#d8b74a', landmark: true },
    U: { fa: 'موزهٔ آینده', en: 'Museum of the Future', icon: '🏛️', color: '#d3d8cc', landmark: true },
    A: { fa: 'برج العرب', en: 'Burj Al Arab', icon: '🏨', color: '#f1ece0', landmark: true },
    /* not a building: the sea, canals and ponds are ground the city cannot cover */
    W: { fa: 'آب', en: 'Water', icon: '🌊', color: '#4fa6cb', terrain: true },
  };

  /* The shape library. Each entry is a type plus a base footprint. */
  const line = (n) => Array.from({ length: n }, (_, i) => [0, i]);
  const LIB = [
    { id: 'H2', type: 'H', cells: line(2) },
    { id: 'H3', type: 'H', cells: line(3) },
    { id: 'HL', type: 'H', cells: [[0, 0], [1, 0], [1, 1]] },
    { id: 'P3', type: 'P', cells: line(3) },
    { id: 'P4', type: 'P', cells: line(4) },
    { id: 'M2', type: 'M', cells: line(2) },
    { id: 'ML', type: 'M', cells: [[0, 0], [1, 0], [1, 1]] },
    { id: 'O4', type: 'O', cells: [[0, 0], [0, 1], [1, 0], [1, 1]] },
    { id: 'O2', type: 'O', cells: line(2) },
    { id: 'F3', type: 'F', cells: line(3) },
    { id: 'FL', type: 'F', cells: [[0, 0], [1, 0], [1, 1]] },
    { id: 'G1', type: 'G', cells: [[0, 0]] },
    { id: 'T1', type: 'T', cells: [[0, 0]] },
    { id: 'C3', type: 'C', cells: line(3) },
    { id: 'C4', type: 'C', cells: [[0, 0], [0, 1], [1, 0], [1, 1]] },
    { id: 'S6', type: 'S', cells: [[0, 0], [0, 1], [0, 2], [1, 0], [1, 1], [1, 2]] },
    { id: 'R2', type: 'R', cells: line(2) },
    { id: 'R3', type: 'R', cells: line(3) },
    { id: 'K4', type: 'K', cells: [[0, 0], [0, 1], [1, 0], [1, 1]] },
    { id: 'Y2', type: 'Y', cells: line(2) },
    { id: 'U2', type: 'U', cells: line(2) },
    { id: 'A2', type: 'A', cells: line(2) },
  ];

  /* ----------------------------------------------------------- geometry */
  const norm = (cells) => {
    const mr = Math.min(...cells.map(c => c[0])), mc = Math.min(...cells.map(c => c[1]));
    return cells.map(([r, c]) => [r - mr, c - mc]).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  };
  const shapeKey = (cells) => cells.map(c => c[0] + ',' + c[1]).join(';');
  const rot90 = (cells) => norm(cells.map(([r, c]) => [c, -r]));   // rotation only, never a mirror
  function rotations(cells) {
    const out = [], seen = new Set();
    let cur = norm(cells);
    for (let k = 0; k < 4; k++) {
      const key = shapeKey(cur);
      if (!seen.has(key)) { seen.add(key); out.push(cur); }
      cur = rot90(cur);
    }
    return out;
  }
  const freeKey = (cells) => rotations(cells).map(shapeKey).sort()[0];
  /* Two pieces are interchangeable when they have the same type and the same
     footprint - up to rotation only where rotation is allowed. */
  const classKey = (type, cells, rotate) =>
    type + ':' + (rotate ? freeKey(cells) : shapeKey(norm(cells)));
  const placementKey = (type, cells) => type + ':' + cells.join(',');

  const geomCache = {};
  function geom(w, h) {
    const key = w * 100 + h;
    if (geomCache[key]) return geomCache[key];
    const nb4 = [];
    for (let i = 0; i < w * h; i++) {
      const r = (i / w) | 0, c = i % w, a = [];
      if (r > 0) a.push(i - w);
      if (c > 0) a.push(i - 1);
      if (c < w - 1) a.push(i + 1);
      if (r < h - 1) a.push(i + w);
      nb4.push(a);
    }
    return (geomCache[key] = { w, h, n: w * h, nb4 });
  }
  const lineCells = (l, g) => {
    const out = [];
    if (l.axis === 'r') for (let c = 0; c < g.w; c++) out.push(l.idx * g.w + c);
    else for (let r = 0; r < g.h; r++) out.push(r * g.w + l.idx);
    return out;
  };

  /* ---------------------------------------------------------- the code */
  /* rules = { ban: [[a,b],..], need: { type: [[t1,t2],..] } }
     ban  - two different buildings of these types may not share an edge
     need - a building of the type must share an edge with one of each set   */
  function makeBan(rules) {
    const s = new Set();
    for (const [a, b] of rules.ban || []) { s.add(a + b); s.add(b + a); }
    return (a, b) => s.has(a + b);
  }

  /* Check a (possibly partial) city. `placements` is a list of
     { type, cells:[abs indices] }. Returns { ok, complete, errors } where each
     error names the offending placements so the page can highlight them. */
  function validateCity(level, placements, partial) {
    const g = geom(level.w, level.h), rules = level.rules || {};
    const ban = makeBan(rules), need = rules.need || {};
    /* -1 = empty ground, -2 = water (not buildable, counts as a neighbour of type 'W') */
    const owner = new Int16Array(g.n).fill(-1);
    for (const c of level.water || []) owner[c] = -2;
    const errors = [];
    placements.forEach((p, i) => {
      for (const c of p.cells) {
        if (owner[c] !== -1) errors.push({ kind: 'OVERLAP', who: owner[c] >= 0 ? [i, owner[c]] : [i] });
        else owner[c] = i;
      }
    });
    let complete = true;
    for (let c = 0; c < g.n; c++) if (owner[c] === -1) { complete = false; break; }
    if (!partial && !complete) errors.push({ kind: 'GAP', who: [] });

    const nbTypes = placements.map(() => new Set());
    const bnd = placements.map(p => {
      const set = new Set(p.cells), out = new Set();
      for (const c of p.cells) for (const j of g.nb4[c]) if (!set.has(j)) out.add(j);
      return [...out];
    });
    placements.forEach((p, i) => {
      for (const j of bnd[i]) {
        const o = owner[j];
        if (o === -2) { nbTypes[i].add('W'); continue; }
        if (o < 0 || o === i) continue;
        nbTypes[i].add(placements[o].type);
        if (o > i && ban(p.type, placements[o].type)) errors.push({ kind: 'BAN', who: [i, o] });
      }
    });
    placements.forEach((p, i) => {
      const reqs = need[p.type];
      if (!reqs) return;
      if (partial && !bnd[i].every(j => owner[j] !== -1)) return;
      for (const R of reqs) {
        if (!R.some(t => nbTypes[i].has(t))) errors.push({ kind: 'NEED', who: [i], need: R });
      }
    });
    for (const l of level.lines || []) {
      const cells = lineCells(l, g);
      let cnt = 0, free = 0;
      for (const c of cells) {
        const o = owner[c];
        if (o === -1) free++; else if (o >= 0 && placements[o].type === l.type) cnt++;
      }
      if (cnt > l.k || (!partial && cnt !== l.k) || (partial && cnt + free < l.k)) {
        errors.push({ kind: 'LINE', line: l, count: cnt });
      }
    }
    return { ok: errors.length === 0 && complete, complete, errors };
  }

  /* ------------------------------------------------------------- texts */
  /* The city code as sentences, in the requested language ('fa' or 'en'). */
  function ruleTexts(level, lang) {
    const en = lang === 'en';
    const out = [], rules = level.rules || {};
    const nm = (t) => TYPES[t][en ? 'en' : 'fa'];
    const seen = new Set();
    for (const [a, b] of rules.ban || []) {
      const k = [a, b].sort().join('');
      if (seen.has(k)) continue;
      seen.add(k);
      if (en) out.push(a === b ? `Two ${nm(a)} may not touch` : `${nm(a)} and ${nm(b)} may not touch`);
      else out.push(a === b ? `دو ${nm(a)} نباید کنار هم باشند` : `${nm(a)} و ${nm(b)} نباید کنار هم باشند`);
    }
    for (const t of Object.keys(rules.need || {})) {
      if (en) {
        const parts = rules.need[t].map(R => R.map(nm).join(' or '));
        out.push(`${nm(t)} must touch ${parts.join(', and also ')}`);
      } else {
        const parts = rules.need[t].map(R => R.map(nm).join(' یا '));
        out.push(`${nm(t)} باید کنار ${parts.join(' و همچنین کنار ')} باشد`);
      }
    }
    return out;
  }
  function lineText(l, lang) {
    if (lang === 'en') return `${l.axis === 'r' ? 'Row' : 'Column'} ${l.idx + 1}: exactly ${l.k} ${TYPES[l.type].en} cell${l.k === 1 ? '' : 's'}`;
    return `${l.axis === 'r' ? 'ردیف' : 'ستون'} ${l.idx + 1}: دقیقاً ${l.k} خانه ${TYPES[l.type].fa}`;
  }

  Object.assign(D, {
    mulberry32, rngInt, rngPick, rngShuffle, hash2,
    TYPES, LIB, norm, shapeKey, rot90, rotations, freeKey, classKey, placementKey,
    geom, lineCells, makeBan, validateCity, ruleTexts, lineText,
  });
  if (typeof module !== 'undefined' && module.exports) module.exports = D;
})(typeof self !== 'undefined' ? self : globalThis);
export default globalThis.Dubiko;
