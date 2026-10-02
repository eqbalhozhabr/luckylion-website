'use strict';
/* ============================================================
   core.js : pixel-exact isometric renderer. No images anywhere.
   Everything on screen comes from polygons, per-pixel painters
   and the room data files.
   ============================================================ */
const TW = 20, TH = 10, N = 8, W = 176, H = 164, WH = 56, SLAB = 6;
let OX = 88, OY = 68;       // screen position of the room's top corner; moved per room so rooms of any size sit centred
let NXc = N, NYc = N;       // size of the room being drawn in tiles (x runs along the right wall, y along the left)
const HW = TW / 2, HH = TH / 2;
const pix = new Uint32Array(W * H);   // static scene colours
const ids = new Uint16Array(W * H);   // which object owns each pixel
const out = new Uint32Array(W * H);   // final frame (lighting, hover)
const TYPES = {};       // object type -> renderer (o, g, st)
const ITEM_TYPES = {};  // small item type -> renderer (it, z, g)
let CURROOM = null;     // the resolved room being drawn (objects, items, env)
let WHc = WH;           // wall height of the room being drawn (rooms may override: yards and car parks have low walls)
const gidHot = [null];                // gid -> hotspot name
const gidOut = [false];               // gid -> gets outlines
let gidN = 0;
function newG(hot, outline) {
  gidN++;
  gidHot[gidN] = hot || null;
  gidOut[gidN] = outline !== false;
  return gidN;
}
function P(x, y, z) { return [OX + (x - y) * HW, OY + (x + y) * HH - (z || 0)]; }

/* ---------- colour ---------- */
let PAL = {}, VAR = { h: 0, s: 1, l: 1 };
const CC = new Map();
function h2r(h) {
  h = h.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
function rgb2hsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
  let h = 0, s = 0; const l = (mx + mn) / 2;
  if (mx !== mn) {
    const d = mx - mn;
    s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
    if (mx === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (mx === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
  }
  return [h, s, l];
}
function hsl2rgb(h, s, l) {
  h = ((h % 360) + 360) % 360 / 360;
  if (s === 0) return [l * 255, l * 255, l * 255];
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
  const f = (t) => {
    if (t < 0) t += 1; if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  return [f(h + 1 / 3) * 255, f(h) * 255, f(h - 1 / 3) * 255];
}
function setPalette(p, v) { PAL = p; VAR = v || { h: 0, s: 1, l: 1 }; CC.clear(); }
function baseRGB(key) {
  let c = h2r(PAL[key] || key);
  if (VAR.h || VAR.s !== 1 || VAR.l !== 1) {
    const hs = rgb2hsl(c[0], c[1], c[2]);
    c = hsl2rgb(hs[0] + VAR.h, Math.min(1, hs[1] * VAR.s), Math.min(1, hs[2] * VAR.l));
  }
  return c;
}
function pk(c) {
  return (0xFF000000 | (Math.round(c[2]) << 16) | (Math.round(c[1]) << 8) | Math.round(c[0])) >>> 0;
}
function mixc(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }
/* col(key, k): k>0 lighter (warm), k<0 darker (cool) */
function col(key, k) {
  k = k || 0;
  const ck = key + '|' + k;
  let v = CC.get(ck);
  if (v !== undefined) return v;
  let c = baseRGB(key);
  if (k > 0) c = mixc(c, [255, 240, 196], Math.min(1, k * 0.55));
  else if (k < 0) c = mixc(c, [30, 22, 52], Math.min(1, -k * 0.6));
  v = pk(c); CC.set(ck, v); return v;
}
function hash2(a, b) {
  let h = (Math.imul(a | 0, 374761393) + Math.imul(b | 0, 668265263)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/* ---------- primitives ---------- */
function put(x, y, c, g) {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const i = y * W + x; pix[i] = c; ids[i] = g;
}
function poly(pts, c, g) {
  let mn = Infinity, mx = -Infinity;
  for (const p of pts) { if (p[1] < mn) mn = p[1]; if (p[1] > mx) mx = p[1]; }
  const y0 = Math.max(0, Math.ceil(mn - 0.5)), y1 = Math.min(H - 1, Math.floor(mx - 0.5));
  for (let y = y0; y <= y1; y++) {
    const sy = y + 0.5, xs = [];
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i], b = pts[(i + 1) % pts.length];
      if ((a[1] <= sy && b[1] > sy) || (b[1] <= sy && a[1] > sy)) xs.push(a[0] + (sy - a[1]) * (b[0] - a[0]) / (b[1] - a[1]));
    }
    xs.sort((p, q) => p - q);
    for (let k = 0; k + 1 < xs.length; k += 2) {
      const xa = Math.ceil(xs[k] - 0.5), xb = Math.floor(xs[k + 1] - 0.5);
      for (let x = xa; x <= xb; x++) put(x, y, c, g);
    }
  }
}
function quad(a, b, c, d, color, g) { poly([P(a[0], a[1], a[2]), P(b[0], b[1], b[2]), P(c[0], c[1], c[2]), P(d[0], d[1], d[2])], color, g); }
function lineS(x0, y0, x1, y1, c, g) {
  x0 = Math.floor(x0); y0 = Math.floor(y0); x1 = Math.floor(x1); y1 = Math.floor(y1);
  const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let e = dx + dy;
  for (;;) {
    put(x0, y0, c, g);
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * e;
    if (e2 >= dy) { e += dy; x0 += sx; }
    if (e2 <= dx) { e += dx; y0 += sy; }
  }
}
function line3(a, b, c, g) { const p = P(a[0], a[1], a[2]), q = P(b[0], b[1], b[2]); lineS(p[0], p[1], q[0], q[1], c, g); }
function rectS(x, y, w, h, c, g) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) put(x + i, y + j, c, g); }
function ellFill(cx, cy, rx, ry, c, g) {
  for (let py = Math.floor(cy - ry); py <= Math.ceil(cy + ry); py++) {
    const dy = (py + 0.5 - cy) / ry; if (dy < -1 || dy > 1) continue;
    const hx = rx * Math.sqrt(1 - dy * dy);
    for (let px = Math.ceil(cx - hx - 0.5); px <= Math.floor(cx + hx - 0.5); px++) put(px, py, c, g);
  }
}
/* box with three visible faces. top light, +y face base, +x face dark */
function box(x, y, z, w, d, h, key, g, o) {
  o = o || {};
  const x1 = x + w, y1 = y + d, z1 = z + h;
  quad([x1, y, z], [x1, y1, z], [x1, y1, z1], [x1, y, z1], col(o.right || key, o.rk !== undefined ? o.rk : -0.32), g);
  quad([x, y1, z], [x1, y1, z], [x1, y1, z1], [x, y1, z1], col(o.left || key, o.lk !== undefined ? o.lk : 0), g);
  quad([x, y, z1], [x1, y, z1], [x1, y1, z1], [x, y1, z1], col(o.top || key, o.tk !== undefined ? o.tk : 0.3), g);
}
/* cylinder: x,y = centre in tiles, z = bottom in px */
function cyl(x, y, z, r, h, key, g, o) {
  o = o || {};
  const c0 = P(x, y, z + h), cx = c0[0], cyT = c0[1];
  const rx = r * TW * 0.7071, ry = rx / 2, cyB = cyT + h;
  const left = Math.floor(cx - rx);
  for (let px = left; px <= Math.ceil(cx + rx); px++) {
    const dx = (px + 0.5 - cx) / rx;
    if (dx < -1 || dx > 1) continue;
    const eh = ry * Math.sqrt(1 - dx * dx);
    const k = dx < -0.55 ? 0.22 : dx < -0.05 ? 0.04 : dx < 0.45 ? -0.16 : -0.34;
    let c = col(key, k);
    if (o.stripe && ((px - left) % o.stripe) === 0) c = col(key, k - 0.2);
    const ya = o.noTop ? Math.ceil(cyT - 0.5) : Math.ceil(cyT - 0.5);
    for (let py = ya; py <= Math.floor(cyB + eh - 0.5); py++) put(px, py, c, g);
  }
  if (!o.noTop) ellFill(cx, cyT, rx, ry, col(o.topKey || key, o.tk !== undefined ? o.tk : 0.3), g);
}
/* paint a horizontal surface pixel by pixel */
function topPixels(x0, y0, w, d, z, fn, g) {
  const cs = [P(x0, y0, z), P(x0 + w, y0, z), P(x0 + w, y0 + d, z), P(x0, y0 + d, z)];
  const mnx = Math.floor(Math.min(cs[0][0], cs[1][0], cs[2][0], cs[3][0])), mxx = Math.ceil(Math.max(cs[0][0], cs[1][0], cs[2][0], cs[3][0]));
  const mny = Math.floor(Math.min(cs[0][1], cs[1][1], cs[2][1], cs[3][1])), mxy = Math.ceil(Math.max(cs[0][1], cs[1][1], cs[2][1], cs[3][1]));
  for (let py = mny; py <= mxy; py++) for (let px = mnx; px <= mxx; px++) {
    const tx = (px + 0.5 - OX) / HW, ty = (py + 0.5 - OY + z) / HH;
    const x = (ty + tx) / 2, y = (ty - tx) / 2;
    if (x >= x0 && x < x0 + w && y >= y0 && y < y0 + d) {
      const r = fn(x - x0, y - y0, px, py);
      if (r != null) put(px, py, r, g);
    }
  }
}
/* paint a vertical face lying in the plane y = yy (long face, visible lower-left) */
function faceY(yy, x0, x1, z0, z1, fn, g) {
  const w = Math.round((x1 - x0) * HW), h = Math.round(z1 - z0);
  const a = P(x0, yy, z0), b = P(x1, yy, z1);
  for (let px = Math.floor(a[0]); px <= Math.ceil(b[0]); px++) for (let py = Math.floor(b[1]) - 1; py <= Math.ceil(a[1]) + HH * (x1 - x0) + 1; py++) {
    const x = (px + 0.5 - OX) / HW + yy;
    if (x < x0 || x >= x1) continue;
    const z = OY + (x + yy) * HH - (py + 0.5);
    if (z < z0 || z >= z1) continue;
    const r = fn(Math.floor((x - x0) * HW), Math.floor(z - z0), w, h);
    if (r != null) put(px, py, r, g);
  }
}
/* paint a vertical face lying in the plane x = xx (visible lower-right) */
function faceX(xx, y0, y1, z0, z1, fn, g) {
  const w = Math.round((y1 - y0) * HW), h = Math.round(z1 - z0);
  const a = P(xx, y1, z0), b = P(xx, y0, z1);
  for (let px = Math.floor(a[0]); px <= Math.ceil(b[0]); px++) for (let py = Math.floor(b[1]) - 1; py <= Math.ceil(a[1]) + HH * (y1 - y0) + 1; py++) {
    const y = xx - (px + 0.5 - OX) / HW;
    if (y < y0 || y >= y1) continue;
    const z = OY + (xx + y) * HH - (py + 0.5);
    if (z < z0 || z >= z1) continue;
    const r = fn(Math.floor((y1 - y) * HW), Math.floor(z - z0), w, h);
    if (r != null) put(px, py, r, g);
  }
}

/* ---------- depth sort for the room objects ---------- */
function sortObjs(list) {
  const n = list.length, eps = 0.01;
  const fp = (o) => [o.x, o.x + o.w, o.y, o.y + o.d];
  const before = Array.from({ length: n }, () => []);
  const indeg = new Array(n).fill(0);
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
    const a = fp(list[i]), b = fp(list[j]);
    const ab = a[1] <= b[0] + eps || a[3] <= b[2] + eps;
    const ba = b[1] <= a[0] + eps || b[3] <= a[2] + eps;
    if (ab && !ba) { before[i].push(j); indeg[j]++; }
    else if (ba && !ab) { before[j].push(i); indeg[i]++; }
  }
  const key = (o) => o.x + o.w / 2 + o.y + o.d / 2;
  const res = [], used = new Array(n).fill(false);
  for (let k = 0; k < n; k++) {
    let best = -1;
    for (let i = 0; i < n; i++) if (!used[i] && indeg[i] === 0 && (best < 0 || key(list[i]) < key(list[best]))) best = i;
    if (best < 0) for (let i = 0; i < n; i++) if (!used[i] && (best < 0 || key(list[i]) < key(list[best]))) best = i;
    used[best] = true; res.push(list[best]);
    for (const j of before[best]) indeg[j]--;
  }
  return res;
}

/* ---------- room builder ---------- */
const VARIANTS = [
  { name: 'اصلی', h: 0, s: 1, l: 1 },
  { name: 'جنگلی', h: 85, s: 0.85, l: 1 },
  { name: 'غروب بنفش', h: -120, s: 0.9, l: 1 },
  { name: 'کهنه', h: 0, s: 0.3, l: 1.06 }
];
/* small items that rest on an object's top (cup on a nightstand, ledger on a desk).
   They are drawn inside the owner's renderer so the depth order never breaks. */
function drawOn(ownerId, z) {
  const list = CURROOM.items.filter(i => i.on === ownerId).sort((a, b) => (a.x + a.y) - (b.x + b.y));
  for (const it of list) ITEM_TYPES[it.k](it, z, newG(it.hot || it.id, true));
}
let HOTS = [null];       // hotspot names, index = hover id
let hotIdx = new Uint8Array(2);
let HOTLIST = [];

function paintWall(wall, side, gBase) {
  const items = wall.items || [];
  for (const it of items) it.g = newG(it.name, false);
  for (let sy = 0; sy < H; sy++) for (let sx = 0; sx < W; sx++) {
    let u, z;
    if (side === 'R') {
      u = (sx + 0.5 - OX) / HW;
      if (u < 0 || u >= NXc) continue;
      z = OY + u * HH - (sy + 0.5);
    } else {
      u = (OX - (sx + 0.5)) / HW;
      if (u <= 0 || u > NYc) continue;
      z = OY + u * HH - (sy + 0.5);
    }
    if (z <= 0 || z > WHc) continue;
    let c = wall.base(u, z), g = gBase;
    for (const it of items) {
      if (u >= it.u0 && u < it.u1 && z >= it.z0 && z < it.z1) {
        const w = Math.round((it.u1 - it.u0) * HW), h = Math.round(it.z1 - it.z0);
        const ix = side === 'R' ? Math.floor((u - it.u0) * HW) : Math.floor((it.u1 - u) * HW);
        const r = it.paint(ix, Math.floor(z - it.z0), w, h);
        if (r != null) { c = r; g = it.g; }
      }
    }
    put(sx, sy, c, g);
  }
}

function renderRoom(room, st) {
  pix.fill(0); ids.fill(0);
  gidN = 0; gidHot.length = 1; gidOut.length = 1;
  CURROOM = room;
  WHc = room.wallH || WH;
  NXc = room.nx || N; NYc = room.ny || N;
  OX = 88 - Math.round((NXc - NYc) * HW / 2);
  OY = 68 + Math.floor((16 - NXc - NYc) * HH / 2);
  if (!room.items) room.items = [];
  setPalette(room.pal, VARIANTS[st.variant || 0]);
  const gF = newG(null, false), gL = newG(null, false), gR = newG(null, false), gS = newG(null, false);
  const gRug = room.hasRug ? newG('rug', false) : 0;
  // floor
  const ff = room.floor(st, room);
  for (let sy = 0; sy < H; sy++) for (let sx = 0; sx < W; sx++) {
    const tx = (sx + 0.5 - OX) / HW, ty = (sy + 0.5 - OY) / HH;
    const x = (ty + tx) / 2, y = (ty - tx) / 2;
    if (x < 0 || y < 0 || x >= NXc || y >= NYc) continue;
    const r = ff(x, y);
    if (Array.isArray(r)) put(sx, sy, r[0], gRug); else put(sx, sy, r, gF);
  }
  const wl = room.walls(st, room);
  paintWall(wl.L, 'L', gL);
  paintWall(wl.R, 'R', gR);
  // slab + wall tops
  const t = 0.3;
  quad([0, NYc, 0], [NXc, NYc, 0], [NXc, NYc, -SLAB], [0, NYc, -SLAB], col(room.slab, 0), gS);
  quad([NXc, 0, 0], [NXc, NYc, 0], [NXc, NYc, -SLAB], [NXc, 0, -SLAB], col(room.slab, -0.3), gS);
  quad([NXc, -t, 0], [NXc, 0, 0], [NXc, 0, WHc], [NXc, -t, WHc], col(room.rim, -0.3), gS);
  quad([-t, NYc, 0], [0, NYc, 0], [0, NYc, WHc], [-t, NYc, WHc], col(room.rim, 0), gS);
  poly([P(-t, -t, WHc), P(NXc, -t, WHc), P(NXc, 0, WHc), P(0, 0, WHc), P(0, NYc, WHc), P(-t, NYc, WHc)], col(room.rim, 0.25), gS);
  // objects
  const objs = sortObjs(room.objects);
  for (const o of objs) {
    const g = newG(o.hot, true);
    TYPES[o.t](o, g, st);
  }
  outlines();
  indexHotspots();
}

function outlines() {
  const hit = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x, c = pix[i];
    if (!c) continue;
    const g = ids[i];
    let edge = false;
    const nb = [x > 0 ? i - 1 : -1, x < W - 1 ? i + 1 : -1, y > 0 ? i - W : -1, y < H - 1 ? i + W : -1];
    for (let k = 0; k < 4; k++) {
      const q = nb[k];
      if (q < 0 || !pix[q]) { edge = true; break; }
      if (gidOut[g] && ids[q] !== g && g > ids[q]) { edge = true; break; }
    }
    if (edge) hit.push(i);
  }
  for (const i of hit) {
    const c = pix[i];
    pix[i] = pk(mixc([c & 255, (c >> 8) & 255, (c >> 16) & 255], [28, 20, 40], 0.68));
  }
}

function indexHotspots() {
  const names = [null];
  const map = new Map();
  for (let g = 1; g <= gidN; g++) {
    const h = gidHot[g];
    if (h && !map.has(h)) { map.set(h, names.length); names.push(h); }
  }
  HOTS = names;
  const gi = new Uint8Array(gidN + 1);
  for (let g = 1; g <= gidN; g++) gi[g] = gidHot[g] ? map.get(gidHot[g]) : 0;
  hotIdx = new Uint8Array(W * H);
  const sx = new Float64Array(names.length), sy = new Float64Array(names.length), cn = new Float64Array(names.length);
  for (let i = 0; i < W * H; i++) {
    if (!pix[i]) continue;
    const h = gi[ids[i]]; hotIdx[i] = h;
    if (h) { sx[h] += i % W; sy[h] += (i / W) | 0; cn[h]++; }
  }
  HOTLIST = [];
  for (let h = 1; h < names.length; h++) {
    if (!cn[h]) continue;
    const mx = sx[h] / cn[h], my = sy[h] / cn[h];
    let best = -1, bd = 1e9;
    for (let i = 0; i < W * H; i++) if (hotIdx[i] === h) {
      const dx = (i % W) - mx, dy = ((i / W) | 0) - my, d = dx * dx + dy * dy;
      if (d < bd) { bd = d; best = i; }
    }
    HOTLIST.push({ name: names[h], idx: h, x: best % W, y: (best / W) | 0 });
  }
}

/* ---------- final frame: light + hover ---------- */
const BAY = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => (v + 0.5) / 16);
function compose(light, hover, t) {
  const amb = light.amb, Ls = light.lights;
  const pulse = 0.5 + 0.5 * Math.sin(t * 6);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x, c = pix[i];
    if (!c) { out[i] = 0; continue; }
    let r = c & 255, g = (c >> 8) & 255, b = (c >> 16) & 255;
    const bay = BAY[(y & 3) * 4 + (x & 3)];
    let fr = amb[0], fg = amb[1], fb = amb[2];
    for (let k = 0; k < Ls.length; k++) {
      const L = Ls[k];
      const dx = x - L.sx, dy = (y - L.sy) * 1.6;
      const d = Math.sqrt(dx * dx + dy * dy) / L.r;
      if (d >= 1) continue;
      let q = 1 - d; q = q * q * L.k;
      q = Math.floor(q * 6 + bay) / 6;
      fr += q * L.col[0]; fg += q * L.col[1]; fb += q * L.col[2];
    }
    r = Math.min(255, r * fr); g = Math.min(255, g * fg); b = Math.min(255, b * fb);
    if (hover > 0) {
      const hv = hotIdx[i];
      if (hv === hover) {
        const up = x < W - 1 ? hotIdx[i + 1] : 0, dn = x > 0 ? hotIdx[i - 1] : 0, uu = y > 0 ? hotIdx[i - W] : 0, dd = y < H - 1 ? hotIdx[i + W] : 0;
        if (up !== hover || dn !== hover || uu !== hover || dd !== hover) { r = 255; g = 240; b = 170; }
        else { const bst = 14 + 12 * pulse; r = Math.min(255, r + bst); g = Math.min(255, g + bst); b = Math.min(255, b + bst * 0.6); }
      }
    }
    out[i] = (0xFF000000 | (b << 16) | (g << 8) | r) >>> 0;
  }
}
function sparkles(t, lit) {
  for (const h of HOTLIST) {
    const ph = (t * 1.6 + h.idx * 0.37) % 1;
    const s = ph < 0.5 ? 1 : 0;
    const c = (0xFF000000 | (200 << 16) | (245 << 8) | 255) >>> 0;
    const px = [[0, 0]];
    if (ph < 0.25) px.push([1, 0], [-1, 0], [0, 1], [0, -1]);
    if (s) for (const p of px) {
      const x = h.x + p[0], y = h.y + p[1];
      if (x >= 0 && y >= 0 && x < W && y < H) out[y * W + x] = c;
    }
  }
}

/* ============================================================
   state.js : a room is described once; every "moment" of the case
   (a witness's account, the discovery scene) is a list of patches
   laid over that base. Nothing is drawn here, this only resolves
   data. The renderer then draws whatever list comes out.

   patch shapes:
     { env: { curtains: 'open' } }              change room-wide settings
     { id: 'cup', set: { on: 'dresser', x, y } } change an object or item
     { id: 'cup', remove: true }                take it out of the moment
     { add: { ...object }, item: true }         put something new in
   ============================================================ */
