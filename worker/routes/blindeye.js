import { readSessionToken } from '../lib/session.js';
import { findSessionUser } from '../lib/db.js';
import { json } from '../lib/http.js';

// Level progress for Blind Eye (/blind-eye/). The game keeps its progress in the browser and, once the
// player is logged in (the same account system as Pixels of the Mist), syncs it here. The server only ever
// MERGES: a level's stars can go up (or equal stars with fewer moves), never down, so an old tab or a second
// device can't wipe progress.

const MAX_BODY = 40000;
const MAX_LEVEL = 1000;

let ready = null;
function ensureTable(DB) {
  if (!ready) {
    ready = DB.prepare(
      'CREATE TABLE IF NOT EXISTS blind_eye_progress (user_id TEXT PRIMARY KEY REFERENCES users(id), data TEXT NOT NULL, updated_at INTEGER NOT NULL)'
    ).run().catch((err) => { ready = null; throw err; });
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
  const now = Date.now();
  await env.DB.prepare(
    'INSERT INTO blind_eye_progress (user_id, data, updated_at) VALUES (?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at'
  ).bind(user.id, JSON.stringify(merged), now).run();
  return json({ progress: merged, updatedAt: now });
}
