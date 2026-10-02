import { readSessionToken } from '../lib/session.js';
import { findSessionUser } from '../lib/db.js';
import { json } from '../lib/http.js';

// Level progress for Blind Eye (/blind-eye/). The game keeps its progress in the browser and, once the
// player is logged in (the same account system as Pixels of the Mist), syncs it here. The server only ever
// MERGES: a level's stars can go up (or equal stars with fewer moves), never down, so an old tab or a second
// device can't wipe progress.

const MAX_BODY = 40000;
const MAX_LEVEL = 300;                      // the game has 185 levels today; this is only a sanity limit
const TOP = 20;

// The tables are created on first use, so deploying needs no manual migration (migrations/0003 holds the same statements).
let ready = null;
function ensureTable(DB) {
  if (!ready) {
    ready = (async () => {
      await DB.prepare('CREATE TABLE IF NOT EXISTS blind_eye_progress (user_id TEXT PRIMARY KEY REFERENCES users(id), data TEXT NOT NULL, updated_at INTEGER NOT NULL)').run();
      await DB.prepare('CREATE TABLE IF NOT EXISTS blind_eye_scores (user_id TEXT PRIMARY KEY REFERENCES users(id), stars INTEGER NOT NULL, levels INTEGER NOT NULL, updated_at INTEGER NOT NULL, hidden INTEGER NOT NULL DEFAULT 0)').run();
      await DB.prepare('CREATE INDEX IF NOT EXISTS idx_blind_eye_scores_rank ON blind_eye_scores(hidden, stars DESC)').run();
      // anyone who synced before the leaderboard existed gets a score row from the progress they already have
      await DB.prepare("INSERT OR IGNORE INTO blind_eye_scores (user_id, stars, levels, updated_at) SELECT p.user_id, SUM(json_extract(j.value, '$.stars')), COUNT(*), p.updated_at FROM blind_eye_progress p, json_each(p.data, '$.best') j GROUP BY p.user_id").run();
    })().catch((err) => { ready = null; throw err; });
  }
  return ready;
}

const intIn = (v, lo, hi) => (Number.isInteger(v) && v >= lo && v <= hi ? v : null);

// Only known shapes survive: anything else in the posted document is dropped.
export function clean(p) {
  const out = { best: {}, intro: {}, last: 0 };
  if (!p || typeof p !== 'object') return out;
  if (p.best && typeof p.best === 'object') {
    for (const [k, v] of Object.entries(p.best)) {
      const id = Number(k), stars = v && intIn(v.stars, 1, 3), moves = v && intIn(v.moves, 0, 999);
      if (Number.isInteger(id) && id >= 1 && id <= MAX_LEVEL && stars && moves !== null) out.best[id] = { stars, moves };
    }
  }
  if (p.intro && typeof p.intro === 'object') {
    for (const k of Object.keys(p.intro)) if (/^[a-z]{2,12}$/.test(k) && p.intro[k]) out.intro[k] = 1;
  }
  out.last = intIn(p.last, 0, MAX_LEVEL) ?? 0;
  return out;
}

export function merge(a, b) {
  const out = { best: { ...a.best }, intro: { ...a.intro, ...b.intro }, last: b.last };
  for (const [id, v] of Object.entries(b.best)) {
    const o = out.best[id];
    if (!o || v.stars > o.stars || (v.stars === o.stars && v.moves < o.moves)) out.best[id] = v;
  }
  return out;
}

async function userOf(request, env) {
  return findSessionUser(env.DB, readSessionToken(request));
}

export async function getProgress(request, env) {
  const user = await userOf(request, env);
  if (!user) return json({ error: 'not_logged_in' }, { status: 401 });
  await ensureTable(env.DB);
  const row = await env.DB.prepare('SELECT data, updated_at FROM blind_eye_progress WHERE user_id = ?').bind(user.id).first();
  if (!row) return json({ progress: null });
  return json({ progress: clean(JSON.parse(row.data)), updatedAt: row.updated_at });
}