function resolveRoom(base, patches) {
  const r = Object.assign({}, base, {
    objects: base.objects.map(o => Object.assign({}, o)),
    items: (base.items || []).map(i => Object.assign({}, i)),
    env: Object.assign({}, base.env || {})
  });
  for (const p of patches || []) {
    if (p.env) { Object.assign(r.env, p.env); continue; }
    if (p.add) { (p.item ? r.items : r.objects).push(Object.assign({}, p.add)); continue; }
    const list = r.items.find(i => i.id === p.id) ? r.items : r.objects;
    const idx = list.findIndex(o => o.id === p.id);
    if (idx < 0) throw new Error('patch target not found: ' + p.id);
    if (p.remove) list.splice(idx, 1);
    else list[idx] = Object.assign({}, list[idx], p.set);
  }
  const lamp = r.items.find(i => i.k === 'lamp');
  r.env.lampOn = !!(lamp && lamp.lit);
  return r;
}

/* which named things differ between two resolved rooms (by hotspot name).
   Used for the "what changed?" puzzle and by the case linter. */
function changedBetween(a, b) {
  const out = new Set();
  const key = (o) => JSON.stringify(Object.assign({}, o, { env: undefined }));
  const index = (r) => {
    const m = new Map();
    for (const o of r.objects) m.set(o.id, o);
    for (const i of r.items) m.set(i.id, i);
    return m;
  };
  const A = index(a), B = index(b);
  for (const id of new Set([...A.keys(), ...B.keys()])) {
    const x = A.get(id), y = B.get(id);
    if (!x || !y || key(x) !== key(y)) out.add((x || y).hot || id);
  }
  return [...out];
}

/* minutes since the case's evening start: '03:17' -> 1637 when the evening starts at 18:00 */
function toMin(hhmm, dayStart) {
  const [h, m] = hhmm.split(':').map(Number);
  const s = dayStart ? Number(dayStart.split(':')[0]) : 0;
  return (h < s ? h + 24 : h) * 60 + m;
}

/* ============================================================
   portrait.js : parametric pixel busts. Every face on screen comes
   from a handful of fields (skin, hair, style, glasses, ...), so a
   generator can invent new suspects without any art. Browser only.
   ============================================================ */
function drawPortrait(cv, s, bg) {
  const W = 24, H = 28;
  cv.width = W; cv.height = H;
  const x = cv.getContext('2d');
  const R = (c, px, py, w, h) => { x.fillStyle = c; x.fillRect(px, py, w, h); };
  const E = (c, cx, cy, rx, ry) => {
    x.fillStyle = c;
    for (let py = Math.floor(cy - ry); py <= Math.ceil(cy + ry); py++) for (let px = Math.floor(cx - rx); px <= Math.ceil(cx + rx); px++) {
      const dx = (px + 0.5 - cx) / rx, dy = (py + 0.5 - cy) / ry;
      if (dx * dx + dy * dy <= 1) x.fillRect(px, py, 1, 1);
    }
  };
  const shade = (hex, k) => {
    const n = parseInt(hex.slice(1), 16), f = (v) => Math.max(0, Math.min(255, Math.round(v + (k < 0 ? v * k : (255 - v) * k))));
    return '#' + [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(f).map(v => v.toString(16).padStart(2, '0')).join('');
  };
  const ink = '#2a2132';
  R(bg || '#3a3552', 0, 0, W, H);
  if (s.style === 'long') { E(s.hair, 12, 12, 8, 10, 0); R(s.hair, 4, 12, 4, 12); R(s.hair, 16, 12, 4, 12); }
  E(s.shirt, 12, 30, 11, 8);                                   // shoulders
  R(shade(s.skin, -0.12), 10, 17, 4, 4);                       // neck
  R(s.collar || shade(s.shirt, 0.3), 9, 20, 6, 2);             // collar
  R(shade(s.skin, -0.12), 11, 20, 2, 1);
  E(s.skin, 12, 11, 6.2, 7.2);                                 // head
  R(shade(s.skin, -0.1), 5, 11, 1, 3); R(shade(s.skin, -0.1), 18, 11, 1, 3); // ears
  // hair
  if (s.style === 'short' || s.style === 'bun') { E(s.hair, 12, 7, 6.8, 4.2); R(s.hair, 6, 8, 2, 4); R(s.hair, 16, 8, 2, 4); }
  if (s.style === 'bun') E(s.hair, 12, 2.5, 3, 2.6);
  if (s.style === 'long') { E(s.hair, 12, 6.5, 6.8, 3.8); R(s.hair, 6, 8, 2, 8); R(s.hair, 16, 8, 2, 8); }
  if (s.style === 'cap') {
    R(s.hair, 6, 9, 2, 3); R(s.hair, 16, 9, 2, 3);
    E(s.cap, 12, 6.5, 7, 4.2); R(shade(s.cap, -0.25), 5, 8, 14, 2);
  }
  // face
  R(ink, 8, 11, 2, 2); R(ink, 14, 11, 2, 2);
  R(shade(s.hair || '#444444', -0.1), 8, 9, 3, 1); R(shade(s.hair || '#444444', -0.1), 13, 9, 3, 1);
  R(shade(s.skin, -0.18), 12, 13, 1, 2);
  R('#a5524f', 11, 17, 3, 1);
  if (s.mustache) R(s.mustache, 9, 15, 6, 2);
  if (s.glasses) {
    R(ink, 7, 10, 5, 1); R(ink, 7, 14, 5, 1); R(ink, 7, 10, 1, 5); R(ink, 11, 10, 1, 5);
    R(ink, 13, 10, 5, 1); R(ink, 13, 14, 5, 1); R(ink, 13, 10, 1, 5); R(ink, 17, 10, 1, 5);
    R(ink, 12, 11, 1, 1);
  }
  // accessories: a jeweller's loupe pushed up on the forehead, paint spots on a smock
  if (s.extra === 'loupe') { E('#e0b04a', 17.5, 6, 3, 3); E('#cfe8f0', 17.5, 6, 1.8, 1.8); R('#e0b04a', 6, 5, 11, 1); }
  if (s.extra === 'paint') { R('#d46a5a', 7, 24, 2, 2); R('#5a9fd4', 15, 23, 2, 2); R('#e3c06a', 11, 26, 2, 2); }
}

/* Marmalade, the building cat, as a small icon for the hint button */
function drawCatIcon(cv) {
  cv.width = 16; cv.height = 16;
  const x = cv.getContext('2d'), R = (c, px, py, w, h) => { x.fillStyle = c; x.fillRect(px, py, w, h); };
  R('#e89a4a', 3, 2, 3, 3); R('#e89a4a', 10, 2, 3, 3);      // ears
  R('#e89a4a', 3, 4, 10, 8); R('#f4ead8', 6, 9, 4, 3);       // head + muzzle
  R('#2a2132', 5, 7, 2, 2); R('#2a2132', 9, 7, 2, 2);        // eyes
  R('#e07a7a', 7, 9, 2, 1);                                  // nose
  R('#c97a3a', 3, 4, 1, 3); R('#c97a3a', 12, 4, 1, 3);       // stripes
  R('#e89a4a', 4, 12, 8, 3);                                 // body
}

/* ============================================================
   details.js : the magnifier's close-ups. The room is drawn at one
   pixel per detail; a close-up is a separate drawing of the same
   object on a 112x112 canvas, so about ten times finer. Each painter
   reads the object's current state (clock time, cup fill, lamp lit ...)
   so the close-up always matches what the room shows. Browser only.
   DETAILS[hotName](canvas, room) -> draws and returns true.
   ============================================================ */
const DETAIL_PX = 112;
const GLYPHS = {
  0: '111101101101111', 1: '010110010010111', 2: '111001111100111', 3: '111001111001111', 4: '101101111001001',
  5: '111100111001111', 6: '111100111101111', 7: '111001001010010', 8: '111101111101111', 9: '111101111001111'
};

function detailCtx(c) {
  c.width = DETAIL_PX; c.height = DETAIL_PX;
  const x = c.getContext('2d');
  x.imageSmoothingEnabled = false;
  const R = (col, px, py, w, h) => { x.fillStyle = col; x.fillRect(Math.round(px), Math.round(py), Math.round(w), Math.round(h)); };
  const E = (col, cx, cy, rx, ry) => {
    x.fillStyle = col;
    for (let py = Math.floor(cy - ry); py <= Math.ceil(cy + ry); py++) for (let px = Math.floor(cx - rx); px <= Math.ceil(cx + rx); px++) {
      const dx = (px + 0.5 - cx) / rx, dy = (py + 0.5 - cy) / ry;
      if (dx * dx + dy * dy <= 1) x.fillRect(px, py, 1, 1);
    }
  };
  const L = (col, x0, y0, x1, y1, th) => {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) * 2 || 1;
    x.fillStyle = col;
    for (let i = 0; i <= n; i++) x.fillRect(Math.round(x0 + (x1 - x0) * i / n), Math.round(y0 + (y1 - y0) * i / n), th || 1, th || 1);
  };
  const bg = () => { R('#1c1830', 0, 0, DETAIL_PX, DETAIL_PX); };
  return { x, R, E, L, bg };
}
const itemById = (room, id) => room.items.find((i) => i.id === id);
const lighten = (hex, k) => { const n = parseInt(hex.slice(1), 16), f = (v) => Math.max(0, Math.min(255, Math.round(v + (k < 0 ? v * k : (255 - v) * k)))); return '#' + [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(f).map((v) => v.toString(16).padStart(2, '0')).join(''); };

function drawClockBig(c, o) {
  const N2 = 56; c.width = N2; c.height = N2;
  const x = c.getContext('2d'), R = (col, px, py, w, h) => { x.fillStyle = col; x.fillRect(px, py, w, h); };
  const line = (col, x0, y0, x1, y1, thick) => {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) * 2;
    x.fillStyle = col;
    for (let i = 0; i <= n; i++) x.fillRect(Math.round(x0 + (x1 - x0) * i / n), Math.round(y0 + (y1 - y0) * i / n), thick || 1, thick || 1);
  };
  R('#8a6424', 8, 12, 40, 40); R('#c8963e', 9, 13, 38, 38); R('#e0b04a', 10, 14, 36, 3);
  const up = o.crownOut ? 8 : 3; R('#e0b04a', 26, 12 - up, 4, up); R('#8a6424', 24, 11, 8, 2);
  R('#8a6424', 12, 6, 8, 4); R('#8a6424', 36, 6, 8, 4);
  const cx = 28, cy = 32;
  for (let py = 0; py < N2; py++) for (let px = 0; px < N2; px++) {
    const d = Math.hypot(px + 0.5 - cx, py + 0.5 - cy);
    if (d <= 17) R(d > 16 ? '#8a6424' : '#f4ead0', px, py, 1, 1);
  }
  for (let k = 0; k < 12; k++) {
    const a = k / 12 * Math.PI * 2, r0 = k % 3 === 0 ? 12.5 : 14, r1 = 15;
    line('#2a2132', cx + Math.sin(a) * r0, cy - Math.cos(a) * r0, cx + Math.sin(a) * r1, cy - Math.cos(a) * r1, 1);
  }
  const [hh, mm] = o.time.split(':').map(Number);
  const aM = (mm + (o.sec || 0) / 60) / 60 * Math.PI * 2, aH = ((hh % 12) + mm / 60) / 12 * Math.PI * 2;
  line('#2a2132', cx, cy, cx + Math.sin(aH) * 8, cy - Math.cos(aH) * 8, 2);
  line('#3a2f4a', cx, cy, cx + Math.sin(aM) * 13, cy - Math.cos(aM) * 13, 1);
  if (o.sec != null) { const aS = o.sec / 60 * Math.PI * 2; line('#e0584a', cx, cy, cx + Math.sin(aS) * 14, cy - Math.cos(aS) * 14, 1); }
  R('#2a2132', cx - 1, cy - 1, 2, 2);
}

function drawCam(c, idx) {
  c.width = 96; c.height = 56;
  const x = c.getContext('2d'), R = (col, px, py, w, h) => { x.fillStyle = col; x.fillRect(px, py, w, h); };
  R('#17203a', 0, 0, 96, 20); R('#2c3550', 0, 14, 96, 14); R('#2f4a38', 0, 28, 96, 28);
  for (let i = 0; i < 96; i += 6) R('#3a4160', i, 14, 1, 14);
  R('#6fb7e8', 66, 36, 3, 6); R('#7b8794', 64, 34, 7, 2); R('#7b8794', 71, 36, 4, 2);
  R('#5a6b7a', 74, 42, 6, 6); R('#3d4a56', 74, 42, 6, 1);
  const mx = [50, 52, 52, 56][idx], standing = idx >= 2;
  R('#d98a2b', mx, standing ? 30 : 36, 6, standing ? 12 : 8);
  R('#c8936c', mx + 1, standing ? 25 : 31, 4, 4); R('#3a5d8a', mx, standing ? 24 : 30, 6, 2);
  if (idx === 1) R('#cfd6dc', mx + 6, 38, 4, 1);
  if (idx === 3) { R('#6fb7e8', 67, 43, 1, 3); R('#6fb7e8', 68, 46, 1, 2); }
  x.fillStyle = 'rgba(0,0,0,.22)'; for (let y = 0; y < 56; y += 2) x.fillRect(0, y, 96, 1);
  R('#ff3b30', 5, 5, 3, 3);
}

/* ---------- camera frames for case 2 documents ----------
   drawFrame(canvas, spec) paints one small CCTV picture from data. spec = { scene, figs: [{ who, x, h, hood, hold, flip }], ruler }.
   scene: lobby | basement | reception | bar | ward | dining. People are coloured from their portrait, so the same person looks the same everywhere. */
function drawFrame(c, spec, people) {
  c.width = 96; c.height = 56;
  const x = c.getContext('2d'), R = (col, px, py, w, h) => { x.fillStyle = col; x.fillRect(Math.round(px), Math.round(py), Math.round(w), Math.round(h)); };
  const S = spec.scene;
  if (S === 'lobby') {
    R('#1a2236', 0, 0, 96, 56); R('#2c3550', 0, 8, 96, 30); R('#3a3f55', 0, 38, 96, 18);
    R('#201a28', 32, 8, 34, 40);                                   // the front door, open to the wet night
    R('#5a6b8a', 33, 9, 32, 5); for (let i = 0; i < 12; i++) R('#7aa0d0', 34 + i * 2.6, 10 + (i * 7) % 20, 1, 3);   // rain
    R('#e0b04a', 30, 8, 2, 40); R('#e0b04a', 66, 8, 2, 40); R('#e0b04a', 30, 8, 38, 2);
    R('#8a97a3', 70, 20, 6, 8); R('#e0b04a', 72, 22, 2, 2);          // the intercom panel
  } else if (S === 'basement') {
    R('#2a2b30', 0, 0, 96, 56); R('#3a3c44', 0, 6, 96, 28); R('#25262c', 0, 34, 96, 22);
    R('#7a5a52', 52, 10, 26, 34); R('#5a4038', 54, 12, 22, 30); R('#9aa3ae', 60, 14, 6, 26); R('#e0584a', 70, 18, 3, 3); // the boiler
    R('#6f757d', 8, 28, 26, 3); R('#6f757d', 8, 20, 3, 14);          // pipes and a shelf
  } else if (S === 'reception') {
    R('#2c2530', 0, 0, 96, 56); R('#4a3a52', 0, 10, 96, 24); R('#34303c', 0, 34, 96, 22);
    R('#8a6a3a', 6, 30, 50, 8); R('#b9804d', 6, 28, 50, 3); R('#e0b04a', 62, 10, 12, 8); R('#7a5a3a', 63, 11, 10, 6);   // desk and a sign
  } else if (S === 'bar') {
    R('#2a1f22', 0, 0, 96, 56); R('#4a2f2c', 0, 8, 96, 24); R('#201a1c', 0, 32, 96, 24);
    for (let i = 0; i < 8; i++) R(['#8ec5ea', '#e0b04a', '#d6453d', '#7cc07a'][i % 4], 8 + i * 10, 14, 4, 9);   // bottles
    R('#7a4a2a', 0, 32, 96, 6); R('#b9804d', 0, 31, 96, 2); R('#cfe8f0', 74, 27, 3, 4); R('#cfe8f0', 80, 27, 3, 4);
  } else if (S === 'hall') {                                       // the great hall: stage, lectern, rows of heads
    R('#2a1c26', 0, 0, 96, 56); R('#5a2a3a', 0, 4, 96, 22); for (let i = 0; i < 96; i += 7) R('#6a3446', i, 4, 2, 22);       // curtain
    R('#7a5a3a', 8, 28, 80, 4); R('#4a3626', 8, 32, 80, 3);                                                                   // stage
    R('#b9804d', 52, 20, 8, 9); R('#e0b04a', 54, 18, 4, 2);                                                                    // lectern and microphone
    R('#1c1620', 0, 36, 96, 20);
    for (let r = 0; r < 3; r++) for (let i = 0; i < 9; i++) { const hx = 6 + i * 10 + (r % 2) * 5; R('#3a2f44', hx, 42 + r * 5, 6, 5); R('#4a3c56', hx + 1, 40 + r * 5, 4, 3); }
  } else if (S === 'yard') {                                       // the library yard at night: fence, bins, a lamp
    R('#14182a', 0, 0, 96, 56); R('#2a3040', 0, 10, 96, 20); for (let i = 0; i < 96; i += 5) R('#3a4258', i, 10, 3, 20);
    R('#26402c', 0, 30, 96, 26); R('#6a6a52', 20, 36, 60, 5);
    R('#e8d8a0', 12, 4, 3, 3); R('#cfc07c', 10, 2, 7, 1);                                                                     // yard lamp
    R('#3f7f5a', 62, 24, 10, 13); R('#2a5a3c', 62, 24, 10, 2); R('#3b6fa0', 76, 26, 10, 11); R('#264a70', 76, 26, 10, 2);   // two bins
  } else {
    R('#2b2230', 0, 0, 96, 56); R('#5a4838', 0, 12, 96, 22); R('#3a3040', 0, 34, 96, 22);
    R('#b9804d', 14, 30, 50, 4); R('#e8e0cf', 20, 26, 6, 4); R('#e8e0cf', 40, 26, 6, 4);
  }
  if (spec.ruler) {                                                  // height marks beside the door: 150 .. 200 cm, every 10 (1 pixel = 5 cm)
    for (let cm = 150; cm <= 200; cm += 10) R('#f3e9d3', 24, 46 - cm / 5, cm % 20 === 0 ? 6 : 3, 1);
  }
  for (const f of spec.figs || []) {
    const P0 = (people && people[f.who]) || { skin: '#c8936c', hair: '#2a2024', shirt: '#6a6a7a' };
    const gx = f.x, base = f.base || 46, hpx = f.h;                            // hpx: body height in frame pixels
    const top = base - hpx, bw = f.wide || 7;
    R('rgba(0,0,0,0.35)', gx - 1, base, bw + 4, 2);
    const small = hpx < 26;                                           // far away or seated: head and shoulders only
    R(P0.shirt, gx, top + 6, bw, small ? hpx - 6 : hpx - 14);          // coat or shirt
    if (!small) { R('#2a2132', gx + 1, base - 8, 2, 8); R('#2a2132', gx + bw - 3, base - 8, 2, 8); }   // legs
    if (f.hood) { R(f.hoodColor || '#3a4660', gx - 1, top, bw + 2, 7); R('#15182a', gx + 1, top + 2, bw - 2, 4); }
    else { R(P0.skin, gx + 1, top + 1, bw - 2, 5); R(P0.hair, gx, top, bw, 2); if (f.flip) R(P0.hair, gx + bw - 2, top, 2, 4); else R(P0.hair, gx, top, 2, 4); }
    if (f.hold === 'tube') R('#f4ead0', gx + bw, top + 12, 2, 12);                  // a rolled bundle of papers
    if (f.hold === 'umbrella') R('#15182a', gx + bw + 1, top + 4, 1, hpx - 6);
    if (f.hold === 'card') { R('#e8e4d0', gx + bw, top + 14, 5, 3); R('#3b7fb8', gx + bw, top + 14, 5, 1); }
    if (f.hold === 'wrench') { R('#9aa3ae', gx + bw, top + 10, 1, 9); R('#9aa3ae', gx + bw - 1, top + 9, 3, 2); }
    if (f.hold === 'bin') { R('#3f7f5a', gx + bw, top + 14, 6, 8); R('#2a5a3c', gx + bw, top + 14, 6, 1); }
    if (f.hold === 'trolley') { R('#cfd6dc', gx + bw + 2, top + 14, 10, 2); R('#9aa3ae', gx + bw + 3, top + 16, 1, 8); R('#9aa3ae', gx + bw + 10, top + 16, 1, 8); }
  }
  x.fillStyle = 'rgba(0,0,0,.22)'; for (let y = 0; y < 56; y += 2) x.fillRect(0, y, 96, 1);
  R('#ff3b30', 5, 5, 3, 3);
}

const DETAILS = {};

DETAILS.clock = (c, room) => {
  const it = itemById(room, 'clock'); if (!it) return false;
  const tmp = document.createElement('canvas');
  drawClockBig(tmp, { time: it.time, crownOut: it.crownOut, sec: it.crownOut ? null : 20 });
  const { x, bg } = detailCtx(c); bg(); x.drawImage(tmp, 0, 0, DETAIL_PX, DETAIL_PX);
  return true;
};

