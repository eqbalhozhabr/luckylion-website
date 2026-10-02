import { backupToGithub } from './github-backup.js';

export async function runDailyBackup(env) {
  const users = await env.DB.prepare(
    'SELECT id, email, username, created_at FROM users'
  ).all();
  const unlocks = await env.DB.prepare(
    'SELECT user_id, stage, source, created_at FROM unlocks'
  ).all();

  // Blind Eye progress (the table may not exist yet if nobody has synced; that is fine)
  const blindEye = await env.DB.prepare('SELECT user_id, data, updated_at FROM blind_eye_progress').all().catch(() => ({ results: [] }));

  await backupToGithub(env, {
    exported_at: new Date().toISOString(),
    users: users.results,
    unlocks: unlocks.results,
    blind_eye_progress: blindEye.results,
  });
}
