const COOKIE_NAME = 'pom_session';
const MAX_AGE_S = 30 * 24 * 60 * 60; // 30 days, matches db.js's SESSION_TTL_MS

export function readSessionToken(request) {
  const header = request.headers.get('Cookie');
  if (!header) return null;
  for (const part of header.split(';')) {
    const eq = part.indexOf('=');
    if (eq === -1) continue;
    if (part.slice(0, eq).trim() === COOKIE_NAME) return part.slice(eq + 1).trim();
  }
  return null;
}

// Secure + HttpOnly: never readable or sendable by page script, only by the
// browser back to this same origin. SameSite=Lax rather than Strict so a
// verify link opened from an email client still carries the cookie it needs
// to set on the very next request (the redirect after verifying).
export function setSessionCookie(token) {
  return `${COOKIE_NAME}=${token}; Path=/; Max-Age=${MAX_AGE_S}; HttpOnly; Secure; SameSite=Lax`;
}

export function clearSessionCookie() {
  return `${COOKIE_NAME}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`;
}