DETAILS.cup = (c, room) => {
  const it = itemById(room, 'cup'); if (!it) return false;
  const { R, E, bg } = detailCtx(c); bg();
  E('#8c8498', 56, 78, 46, 17); E('#f1e8d3', 56, 75, 46, 16); E('#d9cfb6', 56, 77, 30, 9);                // saucer
  E('#2f6a9a', 56, 60, 30, 12); R('#3b7fb8', 26, 40, 60, 22); E('#3b7fb8', 56, 62, 30, 13);               // cup body
  R('#2f6a9a', 74, 42, 12, 20); R('#4a93cf', 30, 42, 8, 18);                                              // shade + light
  E('#2f6a9a', 56, 40, 30, 11);
  const fill = { tea: '#7a3e22', low: '#a8764a', residue: '#efe9dc', empty: '#e9e1cc' }[it.fill || 'tea'];
  E(fill, 56, 40, 26, 8);
  if (it.fill === 'tea') { E('#8f4c2c', 50, 38, 12, 3); }
  if (it.fill === 'residue') {                                                                            // powder and tiny herbal flecks
    [[44, 40], [50, 43], [60, 38], [66, 42], [56, 40], [48, 37]].forEach((p, i) => R(i % 2 ? '#5f9a4c' : '#c9d8a8', p[0], p[1], 2, 1));
    E('#d8d0bd', 58, 41, 9, 3);
  }
  E('#2f6a9a', 94, 54, 12, 12); E('#1c1830', 94, 54, 6, 6);                                               // handle
  return true;
};

DETAILS.lamp = (c, room) => {
  const it = itemById(room, 'lamp'); if (!it) return false;
  const { R, E, bg } = detailCtx(c); bg();
  if (it.lit) { E('#4a3a20', 56, 52, 52, 44); E('#6a5128', 56, 52, 40, 34); }
  R('#c8963e', 50, 62, 12, 34); E('#e0b04a', 56, 96, 22, 6); R('#e0b04a', 34, 92, 44, 6);
  const shade = it.lit ? '#f8e4a6' : '#5aa4a8';
  for (let y = 12; y < 62; y++) { const w = 18 + (y - 12) * 0.55; R(shade, 56 - w, y, w * 2, 1); }
  R(lighten(shade, 0.25), 38, 14, 6, 44); R(lighten(shade, -0.25), 70, 14, 6, 44);
  return true;
};

DETAILS.musicbox = (c, room) => {
  const it = itemById(room, 'musicbox'); if (!it) return false;
  const { R, E, L, bg } = detailCtx(c); bg();
  R('#8a6424', 10, 52, 92, 44); R('#c8963e', 12, 54, 88, 40); R('#e0b04a', 12, 54, 88, 6); R('#a8782c', 12, 86, 88, 8);
  if (it.open) {
    R('#8a6424', 10, 22, 92, 32); R('#c8963e', 12, 24, 88, 28);                                            // raised lid
    R('#1c1830', 18, 60, 76, 22); R('#e0b04a', 26, 66, 60, 3);
    for (let i = 0; i < 9; i++) R('#e8d8a8', 28 + i * 6, 70, 2, 9 - (i % 3) * 2);                         // the comb
    return true;
  }
  R('#8a6424', 10, 40, 92, 14); R('#d9a84e', 12, 42, 88, 4);                                              // lid
  R('#1c1830', 50, 66, 12, 16); E('#1c1830', 56, 66, 6, 6); R('#2f2038', 54, 70, 4, 8);                  // keyhole plate
  E('#e0b04a', 56, 70, 11, 11); E('#1c1830', 56, 68, 4, 4); R('#1c1830', 54, 69, 4, 9);
  if (it.scratched) [[40, 60, 70, 82], [44, 82, 68, 62], [38, 72, 60, 78], [64, 58, 78, 80], [48, 58, 52, 84]].forEach((s) => L('#fff1c0', s[0], s[1], s[2], s[3], 1));
  return true;
};

DETAILS.slippers = (c, room) => {
  const o = room.objects.find((q) => q.id === 'slippers'); if (!o) return false;
  const { R, E, bg } = detailCtx(c); bg();
  const slipper = (cx, cy, rot, flip) => {
    const w = rot ? 52 : 22, h = rot ? 22 : 52;
    E(flip ? '#6b5a4a' : '#b8483f', cx, cy, w / 2, h / 2);
    if (!flip) { E('#5a2a2e', cx, cy + (rot ? 0 : 10), rot ? 14 : 8, rot ? 8 : 14); E('#d0605a', cx, cy - (rot ? 0 : 14), rot ? 10 : 9, rot ? 9 : 10); }
    else { for (let i = -2; i <= 2; i++) R('#54463a', cx + (rot ? i * 8 : -9), cy + (rot ? -9 : i * 8), rot ? 2 : 18, rot ? 18 : 2); }
  };
  if (o.pose === 'scattered') { slipper(34, 62, false, false); slipper(70, 36, true, true); }
  else { slipper(40, 56, false, false); slipper(72, 56, false, false); }
  return true;
};

/* the framed mechanism drawing (case rooms define BLUEPRINT) */
DETAILS.blueprint = (c, room) => {
  if (typeof BLUEPRINT === 'undefined') return false;
  const { R, E, bg } = detailCtx(c); bg();
  const lit = room.env.lampOn, W2 = DETAIL_PX, top = 22, hh = 68;
  R('#3a2a2a', 2, top - 4, W2 - 4, hh + 8); R('#2a4f86', 6, top, W2 - 12, hh);
  for (let i = 6; i < W2 - 6; i += 8) R('#2f5a96', i, top, 1, hh);
  for (let j = top; j < top + hh; j += 8) R('#2f5a96', 6, j, W2 - 12, 1);
  const sx = (W2 - 12) / 36, sy = hh / 22;
  BLUEPRINT.gears.forEach((G, k) => {
    const cx = 6 + G[0] * sx, cy = top + hh - G[1] * sy, r = G[2] * sx * 0.92;
    const marked = k === BLUEPRINT.mark && lit;
    for (let t = 0; t < G[3]; t++) {
      const a = t / G[3] * Math.PI * 2;
      E('#cfe4ff', cx + Math.cos(a) * (r + 2), cy + Math.sin(a) * (r + 2), 2.4, 2.4);
    }
    E('#cfe4ff', cx, cy, r + 1, r + 1); E(marked ? '#ff5a4a' : '#7fa9dd', cx, cy, r - 1.5, r - 1.5); E('#2a4f86', cx, cy, r * 0.34, r * 0.34);
  });
  return true;
};

/* the bed from above: pillows, quilt, and in the scene the chalk outline (uses the same silhouette as the room) */
DETAILS.body = DETAILS.bed = (c, room) => {
  const o = room.objects.find((q) => q.id === 'bed'); if (!o) return false;
  const { x, R, bg } = detailCtx(c); bg();
  const bx = 18, by = 4, bw = 76, bh = 104, sc = bw / 2.6;
  R('#4a3433', bx - 4, by, bw + 8, bh + 4); R('#d9d3c4', bx, by + 6, bw, bh - 4);
  R('#ece7d8', bx + 6, by + 10, 28, 22); R('#ece7d8', bx + 42, by + 10, 28, 22);
  R('#2f6f8f', bx, by + 36, bw, bh - 34);
  for (let j = 0; j < bh - 40; j += 8) for (let i = 4; i < bw; i += 10) R('#d3e8ec', bx + i + ((j / 8) % 2) * 5, by + 40 + j, 3, 1);
  if (o.body === 'chalk' && typeof inBody === 'function') {
    const e = 0.07;
    for (let py = 0; py < 112; py++) for (let px = 0; px < 112; px++) {
      const lx = (px - bx) / sc, ly = (py - by - 8) / sc;
      if (lx < 0.1 || lx > 2.5 || ly < 0.2 || ly > 4.1 || !inBody(lx, ly)) continue;
      const edge = !inBody(lx + e, ly) || !inBody(lx - e, ly) || !inBody(lx, ly + e) || !inBody(lx, ly - e);
      x.fillStyle = edge ? '#f6f3e8' : 'rgba(246,243,232,.16)'; x.fillRect(px, py, 1, 1);
    }
  }
  return true;
};

DETAILS.ledger = (c) => {
  const { R, bg } = detailCtx(c); bg();
  R('#7a2f3a', 4, 30, 104, 56); R('#f4ead0', 8, 26, 47, 54); R('#f4ead0', 57, 26, 47, 54); R('#c9b98a', 55, 26, 2, 54);
  for (let j = 0; j < 6; j++) { R('#8a7a5a', 12, 34 + j * 8, 38 - (j % 3) * 8, 1); R('#8a7a5a', 61, 34 + j * 8, 36 - (j % 2) * 10, 1); R('#2a2132', 12, 31 + j * 8, 14, 2); }
  return true;
};

DETAILS.monitor = (c) => {
  const { x, R, bg } = detailCtx(c); bg();
  R('#cdbf9c', 8, 14, 96, 76); R('#8f836a', 8, 84, 96, 6); R('#2a2132', 16, 22, 80, 56);
  const cam = document.createElement('canvas'); drawCam(cam, 0);
  x.drawImage(cam, 18, 24, 76, 52);
  R('#cdbf9c', 38, 90, 36, 6); R('#8f836a', 28, 96, 56, 6);
  return true;
};

DETAILS.keyboard = (c) => {
  if (typeof KEYBOARD === 'undefined') return false;
  const { R, E, bg } = detailCtx(c); bg();
  R('#3a2a2a', 4, 14, 104, 86); R('#b9804d', 6, 16, 100, 82); R('#2f5a46', 10, 20, 92, 74);
  KEYBOARD.tags.forEach(([unit, colr], k) => {
    const row = k < 3 ? 0 : 1, cx = 16 + (k % 3) * 30, top = 24 + row * 36;
    R('#e0b04a', cx + 10, top - 2, 4, 4);                                                                   // hook
    if (unit === KEYBOARD.missing) return;
    R('#e0b04a', cx + 11, top + 14, 2, 14); R('#e0b04a', cx + 8, top + 26, 8, 3);                           // key shaft + teeth
    R(colr, cx, top + 2, 24, 18);
    const g = GLYPHS[unit];
    for (let i = 0; i < 15; i++) if (g[i] === '1') R('#2a2132', cx + 6 + (i % 3) * 4, top + 4 + Math.floor(i / 3) * 3, 4, 3);
  });
  return true;
};

DETAILS.cat = (c) => {
  const { R, E, bg } = detailCtx(c); bg();
  E('#d98a3a', 84, 92, 20, 8);                                                                              // tail
  E('#e89a4a', 54, 80, 30, 24); E('#f4ead8', 54, 86, 14, 16);                                               // body + bib
  E('#e89a4a', 54, 44, 28, 24);
  R('#e89a4a', 28, 14, 14, 18); R('#e89a4a', 66, 14, 14, 18); R('#e07a7a', 32, 18, 6, 10); R('#e07a7a', 70, 18, 6, 10); // ears
  R('#c97a3a', 36, 24, 3, 12); R('#c97a3a', 44, 22, 3, 10); R('#c97a3a', 62, 22, 3, 10); R('#c97a3a', 70, 24, 3, 12);
  E('#f2e8a0', 42, 44, 6, 7); E('#f2e8a0', 66, 44, 6, 7); R('#2a2132', 41, 40, 2, 9); R('#2a2132', 65, 40, 2, 9);
  E('#e07a7a', 54, 54, 3, 2); R('#f4ead8', 46, 56, 16, 6); R('#2a2132', 50, 60, 8, 1);
  return true;
};

/* paint the close-up for a hotspot; returns false when that thing has none */
function drawDetail(name, canvas, room) {
  const f = DETAILS[name];
  return f ? f(canvas, room) !== false : false;
}

/* ============================================================
   library/bedroom.js : furniture and small things for bedrooms.
   Large pieces are TYPES (depth sorted, one per object);
   small things are ITEM_TYPES (they rest on a surface and are
   drawn by the piece that owns the surface via drawOn()).
   ============================================================ */

/* ---------- tiny helpers shared by items ---------- */
function handsPixels(hhmm, cx, cz, lenH, lenM) {
  const [hh, mm] = hhmm.split(':').map(Number);
  const aM = (mm / 60) * Math.PI * 2, aH = (((hh % 12) + mm / 60) / 12) * Math.PI * 2;
  const set = new Set();
  const ray = (a, len) => {
    for (let t = 0; t <= len; t += 0.5) set.add(Math.round(cx + Math.sin(a) * t) + ',' + Math.round(cz + Math.cos(a) * t));
  };
  ray(aH, lenH); ray(aM, lenM);
  return set;
}

/* ---------- small items ---------- */
ITEM_TYPES.lamp = (it, z, g) => {
  cyl(it.x, it.y, z, 0.2, 3, 'brass', g);
  cyl(it.x, it.y, z + 3, 0.07, 5, 'brass', g, { tk: 0.1 });
  cyl(it.x, it.y, z + 8, 0.42, 9, it.lit ? 'shadeOn' : 'shade', g, { tk: it.lit ? 0.15 : 0.1 });
};

/* bedside alarm clock. it.time = what the hands show, it.crownOut = crown pulled (clock stopped) */
ITEM_TYPES.clock = (it, z, g) => {
  const w = 1.0, d = 0.36, h = 11, x0 = it.x - w / 2, y0 = it.y - d / 2;
  box(x0, y0, z, w, d, h, 'brassBox', g, { tk: 0.25 });
  const c = P(it.x, it.y, z + h);
  const up = it.crownOut ? 3 : 1;
  rectS(Math.floor(c[0]) - 1, Math.floor(c[1]) - up, 2, up, col('brass', 0.45), g);
  rectS(Math.floor(c[0]) - 2, Math.floor(c[1]) - 1, 4, 1, col('brassBox', 0.1), g);
  const hands = handsPixels(it.time, 4, 4.5, 2, 3.4);
  faceY(y0 + d, x0 + 0.1, x0 + w - 0.1, z + 1.5, z + h - 1, (ix, iz, w2, h2) => {
    const dx = ix - (w2 - 1) / 2, dz = iz - (h2 - 1) / 2, r = Math.sqrt(dx * dx + dz * dz);
    if (r > Math.min(w2, h2) / 2 + 0.4) return col('brassBox', -0.1);
    if (r > Math.min(w2, h2) / 2 - 0.5) return col('brass', 0.2);
    if (hands.has(ix + ',' + iz)) return col('ink', 0);
    if ((ix === 4 && iz === h2 - 2) || (ix === 4 && iz === 1) || (ix === 1 && iz === 4) || (ix === w2 - 2 && iz === 4)) return col('ink', 0.5);
    return col('paper', 0.05);
  }, g);
};

/* tea cup on a saucer. fill: tea | low | residue | empty */
ITEM_TYPES.cup = (it, z, g) => {
  cyl(it.x, it.y, z, 0.3, 1, 'saucer', g, { tk: 0.2 });
  const top = { tea: 'tea', low: 'teaLow', residue: 'residue', empty: 'saucer' }[it.fill || 'tea'];
  cyl(it.x, it.y, z + 1, 0.19, 3.5, 'cupBlue', g, { topKey: top, tk: 0.1 });
  if (it.fill === 'residue') {
    const c = P(it.x, it.y, z + 4.5);
    put(Math.floor(c[0]) - 1, Math.floor(c[1]), col('herb', 0), g);
    put(Math.floor(c[0]) + 1, Math.floor(c[1]), col('herb', 0.1), g);
    put(Math.floor(c[0]), Math.floor(c[1]) + 1, col('tea', 0.2), g);
  }
};

/* brass music box. it.x,it.y = back-left corner. open / scratched are the two states that matter */
ITEM_TYPES.musicbox = (it, z, g) => {
  const bx = it.x, by = it.y;
  if (it.open) {
    box(bx, by + 0.7, z, 0.9, 0.12, 6, 'brassBox', newG(it.hot, true), { tk: 0.1 });
    box(bx, by, z, 0.9, 0.7, 3, 'brassBox', g);
    topPixels(bx + 0.06, by + 0.06, 0.78, 0.58, z + 3, (lx, ly) => {
      const u = Math.floor(lx * 10), v = Math.floor(ly * 10);
      if ((u === 4 && v >= 2 && v <= 4) || (v === 3 && u >= 3 && u <= 5)) return col('brass', 0.35);
      return col('ink', 0.1);
    }, g);
    return;
  }
  box(bx, by, z, 0.9, 0.7, 4, 'brassBox', g, { tk: 0.2 });
  const scr = new Set(it.scratched ? ['2,3', '3,2', '3,3', '4,4', '5,4', '6,3', '6,2', '7,3', '5,1'] : []);
  faceY(by + 0.7, bx, bx + 0.9, z, z + 4, (ix, iz, w2, h2) => {
    if (scr.has(ix + ',' + iz)) return col('brassBox', 0.75);
    if (ix >= 4 && ix <= 5 && iz <= 2) return col('woodDk', 0);
    return iz === h2 - 1 ? col('brassBox', 0.3) : null;
  }, g);
};

/* ---------- furniture ---------- */
/* body silhouette in bed-local tile coordinates (lying on the back, head toward the wall) */
function inBody(lx, ly) {
  const cx = 1.3, seg = (ax, ay, bx, by, r) => {
    const dx = bx - ax, dy = by - ay, t = Math.max(0, Math.min(1, ((lx - ax) * dx + (ly - ay) * dy) / (dx * dx + dy * dy || 1)));
    const px = ax + dx * t - lx, py = ay + dy * t - ly;
    return px * px + py * py <= r * r;
  };
  if ((lx - cx) * (lx - cx) + (ly - 0.93) * (ly - 0.93) <= 0.4 * 0.4) return true;
  if (Math.abs(lx - cx) <= 0.55 && ly >= 1.4 && ly <= 2.9) return true;
  return seg(cx - 0.55, 1.6, cx - 1.0, 2.8, 0.17) || seg(cx + 0.55, 1.6, cx + 1.0, 2.8, 0.17)
    || seg(cx - 0.28, 2.9, cx - 0.32, 3.95, 0.22) || seg(cx + 0.28, 2.9, cx + 0.32, 3.95, 0.22);
}
function chalkFn(ox, oy, inner) {
  const e = 0.075;
  return (lx, ly) => {
    const bx = lx + ox, by = ly + oy;
    if (!inBody(bx, by)) return null;
    if (!inBody(bx + e, by) || !inBody(bx - e, by) || !inBody(bx, by + e) || !inBody(bx, by - e)) return col('chalk', 0);
    return inner(bx, by);
  };
}

/* the chalk outline on the floor, where the victim was found (o.dir: 'x' or 'y' = the long way, o.s = scale) */
TYPES.chalk = (o, g) => {
  const e = 0.16, sc = o.s || 0.75, sw = o.dir === 'x';   // a thick white line, so it still reads on a phone
  topPixels(o.x, o.y, o.w, o.d, 0.3, (lx, ly) => {
    const bx = (sw ? ly : lx) / sc + 0.15, by = (sw ? lx : ly) / sc + 0.5;
    if (!inBody(bx, by)) return null;
    return (!inBody(bx + e, by) || !inBody(bx - e, by) || !inBody(bx, by + e) || !inBody(bx, by - e)) ? col('chalkW', 0.3) : null;
  }, g);
};

TYPES.bed = (o, g, st) => {
  const { x, y, w, d } = o;
  const chalk = o.body === 'chalk';
  box(x, y, 0, w, 0.35, 22, 'bedwood', g, { tk: 0.15 });
  box(x, y + 0.35, 0, w, d - 0.35, 7, 'bedwood', newG(o.hot, true));
  box(x, d - 0.3, 0, w, 0.3, 11, 'bedwood', newG(o.hot, true), { tk: 0.15 });
  box(x + 0.12, y + 0.4, 7, w - 0.24, d - 0.7, 3, 'sheet', newG(o.hot, true), { tk: 0.2 });
  const gb = newG(o.hot, true);
  box(x + 0.12, y + 1.55, 7, w - 0.24, d - 1.85, 4.5, 'blue', gb, { tk: 0.2 });
  const cross = (lx, ly) => {
    const u = Math.floor(lx * 10) % 7, v = Math.floor(ly * 10) % 7;
    if ((u >= 2 && u <= 4 && v === 3) || (u === 3 && v >= 2 && v <= 4)) return col('blueLt', 0);
    return null;
  };
  const gc = chalk ? newG('body', false) : 0;
  const onBlanket = chalk ? chalkFn(0.12, 1.55, () => col('blue', 0.5)) : null;
  topPixels(x + 0.12, y + 1.55, w - 0.24, d - 1.85, 11.5, (lx, ly, px, py) => {
    if (chalk) { const c = onBlanket(lx, ly); return c != null ? c : (cross(lx, ly) ? col('blue', 0.14) : null); }
    return cross(lx, ly);
  }, gb);
  const gp1 = newG('pillow', true);
  box(x + 0.22, y + 0.5, 10, 1.0, 0.85, 3, 'pillow', gp1, { tk: 0.15 });
  box(x + 1.38, y + 0.5, 10, 1.0, 0.85, 3, 'pillow', newG('pillow', true), { tk: 0.15 });
  if (chalk) {
    // the head outline sits on the pillow, the rest of the figure is on the blanket above
    topPixels(x + 0.22, y + 0.5, 2.16, 0.85, 13, chalkFn(0.22, 0.5, () => col('pillow', -0.18)), gc);
  }
};

TYPES.nightstand = (o, g, st) => {
  const { x, y, w, d, h } = o;
  box(x, y, 0, w, d, h - 2, 'navy', g, { tk: 0.1 });
  box(x - 0.04, y, h - 2, w + 0.08, d + 0.06, 2, 'cabLt', newG(o.hot, true), { tk: 0.2 });
  faceY(y + d, x + 0.1, x + w - 0.1, 2, h - 4, (ix, iz, w2, h2) => {
    if (ix === 0 || ix === w2 - 1 || iz === 0 || iz === h2 - 1) return col('navy', -0.4);
    const mx = Math.floor(w2 / 2);
    if ((ix === mx || ix === mx - 1) && iz >= h2 - 5 && iz <= h2 - 4) return col('brass', 0.1);
    return col('cabLt', -0.05);
  }, newG(o.hot, true));
  drawOn(o.id, h);
};