export async function saveProgress(request, env) {
  const origin = request.headers.get('Origin');
  if (origin && origin !== new URL(request.url).origin) return json({ error: 'bad_origin' }, { status: 403 });
  const user = await userOf(request, env);
  if (!user) return json({ error: 'not_logged_in' }, { status: 401 });
  const text = await request.text();
  if (text.length > MAX_BODY) return json({ error: 'too_large' }, { status: 413 });
  let body;
  try { body = JSON.parse(text); } catch { return json({ error: 'bad_request' }, { status: 400 }); }
  await ensureTable(env.DB);
  const row = await env.DB.prepare('SELECT data FROM blind_eye_progress WHERE user_id = ?').bind(user.id).first();
  const merged = merge(row ? clean(JSON.parse(row.data)) : clean(null), clean(body && body.progress));
  const now = Date.now(), vals = Object.values(merged.best), stars = vals.reduce((a, v) => a + v.stars, 0);
  await env.DB.prepare(
    'INSERT INTO blind_eye_progress (user_id, data, updated_at) VALUES (?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at'
  ).bind(user.id, JSON.stringify(merged), now).run();
  // the leaderboard row: the time only moves when the star total changes, so ties go to whoever got there first; `hidden` is never touched here
  await env.DB.prepare(
    'INSERT INTO blind_eye_scores (user_id, stars, levels, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET stars = excluded.stars, levels = excluded.levels, updated_at = CASE WHEN excluded.stars != blind_eye_scores.stars THEN excluded.updated_at ELSE blind_eye_scores.updated_at END'
  ).bind(user.id, stars, vals.length, now).run();
  return json({ progress: merged, updatedAt: now });
}

// Public: the top players by total stars. Only players who chose a username (and have not hidden themselves) are listed, and only that name,
// the star total and the number of levels leave the server - never an e-mail. Stars are what the game reports; the server cannot replay a run.
const VISIBLE = 's.hidden = 0 AND u.username IS NOT NULL AND s.stars > 0';
export async function getLeaderboard(request, env) {
  await ensureTable(env.DB);
  const rows = await env.DB.prepare(
    `SELECT u.username AS name, s.stars, s.levels FROM blind_eye_scores s JOIN users u ON u.id = s.user_id WHERE ${VISIBLE} ORDER BY s.stars DESC, s.levels DESC, s.updated_at ASC LIMIT ?`
  ).bind(TOP).all();
  const top = rows.results.map((r, i) => ({ rank: i + 1, name: r.name, stars: r.stars, levels: r.levels }));
  const total = (await env.DB.prepare(`SELECT COUNT(*) AS n FROM blind_eye_scores s JOIN users u ON u.id = s.user_id WHERE ${VISIBLE}`).first()).n;
  let you = null;
  const user = await userOf(request, env);
  if (user) {
    const mine = await env.DB.prepare('SELECT stars, levels, updated_at, hidden FROM blind_eye_scores WHERE user_id = ?').bind(user.id).first();
    you = { name: user.username || null, stars: mine ? mine.stars : 0, levels: mine ? mine.levels : 0, hidden: mine ? !!mine.hidden : false, rank: null };
    if (mine && user.username && !mine.hidden && mine.stars > 0) {
      const ahead = await env.DB.prepare(
        `SELECT COUNT(*) AS n FROM blind_eye_scores s JOIN users u ON u.id = s.user_id WHERE ${VISIBLE} AND (s.stars > ?1 OR (s.stars = ?1 AND s.levels > ?2) OR (s.stars = ?1 AND s.levels = ?2 AND s.updated_at < ?3))`
      ).bind(mine.stars, mine.levels, mine.updated_at).first();
      you.rank = ahead.n + 1;
    }
  }
  return json({ top, total, you }, { headers: { 'Cache-Control': 'no-store' } });
}

// A signed-in player can leave or rejoin the leaderboard at any time.
export async function setVisibility(request, env) {
  const origin = request.headers.get('Origin');
  if (origin && origin !== new URL(request.url).origin) return json({ error: 'bad_origin' }, { status: 403 });
  const user = await userOf(request, env);
  if (!user) return json({ error: 'not_logged_in' }, { status: 401 });
  let body;
  try { body = await request.json(); } catch { return json({ error: 'bad_request' }, { status: 400 }); }
  if (typeof body.visible !== 'boolean') return json({ error: 'bad_request' }, { status: 400 });
  await ensureTable(env.DB);
  await env.DB.prepare(
    'INSERT INTO blind_eye_scores (user_id, stars, levels, updated_at, hidden) VALUES (?, 0, 0, ?, ?) ON CONFLICT(user_id) DO UPDATE SET hidden = excluded.hidden'
  ).bind(user.id, Date.now(), body.visible ? 0 : 1).run();
  return json({ ok: true, visible: body.visible });
}
