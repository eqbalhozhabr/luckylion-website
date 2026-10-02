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

// Where a sign-in link may send the player back to (an open redirect would be a phishing hole): a fixed list. Each page is a game with its own
// name, used for the e-mail's subject / sender name / body and for the confirmation page.
export const GAMES = {
  '/pixels-of-the-mist/': { name: 'Pixels of the Mist' },
  '/blind-eye/': { name: 'Blind Eye' },
};
export function safeNext(s) {
  return typeof s === 'string' && Object.prototype.hasOwnProperty.call(GAMES, s) ? s : '/pixels-of-the-mist/';
}
export const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

// A small standalone page for the sign-in steps (it is opened from an e-mail, so it cannot depend on any game's page).
export function page(title, bodyHtml, init) {
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex">
<title>${escapeHtml(title)}</title><style>
body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#0d1017;color:#e8ecf4;font:16px/1.6 system-ui,sans-serif;padding:20px;box-sizing:border-box}
.c{max-width:420px;width:100%;background:#1c2130;padding:26px 22px;text-align:center;box-shadow:0 -3px 0 #06080d,0 3px 0 #06080d,-3px 0 0 #06080d,3px 0 0 #06080d}
h1{font-size:20px;margin:0 0 12px}p{color:#a9b2c6;margin:10px 0}button,a.b{display:inline-block;margin-top:14px;padding:13px 22px;border:0;background:#ff3b52;color:#fff;font:700 16px system-ui,sans-serif;text-decoration:none;box-shadow:0 -3px 0 #06080d,0 3px 0 #06080d,-3px 0 0 #06080d,3px 0 0 #06080d;cursor:pointer}
small{display:block;margin-top:16px;color:#6b768b}</style></head><body><div class="c">${bodyHtml}</div></body></html>`;
  return new Response(html, { ...init, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', ...(init && init.headers) } });
}