TYPES.dresser = (o, g, st) => {
  const { x, y, w, d, h } = o;
  box(x, y, 0, w, d, h - 2, 'cab', g, { tk: 0.05 });
  box(x - 0.04, y - 0.02, h - 2, w + 0.08, d + 0.06, 2, 'cabLt', newG(o.hot, true), { tk: 0.25 });
  const n = 4, gap = 0.1, drawer = (ix, iz, w2, h2) => {
    if (ix === 0 || ix === w2 - 1 || iz === 0 || iz === h2 - 1) return col('cab', -0.45);
    const mx = Math.floor(w2 / 2);
    if ((ix === mx || ix === mx - 1) && (iz === Math.floor(h2 / 2) || iz === Math.floor(h2 / 2) - 1)) return col('brass', 0.1);
    return iz > h2 - 3 ? col('cabLt', 0.1) : col('cabLt', -0.1);
  };
  if (o.face === 'y') {
    const dw = (w - gap * (n + 1)) / n;
    for (let i = 0; i < n; i++) { const x0 = x + gap + i * (dw + gap); faceY(y + d, x0, x0 + dw, 2, h - 4, drawer, newG(o.hot, true)); }
  }
  const dl = (d - gap * (n + 1)) / n;
  for (let i = 0; i < n && o.face !== 'y'; i++) {
    const y0 = y + gap + i * (dl + gap), y1 = y0 + dl;
    faceX(x + w, y0, y1, 2, h - 4, (ix, iz, w2, h2) => {
      if (ix === 0 || ix === w2 - 1 || iz === 0 || iz === h2 - 1) return col('cab', -0.45);
      const mx = Math.floor(w2 / 2);
      if ((ix === mx || ix === mx - 1) && (iz === Math.floor(h2 / 2) || iz === Math.floor(h2 / 2) - 1)) return col('brass', 0.1);
      return iz > h2 - 3 ? col('cabLt', 0.1) : col('cabLt', -0.1);
    }, newG(o.hot, true));
  }
  drawOn(o.id, h);
  if (o.decor !== false && o.d >= 4.5) {
    // books and a small plant, placed relative to the dresser
    const bx = o.x + 0.4, by = o.y + 2.3, gb = newG(o.hot, true);
    box(bx, by, h, 0.7, 0.6, 3, 'bookA', gb);
    box(bx + 0.03, by + 0.03, h + 3, 0.64, 0.54, 2, 'bookB', gb);
    box(bx + 0.06, by + 0.07, h + 5, 0.56, 0.46, 2, 'bookC', gb);
    const gp = newG('plant', true), px = o.x + 0.75, py = o.y + 3.9;
    cyl(px, py, h, 0.26, 5, 'clay', gp);
    const c = P(px, py, h + 5);
    ellFill(c[0] - 3, c[1] - 3, 3, 2.2, col('leaf', 0), gp);
    ellFill(c[0] + 3, c[1] - 4, 3, 2.6, col('leafLt', 0), gp);
    ellFill(c[0], c[1] - 7, 2.6, 3, col('leaf', 0.15), gp);
  }
};

TYPES.pouf = (o, g) => {
  const cx = o.x + o.w / 2, cy = o.y + o.d / 2;
  cyl(cx, cy, 0, o.w / 2, 8, 'pouf', g, { tk: 0.28 });
  const c = P(cx, cy, 8);
  rectS(Math.floor(c[0]) - 3, Math.floor(c[1]) - 1, 1, 2, col('ink', 0.1), g);
  rectS(Math.floor(c[0]) + 2, Math.floor(c[1]) - 1, 1, 2, col('ink', 0.1), g);
  rectS(Math.floor(c[0]) - 1, Math.floor(c[1]) + 2, 3, 1, col('ink', 0.1), g);
};

TYPES.plant = (o, g) => {
  const cx = o.x + o.w / 2, cy = o.y + o.d / 2;
  cyl(cx, cy, 0, 0.42, 8, 'clay', g, { tk: 0.2 });
  const c = P(cx, cy, 8);
  ellFill(c[0] - 4, c[1] - 4, 4, 2.6, col('leaf', 0), g);
  ellFill(c[0] + 4, c[1] - 5, 4, 3, col('leafLt', 0), g);
  ellFill(c[0] - 1, c[1] - 9, 3.4, 4, col('leaf', 0.12), g);
  ellFill(c[0] + 2, c[1] - 12, 2.4, 3, col('leafLt', 0.1), g);
};

/* a pair of felt slippers. pose 'tidy' = side by side, 'scattered' = kicked about, one flipped */
TYPES.slippers = (o, g) => {
  const parts = o.pose === 'scattered'
    ? [{ x: 0, y: 0.4, w: 0.36, d: 0.7 }, { x: 0.65, y: 0, w: 0.7, d: 0.36, flip: true }]
    : [{ x: 0, y: 0, w: 0.34, d: 0.7 }, { x: 0.43, y: 0, w: 0.34, d: 0.7 }];
  for (const p of parts) {
    const gs = newG(o.hot, true), sx = o.x + p.x, sy = o.y + p.y;
    box(sx, sy, 0, p.w, p.d, 2.4, p.flip ? 'sole' : 'slipper', gs, { tk: 0.2 });
    if (!p.flip) topPixels(sx + 0.04, sy + (p.w > p.d ? 0.02 : 0.28), p.w - 0.08, (p.w > p.d ? p.d - 0.04 : p.d - 0.32), 2.4, () => col('slipperIn', 0), gs);
  }
};

/* ============================================================
   library/hallway.js : a building corridor. A reception desk with
   things on it, the building cat, and the door painter.
   ============================================================ */

/* wooden door with a blank brass plate (the digits are too small to read on a sheared wall,
   so doors are told apart by their hotspot labels and the locked one by its colour) */
function doorPaint(locked) {
  return (ix, iz, w, h) => {
    if (ix < 2 || ix >= w - 2 || iz >= h - 2) return col('woodDk', -0.1);
    const midz = Math.floor(h / 2);
    // number plate above the panels
    if (ix >= 7 && ix <= 12 && iz >= h - 10 && iz <= h - 5) return col('brass', 0.15);
    const panel = ix >= 4 && ix < w - 4 && ((iz >= 4 && iz < midz - 3) || (iz >= midz + 3 && iz < h - 12));
    if (panel) { const edge = ix === 4 || iz === 4 || iz === midz + 3; return edge ? col('woodDk', 0) : col(locked ? 'doorLocked' : 'wood', -0.05); }
    if (ix >= w - 6 && ix <= w - 5 && iz >= midz - 1 && iz <= midz) return col('brass', 0.1);
    return col(locked ? 'doorLocked' : 'woodLt', -0.1);
  };
}

/* ---------- desk items ---------- */
/* the building's visitor log, lying open */
ITEM_TYPES.ledger = (it, z, g) => {
  box(it.x - 0.5, it.y - 0.34, z, 1.0, 0.68, 1.6, 'ledgerCover', g, { tk: 0.1 });
  topPixels(it.x - 0.46, it.y - 0.3, 0.92, 0.6, z + 1.6, (lx, ly) => {
    if (Math.abs(lx - 0.46) < 0.03) return col('paper', -0.4);
    if (Math.floor(ly * 10) % 2 === 1 && lx > 0.06 && lx < 0.86 && Math.abs(lx - 0.46) > 0.06) return col('ink', 0.55);
    return col('paper', 0.1);
  }, g);
};

/* the little CRT that shows the courtyard camera */
ITEM_TYPES.monitor = (it, z, g) => {
  const w = 1.1, d = 0.9, h = 9, x0 = it.x - w / 2, y0 = it.y - d / 2;
  box(x0, y0, z, w, d, h, 'crt', g, { tk: 0.2 });
  box(it.x - 0.3, it.y - 0.25, z, 0.6, 0.5, 1.5, 'crt', g, { tk: 0.1 });
  faceY(y0 + d, x0 + 0.1, x0 + w - 0.1, z + 1.5, z + h - 1, (ix, iz, w2, h2) => {
    if (ix === 0 || ix === w2 - 1 || iz === 0 || iz === h2 - 1) return col('crt', -0.5);
    // night courtyard: dark sky, wall, tap, a kneeling caretaker in orange
    if (iz > h2 - 3) return col('camSky', 0);
    if (ix >= 2 && ix <= 3 && iz >= 2 && iz <= 4) return col('camTap', 0);
    if (ix >= 5 && ix <= 6 && iz >= 2 && iz <= 4) return col('camMan', 0);
    if (ix >= 5 && ix <= 6 && iz === 5) return col('skin', -0.1);
    return (iz % 2 === 0) ? col('camGround', -0.1) : col('camGround', 0);
  }, g);
};

ITEM_TYPES.bell = (it, z, g) => {
  cyl(it.x, it.y, z, 0.28, 1, 'brass', g, { tk: 0.1 });
  cyl(it.x, it.y, z + 1, 0.16, 2, 'brass', g, { tk: 0.3 });
};

/* ---------- furniture ---------- */
TYPES.desk = (o, g) => {
  const { x, y, w, d, h } = o;
  box(x, y, 0, w, d, h - 2, 'woodDk', g, { tk: 0.05 });
  box(x - 0.05, y, h - 2, w + 0.1, d + 0.08, 2, 'woodLt', newG(o.hot, true), { tk: 0.25 });
  const n = 3, gap = 0.12, wd = (w - gap * (n + 1)) / n;
  for (let i = 0; i < n; i++) {
    const x0 = x + gap + i * (wd + gap);
    faceY(y + d, x0, x0 + wd, 2, h - 4, (ix, iz, w2, h2) => {
      if (ix === 0 || ix === w2 - 1 || iz === 0 || iz === h2 - 1) return col('woodDk', -0.2);
      const mx = Math.floor(w2 / 2);
      if ((ix === mx || ix === mx - 1) && (iz === Math.floor(h2 / 2))) return col('brass', 0.1);
      return col('wood', -0.1);
    }, newG(o.hot, true));
  }
  drawOn(o.id, h);
};

/* Halva, the building cat: orange tabby, white bib, sitting with her tail around her feet */
TYPES.cat = (o, g) => {
  const c = P(o.x + o.w / 2, o.y + o.d / 2, 0), cx = Math.floor(c[0]), cy = Math.floor(c[1]);
  ellFill(cx + 3, cy - 1, 4.5, 2.2, col('cat', -0.15), g);            // tail curl
  ellFill(cx, cy - 4, 4.6, 4.6, col('cat', 0), g);                     // body
  ellFill(cx, cy - 3, 2.2, 3, col('catBib', 0), g);                    // bib
  ellFill(cx, cy - 9, 3.6, 3.2, col('cat', 0.08), g);                  // head
  rectS(cx - 4, cy - 13, 2, 2, col('cat', -0.1), g); rectS(cx + 2, cy - 13, 2, 2, col('cat', -0.1), g); // ears
  rectS(cx - 2, cy - 10, 1, 1, col('ink', 0), g); rectS(cx + 1, cy - 10, 1, 1, col('ink', 0), g);       // eyes
  rectS(cx, cy - 8, 1, 1, col('rose', 0), g);                                                           // nose
  rectS(cx - 3, cy - 7, 1, 2, col('cat', -0.3), g); rectS(cx + 3, cy - 7, 1, 2, col('cat', -0.3), g);   // cheek stripes
};

/* ============================================================
   library/furniture.js : living room, kitchen, bathroom and storage
   pieces. Every piece takes o.face = 'y' (front toward the lower
   left, for things against the right-hand wall) or 'x' (front toward
   the lower right, for things against the left-hand wall). Colours
   come from palette keys so a theme can recolour a whole space.
   ============================================================ */

/* paint the front of a piece, whichever way it faces */
function front(o, z0, z1, fn, g) {
  if (o.face === 'x') faceX(o.x + o.w, o.y, o.y + o.d, z0, z1, fn, g);
  else faceY(o.y + o.d, o.x, o.x + o.w, z0, z1, fn, g);
}
const knobAt = (ix, iz, w, h, kz) => ((ix === Math.floor(w / 2) || ix === Math.floor(w / 2) - 1) && iz === (kz == null ? Math.floor(h / 2) : kz));
function bookStrips(seed) {
  return (ix, iz, w, h) => {
    if (ix === 0 || ix === w - 1 || iz === 0 || iz === h - 1) return col('woodDk', -0.2);
    const shelf = Math.floor(h / 3);
    if (iz % shelf === 0) return col('woodDk', 0);
    const hh = hash2(Math.floor(ix / 2) + seed, Math.floor(iz / shelf));
    if (hh > 0.86) return col('woodDk', -0.35);                       // gap
    const top = 3 + Math.floor(hh * 4);
    if ((iz % shelf) > shelf - 2 - top) return null;
    return col(['bookA', 'bookB', 'bookC', 'accent'][Math.floor(hh * 10) % 4], ix % 2 ? 0 : -0.15);
  };
}

TYPES.sofa = (o, g) => {
  const { x, y, w, d } = o, fx = o.face === 'x';
  box(x, y, 0, w, d, 6, 'fabricDk', g);
  const gs = newG(o.hot, true), gb = newG(o.hot, true), ga = newG(o.hot, true);
  if (!fx) {
    box(x + 0.25, y + 0.3, 6, w - 0.5, d - 0.3, 4, 'fabric', gs, { tk: 0.2 });
    box(x, y, 6, w, 0.35, 15, 'fabric', gb, { tk: 0.15 });
    box(x, y, 6, 0.28, d, 9, 'fabricDk', ga, { tk: 0.2 }); box(x + w - 0.28, y, 6, 0.28, d, 9, 'fabricDk', newG(o.hot, true), { tk: 0.2 });
    const n = Math.max(2, Math.round(w / 0.95));
    for (let i = 1; i < n; i++) line3([x + 0.25 + (w - 0.5) * i / n, y + 0.3, 10], [x + 0.25 + (w - 0.5) * i / n, y + d, 10], col('fabricDk', -0.3), gs);
  } else {
    box(x + 0.3, y + 0.25, 6, w - 0.3, d - 0.5, 4, 'fabric', gs, { tk: 0.2 });
    box(x, y, 6, 0.35, d, 15, 'fabric', gb, { tk: 0.15 });
    box(x, y, 6, w, 0.28, 9, 'fabricDk', ga, { tk: 0.2 }); box(x, y + d - 0.28, 6, w, 0.28, 9, 'fabricDk', newG(o.hot, true), { tk: 0.2 });
    const n = Math.max(2, Math.round(d / 0.95));
    for (let i = 1; i < n; i++) line3([x + 0.3, y + 0.25 + (d - 0.5) * i / n, 10], [x + w, y + 0.25 + (d - 0.5) * i / n, 10], col('fabricDk', -0.3), gs);
  }
};
TYPES.armchair = TYPES.sofa;

TYPES.coffeetable = (o, g) => {
  const { x, y, w, d } = o;
  for (const [lx, ly] of [[0, 0], [w - 0.18, 0], [0, d - 0.18], [w - 0.18, d - 0.18]]) box(x + lx, y + ly, 0, 0.18, 0.18, 7, 'woodDk', g);
  box(x, y, 7, w, d, 2, 'woodLt', newG(o.hot, true), { tk: 0.3 });
  const gi = newG(o.hot, true);
  box(x + 0.2, y + 0.2, 9, 0.5, 0.4, 1.5, 'bookA', gi); cyl(x + w - 0.4, y + d / 2, 9, 0.16, 3, 'paper', gi);
};

TYPES.tvunit = (o, g) => {
  const { x, y, w, d } = o, fx = o.face === 'x';
  box(x, y, 0, w, d, 9, 'woodDk', g, { tk: 0.1 });
  front(o, 1, 8, (ix, iz, w2, h2) => (ix === 0 || ix === w2 - 1 || iz === 0 || iz === h2 - 1 || ix === Math.floor(w2 / 2)) ? col('woodDk', -0.4) : (knobAt(ix, iz, w2, h2) || knobAt(ix + 1, iz, w2, h2) ? col('brass', 0.1) : col('wood', -0.05)), newG(o.hot, true));
  const gt = newG('tv', true);
  if (!fx) {
    box(x + 0.2, y + 0.22, 9, w - 0.4, 0.2, 13, 'tv', gt);
    faceY(y + 0.42, x + 0.28, x + w - 0.28, 11, 20, (ix, iz, w2, h2) => ((ix + iz) % 9 === 0 && iz > h2 / 2 ? col('glass', 0.3) : col('tvScreen', iz > h2 / 2 ? 0.1 : 0)), gt);
  } else {
    box(x + 0.22, y + 0.2, 9, 0.2, d - 0.4, 13, 'tv', gt);
    faceX(x + 0.42, y + 0.28, y + d - 0.28, 11, 20, (ix, iz, w2, h2) => ((ix + iz) % 9 === 0 && iz > h2 / 2 ? col('glass', 0.3) : col('tvScreen', iz > h2 / 2 ? 0.1 : 0)), gt);
  }
};

TYPES.bookshelf = (o, g) => {
  const { x, y, w, d, h } = o;
  box(x, y, 0, w, d, h, 'wood', g, { tk: 0.2 });
  front(o, 1, h - 2, bookStrips(Math.floor(x * 7 + y * 13)), newG(o.hot, true));
};

TYPES.floorlamp = (o, g) => {
  const cx = o.x + 0.3, cy = o.y + 0.3;
  cyl(cx, cy, 0, 0.22, 2, 'metalDk', g); cyl(cx, cy, 2, 0.06, 30, 'metal', g, { tk: 0.1 });
  cyl(cx, cy, 30, 0.4, 11, o.lit ? 'shadeOn' : 'shade', g, { tk: 0.15 });
};

/* kitchen run: o.kind = plain | sink | stove */
TYPES.kcounter = (o, g) => {
  const { x, y, w, d } = o, fx = o.face === 'x';
  box(x, y, 0, w, d, 15, 'cabinet', g, { tk: 0.05 });
  box(x - 0.04, y - 0.02, 15, w + 0.08, d + 0.06, 3, 'counterTop', newG(o.hot, true), { tk: 0.25 });
  const kind = o.kind || 'plain';
  front(o, 1, 14, (ix, iz, w2, h2) => {
    if (ix === 0 || ix === w2 - 1 || iz === 0 || iz === h2 - 1) return col('cabinet', -0.45);
    if (kind === 'stove' && ix > 2 && ix < w2 - 3 && iz > 2 && iz < h2 - 3) return iz > h2 - 6 ? col('metal', 0.3) : col('ink', 0.25);
    if (ix === Math.floor(w2 / 2) && kind !== 'stove') return col('cabinet', -0.4);
    return knobAt(ix, iz, w2, h2, h2 - 4) || knobAt(ix + 3, iz, w2, h2, h2 - 4) ? col('brass', 0.1) : col('cabinet', -0.1);
  }, newG(o.hot, true));
  const top = 18, gi = newG(kind === 'plain' ? o.hot : o.hot, true);
  if (kind === 'sink') {
    const sx = x + (fx ? 0.15 : w * 0.25), sy = y + (fx ? d * 0.25 : 0.15), sw = fx ? w - 0.3 : w * 0.5, sd = fx ? d * 0.5 : d - 0.3;
    topPixels(sx, sy, sw, sd, top, () => col('metalDk', -0.1), gi);
    topPixels(sx + 0.08, sy + 0.08, sw - 0.16, sd - 0.16, top, () => col('metal', 0.1), gi);
    cyl(fx ? x + 0.25 : x + w * 0.5, fx ? y + d * 0.5 : y + 0.3, top, 0.07, 6, 'metal', gi);
  } else if (kind === 'stove') {
    for (const [px, py] of [[0.28, 0.3], [0.72, 0.3], [0.28, 0.72], [0.72, 0.72]]) {
      const c = P(x + w * (fx ? py : px), y + d * (fx ? px : py), top);
      ellFill(c[0], c[1], 2.6, 1.4, col('ink', 0.1), gi); ellFill(c[0], c[1], 1.4, 0.8, col('red', 0), gi);
    }
  } else {
    const gp = newG(o.hot, true); cyl(x + w * 0.5, y + d * 0.5, top, 0.18, 4, 'clay', gp);
  }
};

TYPES.fridge = (o, g) => {
  const { x, y, w, d } = o;
  box(x, y, 0, w, d, 46, 'white', g, { tk: 0.2 });
  front(o, 1, 45, (ix, iz, w2, h2) => {
    if (ix === 0 || ix === w2 - 1 || iz === 0 || iz === h2 - 1) return col('whiteDk', -0.2);
    if (iz === Math.floor(h2 * 0.68)) return col('whiteDk', -0.35);
    if (ix === w2 - 3 && ((iz > h2 * 0.72 && iz < h2 * 0.95) || (iz > h2 * 0.2 && iz < h2 * 0.55))) return col('metal', 0.1);
    return col('white', iz > h2 - 3 ? 0.1 : -0.03);
  }, newG(o.hot, true));
};

TYPES.table = (o, g) => {
  const { x, y, w, d } = o;
  for (const [lx, ly] of [[0.1, 0.1], [w - 0.28, 0.1], [0.1, d - 0.28], [w - 0.28, d - 0.28]]) box(x + lx, y + ly, 0, 0.18, 0.18, 13, 'woodDk', g);
  box(x, y, 13, w, d, 2, 'woodLt', newG(o.hot, true), { tk: 0.3 });
  const gi = newG(o.hot, true);
  drawOn(o.id, 15);
  if (o.set) { cyl(x + w * 0.3, y + d * 0.5, 15, 0.26, 1.5, 'plate', gi); cyl(x + w * 0.7, y + d * 0.5, 15, 0.26, 1.5, 'plate', gi); cyl(x + w * 0.5, y + d * 0.5, 15, 0.14, 4, 'glass', gi); }
};
TYPES.chair = (o, g) => {
  const { x, y, w, d } = o;
  for (const [lx, ly] of [[0, 0], [w - 0.14, 0], [0, d - 0.14], [w - 0.14, d - 0.14]]) box(x + lx, y + ly, 0, 0.14, 0.14, 8, 'woodDk', g);
  box(x, y, 8, w, d, 2, 'wood', newG(o.hot, true), { tk: 0.3 });
  if (o.back === 'x') box(x, y, 10, 0.14, d, 10, 'wood', newG(o.hot, true), { tk: 0.2 });
  else if (o.back === 'X') box(x + w - 0.14, y, 10, 0.14, d, 10, 'wood', newG(o.hot, true), { tk: 0.2 });
  else if (o.back === 'Y') box(x, y + d - 0.14, 10, w, 0.14, 10, 'wood', newG(o.hot, true), { tk: 0.2 });
  else box(x, y, 10, w, 0.14, 10, 'wood', newG(o.hot, true), { tk: 0.2 });
};

