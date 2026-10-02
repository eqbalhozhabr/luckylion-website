-- Blind Eye: level progress per account (see public/blind-eye/ and worker/routes/blindeye.js).
-- One row per user; `data` is a small JSON document: { best: {"<level id>": {stars, moves}}, intro: {...}, last: <level index> }.
-- The Worker also creates this table on first use (CREATE TABLE IF NOT EXISTS), so applying this migration is optional but harmless.
CREATE TABLE IF NOT EXISTS blind_eye_progress (
  user_id TEXT PRIMARY KEY REFERENCES users(id),
  data TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);
