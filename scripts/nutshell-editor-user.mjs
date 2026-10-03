// node scripts/nutshell-editor-user.mjs [--merge '<the current EDITOR_USERS json>']
//
// Makes a user name + password for the Case in a Nutshell layout editor, and prints what to give Cloudflare. Run it on your own computer:
// the password is typed here, never written to a file, and only a salted hash comes out.
//
//   1. node scripts/nutshell-editor-user.mjs
//   2. npx wrangler secret put EDITOR_USERS            (paste the JSON it prints)
//   3. npx wrangler secret put EDITOR_SESSION_SECRET   (paste the random string it prints; make it once, keep it)
//
// Another user: run it again with --merge '<the JSON you have now>' and put the new JSON. Taking a user out of the JSON signs them out at once.
import crypto from 'node:crypto';
import readline from 'node:readline';

const ITERATIONS = 100000;   // the most Cloudflare Workers allow for PBKDF2; the length of the password and the sign-in limits do the rest
const arg = (n) => { const i = process.argv.indexOf('--' + n); return i < 0 ? null : process.argv[i + 1]; };

function ask(q, hidden) {
  return new Promise((ok) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    if (hidden) rl._writeToOutput = (s) => { if (s.includes(q)) process.stdout.write(s); else if (s === '\r\n' || s === '\n') process.stdout.write('\n'); };
    rl.question(q, (a) => { rl.close(); ok(a); });
  });
}

const user = (process.env.NUTSHELL_USER || (await ask('User name: ', false))).trim();
if (!/^[A-Za-z0-9._-]{2,40}$/.test(user)) { console.error('Use 2 to 40 letters, digits, dot, dash or underscore.'); process.exit(1); }
let password = process.env.NUTSHELL_PASSWORD;
if (!password) {
  password = await ask('Password (at least 12 characters; a few random words is good): ', true);
  if (password !== (await ask('Again: ', true))) { console.error('The two passwords differ.'); process.exit(1); }
}
if (password.length < 12) { console.error('Too short: at least 12 characters.'); process.exit(1); }

const salt = crypto.randomBytes(16), hash = crypto.pbkdf2Sync(password, salt, ITERATIONS, 32, 'sha256');
let users = {};
if (arg('merge')) { try { users = JSON.parse(arg('merge')); } catch { console.error('--merge needs the JSON of the current EDITOR_USERS.'); process.exit(1); } }
users[user] = `pbkdf2-sha256:${ITERATIONS}:${salt.toString('base64')}:${hash.toString('base64')}`;
console.log('\nEDITOR_USERS (paste this into: npx wrangler secret put EDITOR_USERS)\n');
console.log(JSON.stringify(users));
console.log('\nEDITOR_SESSION_SECRET (paste this into: npx wrangler secret put EDITOR_SESSION_SECRET; make it once and keep it, a new one signs everybody out)\n');
console.log(crypto.randomBytes(48).toString('base64url'));
