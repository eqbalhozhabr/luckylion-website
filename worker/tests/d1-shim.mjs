// Just enough of Cloudflare D1's interface on top of Node's built-in SQLite, so the Worker's routes can be tested without Cloudflare.
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export function makeDb(migrations = ['0006_nutshell_editor.sql']) {
  const db = new DatabaseSync(':memory:');
  const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'migrations');
  for (const m of migrations) db.exec(fs.readFileSync(path.join(dir, m), 'utf8'));
  const stmt = (sql, args = []) => ({
    bind: (...a) => stmt(sql, a),
    first: async () => db.prepare(sql).get(...args) || null,
    all: async () => ({ results: db.prepare(sql).all(...args) }),
    run: async () => { const r = db.prepare(sql).run(...args); return { meta: { last_row_id: Number(r.lastInsertRowid), changes: r.changes } }; }
  });
  return { prepare: (sql) => stmt(sql), raw: db };
}