TYPES.toilet = (o, g) => {
  const { x, y, w, d } = o, fx = o.face === 'x';
  if (!fx) { box(x, y, 0, w, 0.35, 16, 'white', g, { tk: 0.2 }); cyl(x + w / 2, y + 0.65, 0, 0.36, 9, 'white', newG(o.hot, true), { tk: 0.3 }); }
  else { box(x, y, 0, 0.35, d, 16, 'white', g, { tk: 0.2 }); cyl(x + 0.65, y + d / 2, 0, 0.36, 9, 'white', newG(o.hot, true), { tk: 0.3 }); }
  const c = P(fx ? x + 0.65 : x + w / 2, fx ? y + d / 2 : y + 0.65, 9);
  ellFill(c[0], c[1], 3.6, 1.8, col('whiteDk', -0.3), newG(o.hot, true));
};
TYPES.tub = (o, g) => {
  const { x, y, w, d } = o;
  box(x, y, 0, w, d, 13, 'white', g, { tk: 0.2 });
  topPixels(x + 0.14, y + 0.14, w - 0.28, d - 0.28, 13, (lx, ly) => (ly > d * 0.6 ? col('water', 0.15) : col('water', 0)), newG(o.hot, true));
  cyl(x + 0.3, y + 0.3, 13, 0.07, 6, 'metal', newG(o.hot, true));
};
TYPES.basin = (o, g) => {
  const { x, y, w, d } = o, fx = o.face === 'x';
  cyl(x + w / 2, y + d / 2, 0, 0.22, 11, 'white', g, { tk: 0.2 });
  box(x, y, 11, w, d, 5, 'white', newG(o.hot, true), { tk: 0.3 });
  topPixels(x + 0.12, y + 0.12, w - 0.24, d - 0.24, 16, () => col('whiteDk', -0.25), newG(o.hot, true));
  cyl(fx ? x + 0.12 : x + w / 2, fx ? y + d / 2 : y + 0.12, 16, 0.06, 5, 'metal', newG(o.hot, true));
};

/* open shelving with cardboard boxes and jars */
TYPES.shelfunit = (o, g) => {
  const { x, y, w, d, h } = o;
  box(x, y, 0, w, d, h, 'metalShelf', g, { tk: 0.15 });
  front(o, 1, h - 1, (ix, iz, w2, h2) => {
    const lv = Math.floor(h2 / 3);
    if (ix === 0 || ix === w2 - 1 || iz % lv === 0) return col('metalShelf', 0.1);
    const hh = hash2(Math.floor(ix / 4) + Math.floor(x * 5), Math.floor(iz / lv));
    const bh = 4 + Math.floor(hh * (lv - 6));
    if ((iz % lv) > bh || hh < 0.18) return col('ink', 0.05);
    const edge = ix % 4 === 0;
    return hh > 0.55 ? col(edge ? 'boxDk' : 'box', 0) : col(['red', 'yellow', 'glass'][Math.floor(hh * 10) % 3], edge ? -0.2 : 0);
  }, newG(o.hot, true));
};
TYPES.boxes = (o, g) => {
  const { x, y, w, d } = o;
  const stack = (bx, by, bw, bd, z, bh, gg) => {
    box(bx, by, z, bw, bd, bh, 'box', gg, { tk: 0.2 });
    faceY(by + bd, bx, bx + bw, z, z + bh, (ix, iz, w2, h2) => (iz === Math.floor(h2 / 2) || iz === Math.floor(h2 / 2) - 1) && ix > 1 && ix < w2 - 2 ? col('tape', 0) : (ix === 0 || iz === 0 ? col('boxDk', 0) : col('box', 0)), gg);
  };
  stack(x, y, w * 0.9, d * 0.9, 0, 10, g);
  stack(x + 0.1, y + 0.1, w * 0.62, d * 0.62, 10, 8, newG(o.hot, true));
};
TYPES.crates = (o, g) => {
  const slat = (ix, iz, w, h) => (ix < 2 || ix >= w - 2 || iz < 2 || iz >= h - 2) ? col('woodDk', 0) : (iz % 4 === 0 ? col('wood', -0.3) : col('wood', 0.05));
  const big = (x, y, w, d, z, h, gg) => {
    box(x, y, z, w, d, h, 'wood', gg);
    faceY(y + d, x, x + w, z, z + h, slat, gg);
    faceX(x + w, y, y + d, z, z + h, (ix, iz, ww, hh) => { const c = slat(ix, iz, ww, hh); return c === col('wood', 0.05) ? col('wood', -0.27) : c; }, gg);
    topPixels(x, y, w, d, z + h, (lx, ly) => ((Math.floor(ly * 10) % 4) === 0 ? col('wood', 0.1) : col('wood', 0.3)), gg);
  };
  big(o.x, o.y, 1.5, 1.5, 0, 11, g);
  if (!o.single) big(o.x + 0.2, o.y + 0.2, 1.1, 1.1, 11, 9, newG(o.hot, true));
};
TYPES.barrel = (o, g) => {
  const r = o.w / 2, cx = o.x + r, cy = o.y + o.d / 2, h = o.h || 22;
  for (const s of [[0, 0.2, 0.88], [0.2, 0.5, 0.98], [0.5, 0.8, 0.98], [0.8, 1, 0.88]]) cyl(cx, cy, h * s[0], r * s[2], h * (s[1] - s[0]), 'wood', g, { stripe: 4, tk: 0.1, topKey: 'woodLt' });
  cyl(cx, cy, h * 0.16, r * 0.99, 2, 'metal', g, { noTop: true }); cyl(cx, cy, h * 0.76, r * 0.99, 2, 'metal', g, { noTop: true });
};
TYPES.ladder = (o, g) => {
  const { x, y, w, d, h } = o;
  front(o, 0, h, () => null, g);   // (keeps the footprint registered)
  const rails = (ix, iz, w2, h2) => (ix < 2 || ix >= w2 - 2) ? col('wood', 0) : (iz % 6 === 2 ? col('woodLt', 0) : null);
  if (o.face === 'x') faceX(x + 0.1, y, y + d, 0, h, rails, g); else faceY(y + 0.1, x, x + w, 0, h, rails, g);
};
TYPES.workbench = (o, g) => {
  const { x, y, w, d } = o;
  for (const [lx, ly] of [[0.1, 0.1], [w - 0.28, 0.1], [0.1, d - 0.28], [w - 0.28, d - 0.28]]) box(x + lx, y + ly, 0, 0.2, 0.2, 14, 'woodDk', g);
  box(x, y, 14, w, d, 3, 'woodLt', newG(o.hot, true), { tk: 0.3 });
  const gi = newG(o.hot, true);
  if (o.bare) { drawOn(o.id, 17); return; }
  box(x + 0.3, y + 0.3, 17, 0.5, 0.18, 1.5, 'metalDk', gi); cyl(x + w - 0.4, y + d * 0.5, 17, 0.2, 5, 'red', gi);
};
TYPES.boiler = (o, g) => {
  const cx = o.x + o.w / 2, cy = o.y + o.d / 2;
  cyl(cx, cy, 0, o.w / 2, 40, 'metal', g, { tk: 0.2, stripe: 5 }); cyl(cx, cy, 40, o.w / 2 * 0.5, 8, 'metalDk', g);
  const c = P(cx + o.w * 0.15, cy + o.d * 0.45, 24); ellFill(c[0], c[1], 3, 3, col('paper', 0.1), g); put(Math.floor(c[0]), Math.floor(c[1]) - 1, col('red', 0), g);
};
TYPES.bin = (o, g) => { const r = Math.min(o.w, o.d) * 0.36; cyl(o.x + o.w / 2, o.y + o.d / 2, 0, r, 8, 'bin', g, { tk: 0.25 }); cyl(o.x + o.w / 2, o.y + o.d / 2, 8, r + 0.03, 1.5, 'binLid', g, { tk: 0.3 }); };

/* ============================================================
   library/outdoor.js : yard, car park and stairwell pieces.
   ============================================================ */

TYPES.tree = (o, g) => {
  const cx = o.x + o.w / 2, cy = o.y + o.d / 2;
  cyl(cx, cy, 0, 0.26, 22, 'bark', g, { tk: 0.15 });
  const c = P(cx, cy, 22), gl = newG(o.hot, true);
  ellFill(c[0] - 7, c[1] - 4, 9, 6.5, col('leaf', -0.1), gl); ellFill(c[0] + 7, c[1] - 5, 9, 7, col('leaf', 0), gl);
  ellFill(c[0], c[1] - 12, 10, 8, col('leafLt', -0.05), gl); ellFill(c[0] - 3, c[1] - 17, 6, 4.5, col('leafLt', 0.15), gl);
  if (o.fruit) for (const [dx, dy] of [[-8, -4], [6, -9], [2, -2], [9, -3], [-3, -14]]) ellFill(c[0] + dx, c[1] + dy, 1.4, 1.4, col('orange', 0), gl);
};
TYPES.bush = (o, g) => {
  const c = P(o.x + o.w / 2, o.y + o.d / 2, 0);
  ellFill(c[0] - 4, c[1] - 3, 5.5, 4, col('leaf', -0.1), g); ellFill(c[0] + 4, c[1] - 3, 5.5, 4, col('leaf', 0), g); ellFill(c[0], c[1] - 6, 5.5, 4.2, col('leafLt', 0), g);
  if (o.flowers) for (const [dx, dy] of [[-5, -3], [4, -7], [6, -2], [-1, -8]]) put(Math.floor(c[0] + dx), Math.floor(c[1] + dy), col(o.flowers, 0.1), g);
};
TYPES.bench = (o, g) => {
  const { x, y, w, d } = o, fx = o.face === 'x';
  box(x, y, 0, fx ? 0.16 : 0.16, fx ? d : d, 8, 'woodDk', g); box(x + w - 0.16, y, 0, 0.16, d, 8, 'woodDk', newG(o.hot, true));
  box(x, y, 8, w, d, 2, 'woodLt', newG(o.hot, true), { tk: 0.3 });
  if (fx) box(x, y, 10, 0.14, d, 9, 'wood', newG(o.hot, true), { tk: 0.2 }); else box(x, y, 10, w, 0.14, 9, 'wood', newG(o.hot, true), { tk: 0.2 });
};
/* outdoor tap with a bucket under it: the caretaker's tap */
TYPES.tap = (o, g) => {
  const cx = o.x + 0.3, cy = o.y + 0.3;
  cyl(cx, cy, 0, 0.09, 10, 'metal', g); box(cx - 0.1, cy - 0.05, 10, 0.5, 0.1, 2, 'metal', newG(o.hot, true));
  cyl(cx + 0.55, cy + 0.35, 0, 0.3, 7, 'bin', newG('bucket', true), { tk: 0.2 });
};
TYPES.flowerbed = (o, g) => {
  box(o.x, o.y, 0, o.w, o.d, 4, 'brick', g, { tk: 0.2 });
  topPixels(o.x + 0.1, o.y + 0.1, o.w - 0.2, o.d - 0.2, 4, (lx, ly) => { const h = hash2(Math.floor(lx * 10), Math.floor(ly * 10)); return h > 0.86 ? col(['red', 'yellow', 'pink'][Math.floor(h * 100) % 3], 0.1) : col(h > 0.5 ? 'leaf' : 'soil', 0); }, newG(o.hot, true));
};

/* a small car. o.dir 'x' = long side faces the lower left, 'y' = long side faces the lower right */
TYPES.car = (o, g) => {
  const { x, y, w, d } = o, along = o.dir === 'y' ? 'y' : 'x';
  const body = o.color || 'carA';
  box(x, y, 3, w, d, 6, body, g, { tk: 0.2 });
  // cabin set back from the ends
  const cab = along === 'x' ? [x + w * 0.22, y + 0.12, w * 0.5, d - 0.24] : [x + 0.12, y + d * 0.22, w - 0.24, d * 0.5];
  const gc = newG(o.hot, true);
  box(cab[0], cab[1], 9, cab[2], cab[3], 5, body, gc, { tk: 0.25 });
  const win = (ix, iz, w2, h2) => (ix < 2 || ix >= w2 - 2 || iz < 1 || iz >= h2 - 1) ? col(body, -0.3) : (ix === Math.floor(w2 / 2) ? col(body, -0.3) : col('glass', iz > h2 / 2 ? 0.2 : 0));
  if (along === 'x') faceY(cab[1] + cab[3], cab[0], cab[0] + cab[2], 9, 14, win, gc); else faceX(cab[0] + cab[2], cab[1], cab[1] + cab[3], 9, 14, win, gc);
  const gw = newG(o.hot, true);
  const wheel = (ix, iz, w2, h2) => { const dx = ix - 4, dz = iz - 3; return dx * dx + dz * dz <= 10 ? col('ink', iz > 3 ? 0.1 : 0) : null; };
  if (along === 'x') {
    faceY(y + d, x + 0.25, x + 0.85, 0, 7, wheel, gw); faceY(y + d, x + w - 0.85, x + w - 0.25, 0, 7, wheel, gw);
    faceX(x + w, y, y + d, 3, 9, (ix, iz, w2, h2) => (iz > h2 - 3 ? col('red', 0) : (iz < 2 && (ix < 3 || ix > w2 - 4)) ? col('yellow', 0.2) : col(body, -0.32)), gw);
  } else {
    faceX(x + w, y + 0.25, y + 0.85, 0, 7, wheel, gw); faceX(x + w, y + d - 0.85, y + d - 0.25, 0, 7, wheel, gw);
    faceY(y + d, x, x + w, 3, 9, (ix, iz, w2, h2) => ((iz < 3 && (ix < 3 || ix > w2 - 4)) ? col('yellow', 0.2) : col(body, 0)), gw);
  }
};
TYPES.pillar = (o, g) => {
  box(o.x, o.y, 0, o.w, o.d, 56, 'concrete', g, { tk: 0.2 });
  faceY(o.y + o.d, o.x, o.x + o.w, 8, 16, (ix, iz) => ((ix + iz) % 6 < 3 ? col('yellow', 0) : col('ink', 0)), newG(o.hot, true));
  faceX(o.x + o.w, o.y, o.y + o.d, 8, 16, (ix, iz) => ((ix + iz) % 6 < 3 ? col('yellow', -0.3) : col('ink', 0)), newG(o.hot, true));
};

/* A staircase rising toward the back-left corner along the right wall.
   o.open = false: solid, one flat side face with a stepped top edge.
   o.open = true : thin treads on one slanted side beam, nothing under them.
   Steps are drawn from the far (high) one to the near (low) one so every step overlaps the one behind it. */
TYPES.stairs = (o, g) => {
  const n = o.steps || 8, dx = o.w / n, rise = 5, yD = o.y + o.d, xf = o.x + o.w, xb = o.x;
  const tread = (lx) => (lx < 0.12 ? 'bright' : 'lit');
  const treadPaint = (lx) => (tread(lx) === 'bright' ? col('stairTop', 0.55) : col('stairTop', 0.22));
  if (!o.open) {
    for (let i = n - 1; i >= 0; i--) {
      const sx = xf - (i + 1) * dx, top = (i + 1) * rise;
      box(sx, o.y, 0, dx, o.d, top, 'stairBody', g, { tk: 0.3, lk: -0.14, rk: -0.42 });   // one gid: no seams inside the flight
      topPixels(sx, o.y, dx, o.d, top, treadPaint, g);
    }
  } else {
    // the slanted side beam under the treads, on the open side
    const zTop = (x) => rise + rise * (xf - dx / 2 - x) / dx - 2, drop = 6;
    const x0 = xf - dx / 2 - (drop + 2 - rise) * dx / rise;
    const pts = [[xf, yD, 0], [xf, yD, zTop(xf)], [xb, yD, zTop(xb)], [xb, yD, zTop(xb) - drop], [x0, yD, 0]];
    poly(pts.map((p) => P(p[0], p[1], p[2])), col('stairBody', -0.14), g);
    for (let i = n - 1; i >= 0; i--) {
      const sx = xf - (i + 1) * dx, top = (i + 1) * rise, gs = newG(o.hot, true);
      box(sx, o.y, top - 2, dx, o.d, 2, 'stairTop', gs, { tk: 0.3, lk: -0.1, rk: -0.3 });
      topPixels(sx, o.y, dx, o.d, top, treadPaint, gs);
    }
  }
  const gr = newG(o.hot, true), y0 = yD - 0.12;
  for (let i = 0; i < n; i++) { const px = xf - (i + 0.5) * dx; box(px - 0.03, y0, (i + 1) * rise, 0.06, 0.06, 14, 'stairRail', gr, { tk: 0.2 }); }
  const rail = (dz, k) => line3([xf - 0.5 * dx, y0 + 0.03, rise + 14 + dz], [xb + 0.5 * dx, y0 + 0.03, n * rise + 14 + dz], col('stairRail', k), gr);
  rail(0, 0.3); rail(1, 0.3); rail(-1, -0.2);
  box(xf - 0.1, y0, 0, 0.1, 0.1, rise + 16, 'stairRail', gr, { tk: 0.2 });
};

/* a post with a small camera box on top */
TYPES.camerapost = (o, g) => {
  const cx = o.x + o.w / 2, cy = o.y + o.d / 2;
  cyl(cx, cy, 0, 0.1, 26, 'metalDk', g);
  box(cx - 0.28, cy - 0.2, 26, 0.56, 0.4, 4, 'metal', newG(o.hot, true), { tk: 0.2 });
  box(cx - 0.1, cy + 0.2, 27, 0.2, 0.1, 2, 'ink', newG(o.hot, true));
};

/* ============================================================
   library/extras.js : office, bathroom, garden and library pieces
   added after the first space kit (shower, desks, loungers, pool
   things, big planters, book piles).
   ============================================================ */

/* a shower cubicle with a striped curtain, partly drawn back */
TYPES.shower = (o, g) => {
  const { x, y, w, d } = o;
  box(x, y, 0, w, d, 2, 'whiteDk', g, { tk: 0.2 });
  const gc = newG(o.hot, true);
  const stripes = (open) => (ix, iz, w2, h2) => {
    if (iz > h2 - 2) return col('metal', 0.2);
    if (open && ix > w2 * 0.55 && ix < w2 * 0.85) return null;
    if (ix % 7 === 0) return col('curtainB', -0.25);
    return (Math.floor(ix / 4) % 2) ? col('curtainA', 0) : col('curtainB', 0);
  };
  faceY(y + d, x, x + w, 2, 38, stripes(true), gc);
  faceX(x + w, y, y + d, 2, 38, stripes(false), newG(o.hot, true));
  for (const [px, py] of [[x, y], [x + w - 0.05, y], [x, y + d - 0.05], [x + w - 0.05, y + d - 0.05]]) box(px, py, 2, 0.05, 0.05, 36, 'metal', gc);
  const c = P(x + 0.25, y + 0.25, 34); ellFill(c[0], c[1], 2.4, 1.2, col('metal', 0.2), gc);
};

