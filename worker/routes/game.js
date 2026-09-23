import { generateFrom, generateFromBanded } from '../lib/engine.js';
import { stageAllowed } from '../lib/chapters.js';
import { readSessionToken } from '../lib/session.js';
import { findSessionUser } from '../lib/db.js';
import { json } from '../lib/http.js';

// Same shape as withoutAnswer() in mist-worker.js - the fields that give the
// game away never leave this process for a /api/level request. /api/submit
// is the only thing that ever reads level.solution, and only to compare it
// against what was posted, never to send it back.
function withoutAnswer(level) {
  const out = {};
  for (const k in level) if (k !== 'solution' && k !== 'monsters' && k !== 'trace') out[k] = level[k];
  return out;
}

function build(stage, seed, band) {
  return band ? generateFromBanded(stage, seed >>> 0, band) : generateFrom(stage, seed >>> 0);
}

async function currentUserId(request, env) {
  const user = await findSessionUser(env.DB, readSessionToken(request));
  return user ? user.id : null;
}

export async function getLevel(request, env) {
  const url = new URL(request.url);
  const stage = Number(url.searchParams.get('stage'));
  const seed = Number(url.searchParams.get('seed'));
  const band = url.searchParams.get('band') || undefined;
  if (!Number.isInteger(stage) || !Number.isFinite(seed)) {
    return json({ error: 'bad_request' }, { status: 400 });
  }

  const userId = await currentUserId(request, env);
  if (!(await stageAllowed(env.DB, stage, userId))) {
    return json({ error: 'stage_locked' }, { status: 403 });
  }

  let level;
  try {
    level = build(stage, seed, band);
  } catch (err) {
    return json({ error: 'generation_failed', detail: String(err) }, { status: 500 });
  }
  if (!level) return json({ error: 'generation_failed' }, { status: 500 });
  return json(withoutAnswer(level));
}

export async function submit(request, env) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'bad_request' }, { status: 400 });
  }
  const { stage, seed, band, fires } = body;
  if (
    !Number.isInteger(stage) ||
    !Number.isFinite(seed) ||
    !Array.isArray(fires) ||
    !fires.every((f) => Number.isInteger(f))
  ) {
    return json({ error: 'bad_request' }, { status: 400 });
  }

  const userId = await currentUserId(request, env);
  if (!(await stageAllowed(env.DB, stage, userId))) {
    return json({ error: 'stage_locked' }, { status: 403 });
  }

  let level;
  try {
    level = build(stage, seed, band);
  } catch (err) {
    return json({ error: 'generation_failed', detail: String(err) }, { status: 500 });
  }
  if (!level || !level.solution) return json({ error: 'generation_failed' }, { status: 500 });

  const submitted = [...fires].sort((a, b) => a - b);
  const solution = [...level.solution].sort((a, b) => a - b);
  const correct =
    submitted.length === solution.length && submitted.every((v, i) => v === solution[i]);
  return json({ correct });
}
