import { json } from '../lib/http.js';

// Anonymous play statistics and level reports for /blind-eye/. Nothing here is linked to an account, an e-mail or an IP address: the browser
// keeps a random id (`aid`, for "players") and a per-visit id (`sid`) and sends batches of small events as text/plain (no CORS preflight).
// The tables are created on first use, like blind_eye_progress; migrations/0004 holds the same statements.

const EVENTS = new Set(['session_start', 'level_start', 'level_win', 'level_caught', 'level_leave', 'hint', 'mistake', 'ad']);
const REPORT_KINDS = new Set(['too_hard', 'too_easy', 'confusing', 'bug', 'other']);
const DAY = 86400000;
const ID_RE = /^[0-9a-f]{8,32}$/;
const MAX_LEVEL = 300;
const MAX_REPORTS_PER_DAY = 20;

let ready = null;
function ensureTables(DB) {
  if (!ready) {
    ready = (async () => {
      await DB.prepare('CREATE TABLE IF NOT EXISTS blind_eye_events (id INTEGER PRIMARY KEY AUTOINCREMENT, rcv INTEGER NOT NULL, ts INTEGER NOT NULL, aid TEXT NOT NULL, sid TEXT NOT NULL, ev TEXT NOT NULL, lvl INTEGER, ms INTEGER, moves INTEGER, par INTEGER, props TEXT, build TEXT, lang TEXT, phone INTEGER, test INTEGER NOT NULL DEFAULT 0)').run();
      await DB.prepare('CREATE INDEX IF NOT EXISTS idx_be_ev ON blind_eye_events(ev, lvl)').run();
      await DB.prepare('CREATE INDEX IF NOT EXISTS idx_be_aid ON blind_eye_events(aid, rcv)').run();
      await DB.prepare('CREATE TABLE IF NOT EXISTS blind_eye_reports (id INTEGER PRIMARY KEY AUTOINCREMENT, rcv INTEGER NOT NULL, aid TEXT NOT NULL, lvl INTEGER NOT NULL, kind TEXT NOT NULL, note TEXT, build TEXT, lang TEXT, test INTEGER NOT NULL DEFAULT 0)').run();
      await DB.prepare('CREATE INDEX IF NOT EXISTS idx_be_rep ON blind_eye_reports(lvl, kind)').run();
    })().catch((err) => { ready = null; throw err; });
  }
  return ready;
}

const int = (v, lo, hi) => (Number.isFinite(v) && v >= lo && v <= hi ? Math.floor(v) : null);

