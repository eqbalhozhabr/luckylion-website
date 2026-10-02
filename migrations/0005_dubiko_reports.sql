-- Dubiko: what players say about a level (the "Report level" button). Also created on first use by the Worker.
CREATE TABLE IF NOT EXISTS dubiko_reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  rcv INTEGER NOT NULL,
  aid TEXT NOT NULL,
  lvl INTEGER NOT NULL,
  kind TEXT NOT NULL,          -- too_hard | too_easy | confusing | bug | other
  note TEXT,                   -- <= 200 characters, optional
  build TEXT,
  lang TEXT,
  test INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_dubiko_rep ON dubiko_reports(lvl, kind);
