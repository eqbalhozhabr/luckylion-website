import * as db from '../lib/db.js';
import { sendMagicLink } from '../lib/email.js';
import { readSessionToken, setSessionCookie, clearSessionCookie } from '../lib/session.js';
import { json, isValidEmail, isValidUsername, safeNext, GAMES, escapeHtml, page } from '../lib/http.js';

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
  const link = `${url.origin}/api/auth/verify?token=${token}&next=${encodeURIComponent(safeNext(body.next))}`;
  const result = await sendMagicLink(env, email, link, GAMES[safeNext(body.next)]);
  return json({ ok: true, ...result });
}

// Opening the link in the e-mail only shows a "Sign in" button; the link is used up by pressing it (POST below). Mail apps and security scanners
// fetch links with GET on their own, and they used to burn the single-use link before the player ever got to it.
export async function verify(request, env) {
  const url = new URL(request.url);
  const token = url.searchParams.get('token') || '';
  const next = safeNext(url.searchParams.get('next'));
  const game = GAMES[next];
  if (!(await db.peekMagicLink(env.DB, token))) return expiredPage(game, next);
  return page(`Sign in to ${game.name}`, `<h1>${escapeHtml(game.name)}</h1><p>Tap the button to finish signing in.</p>
    <form method="post" action="/api/auth/verify"><input type="hidden" name="token" value="${escapeHtml(token)}"><input type="hidden" name="next" value="${escapeHtml(next)}">
    <button type="submit">Sign in</button></form><small>luckylion.games</small>`);
}

function expiredPage(game, next) {
  return page('Link expired', `<h1>This link has expired</h1><p>Sign-in links work once and last 15 minutes. Go back to ${escapeHtml(game.name)} and ask for a new one.</p>
    <a class="b" href="${escapeHtml(next)}">Back to ${escapeHtml(game.name)}</a><small>luckylion.games</small>`, { status: 400 });
}

export async function confirmVerify(request, env) {
  const origin = request.headers.get('Origin');
  if (origin && origin !== new URL(request.url).origin) return json({ error: 'bad_origin' }, { status: 403 });   // nobody can sign a visitor in to THEIR account from another site
  const form = await request.formData().catch(() => null);
  const token = form && typeof form.get('token') === 'string' ? form.get('token') : '';
  const next = safeNext(form && form.get('next'));
  const email = await db.consumeMagicLink(env.DB, token);
  if (!email) return expiredPage(GAMES[next], next);
  let user = await db.findUserByEmail(env.DB, email);
  if (!user) user = await db.createUser(env.DB, email);
  const session = await db.createSession(env.DB, user.id);

  return new Response(null, {
    status: 303,
    headers: {
      Location: `${next}?loggedin=1`,
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
