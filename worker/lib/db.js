// Thin D1 wrappers - one function per query, so the routes read as intent
// ("findUserByEmail") rather than SQL, and there is exactly one place to
// look if a query needs to change.

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const MAGIC_LINK_TTL_MS = 15 * 60 * 1000; // 15 minutes
const MAGIC_LINK_MIN_GAP_MS = 60 * 1000; // one request per email per minute

export async function findUserByEmail(db, email) {
  return db.prepare('SELECT * FROM users WHERE email = ?').bind(email).first();
}

export async function findUserById(db, id) {
  return db.prepare('SELECT * FROM users WHERE id = ?').bind(id).first();
}

export async function createUser(db, email) {
  const id = crypto.randomUUID();
  await db
    .prepare('INSERT INTO users (id, email, username, created_at) VALUES (?, ?, NULL, ?)')
    .bind(id, email, Date.now())
    .run();
  return { id, email, username: null, created_at: Date.now() };
}

export async function setUsername(db, userId, username) {
  await db.prepare('UPDATE users SET username = ? WHERE id = ?').bind(username, userId).run();
}

export async function usernameTaken(db, username, excludingUserId) {
  const row = await db
    .prepare('SELECT id FROM users WHERE username = ? AND id != ?')
    .bind(username, excludingUserId || '')
    .first();
  return !!row;
}

// Returns null if a link was sent too recently (caller rate-limits on this),
// otherwise the fresh token to email out.
export async function createMagicLink(db, email) {
  const now = Date.now();
  const recent = await db
    .prepare(
      'SELECT 1 FROM magic_links WHERE email = ? AND created_at > ? LIMIT 1'
    )
    .bind(email, now - MAGIC_LINK_MIN_GAP_MS)
    .first();
  if (recent) return null;
  const token = crypto.randomUUID();
  await db
    .prepare(
      'INSERT INTO magic_links (token, email, created_at, expires_at, used_at) VALUES (?, ?, ?, ?, NULL)'
    )
    .bind(token, email, now, now + MAGIC_LINK_TTL_MS)
    .run();
  return token;
}

// Consumes the token atomically-enough for this scale: read, check, mark
// used in one round trip's worth of application logic. Returns the email it
// was issued for, or null if the token is missing, expired, or already used.
export async function consumeMagicLink(db, token) {
  const row = await db
    .prepare('SELECT * FROM magic_links WHERE token = ?')
    .bind(token)
    .first();
  if (!row || row.used_at || row.expires_at < Date.now()) return null;
  await db.prepare('UPDATE magic_links SET used_at = ? WHERE token = ?').bind(Date.now(), token).run();
  return row.email;
}

export async function createSession(db, userId) {
  const token = crypto.randomUUID();
  const now = Date.now();
  await db
    .prepare('INSERT INTO sessions (token, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)')
    .bind(token, userId, now, now + SESSION_TTL_MS)
    .run();
  return token;
}

export async function findSessionUser(db, token) {
  if (!token) return null;
  const row = await db
    .prepare(
      `SELECT users.* FROM sessions
       JOIN users ON users.id = sessions.user_id
       WHERE sessions.token = ? AND sessions.expires_at > ?`
    )
    .bind(token, Date.now())
    .first();
  return row || null;
}

export async function deleteSession(db, token) {
  await db.prepare('DELETE FROM sessions WHERE token = ?').bind(token).run();
}