// POST /api/blind-eye/event   body (text/plain JSON): { a: aid, s: sid, v: build, l: 'en'|'fa', p: 1 phone, x: 1 test, ev: [ {e, t, n, ms, moves, par, hints, lost, undo, stars, k, first, again, ok} ] }
export async function blindEyeEvent(request, env) {
  const text = await request.text();
  if (text.length > 16000) return json({ error: 'too_large' }, { status: 413 });
  let b;
  try { b = JSON.parse(text); } catch { return json({ error: 'bad_request' }, { status: 400 }); }
  if (!b || typeof b.a !== 'string' || typeof b.s !== 'string' || !ID_RE.test(b.a) || !ID_RE.test(b.s) || !Array.isArray(b.ev)) return json({ error: 'bad_request' }, { status: 400 });
  await ensureTables(env.DB);
  const now = Date.now(), build = typeof b.v === 'string' ? b.v.slice(0, 24) : '', lang = b.l === 'fa' || b.l === 'en' ? b.l : '', phone = b.p ? 1 : 0, test = b.x ? 1 : 0;
  const stmt = env.DB.prepare('INSERT INTO blind_eye_events (rcv, ts, aid, sid, ev, lvl, ms, moves, par, props, build, lang, phone, test) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
  const rows = [];
  for (const e of b.ev.slice(0, 40)) {
    if (!e || !EVENTS.has(e.e)) continue;
    const ts = Number.isFinite(e.t) && Math.abs(e.t - now) < DAY ? Math.floor(e.t) : now;
    const props = {};
    for (const k of ['hints', 'lost', 'undo', 'stars', 'k', 'first', 'again', 'ok']) {
      const v = e[k];
      if (typeof v === 'number' || typeof v === 'boolean' || (typeof v === 'string' && v.length < 24)) props[k] = v;
    }
    const p = JSON.stringify(props);
    rows.push(stmt.bind(now, ts, b.a, b.s, e.e, int(e.n, 1, MAX_LEVEL), int(e.ms, 0, 7200000), int(e.moves, 0, 999), int(e.par, 0, 999), p.length > 2 ? p.slice(0, 200) : null, build, lang, phone, test));
  }
  if (rows.length) await env.DB.batch(rows);
  return new Response(null, { status: 204 });
}

// POST /api/blind-eye/report   body (JSON): { a: aid, n: level, k: kind, note?: string (<= 200), v, l, x }
export async function blindEyeReport(request, env) {
  const origin = request.headers.get('Origin');
  if (origin && origin !== new URL(request.url).origin) return json({ error: 'bad_origin' }, { status: 403 });
  const text = await request.text();
  if (text.length > 2000) return json({ error: 'too_large' }, { status: 413 });
  let b;
  try { b = JSON.parse(text); } catch { return json({ error: 'bad_request' }, { status: 400 }); }
  const lvl = int(b && b.n, 1, MAX_LEVEL);
  if (!b || typeof b.a !== 'string' || !ID_RE.test(b.a) || lvl === null || !REPORT_KINDS.has(b.k)) return json({ error: 'bad_request' }, { status: 400 });
  await ensureTables(env.DB);
  const now = Date.now();
  const recent = await env.DB.prepare('SELECT COUNT(*) AS n FROM blind_eye_reports WHERE aid = ? AND rcv > ?').bind(b.a, now - DAY).first();
  if (recent.n >= MAX_REPORTS_PER_DAY) return json({ error: 'too_many' }, { status: 429 });
  const note = typeof b.note === 'string' ? b.note.replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, 200) : '';
  await env.DB.prepare('INSERT INTO blind_eye_reports (rcv, aid, lvl, kind, note, build, lang, test) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
    .bind(now, b.a, lvl, b.k, note || null, typeof b.v === 'string' ? b.v.slice(0, 24) : '', b.l === 'fa' || b.l === 'en' ? b.l : '', b.x ? 1 : 0).run();
  return json({ ok: true });
}

const constantTimeEqual = (a, b) => {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
};

// GET /api/blind-eye/stats?days=30&test=0   (Authorization: Bearer <BLIND_EYE_STATS_KEY, or DUBIKO_STATS_KEY if that is the only key set>)
export async function blindEyeStats(request, env) {
  const key = env.BLIND_EYE_STATS_KEY || env.DUBIKO_STATS_KEY;
  if (!key) return json({ error: 'not_found' }, { status: 404 });
  if (!constantTimeEqual(request.headers.get('Authorization') || '', 'Bearer ' + key)) return json({ error: 'unauthorized' }, { status: 401 });
  await ensureTables(env.DB);
  const url = new URL(request.url);
  const days = Math.min(365, Math.max(1, parseInt(url.searchParams.get('days') || '30', 10) || 30));
  const test = url.searchParams.get('test') === '1' ? 1 : 0;
  const since = Date.now() - days * DAY;
  const q = async (sql, ...args) => (await env.DB.prepare(sql).bind(...args).all()).results;

  const [overview] = await q(
    `SELECT COUNT(DISTINCT aid) AS players, COUNT(DISTINCT sid) AS sessions,
            COUNT(DISTINCT CASE WHEN phone = 1 THEN aid END) AS phone_players,
            COUNT(DISTINCT CASE WHEN ev = 'level_win' THEN aid END) AS winners,
            SUM(ev = 'level_win') AS wins, SUM(ev = 'level_caught') AS caught, SUM(ev = 'mistake') AS mistakes, SUM(ev = 'hint') AS hints,
            SUM(ev = 'ad') AS ads
       FROM blind_eye_events WHERE rcv >= ? AND test = ?`, since, test);
  const levels = await q(
    `SELECT lvl,
            COUNT(DISTINCT CASE WHEN ev = 'level_start' THEN aid END) AS players,
            SUM(ev = 'level_start') AS starts,
            COUNT(DISTINCT CASE WHEN ev = 'level_win' THEN aid END) AS solvers,
            SUM(ev = 'level_win') AS wins,
            SUM(ev = 'level_caught') AS caught,
            SUM(ev = 'level_leave') AS leaves,
            SUM(ev = 'mistake') AS mistakes,
            SUM(ev = 'hint') AS hint_taps,
            AVG(CASE WHEN ev = 'level_win' THEN ms END) AS avg_ms,
            AVG(CASE WHEN ev = 'level_win' THEN moves END) AS avg_moves,
            AVG(CASE WHEN ev = 'level_win' AND par > 0 THEN moves * 1.0 / par END) AS moves_over_par,
            AVG(CASE WHEN ev = 'level_win' THEN json_extract(props, '$.stars') END) AS avg_stars,
            AVG(CASE WHEN ev = 'level_win' THEN json_extract(props, '$.undo') END) AS avg_undo,
            MAX(par) AS par
       FROM blind_eye_events WHERE rcv >= ? AND test = ? AND lvl IS NOT NULL GROUP BY lvl ORDER BY lvl LIMIT 300`, since, test);
  const reports = await q(
    `SELECT lvl, kind, COUNT(*) AS n FROM blind_eye_reports WHERE rcv >= ? AND test = ? GROUP BY lvl, kind ORDER BY lvl`, since, test);
  const notes = await q(
    `SELECT rcv, lvl, kind, note, lang, build FROM blind_eye_reports WHERE rcv >= ? AND test = ? AND note IS NOT NULL ORDER BY rcv DESC LIMIT 100`, since, test);
  return json({ days, test, now: Date.now(), overview, levels, reports, notes });
}
