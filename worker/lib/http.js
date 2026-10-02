export function json(data, init) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init && init.headers) },
  });
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export function isValidEmail(s) {
  return typeof s === 'string' && s.length <= 254 && EMAIL_RE.test(s);
}

const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/;
export function isValidUsername(s) {
  return typeof s === 'string' && USERNAME_RE.test(s);
}

// Where a sign-in link may send the player back to (an open redirect would be a phishing hole): a fixed list.
const NEXT_PAGES = ['/pixels-of-the-mist/', '/blind-eye/'];
export function safeNext(s) {
  return typeof s === 'string' && NEXT_PAGES.includes(s) ? s : '/pixels-of-the-mist/';
}
