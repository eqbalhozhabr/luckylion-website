import { json } from '../lib/http.js';
import * as db from '../lib/db.js';
import { readSessionToken } from '../lib/session.js';
import D from '../lib/dubiko-engine.js';

// Anonymous play statistics for /dubiko/. The browser batches events and posts them as text/plain
// (so no CORS preflight is needed); nothing identifying is stored - see migrations/0002.

const EVENTS = new Set(['session_start', 'level_start', 'level_complete', 'level_leave', 'hint', 'rules_open',
  'help_open', 'tutorial_start', 'tutorial_step', 'tutorial_done', 'tutorial_skip', 'coach_seen']);
const DAY = 86400000;
const ID_RE = /^[0-9a-f]{8,32}$/;

const int = (v, lo, hi) => (Number.isFinite(v) && v >= lo && v <= hi ? Math.floor(v) : null);

export async function dubikoEvent(request, env) {
  const text = await request.text();
  if (text.length > 16000) return json({ error: 'too_large' }, { status: 413 });
  let b;
  try { b = JSON.parse(text); } catch { return json({ error: 'bad_request' }, { status: 400 }); }
  if (!b || typeof b.a !== 'string' || typeof b.s !== 'string' || !ID_RE.test(b.a) || !ID_RE.test(b.s) || !Array.isArray(b.ev)) {
    return json({ error: 'bad_request' }, { status: 400 });
  }
  const now = Date.now();
  const build = typeof b.v === 'string' ? b.v.slice(0, 24) : '';
  const lang = b.l === 'fa' || b.l === 'en' ? b.l : '';
  const phone = b.p ? 1 : 0, test = b.x ? 1 : 0;
  const stmt = env.DB.prepare('INSERT INTO dubiko_events (rcv, ts, aid, sid, ev, lvl, ms, props, build, lang, phone, test) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
  const rows = [];
  for (const e of b.ev.slice(0, 40)) {
    if (!e || !EVENTS.has(e.e)) continue;
    const ts = Number.isFinite(e.t) && Math.abs(e.t - now) < DAY ? Math.floor(e.t) : now;
    const props = {};
    for (const k of ['hints', 'errs', 'moves', 'undo', 'first', 'again', 'kind', 'step', 'at', 'placed', 'k', 'w', 'test']) {
      const v = e[k];
      if (typeof v === 'number' || typeof v === 'boolean' || (typeof v === 'string' && v.length < 24)) props[k] = v;
    }
    const p = JSON.stringify(props);
    rows.push(stmt.bind(now, ts, b.a, b.s, e.e, int(e.n, 1, 1000000), int(e.ms, 0, 7200000), p.length > 2 ? p.slice(0, 200) : null, build, lang, phone, test));
  }
  if (rows.length) await env.DB.batch(rows);
  return new Response(null, { status: 204 });
}

const constantTimeEqual = (a, b) => {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
};

// GET /api/dubiko/stats?days=30&test=0   (Authorization: Bearer <DUBIKO_STATS_KEY>)
export async function dubikoStats(request, env) {
  if (!env.DUBIKO_STATS_KEY) return json({ error: 'not_found' }, { status: 404 });
  const auth = request.headers.get('Authorization') || '';
  if (!constantTimeEqual(auth, 'Bearer ' + env.DUBIKO_STATS_KEY)) return json({ error: 'unauthorized' }, { status: 401 });
  const url = new URL(request.url);
  const days = Math.min(365, Math.max(1, parseInt(url.searchParams.get('days') || '30', 10) || 30));
  const test = url.searchParams.get('test') === '1' ? 1 : 0;
  const since = Date.now() - days * DAY;
  const q = async (sql, ...args) => (await env.DB.prepare(sql).bind(...args).all()).results;

  const [overview] = await q(
    `SELECT COUNT(DISTINCT aid) AS visitors, COUNT(DISTINCT sid) AS sessions,
            COUNT(DISTINCT CASE WHEN ev = 'session_start' AND json_extract(props, '$.first') = 1 THEN aid END) AS new_visitors,
            COUNT(DISTINCT CASE WHEN phone = 1 THEN aid END) AS phone_visitors
       FROM dubiko_events WHERE rcv >= ? AND test = ?`, since, test);
  const [tutorial] = await q(
    `SELECT COUNT(DISTINCT CASE WHEN ev = 'tutorial_start' THEN aid END) AS started,
            COUNT(DISTINCT CASE WHEN ev = 'tutorial_done' THEN aid END) AS done,
            COUNT(DISTINCT CASE WHEN ev = 'tutorial_skip' THEN aid END) AS skipped,
            AVG(CASE WHEN ev = 'tutorial_done' THEN ms END) AS avg_ms
       FROM dubiko_events WHERE rcv >= ? AND test = ?`, since, test);
  const levels = await q(
    `SELECT lvl,
            COUNT(DISTINCT CASE WHEN ev = 'level_start' THEN aid END) AS players,
            SUM(ev = 'level_start') AS starts,
            COUNT(DISTINCT CASE WHEN ev = 'level_complete' THEN aid END) AS solvers,
            SUM(ev = 'level_complete') AS completes,
            SUM(ev = 'level_leave') AS leaves,
            AVG(CASE WHEN ev = 'level_complete' THEN ms END) AS avg_ms,
            AVG(CASE WHEN ev = 'level_complete' THEN json_extract(props, '$.hints') END) AS avg_hints,
            AVG(CASE WHEN ev = 'level_complete' THEN json_extract(props, '$.errs') END) AS avg_errs,
            SUM(ev = 'hint') AS hint_taps
       FROM dubiko_events WHERE rcv >= ? AND test = ? AND lvl IS NOT NULL GROUP BY lvl ORDER BY lvl LIMIT 300`, since, test);
  const retention = await q(
    `WITH f AS (SELECT aid, MIN(rcv / ${DAY}) AS d0 FROM dubiko_events WHERE test = ? GROUP BY aid),
          a AS (SELECT DISTINCT aid, rcv / ${DAY} AS d FROM dubiko_events WHERE test = ?)
     SELECT f.d0 AS day, COUNT(*) AS n,
            SUM(EXISTS (SELECT 1 FROM a WHERE a.aid = f.aid AND a.d = f.d0 + 1)) AS d1,
            SUM(EXISTS (SELECT 1 FROM a WHERE a.aid = f.aid AND a.d = f.d0 + 7)) AS d7,
            SUM(EXISTS (SELECT 1 FROM a WHERE a.aid = f.aid AND a.d = f.d0 + 30)) AS d30
       FROM f WHERE f.d0 >= ? GROUP BY f.d0 ORDER BY f.d0 DESC LIMIT 60`, test, test, Math.floor(since / DAY));
  return json({ days, test, now: Date.now(), overview, tutorial, levels, retention });
}

// ------------------------------------------------------------------ ranking
// A level counts only after the Worker has re-checked the submitted city: the pieces must be exactly
// the level's set (minus the fixed ones) and validateCity must accept the whole board. Levels come from
// the pre-built bank published with the game (public/dubiko/bank), so only banked levels can be ranked.

let bankIndex = null;
const bankChunks = new Map();

async function bankLevel(env, origin, n) {
  if (!bankIndex) {
    const r = await env.ASSETS.fetch(new Request(origin + '/dubiko/bank/index.json'));
    if (!r.ok) return null;
    bankIndex = await r.json();
  }
  const f = bankIndex.files.find((x) => n >= x.from && n <= x.to);
  if (!f) return null;
  if (!bankChunks.has(f.name)) {
    const r = await env.ASSETS.fetch(new Request(origin + '/dubiko/bank/' + f.name));
    if (!r.ok) return null;
    const m = new Map();
    for (const l of (await r.json()).levels) m.set(l.n, l);
    bankChunks.set(f.name, m);
  }
  return bankChunks.get(f.name).get(n) || null;
}

const relOf = (cells, w) => D.norm(cells.map((c) => [(c / w) | 0, c % w]));

// the multiset of pieces the player has to place, as class keys, with the fixed ones taken out
function neededKeys(level) {
  const need = new Map();
  const bump = (k, d) => need.set(k, (need.get(k) || 0) + d);
  for (const p of level.pieces) bump(D.classKey(p.type, D.norm(p.cells), level.rotate), 1);
  for (const g of level.givens) bump(D.classKey(g.type, relOf(g.cells, level.w), level.rotate), -1);
  return need;
}

export function checkSolution(level, placed) {
  if (!Array.isArray(placed) || placed.length > 64) return false;
  const total = level.w * level.h;
  const seen = new Set();
  const all = level.givens.map((g) => ({ type: g.type, cells: g.cells }));
  const have = new Map();
  for (const p of placed) {
    if (!p || typeof p.type !== 'string' || !D.TYPES[p.type] || !Array.isArray(p.cells) || p.cells.length < 1 || p.cells.length > 8) return false;
    for (const c of p.cells) {
      if (!Number.isInteger(c) || c < 0 || c >= total || seen.has(c)) return false;
      seen.add(c);
    }
    const k = D.classKey(p.type, relOf(p.cells, level.w), level.rotate);
    have.set(k, (have.get(k) || 0) + 1);
    all.push({ type: p.type, cells: p.cells });
  }
  const need = neededKeys(level);
  for (const [k, v] of need) if ((have.get(k) || 0) !== v) return false;
  for (const k of have.keys()) if (!need.has(k)) return false;
  return D.validateCity(level, all, false).ok;
}

async function rankOf(env, userId) {
  const mine = await env.DB.prepare('SELECT COUNT(*) AS n, MAX(solved_at) AS last FROM dubiko_solved WHERE user_id = ?').bind(userId).first();
  if (!mine || !mine.n) return { solved: 0, rank: null };
  const ahead = await env.DB.prepare(
    `SELECT COUNT(*) AS c FROM (SELECT user_id, COUNT(*) AS n, MAX(solved_at) AS last FROM dubiko_solved GROUP BY user_id)
      WHERE n > ? OR (n = ? AND last < ?)`).bind(mine.n, mine.n, mine.last).first();
  return { solved: mine.n, rank: (ahead ? ahead.c : 0) + 1 };
}

// POST /api/dubiko/solve  { n, placed: [{ type, cells }] }  (needs a signed-in player with a username)
export async function dubikoSolve(request, env) {
  const user = await db.findSessionUser(env.DB, readSessionToken(request));
  if (!user) return json({ error: 'not_logged_in' }, { status: 401 });
  if (!user.username) return json({ error: 'no_username' }, { status: 409 });
  let body;
  try { body = await request.json(); } catch { return json({ error: 'bad_request' }, { status: 400 }); }
  const n = int(body && body.n, 1, 1000000);
  if (n === null) return json({ error: 'bad_request' }, { status: 400 });
  const level = await bankLevel(env, new URL(request.url).origin, n);
  if (!level) return json({ error: 'not_ranked' }, { status: 404 });          // the level is not in the bank (yet)
  if (!checkSolution(level, body.placed)) return json({ error: 'invalid_solution' }, { status: 422 });
  await env.DB.prepare('INSERT OR IGNORE INTO dubiko_solved (user_id, lvl, solved_at) VALUES (?, ?, ?)').bind(user.id, n, Date.now()).run();
  return json({ ok: true, ...(await rankOf(env, user.id)) });
}

// GET /api/dubiko/leaderboard?limit=50 - public; the caller's own place is added when signed in
export async function dubikoLeaderboard(request, env) {
  const limit = Math.min(100, Math.max(1, parseInt(new URL(request.url).searchParams.get('limit') || '50', 10) || 50));
  const rows = (await env.DB.prepare(
    `SELECT u.username AS username, COUNT(*) AS solved, MAX(s.lvl) AS best, MAX(s.solved_at) AS last
       FROM dubiko_solved s JOIN users u ON u.id = s.user_id
      WHERE u.username IS NOT NULL
      GROUP BY s.user_id ORDER BY solved DESC, last ASC LIMIT ?`).bind(limit).all()).results;
  const user = await db.findSessionUser(env.DB, readSessionToken(request));
  const me = user ? { username: user.username, ...(await rankOf(env, user.id)) } : null;
  return json({ rows: rows.map((r, i) => ({ rank: i + 1, username: r.username, solved: r.solved, best: r.best })), me });
}
