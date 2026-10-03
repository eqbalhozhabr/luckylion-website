// node --test worker/tests/   (npm run test:nutshell-editor)
// The Case in a Nutshell editor's server side: who gets in, what they can do, what the public sees.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { startLocal } from './local-server.mjs';
import { makeSession, readSession } from '../lib/nutshell-auth.js';
import { validateDoc } from '../lib/nutshell-validate.js';

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'nutshell-'));
const put = (rel, text) => { const f = path.join(root, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, text); };
put('case-in-a-nutshell/editor/index.html', '<!doctype html><title>EDITOR</title>');
put('case-in-a-nutshell/editor/editor.js', 'console.log("editor")');
put('case-in-a-nutshell/editor/assets/engine.js', 'const ENGINE = 1;');
put('case-in-a-nutshell/index.html', '<!doctype html><title>GAME</title>');
put('case-in-a-nutshell/assets/engine.js', 'const GAME_ENGINE = 1;');
const S = await startLocal({ root });
test.after(() => { S.close(); fs.rmSync(root, { recursive: true, force: true }); });

const B = '/case-in-a-nutshell/';
const H = { 'content-type': 'application/json', 'x-editor': '1' };
const call = (p, o = {}) => fetch(S.url + p, { redirect: 'manual', ...o, headers: { ...(o.headers || {}) } });
const login = async (ip = '198.51.100.1', password = S.password, user = S.user) => call(B + 'api/editor/login', { method: 'POST', headers: { ...H, 'x-test-ip': ip }, body: JSON.stringify({ user, password }) });
let cookie = '';
const as = (o = {}) => ({ ...o, headers: { ...(o.headers || {}), cookie } });
const doc = (slug = 'demo', extra = {}) => ({ version: 1, case: slug, rooms: { living: { size: [8, 8], objects: [{ id: 'table', type: 'table', hot: 'table', cell: [3, 3.2], footprint: [2, 1.1], class: 'free', base: 'abc123' }], items: [], wall: [], ...extra } } });

test('nobody gets the editor without signing in', async () => {
  for (const p of ['editor/', 'editor', 'editor/editor.js', 'editor/assets/engine.js', 'editor/index.html']) {
    const r = await call(B + p, { headers: { accept: p.endsWith('.js') ? '*/*' : 'text/html' } });
    assert.equal(r.status, 401, p); const t = await r.text(); assert.ok(!t.includes('EDITOR') && !t.includes('ENGINE'), p + ' leaked');
  }
  assert.match(await (await call(B + 'editor/', { headers: { accept: 'text/html' } })).text(), /<form id="f"/, 'the sign-in page is shown');
  for (const [m, p] of [['GET', 'api/editor/me'], ['GET', 'api/editor/layout/demo'], ['PUT', 'api/editor/layout/demo/draft'], ['POST', 'api/editor/layout/demo/publish'], ['GET', 'api/editor/library'], ['PUT', 'api/editor/library/x'], ['DELETE', 'api/editor/library/x']]) {
    const r = await call(B + p, { method: m, headers: H, body: m === 'GET' || m === 'DELETE' ? undefined : '{}' });
    assert.equal(r.status, 401, m + ' ' + p);
  }
  assert.equal((await call(B + 'index.html')).status, 200, 'the game itself stays public');
});

test('a wrong password, an unknown user, and a missing header are all refused', async () => {
  assert.equal((await login('198.51.100.2', 'wrong wrong wrong')).status, 401);
  assert.equal((await login('198.51.100.2', S.password, 'nobody')).status, 401);
  assert.equal((await call(B + 'api/editor/login', { method: 'POST', body: JSON.stringify({ user: S.user, password: S.password }) })).status, 403, 'a form posted from another site has no X-Editor header');
  assert.equal((await call(B + 'api/editor/login', { method: 'GET' })).status, 405);
});

test('guessing is rationed per address, and signing in resets only that address', async () => {
  for (let i = 0; i < 6; i++) assert.equal((await login('198.51.100.9', 'nope nope nope' + i)).status, 401);
  assert.equal((await login('198.51.100.9')).status, 429, 'locked out even with the right password');
  assert.equal((await login('198.51.100.10')).status, 200, 'another address is not');
});

