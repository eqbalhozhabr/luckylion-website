// Mirrors CHAPTERS in mist.html - the client's own copy is what draws the
// lock icons, this one is what actually enforces them. Keep the two in sync
// by hand; there are only ten entries and they change rarely. A stage this
// list doesn't even mention (5-10 today) is unbuilt, not just locked, so it
// is refused the same as 'dev'.
const CHAPTERS = {
  1: null,
  2: { type: 'dev' },
  3: { type: 'dev' },
  4: { type: 'dev' },
};

// db is optional: only 'purchase' needs to look anything up, and callers
// that already know they're not checking a purchase (nothing uses that type
// yet) can omit it.
export async function stageAllowed(db, stage, userId) {
  const unlock = CHAPTERS[stage];
  if (unlock === undefined) return false; // not a real chapter at all
  if (unlock === null) return true; // free
  if (unlock.type === 'purchase') {
    if (!userId || !db) return false;
    const row = await db
      .prepare('SELECT 1 FROM unlocks WHERE user_id = ? AND stage = ?')
      .bind(userId, stage)
      .first();
    return !!row;
  }
  return false; // 'dev', 'complete', or anything else: not publicly playable
}
