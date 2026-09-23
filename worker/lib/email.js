// Without RESEND_API_KEY (local `wrangler dev`, before the secret is set in
// production) this logs the link instead of emailing it, so the whole login
// flow is testable end to end without sending real mail or touching the
// Resend account at all. See the deploy checklist for wiring the real key.
export async function sendMagicLink(env, email, link) {
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
      from: env.RESEND_FROM || 'Pixels of the Mist <login@luckylion.games>',
      to: [email],
      subject: 'Your sign-in link',
      html: `<p>Tap to sign in - this link works once and expires in 15 minutes.</p>
             <p><a href="${link}">${link}</a></p>
             <p>Didn't request this? You can ignore this email.</p>`,
    }),
  });
  if (!res.ok) {
    throw new Error(`Resend request failed: ${res.status} ${await res.text()}`);
  }
  return {};
}
