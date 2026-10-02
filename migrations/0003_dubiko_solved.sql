-- Dubiko ranking: one row per (player, level) the server has checked and found solved.
-- Only logged-in players are listed; the row is written after the Worker re-validates the
-- submitted city against the level's rules (worker/routes/dubiko.js), never on a bare claim.
CREATE TABLE dubiko_solved (
  user_id TEXT NOT NULL REFERENCES users(id),
  lvl INTEGER NOT NULL,
  solved_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, lvl)
);
CREATE INDEX idx_dubiko_solved_user ON dubiko_solved(user_id, solved_at);
