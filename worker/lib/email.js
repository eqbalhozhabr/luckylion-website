import { escapeHtml } from './http.js';

// Without RESEND_API_KEY (local `wrangler dev`, before the secret is set in
// production) this logs the link instead of emailing it, so the whole login
// flow is testable end to end without sending real mail or touching the
// Resend account at all. See the deploy checklist for wiring the real key.
//
// `game` ({name}) makes the mail say which game it is for: the subject, the sender's display name and the text. The sender ADDRESS still comes
// from RESEND_FROM (or login@luckylion.games), so only the display name changes per game.
export function senderFor(env, game) {
  const raw = env.RESEND_FROM || '';
  const addr = (/<([^>]+)>/.exec(raw) || [])[1] || (raw.includes('@') ? raw.trim() : 'login@luckylion.games');
  return `${game.name} <${addr}>`;
}

export async function sendMagicLink(env, email, link, game = { name: 'Pixels of the Mist' }) {
  if (!env.RESEND_API_KEY) {
    console.log(`[dev] magic link for ${email}: ${link}`);
    return { devLink: link };
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: senderFor(env, game),
      to: [email],
      subject: `Sign in to ${game.name}`,
      html: `<h2 style="margin:0 0 12px">${escapeHtml(game.name)}</h2>
             <p>Tap the button to sign in to ${escapeHtml(game.name)}. The link works once and expires in 15 minutes.</p>
             <p><a href="${escapeHtml(link)}" style="display:inline-block;padding:12px 20px;background:#ff3b52;color:#fff;text-decoration:none;font-weight:bold">Sign in to ${escapeHtml(game.name)}</a></p>
             <p style="color:#666;font-size:13px">If the button does not work, copy this address into your browser:<br>${escapeHtml(link)}</p>
             <p style="color:#666;font-size:13px">Didn't request this? You can ignore this email.</p>`,
      text: `Sign in to ${game.name}: ${link}\n\nThe link works once and expires in 15 minutes. If you did not request it, ignore this email.`,
    }),
  });
  if (!res.ok) {
    throw new Error(`Resend request failed: ${res.status} ${await res.text()}`);
  }
  return {};
}
