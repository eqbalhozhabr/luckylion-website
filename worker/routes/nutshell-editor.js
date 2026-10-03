// Case in a Nutshell: the layout editor's server side.
//
//   /case-in-a-nutshell/editor/*          the editor's files, served ONLY with a valid session; anyone else gets the sign-in page
//   /case-in-a-nutshell/api/editor/*      sign in/out, drafts, published versions, the picture library (every one of them needs a session;
//                                         every write also needs the X-Editor header, so another site cannot send one on a signed-in browser's behalf)
//   /case-in-a-nutshell/api/layout/<slug>.js | .json   the PUBLISHED layout of a case: public, read-only; the game loads it before it starts
//
// Returns a Response for these paths and null for anything else.
import { json, escapeHtml } from '../lib/http.js';
import { checkPassword, makeSession, readSession, sessionCookie, clearCookie, clientIp, tooManyAttempts, noteFailure, forgetFailures } from '../lib/nutshell-auth.js';
import { validateDoc, validateSprite, MAX_BYTES } from '../lib/nutshell-validate.js';

const BASE = '/case-in-a-nutshell/';
const SLUG = /^[a-z0-9-]{1,40}$/;
const SPRITE_ID = /^[\w-]{1,40}$/;
const KEEP_DRAFTS = 25;
const NO_STORE = { 'Cache-Control': 'private, no-store' };

