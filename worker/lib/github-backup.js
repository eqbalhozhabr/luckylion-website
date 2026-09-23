/* Daily backup of the D1 tables that actually matter (see index.js's
 * scheduled handler): user identities and unlocks. Sessions and magic-link
 * tokens are deliberately left out - they're short-lived, regenerable, and
 * committing live auth secrets into git history would be a bigger risk than
 * the thing this backup protects against.
 *
 * Pushed straight to a GitHub repo via the Contents API using a token the
 * account owner creates and sets themselves (GITHUB_BACKUP_TOKEN) - this
 * Worker never has any other GitHub access. */

const OWNER = 'eqbalhozhabr';
const REPO = 'pixels-of-the-mist';
const BRANCH = 'claude/nice-cori-hle1ef';
const PATH = 'backups/d1-export.json';

function toBase64(str) {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

export async function backupToGithub(env, data) {
  if (!env.GITHUB_BACKUP_TOKEN) {
    console.log('[backup] GITHUB_BACKUP_TOKEN not set, skipping');
    return;
  }
  const headers = {
    Authorization: `Bearer ${env.GITHUB_BACKUP_TOKEN}`,
    'User-Agent': 'pixels-of-the-mist-backup-worker',
    Accept: 'application/vnd.github+json',
  };
  const api = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${PATH}`;

  let sha;
  const existing = await fetch(`${api}?ref=${BRANCH}`, { headers });
  if (existing.ok) {
    sha = (await existing.json()).sha;
  } else if (existing.status !== 404) {
    throw new Error(`GitHub backup: lookup failed ${existing.status} ${await existing.text()}`);
  }

  const res = await fetch(api, {
    method: 'PUT',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: `Automated D1 backup ${data.exported_at.slice(0, 10)}`,
      content: toBase64(JSON.stringify(data, null, 2)),
      branch: BRANCH,
      ...(sha ? { sha } : {}),
    }),
  });
  if (!res.ok) throw new Error(`GitHub backup: write failed ${res.status} ${await res.text()}`);
}
