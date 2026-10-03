// Sign-in for the Case in a Nutshell layout editor: a user name and a password that only the owner knows.
//
//   EDITOR_USERS           (secret) JSON: { "name": "pbkdf2-sha256:<iterations>:<salt b64>:<hash b64>" }  made by scripts/nutshell-editor-user.mjs
//   EDITOR_SESSION_SECRET  (secret) a long random string that signs the session cookie
//
// Nothing here stores or logs a password. A wrong guess costs the same time whether or not the user exists, and
// guesses are rationed (per address and, more loosely, overall) in D1.
const COOKIE = 'nutshell_editor';
const PATH = '/case-in-a-nutshell/';
const SESSION_S = 12 * 60 * 60;          // a session lasts 12 hours
const WINDOW_MS = 15 * 60 * 1000;
const PER_IP = 6, OVERALL = 60;          // failed sign-ins allowed in the window

const enc = new TextEncoder();
const b64u = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64u = (s) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));
const unb64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

async function pbkdf2(password, salt, iterations) {
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, key, 256));
}
function same(a, b) { let d = a.length ^ b.length; for (let i = 0; i < Math.max(a.length, b.length); i++) d |= (a[i] || 0) ^ (b[i] || 0); return d === 0; }

// a hash nobody's password produces: an unknown user name is checked against it, so the answer takes as long as for a real user
const DUMMY = 'pbkdf2-sha256:100000:AAAAAAAAAAAAAAAAAAAAAA==:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=';

export async function checkPassword(env, user, password) {
  let users = {};
  try { users = JSON.parse(env.EDITOR_USERS || '{}'); } catch { /* no users configured: nobody gets in */ }
  const stored = typeof user === 'string' && Object.prototype.hasOwnProperty.call(users, user) ? users[user] : null;
  const [scheme, it, salt, hash] = (stored || DUMMY).split(':');
  if (scheme !== 'pbkdf2-sha256') return false;
  const got = await pbkdf2(typeof password === 'string' ? password : '', unb64(salt), Math.min(Number(it) || 100000, 100000));
  return same(got, unb64(hash)) && stored !== null;
}

async function hmacKey(env, usage) {
  if (!env.EDITOR_SESSION_SECRET || env.EDITOR_SESSION_SECRET.length < 24) throw new Error('EDITOR_SESSION_SECRET is missing or too short');
  return crypto.subtle.importKey('raw', enc.encode(env.EDITOR_SESSION_SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, [usage]);
}
export async function makeSession(env, user, now = Date.now()) {
  const payload = b64u(enc.encode(JSON.stringify({ u: user, exp: Math.floor(now / 1000) + SESSION_S })));
  const sig = await crypto.subtle.sign('HMAC', await hmacKey(env, 'sign'), enc.encode(payload));
  return `${payload}.${b64u(sig)}`;
}
/* the user name in a valid, unexpired session cookie of this request, or null */
export async function readSession(request, env, now = Date.now()) {
  const header = request.headers.get('Cookie') || '';
  const part = header.split(';').map((s) => s.trim()).find((s) => s.startsWith(COOKIE + '='));
  if (!part) return null;
  const [payload, sig] = part.slice(COOKIE.length + 1).split('.');
  if (!payload || !sig) return null;
  try {
    if (!(await crypto.subtle.verify('HMAC', await hmacKey(env, 'verify'), unb64u(sig), enc.encode(payload)))) return null;
    const p = JSON.parse(new TextDecoder().decode(unb64u(payload)));
    if (typeof p.u !== 'string' || !(p.exp * 1000 > now)) return null;
    // a user taken out of EDITOR_USERS loses the session at once
    let users = {}; try { users = JSON.parse(env.EDITOR_USERS || '{}'); } catch { /* none */ }
    return Object.prototype.hasOwnProperty.call(users, p.u) ? p.u : null;
  } catch { return null; }
}
export const sessionCookie = (token) => `${COOKIE}=${token}; Path=${PATH}; Max-Age=${SESSION_S}; HttpOnly; Secure; SameSite=Strict`;
export const clearCookie = () => `${COOKIE}=; Path=${PATH}; Max-Age=0; HttpOnly; Secure; SameSite=Strict`;

export const clientIp = (request) => request.headers.get('CF-Connecting-IP') || 'unknown';
/* is this address (or everyone together) out of sign-in attempts for now? */
export async function tooManyAttempts(db, ip, now = Date.now()) {
  await db.prepare('DELETE FROM nutshell_login_attempts WHERE at < ?').bind(now - 60 * 60 * 1000).run();
  const mine = await db.prepare('SELECT COUNT(*) AS n FROM nutshell_login_attempts WHERE ip = ? AND at > ?').bind(ip, now - WINDOW_MS).first();
  const all = await db.prepare('SELECT COUNT(*) AS n FROM nutshell_login_attempts WHERE at > ?').bind(now - WINDOW_MS).first();
  return (mine && mine.n >= PER_IP) || (all && all.n >= OVERALL);
}
export const noteFailure = (db, ip, now = Date.now()) => db.prepare('INSERT INTO nutshell_login_attempts (ip, at) VALUES (?, ?)').bind(ip, now).run();
export const forgetFailures = (db, ip) => db.prepare('DELETE FROM nutshell_login_attempts WHERE ip = ?').bind(ip).run();
