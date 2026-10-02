-- Blind Eye: level progress per account (see public/blind-eye/ and worker/routes/blindeye.js).
-- One row per user; `data` is a small JSON document: { best: {"<level id>": {stars, moves}}, intro: {...}, last: <level index> }.
-- The Worker also creates this table on first use (CREATE TABLE IF NOT EXISTS), so applying this migration is optional but harmless.
CREATE TABLE IF NOT EXISTS blind_eye_progress (
  user_id TEXT PRIMARY KEY REFERENCES users(id),
  data TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Leaderboard: one row per player (total stars, levels cleared); `hidden` = the player left the board.
CREATE TABLE IF NOT EXISTS blind_eye_scores (
  user_id TEXT PRIMARY KEY REFERENCES users(id),
  stars INTEGER NOT NULL,
  levels INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  hidden INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_blind_eye_scores_rank ON blind_eye_scores(hidden, stars DESC);
