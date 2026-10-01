-- Dubiko: anonymous play statistics (see public/dubiko/ and worker/routes/dubiko.js).
--
-- One row per event. `aid` is a random id the browser keeps for itself - it is not linked to an
-- account, an email or an IP address, and none of those is stored here.
CREATE TABLE dubiko_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  rcv INTEGER NOT NULL,        -- when the server got it (ms)
  ts INTEGER NOT NULL,         -- when the browser says it happened (ms), clamped near rcv
  aid TEXT NOT NULL,
  sid TEXT NOT NULL,
  ev TEXT NOT NULL,
  lvl INTEGER,
  ms INTEGER,
  props TEXT,                  -- small JSON: hints, errs, moves, step, ...
  build TEXT,
  lang TEXT,
  phone INTEGER,
  test INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX idx_dubiko_ev ON dubiko_events(ev, lvl);
CREATE INDEX idx_dubiko_aid ON dubiko_events(aid, rcv);