test('signing in gives a cookie that unlocks the editor', async () => {
  const r = await login(); assert.equal(r.status, 200);
  const sc = r.headers.getSetCookie()[0]; assert.match(sc, /HttpOnly/); assert.match(sc, /Secure/); assert.match(sc, /SameSite=Strict/); assert.match(sc, /Path=\/case-in-a-nutshell\//);
  cookie = sc.split(';')[0];
  const page = await call(B + 'editor/', as({ headers: { accept: 'text/html' } }));
  assert.equal(page.status, 200); assert.match(await page.text(), /EDITOR/); assert.match(page.headers.get('cache-control'), /private/);
  assert.match((await call(B + 'editor/assets/engine.js', as())).headers.get('content-type'), /javascript/);
  assert.equal((await call(B + 'editor', as())).status, 308, 'a missing slash is added');
  assert.equal((await (await call(B + 'api/editor/me', as({ headers: H }))).json()).user, S.user);
});

test('a forged, altered, expired or revoked cookie does not work', async () => {
  const get = (c) => call(B + 'api/editor/me', { headers: { ...H, cookie: c } });
  const [payload, sig] = cookie.replace('nutshell_editor=', '').split('.');
  assert.equal((await get('nutshell_editor=' + payload + '.' + sig.slice(0, -2) + 'AA')).status, 401, 'altered signature');
  const forged = Buffer.from(JSON.stringify({ u: S.user, exp: 9999999999 })).toString('base64url');
  assert.equal((await get('nutshell_editor=' + forged + '.' + sig)).status, 401, 'a payload with the old signature');
  assert.equal((await get('nutshell_editor=garbage')).status, 401);
  const old = await makeSession(S.env, S.user, Date.now() - 13 * 3600 * 1000);
  assert.equal(await readSession(new Request('http://x/', { headers: { cookie: 'nutshell_editor=' + old } }), S.env), null, 'expired after 12 hours');
  const users = S.env.EDITOR_USERS; S.env.EDITOR_USERS = '{}';
  assert.equal((await get(cookie)).status, 401, 'a user taken out of EDITOR_USERS is out at once'); S.env.EDITOR_USERS = users;
  assert.equal((await get(cookie)).status, 200);
});

test('writes need the X-Editor header as well as the cookie', async () => {
  const r = await call(B + 'api/editor/layout/demo/draft', as({ method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ doc: doc() }) }));
  assert.equal(r.status, 403);
});

test('drafts, publishing, versions, and what the public sees', async () => {
  const get = async (p) => (await call(B + p, as({ headers: H }))).json();
  const send = (p, m, body) => call(B + p, as({ method: m, headers: H, body: JSON.stringify(body) }));
  assert.match(await (await call(B + 'api/layout/demo.js')).text(), /no published layout/, 'nothing published: an empty script, not an error');
  assert.equal((await call(B + 'api/layout/demo.json')).status, 404);
  assert.equal((await send('api/editor/layout/demo/draft', 'PUT', { doc: doc(), label: 'first' })).status, 200);
  let g = await get('api/editor/layout/demo'); assert.equal(g.draft.doc.rooms.living.objects[0].id, 'table'); assert.equal(g.published, null); assert.equal(g.draft.author, S.user);
  assert.match(await (await call(B + 'api/layout/demo.js')).text(), /no published layout/, 'a draft is not public');
  const d2 = doc('demo', { size: [8, 6] }); d2.rooms.living.objects[0].cell = [4, 4];
  assert.equal((await send('api/editor/layout/demo/publish', 'POST', { doc: d2, label: 'v1' })).status, 200);
  const js = await (await call(B + 'api/layout/demo.js')).text();
  const sandbox = { window: {} }; vm.runInNewContext(js, sandbox);
  assert.equal(JSON.stringify(sandbox.window.NUT_PUBLISHED.demo.rooms.living.objects[0].cell), '[4,4]', 'the game gets the published layout as a script');
  assert.equal((await call(B + 'api/layout/demo.js')).headers.get('x-content-type-options'), 'nosniff');
  assert.equal((await (await call(B + 'api/layout/demo.json')).json()).version, 1);
  g = await get('api/editor/layout/demo'); assert.equal(g.published.label, 'v1'); assert.equal(g.versions[0].status, 'published'); assert.equal(g.versions.length, 2);
  const v = await get('api/editor/layout/demo/version/' + g.versions[1].id); assert.equal(v.doc.rooms.living.objects[0].cell[0], 3, 'an older version can be read back');
  assert.equal((await call(B + 'api/editor/layout/demo/version/99999', as({ headers: H }))).status, 404);
  for (let i = 0; i < 30; i++) await send('api/editor/layout/demo/draft', 'PUT', { doc: doc() });
  assert.equal(S.env.DB.raw.prepare("SELECT COUNT(*) AS n FROM nutshell_layouts WHERE slug = 'demo' AND status = 'draft'").get().n, 25, 'only the last 25 drafts are kept');
  assert.equal(S.env.DB.raw.prepare("SELECT COUNT(*) AS n FROM nutshell_layouts WHERE slug = 'demo' AND status = 'published'").get().n, 1, 'published versions are never pruned');
  assert.equal((await send('api/editor/layout/demo/draft', 'POST', { doc: doc() })).status, 405, 'draft is a PUT, publish is a POST');
});

