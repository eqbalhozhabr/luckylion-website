import * as db from '../lib/db.js';
import { sendMagicLink } from '../lib/email.js';
import { readSessionToken, setSessionCookie, clearSessionCookie } from '../lib/session.js';
import { json, isValidEmail, isValidUsername } from '../lib/http.js';

export async function requestLink(request, env) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'bad_request' }, { status: 400 });
  }
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  if (!isValidEmail(email)) return json({ error: 'invalid_email' }, { status: 400 });

  const token = await db.createMagicLink(env.DB, email);
  if (!token) {
    // Already sent one in the last minute - say the same thing as success so
    // this endpoint never reveals request timing to a caller probing emails.
    return json({ ok: true });
  }
  const url = new URL(request.url);
  const link = `${url.origin}/api/auth/verify?token=${token}`;
  const result = await sendMagicLink(env, email, link);
  return json({ ok: true, ...result });
}

export async function verify(request, env) {
  const url = new URL(request.url);
  const token = url.searchParams.get('token') || '';
  const email = await db.consumeMagicLink(env.DB, token);
  if (!email) {
    return new Response('This link is invalid or has expired. Go back and request a new one.', {
      status: 400,
      headers: { 'Content-Type': 'text/plain' },
    });
  }
  let user = await db.findUserByEmail(env.DB, email);
  if (!user) user = await db.createUser(env.DB, email);
  const session = await db.createSession(env.DB, user.id);

  return new Response(null, {
    status: 302,
    headers: {
      Location: '/pixels-of-the-mist/?loggedin=1',
      'Set-Cookie': setSessionCookie(session),
    },
  });
}

export async function me(request, env) {
  const user = await db.findSessionUser(env.DB, readSessionToken(request));
  if (!user) return json({ loggedIn: false });
  const unlocks = await env.DB
    .prepare('SELECT stage FROM unlocks WHERE user_id = ?')
    .bind(user.id)
    .all();
  return json({
    loggedIn: true,
    email: user.email,
    username: user.username,
    unlocks: unlocks.results.map((r) => r.stage),
  });
}

export async function setUsername(request, env) {
  const user = await db.findSessionUser(env.DB, readSessionToken(request));
  if (!user) return json({ error: 'not_logged_in' }, { status: 401 });
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'bad_request' }, { status: 400 });
  }
  const username = typeof body.username === 'string' ? body.username.trim() : '';
  if (!isValidUsername(username)) return json({ error: 'invalid_username' }, { status: 400 });
  if (await db.usernameTaken(env.DB, username, user.id)) {
    return json({ error: 'username_taken' }, { status: 409 });
  }
  await db.setUsername(env.DB, user.id, username);
  return json({ ok: true, username });
}

export async function logout(request, env) {
  const token = readSessionToken(request);
  if (token) await db.deleteSession(env.DB, token);
  return json({ ok: true }, { headers: { 'Set-Cookie': clearSessionCookie() } });
}
