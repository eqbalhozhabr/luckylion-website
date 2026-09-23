import { requestLink, verify, me, setUsername, logout } from './routes/auth.js';
import { getLevel, submit } from './routes/game.js';
import { json } from './lib/http.js';
import { runDailyBackup } from './lib/backup.js';

// Cloudflare serves a matching static file before this Worker ever runs
// (run_worker_first defaults to false - see wrangler.jsonc), so everything
// below only has to handle paths with no file on disk: /api/*.
const ROUTES = [
  ['POST', '/api/auth/request-link', requestLink],
  ['GET', '/api/auth/verify', verify],
  ['GET', '/api/auth/me', me],
  ['POST', '/api/auth/username', setUsername],
  ['POST', '/api/auth/logout', logout],
  ['GET', '/api/level', getLevel],
  ['POST', '/api/submit', submit],
];

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (!url.pathname.startsWith('/api/')) return env.ASSETS.fetch(request);

    for (const [method, path, handler] of ROUTES) {
      if (request.method === method && url.pathname === path) {
        try {
          return await handler(request, env);
        } catch (err) {
          console.error(err);
          return json({ error: 'internal_error' }, { status: 500 });
        }
      }
    }
    return json({ error: 'not_found' }, { status: 404 });
  },

  // Fired daily by the cron trigger in wrangler.jsonc - exports the D1
  // tables that hold real account data (users, unlocks) to GitHub, so
  // losing the D1 database wouldn't mean losing who's registered or what
  // they've unlocked.
  async scheduled(event, env, ctx) {
    ctx.waitUntil(runDailyBackup(env));
  },
};