test('only plain layout data is accepted', async () => {
  const send = async (body, slug = 'demo') => call(B + `api/editor/layout/${slug}/draft`, as({ method: 'PUT', headers: H, body: typeof body === 'string' ? body : JSON.stringify(body) }));
  const bad = async (d, why, slug) => { const r = await send({ doc: d }, slug); assert.equal(r.status, 422, why); return (await r.json()).error; };
  await bad({ ...doc(), extra: 1 }, 'an unknown top-level field');
  await bad(doc('other'), 'a layout of another case');
  await bad({ ...doc(), version: 2 }, 'another version');
  await bad({ version: 1, rooms: { living: { objects: [{ id: 'a', type: 't', cell: [1e9, 1], footprint: [1, 1] }] } } }, 'a far-away cell');
  await bad({ version: 1, rooms: { living: { objects: [{ id: 'a', type: 't', cell: [1, 1], footprint: [1, 1], onclick: 'x' }] } } }, 'an unknown record field');
  await bad({ version: 1, rooms: { living: { objects: [{ id: 'a b', type: 't', cell: [1, 1], footprint: [1, 1] }] } } }, 'a bad id');
  await bad({ version: 1, rooms: { living: { objects: [{ id: 'a', type: 't', cell: [1, 1], footprint: [1, 1], props: { x: 'y'.repeat(61) } }] } } }, 'a long string in props');
  await bad({ version: 1, rooms: { living: { objects: [{ id: 'a', type: 't', cell: [1, 1], footprint: [1, 1], props: { x: { y: 1 } } }] } } }, 'a nested value in props');
  await bad({ version: 1, rooms: { living: { room: { pal: { floorA: 'red' } } } } }, 'a colour that is not a hex colour');
  await bad({ version: 1, sprites: { s: { w: 2, h: 2, ax: 0, ay: 0, fp: [1, 1], pal: ['#ffffff'], px: '0123' } }, rooms: {} }, 'a pixel outside the palette');
  await bad({ version: 1, sprites: { s: { w: 2, h: 2, ax: 0, ay: 0, fp: [1, 1], pal: ['#ffffff'], px: '01' } }, rooms: {} }, 'pixels that do not fill the picture');
  await bad({ version: 1, sprites: { s: { w: 500, h: 2, ax: 0, ay: 0, fp: [1, 1], pal: ['#ffffff'], px: '0' } }, rooms: {} }, 'a huge picture');
  await bad({ version: 1, rooms: { living: { objects: Array.from({ length: 400 }, (_, i) => ({ id: 'o' + i, type: 't', cell: [1, 1], footprint: [1, 1] })) } } }, 'too many objects');
  await bad({ version: 1, rooms: { living: { objects: [{ id: 'a', type: 't', cell: [1, 1], footprint: [1, 1], props: { note: 'z'.repeat(50) } }], wall: [{ key: 'L:x', wall: 'Q', name: 'x', span: [1, 2], z: [0, 3] }] } } }, 'a wall that is neither left nor right');
  assert.equal((await send('{not json')).status, 400);
  assert.equal((await send({ doc: doc() }, 'Bad_Slug')).status, 404, 'a slug with capitals or odd characters is not a route');
  assert.equal((await send({ doc: doc() })).status, 200, 'and a good one still goes through');
  // every layout file of the game is accepted
  const dir = process.env.NUTSHELL_GAME_DIR; if (dir) for (const f of fs.readdirSync(path.join(dir, 'src/cases'))) { const p = path.join(dir, 'src/cases', f, 'layout.json'); if (fs.existsSync(p)) { const d = JSON.parse(fs.readFileSync(p, 'utf8')); assert.doesNotThrow(() => validateDoc(d, d.case), f); } }
});

test('the picture library', async () => {
  const send = (p, m, body) => call(B + p, as({ method: m, headers: H, body: body === undefined ? undefined : JSON.stringify(body) }));
  const spec = { name: 'tree', w: 2, h: 2, ax: 1, ay: 1, fp: [1, 1], pal: ['#4f9a5b'], px: '1101' };
  assert.equal((await send('api/editor/library/tree', 'PUT', { spec })).status, 200);
  assert.deepEqual((await (await send('api/editor/library', 'GET')).json()).sprites.tree.px, '1101');
  assert.equal((await send('api/editor/library/tree', 'PUT', { spec: { ...spec, px: '9999' } })).status, 422);
  assert.equal((await send('api/editor/library/tree', 'DELETE')).status, 200);
  assert.deepEqual((await (await send('api/editor/library', 'GET')).json()).sprites, {});
});

test('logging out ends the session in the browser', async () => {
  const r = await call(B + 'api/editor/logout', as({ method: 'POST', headers: H }));
  assert.match(r.headers.getSetCookie()[0], /Max-Age=0/);
});

test('paths that are not the editor fall through to the static files', async () => {
  assert.equal((await call(B + 'assets/engine.js')).status, 200);
  assert.equal((await call('/pixels-of-the-mist/x')).status, 404);
});
