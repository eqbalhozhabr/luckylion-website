// What a layout document may contain. The editor's server checks every document it is given: plain data only (numbers, short words, hex colours,
// sprite pixels), known keys only, bounded sizes. The game also applies its own rules when it loads a layout (a puzzle or a lock can only be moved,
// never changed), so a document cannot change how the game works, and this check keeps junk and script out of what the public endpoint serves.
const ID = /^[\w:.#-]{1,60}$/;
const WORD = /^[\w-]{1,40}$/;
const HEX = /^#[0-9a-fA-F]{6}$/;
const ALPHA = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
export const MAX_BYTES = 700 * 1024;

const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);
const num = (v, lo, hi) => typeof v === 'number' && Number.isFinite(v) && v >= lo && v <= hi;
const pair = (v, lo, hi) => Array.isArray(v) && v.length === 2 && num(v[0], lo, hi) && num(v[1], lo, hi);
function keysIn(o, allowed, where) { for (const k of Object.keys(o)) if (!allowed.includes(k)) throw new Error(`${where}: unknown field "${k}"`); }
function prim(v, where) { if (!(v === null || typeof v === 'boolean' || num(v, -1000, 1000) || (typeof v === 'string' && v.length <= 60))) throw new Error(`${where}: a value that is not a short word or a number`); }
function props(p, where) { if (!isObj(p) || Object.keys(p).length > 24) throw new Error(`${where}: bad props`); for (const [k, v] of Object.entries(p)) { if (!WORD.test(k)) throw new Error(`${where}: bad prop name`); prim(v, where); } }
function look(l, where) {
  if (!isObj(l)) throw new Error(`${where}: bad look`);
  keysIn(l, ['type', 'sprite', 'paint', 'args'], where);
  for (const k of ['type', 'sprite', 'paint']) if (k in l && !WORD.test(l[k])) throw new Error(`${where}: bad look`);
  if ('args' in l) { if (!Array.isArray(l.args) || l.args.length > 4) throw new Error(`${where}: bad look`); l.args.forEach((a) => prim(a, where)); }
}
function record(r, kind, where) {
  if (!isObj(r)) throw new Error(`${where}: not a record`);
  const ALLOWED = { objects: ['id', 'type', 'hot', 'class', 'why', 'cell', 'footprint', 'props', 'base', 'look', 'deleted'], items: ['id', 'type', 'hot', 'class', 'why', 'host', 'offset', 'cell', 'props', 'base'], wall: ['key', 'wall', 'name', 'span', 'z', 'class', 'why', 'base', 'look'],
    tobjects: ['id', 'cell', 'footprint', 'props', 'look', 'deleted'], titems: ['id', 'offset'], added: ['id', 'type', 'hot', 'cell', 'footprint', 'props', 'look'] };
  keysIn(r, ALLOWED[kind], where);
  for (const k of ['id', 'key', 'host']) if (k in r && r[k] !== null && !ID.test(r[k])) throw new Error(`${where}: bad ${k}`);
  for (const k of ['type', 'hot', 'name', 'class', 'base']) if (k in r && r[k] !== null && !/^[\w:.#-]{1,60}$/.test(r[k])) throw new Error(`${where}: bad ${k}`);
  if ('wall' in r && r.wall !== 'L' && r.wall !== 'R') throw new Error(`${where}: bad wall`);
  if ('why' in r && (!Array.isArray(r.why) || r.why.length > 4 || r.why.some((w) => !WORD.test(w)))) throw new Error(`${where}: bad why`);
  if ('cell' in r && !pair(r.cell, -6, 26)) throw new Error(`${where}: bad cell`);
  if ('footprint' in r && !pair(r.footprint, 0.01, 20)) throw new Error(`${where}: bad footprint`);
  if ('offset' in r && !pair(r.offset, -20, 20)) throw new Error(`${where}: bad offset`);
  if ('span' in r && !pair(r.span, -6, 26)) throw new Error(`${where}: bad span`);
  if ('z' in r && !pair(r.z, -10, 80)) throw new Error(`${where}: bad z`);
  if ('props' in r) props(r.props, where);
  if ('look' in r) look(r.look, where);
  if ('deleted' in r && r.deleted !== true) throw new Error(`${where}: bad deleted`);
}
function list(a, kind, where, max) { if (!Array.isArray(a) || a.length > max) throw new Error(`${where}: too many records`); a.forEach((r, i) => record(r, kind, `${where}[${i}]`)); }
function floorOrWall(v, where) { if (!(typeof v === 'string' && WORD.test(v)) && !(isObj(v) && Object.keys(v).length === 1 && WORD.test(v.sprite))) throw new Error(`${where}: bad choice`); }

export function validateSprite(s, where = 'sprite') {
  if (!isObj(s)) throw new Error(`${where}: not an object`);
  keysIn(s, ['name', 'w', 'h', 'ax', 'ay', 'fp', 'top', 'outline', 'tile', 'offPalette', 'tags', 'pal', 'px'], where);
  if (!Number.isInteger(s.w) || !Number.isInteger(s.h) || s.w < 1 || s.h < 1 || s.w > 128 || s.h > 128) throw new Error(`${where}: bad size`);
  if (!num(s.ax, -200, 400) || !num(s.ay, -200, 400) || !pair(s.fp, 0.1, 20)) throw new Error(`${where}: bad anchor or footprint`);
  if ('top' in s && !num(s.top, 0, 120)) throw new Error(`${where}: bad top`);
  for (const k of ['outline', 'tile', 'offPalette']) if (k in s && typeof s[k] !== 'boolean') throw new Error(`${where}: bad ${k}`);
  if ('name' in s && !(typeof s.name === 'string' && s.name.length <= 60)) throw new Error(`${where}: bad name`);
  if ('tags' in s && !(Array.isArray(s.tags) && s.tags.length <= 8 && s.tags.every((t) => typeof t === 'string' && t.length <= 30))) throw new Error(`${where}: bad tags`);
  if (!Array.isArray(s.pal) || s.pal.length > 61 || s.pal.some((c) => !HEX.test(c))) throw new Error(`${where}: bad palette`);
  if (typeof s.px !== 'string' || s.px.length !== s.w * s.h) throw new Error(`${where}: bad pixels`);
  for (let i = 0; i < s.px.length; i++) { const k = ALPHA.indexOf(s.px[i]); if (k < 0 || k > s.pal.length) throw new Error(`${where}: a pixel outside the palette`); }
  return s;
}

/* throws an Error saying what is wrong; returns the document if it is fine */
export function validateDoc(doc, slug) {
  if (!isObj(doc)) throw new Error('the layout is not an object');
  if (JSON.stringify(doc).length > MAX_BYTES) throw new Error('the layout is too big');
  keysIn(doc, ['version', 'case', 'sprites', 'rooms'], 'layout');
  if (doc.version !== 1) throw new Error('unknown layout version');
  if (doc.case !== undefined && doc.case !== null && doc.case !== slug) throw new Error('the layout is for another case');
  if (doc.sprites !== undefined) {
    if (!isObj(doc.sprites) || Object.keys(doc.sprites).length > 80) throw new Error('too many sprites');
    for (const [id, s] of Object.entries(doc.sprites)) { if (!WORD.test(id)) throw new Error('bad sprite id'); validateSprite(s, `sprite ${id}`); }
  }
  if (!isObj(doc.rooms) || Object.keys(doc.rooms).length > 40) throw new Error('bad rooms');
  for (const [rid, R] of Object.entries(doc.rooms)) {
    if (!WORD.test(rid) || !isObj(R)) throw new Error(`room ${rid}: bad`);
    keysIn(R, ['size', 'objects', 'items', 'wall', 'room', 'times'], `room ${rid}`);
    if ('size' in R && !pair(R.size, 1, 40)) throw new Error(`room ${rid}: bad size`);
    if ('objects' in R) list(R.objects, 'objects', `room ${rid} objects`, 300);
    if ('items' in R) list(R.items, 'items', `room ${rid} items`, 300);
    if ('wall' in R) list(R.wall, 'wall', `room ${rid} wall`, 120);
    if ('room' in R) {
      const r = R.room; if (!isObj(r)) throw new Error(`room ${rid}: bad look`);
      keysIn(r, ['floor', 'wallL', 'wallR', 'pal', 'size'], `room ${rid}`);
      for (const k of ['floor', 'wallL', 'wallR']) if (k in r) floorOrWall(r[k], `room ${rid} ${k}`);
      if ('pal' in r) { if (!isObj(r.pal) || Object.keys(r.pal).length > 80) throw new Error(`room ${rid}: bad colours`); for (const [k, v] of Object.entries(r.pal)) if (!WORD.test(k) || !HEX.test(v)) throw new Error(`room ${rid}: bad colour`); }
      if ('size' in r && !(Array.isArray(r.size) && r.size.length === 2 && r.size.every((v) => Number.isInteger(v) && v >= 1 && v <= 40))) throw new Error(`room ${rid}: bad size`);
    }
    if ('times' in R) {
      if (!isObj(R.times) || Object.keys(R.times).length > 20) throw new Error(`room ${rid}: bad times`);
      for (const [mid, t] of Object.entries(R.times)) {
        if (!WORD.test(mid) || !isObj(t)) throw new Error(`room ${rid}: bad moment`);
        keysIn(t, ['objects', 'items', 'added'], `moment ${mid}`);
        if ('objects' in t) list(t.objects, 'tobjects', `moment ${mid} objects`, 200);
        if ('items' in t) list(t.items, 'titems', `moment ${mid} items`, 200);
        if ('added' in t) list(t.added, 'added', `moment ${mid} added`, 100);
      }
    }
  }
  return doc;
}