TYPES.officedesk = (o, g) => {
  const fx = o.face === 'x', x = o.x, y = o.y, w = fx ? 1.0 : o.w, d = fx ? o.d : 1.0;   // the footprint also covers the chair on the open side
  const cx0 = fx ? x + 1.15 : x + o.w * 0.4, cy0 = fx ? y + o.d * 0.4 : y + 1.15;
  for (const [lx, ly] of [[0.1, 0.1], [w - 0.28, 0.1], [0.1, d - 0.28], [w - 0.28, d - 0.28]]) box(x + lx, y + ly, 0, 0.18, 0.18, 12, 'metalDk', g);
  box(x, y, 12, w, d, 2, 'woodLt', newG(o.hot, true), { tk: 0.3 });
  const gm = newG('computer', true);
  if (!fx) {
    box(x + w * 0.25, y + 0.25, 14, w * 0.4, 0.14, 9, 'tv', gm);
    faceY(y + 0.39, x + w * 0.28, x + w * 0.62, 16, 22, (ix, iz, w2, h2) => ((ix + iz) % 8 === 0 && iz > h2 / 2 ? col('glass', 0.3) : col('tvScreen', iz > h2 / 2 ? 0.1 : 0)), gm);
    box(x + w * 0.28, y + 0.55, 14, w * 0.34, 0.25, 1, 'whiteDk', gm);
  } else {
    box(x + 0.25, y + d * 0.25, 14, 0.14, d * 0.4, 9, 'tv', gm);
    faceX(x + 0.39, y + d * 0.28, y + d * 0.62, 16, 22, (ix, iz, w2, h2) => ((ix + iz) % 8 === 0 && iz > h2 / 2 ? col('glass', 0.3) : col('tvScreen', iz > h2 / 2 ? 0.1 : 0)), gm);
    box(x + 0.55, y + d * 0.28, 14, 0.25, d * 0.34, 1, 'whiteDk', gm);
  }
  cyl(fx ? x + 0.4 : x + w * 0.85, fx ? y + d * 0.85 : y + 0.5, 14, 0.12, 3, 'red', newG(o.hot, true));
  const gch = newG('chair', true);
  for (const [lx, ly] of [[0, 0], [0.5, 0], [0, 0.5], [0.5, 0.5]]) box(cx0 + lx, cy0 + ly, 0, 0.1, 0.1, 8, 'metalDk', gch);
  box(cx0, cy0, 8, 0.6, 0.6, 2, 'fabricDk', gch, { tk: 0.3 });
  if (fx) box(cx0 + 0.5, cy0, 10, 0.1, 0.6, 9, 'fabricDk', gch, { tk: 0.2 }); else box(cx0, cy0 + 0.5, 10, 0.6, 0.1, 9, 'fabricDk', gch, { tk: 0.2 });
};
TYPES.cabinet = (o, g) => {
  const { x, y, w, d } = o;
  box(x, y, 0, w, d, 32, 'metalShelf', g, { tk: 0.25 });
  front(o, 1, 31, (ix, iz, w2, h2) => {
    if (ix === 0 || ix === w2 - 1 || iz === 0 || iz === h2 - 1) return col('metalShelf', -0.4);
    const lv = Math.floor(h2 / 3);
    if (iz % lv === 0) return col('metalShelf', -0.4);
    if ((ix === Math.floor(w2 / 2) || ix === Math.floor(w2 / 2) - 1) && iz % lv === Math.floor(lv / 2)) return col('metal', 0.3);
    return col('metalShelf', iz % lv > lv - 3 ? 0.15 : 0);
  }, newG(o.hot, true));
};
TYPES.cooler = (o, g) => {
  const cx = o.x + o.w / 2, cy = o.y + o.d / 2;
  box(o.x + 0.1, o.y + 0.1, 0, o.w - 0.2, o.d - 0.2, 14, 'white', g, { tk: 0.2 });
  cyl(cx, cy, 14, 0.28, 12, 'waterBottle', newG(o.hot, true), { tk: 0.3 });
  cyl(cx, cy, 26, 0.12, 2, 'whiteDk', newG(o.hot, true));
};
TYPES.printer = (o, g) => {
  box(o.x, o.y, 0, o.w, o.d, 7, 'whiteDk', g, { tk: 0.25 });
  box(o.x + 0.1, o.y + 0.1, 7, o.w - 0.2, o.d * 0.5, 1, 'paper', newG(o.hot, true));
};
TYPES.lounger = (o, g) => {
  const { x, y, w, d } = o, fx = o.face === 'x';
  box(x, y, 3, w, d, 3, 'fabric', g, { tk: 0.2 });
  for (const [lx, ly] of [[0, 0], [w - 0.15, 0], [0, d - 0.15], [w - 0.15, d - 0.15]]) box(x + lx, y + ly, 0, 0.15, 0.15, 3, 'metalDk', newG(o.hot, true));
  if (fx) box(x, y, 6, 0.5, d, 5, 'fabricDk', newG(o.hot, true), { tk: 0.3 }); else box(x, y, 6, w, 0.5, 5, 'fabricDk', newG(o.hot, true), { tk: 0.3 });
};
TYPES.floatring = (o, g) => {
  const c = P(o.x + o.w / 2, o.y + o.d / 2, 1);
  ellFill(c[0], c[1], 8, 4, col('pink', 0), g); ellFill(c[0], c[1], 4.5, 2.2, col('water', -0.1), g);
  ellFill(c[0] + 6, c[1] - 4, 2, 2, col('pink', 0.1), g); put(Math.floor(c[0]) + 7, Math.floor(c[1]) - 5, col('ink', 0), g);       // the flamingo's head
};
TYPES.poolladder = (o, g) => {
  const { x, y } = o;
  for (const k of [0, 0.5]) { cyl(x + k, y, 0, 0.04, 12, 'metal', g); line3([x + k, y, 12], [x + k, y + 0.7, 5], col('metal', 0.2), g); }
  for (let i = 0; i < 3; i++) line3([x, y + 0.15 + i * 0.15, 8 - i * 2], [x + 0.5, y + 0.15 + i * 0.15, 8 - i * 2], col('metal', 0.1), g);
};
TYPES.planter = (o, g) => {
  const cx = o.x + o.w / 2, cy = o.y + o.d / 2;
  cyl(cx, cy, 0, o.w / 2, 8, 'clay', g, { tk: 0.2 });
  const c = P(cx, cy, 8), gl = newG(o.hot, true);
  for (const [dx, dy, rx, ry, k] of [[-6, -6, 5, 3.5, -0.05], [6, -7, 5, 3.5, 0], [0, -12, 4, 4.5, 0.1], [-4, -17, 3.4, 3.4, 0.15], [5, -16, 3.4, 3.4, 0.05]]) ellFill(c[0] + dx, c[1] + dy, rx, ry, col(k > 0.08 ? 'leafLt' : 'leaf', k), gl);
};
TYPES.bookpile = (o, g) => {
  const { x, y, w, d } = o;
  box(x, y, 0, w, d, 2, 'bookA', g); box(x + 0.05, y + 0.05, 2, w - 0.1, d - 0.1, 2, 'bookB', newG(o.hot, true)); box(x + 0.1, y + 0.1, 4, w - 0.2, d - 0.2, 2, 'bookC', newG(o.hot, true));
};
/* a stack of cushions and a throw: the reading nook corner */
TYPES.nook = (o, g) => {
  const { x, y, w, d } = o;
  box(x, y, 0, w, d, 5, 'fabricDk', g, { tk: 0.2 });
  box(x + 0.1, y + 0.1, 5, w - 0.2, d - 0.2, 3, 'fabric', newG(o.hot, true), { tk: 0.3 });
  cyl(x + 0.4, y + 0.4, 8, 0.28, 3, 'accent', newG(o.hot, true), { tk: 0.3 });
};

/* ---------- small items for case 2 ---------- */
/* a folder of papers. it.cover: 'folder' (cream) | 'blue' (a police file) */
ITEM_TYPES.papers = (it, z, g) => {
  const blue = it.cover === 'blue';
  box(it.x - 0.45, it.y - 0.34, z, 0.9, 0.68, 0.9, blue ? 'folderBlue' : 'folder', g, { tk: 0.15 });
  topPixels(it.x - 0.4, it.y - 0.3, 0.8, 0.6, z + 0.9, (lx, ly) => {
    if (blue) return ly < 0.14 ? col('paper', -0.1) : (lx > 0.12 && lx < 0.88 && Math.floor(ly * 10) % 2 === 1 ? col('ink', 0.55) : col('folderBlue', 0.15));
    if (ly < 0.16) return col('folder', -0.2);
    return (lx > 0.12 && lx < 0.88 && Math.floor(ly * 10) % 2 === 0 ? col('ink', 0.5) : col('paper', 0.1));
  }, g);
};
/* the building's electricity meter box with a round dial */
ITEM_TYPES.meter = (it, z, g) => {
  box(it.x - 0.45, it.y - 0.22, z, 0.9, 0.44, 7, 'meterBody', g, { tk: 0.2 });
  faceY(it.y + 0.22, it.x - 0.4, it.x + 0.4, z + 1, z + 6, (ix, iz, w2, h2) => {
    const dx = ix - (w2 - 1) / 2, dz = iz - (h2 - 1) / 2;
    if (ix === 0 || ix === w2 - 1 || iz === 0 || iz === h2 - 1) return col('metalDk', 0);
    if (dx * dx + dz * dz <= 3.2) return Math.abs(dx - dz) < 0.8 ? col('red', 0) : col('meterDial', 0);
    return col('metal', 0.1);
  }, g);
};

/* ============================================================
   library/spaces.js : the space kit. makeSpace(type, opts) builds a
   complete room definition (floor, walls, doors, furniture, light)
   from a type, a seed and a theme, so a new scenario never starts
   from an empty room.

     makeSpace('kitchen', { seed: 7, theme: 1, time: 'night',
        doors: [{ slot: 'RA', to: 'living', kind: 'door' }], name: 'room.kitchen' })

   Same type + same seed = same room. Different seeds change the
   layout, the theme (colours) and small details; `mirror` flips the
   whole room left-right. Doors sit in fixed wall slots and the kit
   keeps furniture out of their way.
   ============================================================ */

/* door slots: A near the back corner, B toward the front, C at the very end of the wall; relative to the wall's length */
const SLOT_NAMES = ['LA', 'LB', 'LC', 'RA', 'RB', 'RC'];
/* slot N: a narrow door at the far end of the wall (used where a staircase takes the back corner) */
function slotOf(name, nx, ny) {
  const wall = name[0], len = wall === 'R' ? nx : ny;
  if (name[1] === 'N') { const k = +name[2] || 0, u1 = len - 0.4 - k * 1.9; return { wall, u0: u1 - 1.4, u1 }; }
  const u0 = name[1] === 'A' ? 0.8 : name[1] === 'B' ? len - 3.4 : len - 2.1;
  return { wall, u0, u1: u0 + 2 };
}
const SPACE_TYPES = ['hallway', 'lobby', 'yard', 'garden', 'basement', 'parking', 'living', 'bedroom', 'kitchen', 'bathroom', 'storage', 'stairs', 'elevator', 'balcony', 'library', 'office'];
/* rooms are not all 8 x 8: [tiles along the right wall, tiles along the left wall] */
const SIZE_OF = { bathroom: [6, 6], elevator: [5, 5], balcony: [8, 4], stairs: [8, 6], storage: [7, 7], hallway: [8, 6] };

