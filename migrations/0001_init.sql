-- Pixels of the Mist: accounts + real chapter-unlock enforcement.
--
-- Guests need no row here at all - they only ever touch free chapters, which
-- the API never gates. A row only exists once someone actually logs in.

CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  username TEXT UNIQUE,
  created_at INTEGER NOT NULL
);

-- One row per "send me a login link" request. Short-lived and single-use;
-- never reused as a long-lived credential.
CREATE TABLE magic_links (
  token TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  used_at INTEGER
);
CREATE INDEX idx_magic_links_email ON magic_links(email);

-- A logged-in session, looked up on every /api/* request that needs to know
-- who's asking. The cookie holds only this opaque token, never the user id.
CREATE TABLE sessions (
  token TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE INDEX idx_sessions_user_id ON sessions(user_id);

-- What a user has actually unlocked, and how. 'stage' matches CHAPTERS'
-- own stage numbers in mist.html. Empty today (nothing is purchasable yet) -
-- this table is what /api/level checks once a chapter's unlock ever becomes
-- {type:'purchase'}.
CREATE TABLE unlocks (
  user_id TEXT NOT NULL REFERENCES users(id),
  stage INTEGER NOT NULL,
  source TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, stage)
);