const loginPage = () => new Response(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex, nofollow"><title>Sign in</title><style>
body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#1d1a26;color:#ece6d6;font:15px/1.5 system-ui,sans-serif;padding:20px;box-sizing:border-box}
form{width:100%;max-width:340px;background:#272333;border:1px solid #3c3650;border-radius:10px;padding:22px}h1{font-size:17px;margin:0 0 14px}label{display:block;color:#9d96b0;font-size:13px;margin:10px 0 4px}
input{width:100%;box-sizing:border-box;background:#342f45;color:#ece6d6;border:1px solid #3c3650;border-radius:6px;padding:9px 10px;font:inherit}button{margin-top:16px;width:100%;padding:10px;border:0;border-radius:6px;background:#e0b04a;color:#231c0e;font:600 15px system-ui,sans-serif;cursor:pointer}
#e{color:#ff7a6e;min-height:1.4em;margin-top:10px;font-size:13px}</style></head><body><form id="f" autocomplete="on"><h1>Case in a Nutshell &middot; editor</h1>
<label for="u">User</label><input id="u" name="username" autocomplete="username" required autofocus><label for="p">Password</label><input id="p" name="password" type="password" autocomplete="current-password" required>
<button>Sign in</button><div id="e" role="alert"></div></form><script>
document.getElementById('f').onsubmit=async function(ev){ev.preventDefault();var e=document.getElementById('e');e.textContent='';
try{var r=await fetch('${BASE}api/editor/login',{method:'POST',headers:{'content-type':'application/json','x-editor':'1'},body:JSON.stringify({user:document.getElementById('u').value,password:document.getElementById('p').value})});
if(r.ok){location.reload();return}e.textContent=r.status===429?'Too many attempts. Wait a few minutes.':'Wrong user or password.'}catch(x){e.textContent='Could not reach the server.'}}
</script></body></html>`, { status: 401, headers: { 'Content-Type': 'text/html; charset=utf-8', ...NO_STORE, 'X-Robots-Tag': 'noindex, nofollow' } });

const deny = (status, error) => json({ error }, { status, headers: NO_STORE });
const readJson = async (request) => { try { return await request.json(); } catch { return null; } };
const row = (r) => (r ? { id: r.id, status: r.status, label: r.label, author: r.author, created_at: r.created_at } : null);

async function latest(db, slug, status) { return db.prepare('SELECT * FROM nutshell_layouts WHERE slug = ? AND status = ? ORDER BY id DESC LIMIT 1').bind(slug, status).first(); }

/* ---------- public: the published layout ---------- */
async function publicLayout(request, env, slug, ext) {
  const r = await latest(env.DB, slug, 'published');
  const headers = { 'Cache-Control': 'public, max-age=30', 'X-Content-Type-Options': 'nosniff', 'Access-Control-Allow-Origin': '*' };
  if (ext === 'json') return r ? new Response(r.doc, { headers: { ...headers, 'Content-Type': 'application/json' } }) : json({ error: 'not_published' }, { status: 404, headers });
  // a script the game loads before it starts: window.NUT_PUBLISHED[slug] = the layout (or nothing, when none is published)
  const body = r ? `(window.NUT_PUBLISHED=window.NUT_PUBLISHED||{})[${JSON.stringify(slug)}]=${r.doc};` : '/* no published layout */';
  return new Response(body, { headers: { ...headers, 'Content-Type': 'text/javascript; charset=utf-8' } });
}

/* ---------- the editor's API ---------- */
async function api(request, env, user, path) {
  const m = request.method, db = env.DB;
  if (m !== 'GET' && request.headers.get('X-Editor') !== '1') return deny(403, 'missing_header');
  if (path === 'me' && m === 'GET') return json({ user }, { headers: NO_STORE });
  if (path === 'logout' && m === 'POST') return json({ ok: true }, { headers: { 'Set-Cookie': clearCookie(), ...NO_STORE } });

  let g;
  if ((g = path.match(/^layout\/([a-z0-9-]{1,40})$/)) && m === 'GET') {
    const slug = g[1];
    const [pub, draft, versions] = await Promise.all([latest(db, slug, 'published'), latest(db, slug, 'draft'), db.prepare('SELECT id, status, label, author, created_at FROM nutshell_layouts WHERE slug = ? ORDER BY id DESC LIMIT 60').bind(slug).all()]);
    return json({ published: pub ? { ...row(pub), doc: JSON.parse(pub.doc) } : null, draft: draft ? { ...row(draft), doc: JSON.parse(draft.doc) } : null, versions: versions.results }, { headers: NO_STORE });
  }
  if ((g = path.match(/^layout\/([a-z0-9-]{1,40})\/version\/(\d{1,12})$/)) && m === 'GET') {
    const r = await db.prepare('SELECT * FROM nutshell_layouts WHERE slug = ? AND id = ?').bind(g[1], Number(g[2])).first();
    return r ? json({ ...row(r), doc: JSON.parse(r.doc) }, { headers: NO_STORE }) : deny(404, 'not_found');
  }
  if ((g = path.match(/^layout\/([a-z0-9-]{1,40})\/(draft|publish)$/)) && (m === 'PUT' || m === 'POST')) {
    if ((g[2] === 'draft') !== (m === 'PUT')) return deny(405, 'method');
    const slug = g[1], body = await readJson(request);
    if (!body) return deny(400, 'bad_json');
    let doc; try { doc = validateDoc(body.doc, slug); } catch (e) { return deny(422, String(e.message || e).slice(0, 200)); }
    const label = typeof body.label === 'string' ? body.label.slice(0, 80) : null, text = JSON.stringify(doc), status = g[2] === 'draft' ? 'draft' : 'published';
    const res = await db.prepare('INSERT INTO nutshell_layouts (slug, status, doc, label, author, created_at) VALUES (?, ?, ?, ?, ?, ?)').bind(slug, status, text, label, user, Date.now()).run();
    if (status === 'draft') await db.prepare('DELETE FROM nutshell_layouts WHERE slug = ? AND status = ? AND id NOT IN (SELECT id FROM nutshell_layouts WHERE slug = ? AND status = ? ORDER BY id DESC LIMIT ?)').bind(slug, 'draft', slug, 'draft', KEEP_DRAFTS).run();
    return json({ ok: true, id: (res.meta && res.meta.last_row_id) || null, status }, { headers: NO_STORE });
  }

  if (path === 'library' && m === 'GET') {
    const r = await db.prepare('SELECT id, spec FROM nutshell_library ORDER BY created_at').all();
    const sprites = {}; for (const x of r.results) sprites[x.id] = JSON.parse(x.spec);
    return json({ sprites }, { headers: NO_STORE });
  }
  if ((g = path.match(/^library\/([\w-]{1,40})$/))) {
    if (!SPRITE_ID.test(g[1])) return deny(400, 'bad_id');
    if (m === 'PUT') {
      const body = await readJson(request); let spec; try { spec = validateSprite(body && body.spec); } catch (e) { return deny(422, String(e.message || e).slice(0, 200)); }
      const count = await db.prepare('SELECT COUNT(*) AS n FROM nutshell_library').first();
      const exists = await db.prepare('SELECT id FROM nutshell_library WHERE id = ?').bind(g[1]).first();
      if (!exists && count.n >= 400) return deny(409, 'library_full');
      await db.prepare('INSERT INTO nutshell_library (id, spec, author, created_at) VALUES (?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET spec = excluded.spec, author = excluded.author').bind(g[1], JSON.stringify(spec), user, Date.now()).run();
      return json({ ok: true }, { headers: NO_STORE });
    }
    if (m === 'DELETE') { await db.prepare('DELETE FROM nutshell_library WHERE id = ?').bind(g[1]).run(); return json({ ok: true }, { headers: NO_STORE }); }
  }
  return deny(404, 'not_found');
}

/* ---------- the entry point ---------- */
export async function nutshellEditor(request, env) {
  const url = new URL(request.url), p = url.pathname;
  if (!p.startsWith(BASE)) return null;
  const rest = p.slice(BASE.length);

  // public: the published layouts
  let g = rest.match(/^api\/layout\/([a-z0-9-]{1,40})\.(js|json)$/);
  if (g && (request.method === 'GET' || request.method === 'HEAD')) return publicLayout(request, env, g[1], g[2]);

  // sign in: the only thing that works without a session
  if (rest === 'api/editor/login') {
    if (request.method !== 'POST') return deny(405, 'method');
    if (request.headers.get('X-Editor') !== '1') return deny(403, 'missing_header');
    const ip = clientIp(request);
    if (await tooManyAttempts(env.DB, ip)) return deny(429, 'too_many_attempts');
    const body = await readJson(request);
    if (!body || !(await checkPassword(env, body.user, body.password))) { await noteFailure(env.DB, ip); return deny(401, 'wrong_user_or_password'); }
    await forgetFailures(env.DB, ip);
    return json({ ok: true, user: body.user }, { headers: { 'Set-Cookie': sessionCookie(await makeSession(env, body.user)), ...NO_STORE } });
  }

  const isApi = rest.startsWith('api/editor/'), isPage = rest === 'editor' || rest.startsWith('editor/');
  if (!isApi && !isPage) return null;
  let user = null;
  try { user = await readSession(request, env); } catch (e) { console.error(e); return deny(500, 'not_configured'); }
  if (!user) {
    if (isApi) return deny(401, 'sign_in_required');
    return rest === 'editor' || rest === 'editor/' || (request.headers.get('Accept') || '').includes('text/html') ? loginPage() : new Response('Sign in required', { status: 401, headers: NO_STORE });
  }
  if (isApi) return api(request, env, user, rest.slice('api/editor/'.length));
  if (rest === 'editor') return new Response(null, { status: 308, headers: { Location: BASE + 'editor/', ...NO_STORE } });
  const res = await env.ASSETS.fetch(request);
  const out = new Response(res.body, res);
  out.headers.set('Cache-Control', 'private, no-store');   // what only a signed-in user may see is never kept by a shared cache
  out.headers.set('X-Robots-Tag', 'noindex, nofollow');
  return out;
}
