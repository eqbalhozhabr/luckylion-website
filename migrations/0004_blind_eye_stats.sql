-- Blind Eye: anonymous play statistics and level reports (worker/routes/blindeye-stats.js).
-- Not linked to accounts: `aid` is a random id the browser keeps for itself. The Worker also creates these tables on first use.
CREATE TABLE IF NOT EXISTS blind_eye_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  rcv INTEGER NOT NULL, ts INTEGER NOT NULL, aid TEXT NOT NULL, sid TEXT NOT NULL, ev TEXT NOT NULL,
  lvl INTEGER, ms INTEGER, moves INTEGER, par INTEGER, props TEXT, build TEXT, lang TEXT, phone INTEGER,
  test INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_be_ev ON blind_eye_events(ev, lvl);
CREATE INDEX IF NOT EXISTS idx_be_aid ON blind_eye_events(aid, rcv);
CREATE TABLE IF NOT EXISTS blind_eye_reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  rcv INTEGER NOT NULL, aid TEXT NOT NULL, lvl INTEGER NOT NULL, kind TEXT NOT NULL, note TEXT, build TEXT, lang TEXT,
  test INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_be_rep ON blind_eye_reports(lvl, kind);