function rngFor(seed) {            // mulberry32: small, fast, repeatable
  let a = (seed | 0) + 0x6D2B79F5;
  return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

/* every key any piece may ask for; themes override a few of them */
const BASE_PAL = {
  slab: '#3a2c33', rim: '#3a2d36',
  wallTop: '#e8d6ab', wallLow: '#d4793b', trim: '#f2e6c4', tile: '#dfe8e6', tileDk: '#a8bcb8', brick: '#a9573f', brickDk: '#7c3d2c', concrete: '#9aa0a8', concreteDk: '#6f757d',
  floorA: '#dccdaa', floorB: '#c6b793', grout: '#8a7a5f', rugA: '#3f9aa8', rugB: '#e6f1e8',
  wood: '#8b5a3b', woodDk: '#4f3326', woodLt: '#b9804d', doorLocked: '#5b3a4a', brass: '#e0b04a', ink: '#2a2132', paper: '#f4ead0', frame: '#3a2a2a',
  fabric: '#3f7f9a', fabricDk: '#2d6179', cabinet: '#4f7a62', counterTop: '#e8e0cf', white: '#eef0ee', whiteDk: '#b9c2c4', metal: '#9aa3ae', metalDk: '#5c6672', metalShelf: '#6d7f8f',
  glass: '#bfe6ee', water: '#7fc4de', leaf: '#4f9a5b', leafLt: '#7cc07a', clay: '#b4623e', bark: '#6b4a3a', soil: '#5a3d2a', grass: '#6aa84f', grassDk: '#4f8a3c', path: '#cdbd98',
  red: '#d6453d', yellow: '#f2c24e', pink: '#e68aa8', orange: '#f08a2b', tv: '#2a2a33', tvScreen: '#3a5a80', shade: '#5aa4a8', shadeOn: '#f8e4a6',
  box: '#c8a066', boxDk: '#9a7544', tape: '#d9c28c', bin: '#4f6a5a', binLid: '#6f8a7a', stairBody: '#a8845a', stairTop: '#d8b88a', asphalt: '#4a4d58', line: '#e8e4d0', pipe: '#8a97a3',
  carA: '#d6453d', carB: '#3b7fb8', carC: '#e0b04a', carD: '#4f9a5b',
  bookA: '#c05a4a', bookB: '#e3c06a', bookC: '#4f7aa8', bookD: '#4f7a5a', bookE: '#8a4a6a', bookF: '#d2a24a', bookG: '#3a5a7a', accent: '#7a4b8a',
  railGreen: '#3d6a5a', railTop: '#6b4a3a', stairRail: '#7a4f30', curtainA: '#e8e8f0', curtainB: '#5a7ab0', waterBottle: '#9fd4ee',
  // bedroom pieces
  bedwood: '#4a3433', navy: '#2b4a5e', cab: '#2f4b5d', cabLt: '#3d6279', blue: '#2f6f8f', blueLt: '#d3e8ec', sheet: '#d9d3c4', pillow: '#ece7d8', brassBox: '#c8963e', pouf: '#3b84a6', ghost: '#f1f8f2', chalkW: '#ffffff',
  sky: '#8ec5ea', skyDk: '#17203a', cloud: '#f4f8fb', star: '#f5f0c8', curtain: '#d6b36a', curtainDk: '#a98a48', skin: '#e9b99a', chalk: '#f6f3e8',
  crt: '#cdbf9c', camSky: '#1c2a44', camGround: '#33503a', camTap: '#6fb7e8', camMan: '#e08a2a',
  tea: '#7a3e22', teaLow: '#a8764a', residue: '#efe9dc', herb: '#5f9a4c', cupBlue: '#3b7fb8', saucer: '#f1e8d3', folder: '#d8c28a', folderBlue: '#3b5f8a', meterBody: '#8d98a4', meterDial: '#e8e4d0',
  cat: '#e89a4a', catBib: '#f4ead8', rose: '#e07a7a', ledgerCover: '#7a2f3a', slipper: '#b8483f', slipperIn: '#5a2a2e', sole: '#6b5a4a'
};

/* three colour themes per type; each overrides only what it needs */
const THEMES = {
  hallway: [{}, { wallTop: '#dfe6d4', wallLow: '#5f8f6f', runnerA: '#8f3d3d', floorA: '#d6d0c0', floorB: '#bdb6a2' }, { wallTop: '#e6dcec', wallLow: '#7a5f9a', floorA: '#d8d0e0', floorB: '#bfb6ca' }],
  lobby: [{ wallTop: '#efe6d2', wallLow: '#7a3b3b', floorA: '#e8e2d4', floorB: '#b8b0a0', fabric: '#7a3b3b', fabricDk: '#5a2a2a' }, { wallTop: '#dbe6ec', wallLow: '#3d6a8a', floorA: '#e4e8ec', floorB: '#a8b4c0', fabric: '#3d6a8a', fabricDk: '#2d526c' }, { wallTop: '#e8e0c8', wallLow: '#2f5a46', floorA: '#e0dcc8', floorB: '#a8a48c', fabric: '#2f5a46', fabricDk: '#22443a' }],
  yard: [{}, { grass: '#8aa84f', grassDk: '#6a8a3c', brick: '#8a6a5a' }, { grass: '#5f9a6a', grassDk: '#427a52', brick: '#9a5a4a' }],
  basement: [{ concrete: '#7c828c', brick: '#6a5a58', brickDk: '#4a3c3a' }, { concrete: '#6c747e', brick: '#58626a', brickDk: '#3c464e' }, { concrete: '#8a8070', brick: '#7a6a52', brickDk: '#54482e' }],
  parking: [{}, { asphalt: '#3f4a58', concrete: '#a8aeb8' }, { asphalt: '#524a48', concrete: '#9a948c' }],
  living: [{ wallTop: '#e8d6ab', wallLow: '#c9703a', floorA: '#b98a5a', floorB: '#a87a4a', fabric: '#3f7f9a', fabricDk: '#2d6179' }, { wallTop: '#dfe6d4', wallLow: '#7a9a6a', floorA: '#c2a478', floorB: '#b0935f', fabric: '#8a4a5a', fabricDk: '#6a3644' }, { wallTop: '#e6dcec', wallLow: '#7a6a9a', floorA: '#a8b0b8', floorB: '#98a0a8', fabric: '#c9803a', fabricDk: '#a2652a' }],
  bedroom: [{ wallTop: '#86a6ab', wallLow: '#668a93', floorA: '#c9bca3', floorB: '#b6a98f' }, { wallTop: '#c9a6a6', wallLow: '#a98080', floorA: '#d6c8b0', floorB: '#c2b49a', blue: '#8f4a5a', blueLt: '#f0d8dc' }, { wallTop: '#a6b88a', wallLow: '#8aa06a', floorA: '#c8b896', floorB: '#b4a47e', blue: '#6a8a4a', blueLt: '#e4ecd0' }],
  kitchen: [{ wallTop: '#f0e4c0', wallLow: '#4f7a62', cabinet: '#4f7a62', floorA: '#e8e0cf', floorB: '#c9bfa8' }, { wallTop: '#e6ecf0', wallLow: '#3d6a8a', cabinet: '#3d6a8a', floorA: '#d8d8d8', floorB: '#b8b8b8' }, { wallTop: '#f4e0d0', wallLow: '#c9703a', cabinet: '#8a4a2a', floorA: '#d8c8a8', floorB: '#bfae8a' }],
  bathroom: [{ tile: '#dfe8e6', tileDk: '#a8bcb8', floorA: '#b8c8c8', floorB: '#a0b4b4' }, { tile: '#e8e0d0', tileDk: '#b8a888', floorA: '#c8c0a8', floorB: '#b0a890' }, { tile: '#d8e4f0', tileDk: '#9ab0cc', floorA: '#b0bccc', floorB: '#98a6b8' }],
  storage: [{ wallTop: '#cfc7b0', wallLow: '#9a8f78' }, { wallTop: '#c0c8c4', wallLow: '#8a9a94' }, { wallTop: '#d4c4b0', wallLow: '#a48a6c' }],
  stairs: [{ wallTop: '#4f6a82', wallLow: '#3d566d', stairTop: '#c89a6a', stairBody: '#8a5a3a', stairRail: '#e8d8b0' }, { wallTop: '#e6dcc6', wallLow: '#8a7a68' }, { wallTop: '#dce4e8', wallLow: '#6a7e8a', stairTop: '#e8e0d0', stairBody: '#a8a090', stairRail: '#3a3a44' }],
  garden: [{}, { grass: '#8aa84f', grassDk: '#6a8a3c', water: '#6cc4d8' }, { grass: '#5f9a6a', grassDk: '#427a52', water: '#82d0e0' }],
  balcony: [{ wallTop: '#efe6d4', floorA: '#a87a50', floorB: '#946a42', railGreen: '#3d6a5a', fabric: '#e8dcc8', fabricDk: '#cdbd9f' }, { wallTop: '#e4ecf0', floorA: '#b09070', floorB: '#9c7e5c', railGreen: '#3d5a7a', fabric: '#d6e2ea', fabricDk: '#b4c4d0' }, { wallTop: '#f0e4e0', floorA: '#c09878', floorB: '#aa8464', railGreen: '#7a3d4a', fabric: '#e8d4d0', fabricDk: '#cfb2ac' }],
  library: [{ wood: '#6b4a32', woodDk: '#3d2a1e', floorA: '#a8683c', floorB: '#94582e', fabric: '#a8352a', fabricDk: '#7a2620', bookA: '#8a3a32', bookB: '#3f6a4a', bookC: '#d2a24a' }, { wood: '#5a4a3a', woodDk: '#2e241c', floorA: '#8a7258', floorB: '#76604a', fabric: '#3f6a4a', fabricDk: '#2e4e36', bookA: '#3f6a4a', bookB: '#a8352a', bookC: '#d8c08a' }, { wood: '#7a5a3a', woodDk: '#44301c', floorA: '#b08a58', floorB: '#9c7646', fabric: '#3a5a7a', fabricDk: '#2a4260', bookA: '#7a3a5a', bookB: '#d2a24a', bookC: '#3a7a6a' }],
  office: [{ wallTop: '#dfe4ea', wallLow: '#7a8aa0', floorA: '#9aa4b0', floorB: '#8a94a0' }, { wallTop: '#e6e8d8', wallLow: '#7a9a7a', floorA: '#a8aa98', floorB: '#989a88' }, { wallTop: '#e8e0e0', wallLow: '#9a7a8a', floorA: '#a8a0a8', floorB: '#98909a' }],
  elevator: [{ metal: '#9aa3ae', metalDk: '#5c6672', floorA: '#6c747e', floorB: '#5c646e', grout: '#444a54' }, { metal: '#b8a888', metalDk: '#7a6a4a', floorA: '#8a7a5a', floorB: '#7a6a4a', grout: '#54482e' }, { metal: '#7a8a9a', metalDk: '#4a5868', floorA: '#4a5868', floorB: '#3c4856', grout: '#2a323c' }]
};

/* ---------- floors ---------- */
function floorFn(kind, rug) {
  return (st, room) => (x, y) => {
    if (rug && rug.kind) {
      const dx = (x - rug.cx) / rug.rx, dy = (y - rug.cy) / rug.ry, q = dx * dx + dy * dy;
      if (q <= 1) return [q > 0.78 ? col('rugB', 0) : ((Math.floor(x * 5) + Math.floor(y * 5)) % 2 ? col('rugA', 0.04) : col('rugA', -0.03)), 1];
    }
    const tx = Math.floor(x), ty = Math.floor(y), fx = x - tx, fy = y - ty, n = hash2(Math.floor(x * 8), Math.floor(y * 8));
    switch (kind) {
      case 'planks': {
        const k = Math.floor(y * 2), fy2 = y * 2 - k;
        if (fy2 < 0.2) return col('floorB', -0.4);
        const off = (k * 0.93) % 2.4, xx = x + off, seg = Math.floor(xx / 2.4), h = hash2(k, seg);
        if (xx - seg * 2.4 < 0.12) return col('floorB', -0.35);
        return col(h < 0.3 ? 'floorA' : 'floorB', n < 0.06 ? 0.1 : n > 0.95 ? -0.1 : 0);
      }
      case 'tiles': return (fx < 0.06 || fy < 0.06 || Math.floor(x * 2) !== Math.floor((x - 0.06) * 2) || Math.floor(y * 2) !== Math.floor((y - 0.06) * 2)) ? col('grout', 0) : col((Math.floor(x * 2) + Math.floor(y * 2)) % 2 ? 'floorA' : 'floorB', n > 0.95 ? -0.08 : 0);
      case 'concrete': return col('concrete', n < 0.08 ? 0.1 : n > 0.93 ? -0.12 : ((tx + ty) % 2 && (fx < 0.04 || fy < 0.04) ? -0.2 : 0));
      case 'asphalt': {
        if (room && room.env.slots) for (const s of room.env.slots) if (x >= s[0] && x <= s[0] + 0.12 && y >= s[1] && y <= s[2]) return col('line', 0);
        return col('asphalt', n < 0.06 ? 0.12 : n > 0.94 ? -0.12 : 0);
      }
      case 'grass': {
        const pl = room && room.env.pool;
        if (pl && x >= pl.x0 - 0.25 && x < pl.x1 + 0.25 && y >= pl.y0 - 0.25 && y < pl.y1 + 0.25) {
          if (x < pl.x0 || x >= pl.x1 || y < pl.y0 || y >= pl.y1) return col('white', -0.05);
          return ((Math.floor(x * 4) + Math.floor(y * 4)) % 5 === 0) ? col('water', 0.22) : col('water', n < 0.08 ? 0.1 : 0);
        }
        const onPath = Math.abs(y - (3.8 + Math.sin(x * 0.7) * 0.5)) < 0.55 + (x > 5 ? 0.4 : 0);
        if (onPath) return col('path', n < 0.1 ? 0.12 : n > 0.9 ? -0.1 : 0);
        return col(n > 0.82 ? 'grassDk' : 'grass', n < 0.1 ? 0.14 : 0);
      }
      case 'runner': {
        const mid = (room && room.ny ? room.ny : 8) / 2;
        if (y > mid - 0.9 && y < mid + 0.9) { if (y < mid - 0.7 || y > mid + 0.7) return col('rugB', 0); return (Math.floor(x * 5) % 2) && (Math.floor(y * 5) % 2) ? col('rugA', 0.06) : col('rugA', -0.02); }
        return (fx < 0.08 || fy < 0.08) ? col('grout', 0) : col((tx + ty) % 2 ? 'floorA' : 'floorB', n < 0.05 ? 0.1 : n > 0.95 ? -0.1 : 0);
      }
      case 'carpet': return col('floorA', ((Math.floor(x * 6) + Math.floor(y * 6)) % 2 ? 0.02 : -0.02) + (n > 0.93 ? 0.06 : 0));
      case 'checker': default:
        return (fx < 0.08 || fy < 0.08) ? col('grout', 0) : col((tx + ty) % 2 ? 'floorA' : 'floorB', n < 0.05 ? 0.1 : n > 0.95 ? -0.1 : 0);
    }
  };
}

/* ---------- wall bases ---------- */
function wallBase(style, side, o) {
  const dk = side === 'R' ? -0.08 : 0;
  return (u, z) => {
    if (z < 4) return style === 'fence' ? col('wood', dk) : col('woodDk', 0);
    if (z < 5) return col('woodDk', -0.4);
    const n = hash2(Math.floor(u * 10), Math.floor(z));
    switch (style) {
      case 'tiles': {
        if (z < 42) return ((Math.floor(u * 4) !== Math.floor((u - 0.06) * 4)) || (Math.floor(z / 7) !== Math.floor((z - 1) / 7))) ? col('tileDk', dk) : col('tile', dk + (n > 0.9 ? 0.06 : 0));
        if (z < 44) return col('tileDk', -0.2 + dk);
        return col('wallTop', dk);
      }
      case 'brick': { const row = Math.floor(z / 5), off = (row % 2) * 0.5; return (z % 5 === 0 || Math.floor((u + off) * 2) !== Math.floor((u + off - 0.07) * 2)) ? col('brickDk', dk) : col('brick', dk + (n > 0.85 ? 0.08 : n < 0.1 ? -0.08 : 0)); }
      case 'concrete': return (z > 30 && z < 33 && o.stripe) ? col('yellow', dk) : col('concrete', dk + (n > 0.93 ? 0.1 : n < 0.06 ? -0.1 : 0) + ((Math.floor(u * 1.3) !== Math.floor((u - 0.06) * 1.3)) ? -0.12 : 0));
      case 'fence': return (Math.floor(u * 4) !== Math.floor((u - 0.08) * 4)) ? col('woodDk', dk) : col('wood', dk + (z > WHc - 3 ? 0.2 : 0) + (n > 0.9 ? 0.08 : 0));
      case 'glassrail': {
        if (z < 17) return (Math.floor(u * 10) % 4 === 0) ? col('railGreen', dk) : 0;                    // balusters, see-through between them
        if (z < 19) return col('railTop', dk);
        if (Math.floor(u * 10 + 1) % 24 < 2) return col('railGreen', dk);                                // mullions
        return col('glass', 0.12 + dk + (z % 9 < 2 ? 0.1 : 0));                                           // glass, flat teal like the reference
      }
      case 'slat': return (z % 4 === 0 || Math.floor(u * 3) !== Math.floor((u - 0.06) * 3)) ? col('wallTop', -0.1 + dk) : col('wallTop', dk + (z % 4 === 1 ? 0.06 : 0));
      case 'shelves': {
        if (z < 6) return col('woodDk', dk);
        const zi = (z - 6) % 12, row = Math.floor((z - 6) / 12);
        if (zi >= 11) return col('wood', dk - 0.12);
        const bk = Math.floor(u * 10 / 2.5), bh = 7 + Math.floor(hash2(bk, row) * 4);
        if (zi > bh) return col('woodDk', -0.3 + dk);
        const keys = ['bookA', 'bookB', 'bookC', 'bookD', 'bookE', 'bookF', 'bookG'];
        return col(keys[Math.floor(hash2(bk, row + 3) * 7)], dk + (Math.floor(u * 10) % 3 === 0 ? -0.2 : 0));
      }
      case 'metal': return (Math.floor(u * 2) !== Math.floor((u - 0.06) * 2)) ? col('metalDk', dk) : col('metal', dk + (z > 20 && z < 22 ? 0.2 : 0));
      case 'plaster': default: {
        if (z < 19) { const f = u * 2 - Math.floor(u * 2); return f < 0.08 ? col('wallLow', -0.25 + dk) : col('wallLow', dk); }
        if (z < 21) return col('trim', -0.1 + dk);
        if (z < 22) return col('wallLow', -0.3 + dk);
        return n < 0.05 ? col('wallTop', 0.12 + dk) : n > 0.96 ? col('wallTop', -0.1 + dk) : col('wallTop', dk);
      }
    }
  };
}

/* ---------- wall items ---------- */
const ITEM_PAINT = {
  door: (locked) => (ix, iz, w, h) => {
    if (ix < 2 || ix >= w - 2 || iz >= h - 2) return col('woodDk', -0.1);
    const midz = Math.floor(h / 2);
    if (ix >= 7 && ix <= 12 && iz >= h - 10 && iz <= h - 5) return col('brass', 0.15);
    const panel = ix >= 4 && ix < w - 4 && ((iz >= 4 && iz < midz - 3) || (iz >= midz + 3 && iz < h - 12));
    if (panel) { const edge = ix === 4 || iz === 4 || iz === midz + 3; return edge ? col('woodDk', 0) : col(locked ? 'doorLocked' : 'wood', -0.05); }
    if (ix >= w - 6 && ix <= w - 5 && iz >= midz - 1 && iz <= midz) return col('brass', 0.1);
    return col(locked ? 'doorLocked' : 'woodLt', -0.1);
  },
  elevator: () => (ix, iz, w, h) => {
    if (ix < 2 || ix >= w - 2 || iz >= h - 2) return col('metalDk', -0.2);
    if (iz >= h - 8 && iz < h - 3) return (ix > w / 2 - 6 && ix < w / 2 + 6) ? ((ix + 1) % 4 === 0 ? col('red', 0) : col('ink', 0)) : col('metalDk', 0);   // floor indicator
    if (ix === Math.floor(w / 2) || ix === Math.floor(w / 2) - 1) return col('metalDk', -0.3);
    return (iz % 2 === 0 ? col('metal', 0.12) : col('metal', 0)) && (ix < w / 2 ? col('metal', iz > h * 0.55 ? 0.15 : 0) : col('metal', iz > h * 0.55 ? 0.1 : -0.06));
  },
  stairs: () => (ix, iz, w, h) => {
    if (ix < 2 || ix >= w - 2 || iz >= h - 2) return col('woodDk', -0.1);
    const step = Math.floor((ix - 2) / 3), top = 4 + step * 4;
    if (iz < top && ix > 4) return col('stairTop', iz === top - 1 ? 0.2 : -0.1);
    if (ix === 9 && iz > h - 16 && iz < h - 6) return col('yellow', 0);
    return col('ink', 0.1 + iz / h * 0.2);
  },
  glass: () => (ix, iz, w, h) => {
    if (ix < 2 || ix >= w - 2 || iz >= h - 2 || iz < 1) return col('white', -0.1);
    if (ix === Math.floor(w / 2) || iz === Math.floor(h * 0.45)) return col('white', -0.2);
    return col('glass', 0.1 + iz / h * 0.15);
  },
  rail: () => (ix, iz, w, h) => (iz >= h / 2 - 1 && iz <= h / 2) ? col('metal', 0.3) : (iz < h / 2 - 1 && iz > 0 && ix % 12 === 3 ? col('metal', -0.1) : null),
  hangplant: () => (ix, iz, w, h) => {
    const cx = w / 2, dx = ix - cx, dz = iz - h * 0.7;
    if (Math.abs(dx) < 3 && iz > h * 0.55 && iz < h * 0.8) return col('clay', 0);
    if (Math.hypot(dx, iz - h * 0.85) < 5 && iz >= h * 0.8) return col(hash2(ix, iz) > 0.5 ? 'leaf' : 'leafLt', 0);
    if (Math.abs(dx) < 6 && iz < h * 0.55 && hash2(ix, iz) > 0.45 + (iz / h)) return col('leaf', 0.05);                // trailing leaves
    return null;
  },
  gate: () => (ix, iz, w, h) => (ix < 2 || ix >= w - 2 || iz >= h - 2) ? col('metalDk', -0.2) : (iz % 4 === 0 ? col('metalDk', -0.1) : col('metal', 0.05 + (iz / h) * 0.1)),
  window: (day, curtains) => (ix, iz, w, h) => {
    if (ix === 0 || ix === w - 1 || iz === h - 1) return col('woodDk', 0);
    if (ix < 2 || ix >= w - 2 || iz >= h - 2) return col('trim', 0);
    if (iz < 3) return col('trim', 0.2);
    if (curtains === 'blinds' && iz < h - 3 && iz > 2) return iz % 3 === 0 ? col('white', -0.15) : (iz % 3 === 1 ? col('white', 0) : col('sky', 0.1));
    if (curtains === true && (ix < 5 || ix >= w - 5) && iz < h - 3) return (ix + iz) % 4 === 0 ? col('curtainDk', 0) : col('curtain', 0);
    if (ix === Math.floor(w / 2) || iz === Math.floor(h / 2)) return col('trim', -0.1);
    if (day === 'auto' ? ((CURROOM.env.time || 'day') === 'day') : day) { const c = (iz > h * 0.55 && hash2(ix >> 2, iz >> 1) > 0.78); return c ? col('cloud', 0) : col('sky', iz / h * 0.3 - 0.1); }
    return hash2(ix, iz) > 0.965 ? col('star', 0.1) : col('skyDk', iz / h > 0.55 ? 0.3 : 0);
  },
  picture: (seed) => (ix, iz, w, h) => {
    if (ix < 2 || ix >= w - 2 || iz < 2 || iz >= h - 2) return col('frame', 0);
    const k = Math.floor(seed * 4) % 4, cx = w / 2, cz = h / 2, dx = ix - cx, dz = iz - cz;
    if (k === 0) return dx * dx + dz * dz < 18 ? col('orange', 0.1) : col('paper', 0);                          // a sun
    if (k === 1) return iz < h * 0.45 ? col('sky', 0) : (iz < h * 0.65 ? col('grass', 0) : col('grassDk', 0));      // a landscape
    if (k === 2) return (ix + iz) % 6 < 3 ? col('accent', 0) : col('paper', 0);                                    // stripes
    return Math.abs(dx) + Math.abs(dz) < 7 ? col('red', 0) : col('paper', -0.05);                                  // a diamond
  },
  mirror: () => (ix, iz, w, h) => (ix < 2 || ix >= w - 2 || iz < 2 || iz >= h - 2) ? col('metal', 0.1) : ((ix + iz) % 9 === 0 || (ix + iz) % 9 === 1) && iz > 4 ? col('white', 0.2) : col('glass', 0.1 - iz / h * 0.2),
  mailboxes: () => (ix, iz, w, h) => (ix === 0 || ix === w - 1 || iz === 0 || iz === h - 1) ? col('metalDk', -0.3) : ((ix % 5 === 0 || iz % 6 === 0) ? col('metalDk', 0) : ((ix % 5 === 3 && iz % 6 === 3) ? col('ink', 0) : col('metal', 0))),
  panel: () => (ix, iz, w, h) => (ix < 1 || ix >= w - 1 || iz < 1 || iz >= h - 1) ? col('metalDk', -0.3) : ((ix % 4 === 1 && iz % 4 === 1) ? col(iz > h / 2 ? 'yellow' : 'red', 0.1) : col('metalDk', 0.1)),
  vent: () => (ix, iz, w, h) => (ix < 1 || ix >= w - 1 || iz < 1 || iz >= h - 1) ? col('metalDk', 0) : (iz % 3 === 0 ? col('ink', 0) : col('metal', -0.1)),
  sign: () => (ix, iz, w, h) => (ix < 2 || ix >= w - 2 || iz < 2 || iz >= h - 2) ? col('frame', 0) : (Math.hypot(ix - 8, iz - 7) <= 3.8 ? col('orange', 0.1) : col('paper', 0))
};

/* ---------- layouts ----------
   A layout is { R: [...], L: [...], free: [...] }.
   R and L list pieces that stand against the right or left wall, in order, with their length along the wall and their depth;
   the kit lays them out in the gaps the doors leave and drops what does not fit. `free` pieces have fixed positions. */
const OBJ = (t, x, y, w, d, extra) => Object.assign({ t, hot: t, x, y, w, d }, extra || {});
const WP = (t, len, depth, extra) => Object.assign({ t, len, depth }, extra || {});
const LAYOUTS = {
  living: [
    (r) => ({ R: [WP('bookshelf', 1.8, 0.6, { h: 42 }), WP('sofa', 3.2, 1.2), WP('floorlamp', 0.6, 0.6)], L: [WP('tvunit', 2.2, 1.0), WP('plant', 0.9, 0.9)], free: [OBJ('coffeetable', 3.0, 2.6, 1.6, 0.9), OBJ('armchair', 5.8, 3.8, 1.2, 1.2, { face: 'y' })] }),
    (r) => ({ R: [WP('tvunit', 2.2, 1.0), WP('bookshelf', 1.8, 0.6, { h: 42 }), WP('plant', 0.9, 0.9)], L: [WP('bookshelf', 1.6, 0.6, { h: 42 }), WP('sofa', 3.0, 1.2), WP('floorlamp', 0.6, 0.6)], free: [OBJ('coffeetable', 2.2, 3.2, 0.9, 1.6), OBJ('armchair', 4.4, 4.8, 1.2, 1.2, { face: 'y' })] })
  ],
  kitchen: [
    (r) => ({ R: [WP('fridge', 0.9, 0.9, { gap: 0 }), WP('kcounter', 1.0, 0.95, { kind: 'stove', gap: 0 }), WP('kcounter', 2.0, 0.95, { kind: 'sink', gap: 0 }), WP('kcounter', 1.2, 0.95)], L: [WP('kcounter', 2.4, 0.95, { gap: 0 }), WP('bin', 0.7, 0.7)], free: [OBJ('table', 3.4, 3.8, 1.8, 1.2, { set: true }), OBJ('chair', 3.0, 3.9, 0.6, 0.6, { back: 'x' }), OBJ('chair', 4.2, 5.2, 0.6, 0.6, { back: 'y' })] }),
    (r) => ({ R: [WP('kcounter', 2.0, 0.95, { kind: 'sink', gap: 0 }), WP('kcounter', 1.4, 0.95, { gap: 0 }), WP('fridge', 0.9, 0.9), WP('plant', 0.9, 0.9)], L: [WP('kcounter', 1.0, 0.95, { kind: 'stove', gap: 0 }), WP('kcounter', 2.0, 0.95)], free: [OBJ('table', 3.6, 3.4, 1.8, 1.2, { set: true }), OBJ('chair', 3.2, 3.5, 0.6, 0.6, { back: 'x' }), OBJ('chair', 4.4, 4.8, 0.6, 0.6, { back: 'y' })] })
  ],
  bathroom: [
    (r) => ({ R: [WP('tub', 2.8, 1.2), WP('toilet', 0.9, 1.0)], L: [WP('basin', 1.1, 0.9), WP('bin', 0.6, 0.6)], free: [OBJ('plant', 6.4, 6.2, 0.9, 0.9)] }),
    (r) => ({ R: [WP('basin', 1.1, 0.9), WP('toilet', 0.9, 1.0)], L: [WP('tub', 2.8, 1.2), WP('plant', 0.9, 0.9)], free: [] })
  ],
  storage: [
    (r) => ({ R: [WP('shelfunit', 3.0, 0.8, { h: 46 }), WP('boxes', 1.2, 1.2), WP('ladder', 0.9, 0.3, { h: 44 })], L: [WP('shelfunit', 2.6, 0.8, { h: 46 }), WP('bin', 0.7, 0.7)], free: [OBJ('crates', 5.0, 4.0, 1.5, 1.5), OBJ('barrel', 3.0, 4.8, 1.2, 1.2, { h: 20 })] }),
    (r) => ({ R: [WP('shelfunit', 2.4, 0.8, { h: 46 }), WP('shelfunit', 2.4, 0.8, { h: 46 }), WP('barrel', 1.2, 1.2, { h: 20 })], L: [WP('boxes', 1.2, 1.2), WP('boxes', 1.2, 1.2)], free: [OBJ('crates', 4.6, 4.2, 1.5, 1.5, { single: true })] })
  ],
  basement: [
    (r) => ({ R: [WP('workbench', 2.6, 1.1), WP('shelfunit', 2.4, 0.8, { h: 46 }), WP('boiler', 1.6, 1.6)], L: [WP('shelfunit', 2.4, 0.8, { h: 46 })], free: [OBJ('crates', 4.0, 4.4, 1.5, 1.5), OBJ('barrel', 6.4, 5.0, 1.2, 1.2, { h: 20 }), OBJ('boxes', 2.2, 5.6, 1.2, 1.2)] }),
    (r) => ({ R: [WP('boiler', 1.6, 1.6), WP('shelfunit', 3.0, 0.8, { h: 46 })], L: [WP('workbench', 2.6, 1.1), WP('boxes', 1.2, 1.2)], free: [OBJ('crates', 5.4, 3.6, 1.5, 1.5), OBJ('barrel', 3.4, 5.2, 1.2, 1.2, { h: 20 })] })
  ],
  yard: [
    (r) => ({ R: [WP('bush', 1.0, 1.0, { flowers: 'pink' }), WP('bench', 2.4, 0.8)], L: [WP('bin', 0.7, 0.7)], free: [OBJ('tree', 5.2, 0.5, 1.4, 1.4, { fruit: true }), OBJ('tap', 0.6, 5.8, 0.6, 0.6), OBJ('flowerbed', 5.6, 5.6, 1.8, 1.2)] }),
    (r) => ({ R: [WP('tree', 1.4, 1.4), WP('bench', 2.4, 0.8), WP('bush', 1.0, 1.0, { flowers: 'yellow' })], L: [WP('bin', 0.7, 0.7)], free: [OBJ('tap', 6.2, 5.8, 0.6, 0.6), OBJ('flowerbed', 0.6, 5.4, 1.8, 1.2)] })
  ],
  parking: [
    (r) => ({ R: [], L: [], free: [OBJ('car', 1.0, 0.5, 2.8, 1.4, { dir: 'x', color: r.pick(['carA', 'carB', 'carC', 'carD']) }), OBJ('car', 4.2, 0.5, 2.8, 1.4, { dir: 'x', color: r.pick(['carB', 'carC', 'carD']) }), OBJ('pillar', 0.5, 3.6, 0.6, 0.6), OBJ('pillar', 6.8, 3.6, 0.6, 0.6), OBJ('car', 2.6, 5.2, 2.8, 1.4, { dir: 'x', color: r.pick(['carA', 'carD']) }), OBJ('bin', 7.0, 6.6, 0.6, 0.6)] }),
    (r) => ({ R: [], L: [], free: [OBJ('car', 0.5, 1.0, 1.4, 2.8, { dir: 'y', color: r.pick(['carA', 'carB']) }), OBJ('car', 0.5, 4.4, 1.4, 2.8, { dir: 'y', color: r.pick(['carC', 'carD']) }), OBJ('pillar', 3.4, 0.5, 0.6, 0.6), OBJ('pillar', 3.4, 6.8, 0.6, 0.6), OBJ('car', 5.0, 2.4, 1.4, 2.8, { dir: 'y', color: r.pick(['carB', 'carC']) })] })
  ],
  hallway: [
    (r) => ({ R: [WP('bench', 2.4, 0.8), WP('plant', 0.9, 0.9)], L: [WP('plant', 0.9, 0.9)], free: [OBJ('cat', 4.4, 3.6, 0.8, 0.8)] }),
    (r) => ({ R: [WP('plant', 0.9, 0.9), WP('bin', 0.6, 0.6)], L: [WP('bench', 2.4, 0.8)], free: [] })
  ],
  lobby: [
    (r) => ({ R: [WP('desk', 3.2, 1.3, { h: 17 })], L: [WP('sofa', 2.6, 1.1), WP('plant', 0.9, 0.9)], free: [OBJ('plant', 6.9, 6.9, 0.9, 0.9), OBJ('coffeetable', 1.8, 4.2, 0.8, 1.4)], fixed: true }),
    (r) => ({ R: [WP('plant', 0.9, 0.9), WP('desk', 3.2, 1.3, { h: 17 })], L: [WP('sofa', 2.6, 1.1)], free: [OBJ('plant', 6.9, 6.9, 0.9, 0.9)], fixed: true })
  ],
  stairs: [
    (r) => ({ R: [WP('stairs', 5.2, 1.5, { steps: 7 })], L: [WP('bench', 2.0, 0.8)], free: [OBJ('plant', 6.6, 6.4, 0.9, 0.9)], fixed: true })
  ],
  elevator: [(r) => ({ R: [], L: [], free: [] })],
  bedroom: [
    (r) => ({ R: [], L: [], fixed: true, free: [OBJ('bed', 5.0, 0, 2.6, 4.3, { body: 'none' }), OBJ('nightstand', 3.2, 0, 1.7, 1.4, { h: 15 }), OBJ('dresser', 0, 0.9, 1.5, 4.7, { h: 17, face: 'x' }), OBJ('pouf', 4.6, 5.4, 1.2, 1.2), OBJ('plant', 2.2, 6.6, 0.9, 0.9)] }),
    (r) => ({ R: [], L: [], fixed: true, free: [OBJ('bed', 1.4, 0, 2.6, 4.3, { body: 'none' }), OBJ('nightstand', 4.1, 0, 1.7, 1.4, { h: 15 }), OBJ('dresser', 0, 0.9, 1.4, 2.6, { h: 17, face: 'x', decor: false }), OBJ('pouf', 5.2, 4.2, 1.2, 1.2), OBJ('plant', 6.6, 0.4, 0.9, 0.9)] })
  ]
};

Object.assign(LAYOUTS, {
  hallway: [
    (r) => ({ R: [WP('bench', 2.4, 0.8), WP('plant', 0.9, 0.9)], L: [WP('plant', 0.9, 0.9)], free: [] }),
    (r) => ({ R: [WP('plant', 0.9, 0.9), WP('bin', 0.6, 0.6)], L: [WP('bench', 2.4, 0.8)], free: [] })
  ],
  bathroom: [
    (r) => ({ R: [WP('basin', 1.1, 0.9), WP('toilet', 0.9, 1.0), WP('shower', 1.7, 1.7)], L: [WP('bin', 0.6, 0.6)], free: [OBJ('plant', 4.6, 4.6, 0.9, 0.9)] }),
    (r) => ({ R: [WP('shower', 1.7, 1.7), WP('tub', 2.6, 1.2)], L: [WP('basin', 1.1, 0.9), WP('toilet', 0.9, 1.0)], free: [OBJ('bin', 4.8, 4.8, 0.6, 0.6)] })
  ],
  storage: [
    (r) => ({ R: [WP('shelfunit', 3.0, 0.8, { h: 46 }), WP('boxes', 1.2, 1.2), WP('ladder', 0.9, 0.3, { h: 44 })], L: [WP('shelfunit', 2.6, 0.8, { h: 46 }), WP('bin', 0.7, 0.7)], free: [OBJ('crates', 4.4, 3.6, 1.5, 1.5), OBJ('barrel', 2.4, 4.2, 1.2, 1.2, { h: 20 })] }),
    (r) => ({ R: [WP('shelfunit', 2.4, 0.8, { h: 46 }), WP('shelfunit', 2.4, 0.8, { h: 46 }), WP('barrel', 1.2, 1.2, { h: 20 })], L: [WP('boxes', 1.2, 1.2), WP('boxes', 1.2, 1.2), WP('bin', 0.7, 0.7)], free: [OBJ('crates', 3.8, 3.4, 1.5, 1.5, { single: true }), OBJ('boxes', 2.4, 4.4, 1.2, 1.2)] })
  ],
  stairs: [
    (r) => ({ R: [WP('stairs', 5.2, 1.5, { steps: 8 })], L: [WP('bench', 2.0, 0.8)], free: [OBJ('plant', 6.6, 4.4, 0.9, 0.9)], fixed: true }),
    (r) => ({ R: [WP('stairs', 5.2, 1.5, { steps: 8, open: true })], L: [], free: [OBJ('plant', 6.6, 4.4, 0.9, 0.9)], fixed: true }),
  ],
  elevator: [(r) => ({ R: [], L: [], free: [] })],
  garden: [
    (r) => ({ R: [WP('planter', 0.9, 0.9), WP('bush', 1.0, 1.0, { flowers: 'pink' }), WP('planter', 0.9, 0.9)], L: [WP('lounger', 2.0, 0.8), WP('planter', 0.9, 0.9)], pool: { x0: 2.6, y0: 2.6, x1: 6.6, y1: 6.2 },
      free: [OBJ('floatring', 4.0, 3.6, 1.2, 1.2), OBJ('poolladder', 6.7, 5.0, 0.5, 0.8), OBJ('lounger', 2.2, 6.9, 2.0, 0.8, { face: 'y' }), OBJ('tree', 0.5, 6.2, 1.4, 1.4), OBJ('bush', 7.0, 6.9, 0.9, 0.9)] }),
    (r) => ({ R: [WP('tree', 1.4, 1.4), WP('planter', 0.9, 0.9)], L: [WP('bush', 1.0, 1.0, { flowers: 'yellow' }), WP('lounger', 2.0, 0.8)], pool: { x0: 3.2, y0: 3.0, x1: 7.0, y1: 6.6 },
      free: [OBJ('floatring', 4.6, 4.2, 1.2, 1.2), OBJ('poolladder', 3.0, 4.6, 0.5, 0.8), OBJ('planter', 1.0, 5.8, 0.9, 0.9), OBJ('bush', 0.8, 7.0, 0.9, 0.9)] })
  ],
  balcony: [
    (r) => ({ R: [WP('sofa', 2.8, 1.1), WP('planter', 0.9, 0.9), WP('planter', 0.9, 0.9)], L: [WP('planter', 0.8, 0.8)], free: [OBJ('table', 3.0, 1.6, 1.2, 0.9), OBJ('chair', 2.4, 1.7, 0.55, 0.55, { back: 'x' }), OBJ('chair', 4.5, 1.7, 0.55, 0.55, { back: 'X' })] }),
    (r) => ({ R: [WP('planter', 0.9, 0.9), WP('lounger', 2.2, 0.8), WP('planter', 0.9, 0.9)], L: [WP('planter', 0.8, 0.8)], free: [OBJ('table', 4.4, 1.7, 1.2, 0.9), OBJ('chair', 3.8, 1.8, 0.55, 0.55, { back: 'x' }), OBJ('floorlamp', 1.0, 2.8, 0.6, 0.6)] })
  ],
  library: [
    (r) => ({ R: [WP('nook', 2.2, 1.1), WP('floorlamp', 0.6, 0.6)], L: [WP('armchair', 1.2, 1.2), WP('floorlamp', 0.6, 0.6), WP('ladder', 0.9, 0.3, { h: 44 })], free: [OBJ('table', 3.4, 3.4, 1.8, 1.2, {}), OBJ('chair', 3.0, 3.5, 0.6, 0.6, { back: 'x' }), OBJ('bookpile', 5.8, 5.6, 0.8, 0.6), OBJ('armchair', 5.4, 2.6, 1.2, 1.2, { face: 'y' })] }),
    (r) => ({ R: [WP('armchair', 1.2, 1.2), WP('floorlamp', 0.6, 0.6), WP('ladder', 0.9, 0.3, { h: 44 })], L: [WP('nook', 1.1, 2.2), WP('floorlamp', 0.6, 0.6)], free: [OBJ('table', 2.6, 3.6, 1.2, 1.8), OBJ('bookpile', 5.4, 2.4, 0.8, 0.6), OBJ('bookpile', 6.0, 5.8, 0.8, 0.6)] })
  ],
  office: [
    (r) => ({ R: [WP('officedesk', 2.2, 1.9), WP('cabinet', 0.9, 0.9), WP('cabinet', 0.9, 0.9), WP('printer', 1.0, 0.8)], L: [WP('officedesk', 2.2, 1.9), WP('bookshelf', 1.8, 0.6, { h: 42 })], free: [OBJ('cooler', 6.6, 6.4, 0.8, 0.8), OBJ('plant', 4.6, 5.8, 0.9, 0.9)] }),
    (r) => ({ R: [WP('bookshelf', 1.8, 0.6, { h: 42 }), WP('officedesk', 2.2, 1.9), WP('plant', 0.9, 0.9)], L: [WP('cabinet', 0.9, 0.9), WP('cabinet', 0.9, 0.9), WP('officedesk', 2.2, 1.9)], free: [OBJ('cooler', 6.6, 6.4, 0.8, 0.8), OBJ('bin', 5.4, 4.4, 0.6, 0.6)] })
  ]
});

const FLOOR_OF = { hallway: 'runner', lobby: 'checker', yard: 'grass', garden: 'grass', basement: 'concrete', parking: 'asphalt', living: 'planks', bedroom: 'checker', kitchen: 'checker', bathroom: 'tiles', storage: 'planks', stairs: 'planks', elevator: 'tiles', balcony: 'planks', library: 'planks', office: 'carpet' };
const STYLE_OF = { hallway: 'plaster', lobby: 'plaster', yard: 'fence', garden: 'fence', basement: 'brick', parking: 'concrete', living: 'plaster', bedroom: 'plaster', kitchen: 'plaster', bathroom: 'tiles', storage: 'plaster', stairs: 'plaster', elevator: 'metal', balcony: { L: 'glassrail', R: 'slat' }, library: 'shelves', office: 'plaster' };
const OUTDOOR = { yard: 14, garden: 14, parking: 24, balcony: 40 };
const FILLERS = { living: ['plant', 'bookpile', 'bin'], hallway: ['plant', 'bin'], storage: ['boxes', 'bin', 'barrel'], library: ['bookpile', 'plant'], office: ['plant', 'bin', 'bookpile'], lobby: ['plant'], bedroom: ['plant', 'bookpile'], kitchen: ['bin', 'plant'], bathroom: ['plant'] };
const FILLER_SIZE = { plant: [0.9, 0.9], bin: [0.6, 0.6], bookpile: [0.8, 0.6], boxes: [1.2, 1.2], barrel: [1.2, 1.2] };

function transposeObj(o) {
  const t = Object.assign({}, o, { x: o.y, y: o.x, w: o.d, d: o.w });
  if (o.face) t.face = o.face === 'x' ? 'y' : 'x';
  if (o.dir) t.dir = o.dir === 'x' ? 'y' : 'x';
  if (o.back) t.back = { x: 'y', y: 'x', X: 'Y', Y: 'X' }[o.back];
  return t;
}
const SLOT_MIRROR = { LA: 'RA', LB: 'RB', RA: 'LA', RB: 'LB', LC: 'RC', RC: 'LC' };

function makeSpace(type, opts) {
  opts = opts || {};
  const seed = opts.seed == null ? 1 : opts.seed, r = rngFor(seed * 9973 + SPACE_TYPES.indexOf(type) * 131);
  r.pick = (a) => a[Math.floor(r() * a.length)];
  const themes = THEMES[type] || [{}], theme = opts.theme != null ? opts.theme % themes.length : Math.floor(r() * themes.length);
  const layouts = LAYOUTS[type], layout = opts.layout != null ? opts.layout % layouts.length : Math.floor(r() * layouts.length);
  const lay = opts.lay ? opts.lay(r) : layouts[layout](r);
  const mirror = !lay.fixed && (opts.mirror != null ? opts.mirror : r() < 0.5);
  let [nx, ny] = opts.size || SIZE_OF[type] || [8, 8];
  if (mirror) [nx, ny] = [ny, nx];
  const SL = (name) => slotOf(name, nx, ny);
  let doors = (opts.doors || []).map((d) => Object.assign({}, d, { slot: mirror ? SLOT_MIRROR[d.slot] : d.slot }));
  // a staircase owns the back corner: doors that would sit behind it move to the far end of their wall, narrower
  const stairLay = [].concat(lay.R || [], lay.L || []).find((q) => q.t === 'stairs');
  const stairSpan = {};
  if (stairLay) {
    stairSpan[mirror ? 'L' : 'R'] = [0, stairLay.len + 0.45];
    stairSpan[mirror ? 'R' : 'L'] = [0, 0.25 + stairLay.depth + 0.3];
    for (const w of Object.keys(stairSpan)) {
      const onWall = doors.filter((d) => d.slot[0] === w);
      if (!onWall.some((d) => { const s = slotOf(d.slot, nx, ny); return s.u0 < stairSpan[w][1] && s.u1 > stairSpan[w][0]; })) continue;
      onWall.sort((a, b) => slotOf(b.slot, nx, ny).u0 - slotOf(a.slot, nx, ny).u0).forEach((d, k) => { d.slot = w + 'N' + k; });
    }
  }
  const spansOf = (wall) => doors.filter((d) => SL(d.slot).wall === wall).map((d) => [SL(d.slot).u0 - 0.25, SL(d.slot).u1 + 0.25]);
  // pieces against a wall are laid out in the gaps the doors leave; whatever does not fit is dropped
  const hitRect = (a, b) => a.x < b.x + b.w + 0.05 && a.x + a.w + 0.05 > b.x && a.y < b.y + b.d + 0.05 && a.y + a.d + 0.05 > b.y;
  const against = (wall, specs, avoid) => {
    const blocked = spansOf(wall), out = [], len = wall === 'R' ? nx : ny;
    let pos = 0.25;
    for (const sp of specs) {
      for (let guard = 0; guard < 6; guard++) { const hit = blocked.find((b) => pos < b[1] && pos + sp.len > b[0]); if (!hit) break; pos = hit[1]; }
      const rectAt = (p) => (wall === 'R' ? { x: p, y: 0, w: sp.len, d: sp.depth } : { x: 0, y: p, w: sp.depth, d: sp.len });
      // pieces of the other wall stand in the back corner: start this wall's row after them
      for (let guard = 0; guard < 6; guard++) { const hit = (avoid || []).find((o) => hitRect(rectAt(pos), o)); if (!hit) break; pos = (wall === 'R' ? hit.x + hit.w : hit.y + hit.d) + 0.1; }
      if (pos + sp.len > len - 0.1) continue;
      const base = wall === 'R' ? { x: pos, y: 0, w: sp.len, d: sp.depth, face: 'y' } : { x: 0, y: pos, w: sp.depth, d: sp.len, face: 'x' };
      const { len: _l, depth, gap, ...rest } = sp;
      out.push(Object.assign({ hot: sp.t }, rest, base));
      pos += sp.len + (gap == null ? 0.15 : gap);
    }
    return out;
  };
  let freeObjs = lay.free.map((o) => Object.assign({}, o));
  let pool = lay.pool ? Object.assign({}, lay.pool) : null;
  if (mirror) { freeObjs = freeObjs.map(transposeObj); if (pool) pool = { x0: pool.y0, y0: pool.x0, x1: pool.y1, y1: pool.x1 }; }
  const zone = (o, d) => { const sl = SL(d.slot), depth = d.kind === 'gate' || d.kind === 'stairs' ? 2.4 : 1.6; return sl.wall === 'L' ? (o.x < depth && o.y < sl.u1 + 0.2 && o.y + o.d > sl.u0 - 0.2) : (o.y < depth && o.x < sl.u1 + 0.2 && o.x + o.w > sl.u0 - 0.2); };
  const inside = (o) => o.x >= 0 && o.y >= 0 && o.x + o.w <= nx + 0.01 && o.y + o.d <= ny + 0.01;
  freeObjs = freeObjs.filter((o) => !doors.some((d) => zone(o, d)) && inside(o));
  const firstRow = against(mirror ? 'L' : 'R', lay.R || []);
  const wallObjs = firstRow.concat(against(mirror ? 'R' : 'L', lay.L || [], firstRow));
  const objs = wallObjs.concat(freeObjs);
  // scatter a few small fillers on free floor so rooms do not look bare (never in doorways, never overlapping)
  const overlaps = (a, b, m) => a.x < b.x + b.w + m && a.x + a.w + m > b.x && a.y < b.y + b.d + m && a.y + a.d + m > b.y;
  const fills = FILLERS[type] || [];
  const wantFill = fills.length ? (opts.fill != null ? opts.fill : (type === 'bathroom' ? Math.floor(r() * 2) : 1 + Math.floor(r() * 2))) : 0;
  for (let i = 0, tries = 0; i < wantFill && tries < 40; tries++) {
    const t = r.pick(fills), [w, d] = FILLER_SIZE[t], o = OBJ(t, 0.4 + r() * (nx - w - 0.8), 0.4 + r() * (ny - d - 0.8), w, d, { h: t === 'barrel' ? 20 : undefined });
    if (!doors.some((dd) => zone(o, dd)) && !objs.some((q) => overlaps(o, q, 0.3)) && inside(o) && !(pool && overlaps(o, { x: pool.x0, y: pool.y0, w: pool.x1 - pool.x0, d: pool.y1 - pool.y0 }, 0.2))) { objs.push(o); i++; }
  }
  objs.forEach((o, i) => { o.id = o.id || (o.t + (i + 1)); });

  // windows and pictures in the wall spans doors leave free
  const kinds = { L: [], R: [] }, taken = { L: [], R: [] };
  for (const d of doors) { const s = SL(d.slot); taken[s.wall].push([s.u0 - 0.3, s.u1 + 0.3]); }
  for (const w of Object.keys(stairSpan)) taken[w].push(stairSpan[w]);   // no windows or pictures behind the stairs
  const free = (wall, a, b) => !taken[wall].some((t) => a < t[1] && b > t[0]);
  const outdoor = OUTDOOR[type] != null, openAir = ['yard', 'garden', 'parking'].includes(type);
  const wantWindows = openAir ? 0 : (['basement', 'elevator'].includes(type) ? 0 : (type === 'stairs' || type === 'library' ? 0.5 : 1));
  const auto = opts.time === 'auto', day = auto ? 'auto' : (opts.time || 'day') === 'day';
  const styleOf = STYLE_OF[type], onGlass = (wall) => type === 'balcony' && wall === 'L';
  for (const wall of ['L', 'R']) {
    const len = wall === 'R' ? nx : ny;
    for (let a = 0.8; a + 2 <= len - 0.4; a += 2.4) {
      const b = a + 2;
      if (!free(wall, a, b) || openAir || onGlass(wall)) continue;
      const roll = r();
      if (type === 'bathroom') { if (roll < 0.5) kinds[wall].push({ name: 'mirror', u0: a + 0.3, u1: b - 0.5, z0: 24, z1: 46, paint: ITEM_PAINT.mirror() }); continue; }
      if (type === 'elevator') { if (wall === 'L' && roll < 2) kinds[wall].push({ name: 'mirror', u0: 1.0, u1: ny - 1.0, z0: 18, z1: 46, paint: ITEM_PAINT.mirror() }); if (wall === 'R') kinds[wall].push({ name: 'panel', u0: nx - 1.6, u1: nx - 0.8, z0: 20, z1: 38, paint: ITEM_PAINT.panel() }); break; }
      if (type === 'balcony') { if (wall === 'R' && roll < 0.8) kinds[wall].push({ name: 'hangplant', u0: a + 0.5, u1: a + 1.5, z0: 14, z1: 46, paint: ITEM_PAINT.hangplant() }); continue; }
      if (wantWindows && roll < 0.55 * wantWindows + 0.2) kinds[wall].push({ name: 'window', u0: a, u1: b, z0: 24, z1: 48, paint: ITEM_PAINT.window(day, type === 'office' ? 'blinds' : (type === 'living' || type === 'bedroom')) });
      else if (roll < 0.8) kinds[wall].push({ name: 'picture', u0: a + 0.4, u1: b - 0.4, z0: 28, z1: 44, paint: ITEM_PAINT.picture(r()) });
    }
  }
  if (type === 'lobby') { const w = taken.R.length ? 'L' : 'R', len = w === 'R' ? nx : ny; if (free(w, len - 1.4, len - 0.2)) kinds[w].push({ name: 'mailboxes', u0: len - 1.4, u1: len - 0.2, z0: 20, z1: 44, paint: ITEM_PAINT.mailboxes() }); }
  if (type === 'basement') kinds.R.push({ name: 'vent', u0: nx - 1.8, u1: nx - 0.8, z0: 30, z1: 40, paint: ITEM_PAINT.vent() });
  if (type === 'elevator') kinds.L.push({ name: 'rail', u0: 0.2, u1: ny - 0.2, z0: 14, z1: 30, paint: ITEM_PAINT.rail() });
  const doorItems = { L: [], R: [] };
  for (const d of doors) {
    const s = SL(d.slot), kind = d.kind || 'door';
    const paint = kind === 'elevator' ? ITEM_PAINT.elevator() : kind === 'stairs' ? ITEM_PAINT.stairs() : kind === 'gate' ? ITEM_PAINT.gate() : kind === 'glass' ? ITEM_PAINT.glass() : ITEM_PAINT.door(!!d.locked);
    doorItems[s.wall].push({ name: 'door:' + d.to, u0: s.u0, u1: s.u1, z0: 0, z1: kind === 'gate' ? 38 : (kind === 'glass' ? 40 : 42), paint });
  }

  const pal = Object.assign({}, BASE_PAL, themes[theme], opts.pal || {});
  const wallH = outdoor ? OUTDOOR[type] : 56;
  const style = typeof styleOf === 'string' ? { L: styleOf, R: styleOf } : (mirror ? { L: styleOf.R, R: styleOf.L } : styleOf);
  const rugRoll = ['living', 'bedroom', 'lobby', 'library', 'balcony'].includes(type) && r() < 0.8;
  const rug = rugRoll ? { kind: 'oval', cx: nx * (0.45 + r() * 0.1), cy: ny * (0.52 + r() * 0.1), rx: Math.min(1.8, nx * 0.22), ry: Math.min(1.2, ny * 0.15) } : null;
  if (rug) { pal.rugA = r.pick(['#3f9aa8', '#a84a4a', '#6a8a4a', '#8a6aa8']); }
  const slotsLines = type === 'parking' ? [[0.6, 0.2, 2.2], [3.9, 0.2, 2.2], [7.2, 0.2, 2.2], [0.6, 4.6, 6.6], [3.9, 4.6, 6.6], [7.2, 4.6, 6.6]] : null;
  const name = opts.name || ('room.' + (opts.id || type));
  const room = {
    id: opts.id || type, name, type, seed, slab: 'slab', rim: 'rim', hasRug: !!rug, wallH, nx, ny,
    spec: { type, seed, theme, layout, mirror, time: auto ? 'day' : (opts.time || 'day'), size: [nx, ny] },
    env: { slots: slotsLines, pool },
    pal, floor: floorFn(FLOOR_OF[type], rug),
    walls: (st, rm) => ({
      L: { base: wallBase(style.L, 'L', { stripe: type === 'parking' }), items: kinds.L.concat(doorItems.L) },
      R: { base: wallBase(style.R, 'R', { stripe: type === 'parking' }), items: kinds.R.concat(doorItems.R) }
    }),
    objects: objs, items: (opts.items || []).slice(),
    light: (st, t, rm) => {
      const dayNow = day === 'auto' ? ((rm.env.time || 'day') === 'day') : day;
      const amb = outdoor ? (dayNow ? [1.0, 0.98, 0.94] : [0.45, 0.5, 0.8]) : (dayNow ? [0.96, 0.93, 0.88] : [0.5, 0.52, 0.72]);
      const cp = P(nx / 2, ny / 2, wallH);
      const lights = outdoor ? [] : [{ sx: cp[0], sy: cp[1], r: 90, k: dayNow ? 0.18 : 0.5, col: [0.8, 0.55, 0.25] }];
      return { amb, lights };
    }
  };
  return room;
}
