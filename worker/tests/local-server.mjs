// node worker/tests/local-server.mjs [folder] [port]
// The site's Worker (the editor's part of it) on your computer, with an in-memory database and the files of `folder` standing in for the static
// assets: the same code Cloudflare runs, so the sign-in, the editor's pages, drafts and publishing can be tried and tested without deploying.
// Environment: NUTSHELL_USER / NUTSHELL_PASSWORD (default editor / a long test phrase), PORT.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { nutshellEditor } from '../routes/nutshell-editor.js';
import { makeDb } from './d1-shim.mjs';

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.xml': 'application/xml' };
export function startLocal({ root, port = 0, user = 'editor', password = 'correct horse battery staple' }) {
  const salt = crypto.randomBytes(16), hash = crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256');
  const env = {
    DB: makeDb(),
    EDITOR_USERS: JSON.stringify({ [user]: `pbkdf2-sha256:100000:${salt.toString('base64')}:${hash.toString('base64')}` }),
    EDITOR_SESSION_SECRET: crypto.randomBytes(32).toString('base64url'),
    ASSETS: { fetch: async (request) => {   // like Cloudflare's static assets: a folder, directories answer with their index.html
      let p = decodeURIComponent(new URL(request.url).pathname).replace(/^\//, ''), f = path.join(root, p);
      if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html');
      if (!f.startsWith(path.resolve(root)) || !fs.existsSync(f)) return new Response('not found', { status: 404 });
      return new Response(fs.readFileSync(f), { headers: { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' } });
    } }
  };
  const server = http.createServer(async (req, res) => {
    const chunks = []; for await (const c of req) chunks.push(c);
    const headers = new Headers(); for (const [k, v] of Object.entries(req.headers)) headers.set(k, Array.isArray(v) ? v.join(', ') : v);
    headers.set('CF-Connecting-IP', headers.get('x-test-ip') || '203.0.113.7');
    const request = new Request(`http://${req.headers.host}${req.url}`, { method: req.method, headers, body: ['GET', 'HEAD'].includes(req.method) ? undefined : Buffer.concat(chunks) });
    let r = await nutshellEditor(request, env);
    if (!r) r = await env.ASSETS.fetch(request);   // what the real Worker does for everything else
    const out = {}; r.headers.forEach((v, k) => { out[k] = v; });
    const cookies = r.headers.getSetCookie ? r.headers.getSetCookie() : []; if (cookies.length) out['set-cookie'] = cookies;
    res.writeHead(r.status, out); res.end(Buffer.from(await r.arrayBuffer()));
  });
  return new Promise((ok) => server.listen(port, '127.0.0.1', () => ok({ url: `http://127.0.0.1:${server.address().port}`, env, close: () => server.close(), user, password })));
}
if (import.meta.url === `file://${process.argv[1]}`) {
  const s = await startLocal({ root: path.resolve(process.argv[2] || 'dist'), port: Number(process.argv[3] || process.env.PORT || 8788), user: process.env.NUTSHELL_USER, password: process.env.NUTSHELL_PASSWORD });
  console.log(`editor on ${s.url}/case-in-a-nutshell/editor/   user: ${s.user}   password: ${s.password}`);
}
