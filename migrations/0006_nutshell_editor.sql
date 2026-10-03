-- Case in a Nutshell layout editor (/case-in-a-nutshell/editor/): layouts of the rooms (drafts and published versions),
-- the library of pictures the editor's users added, and failed sign-ins (to slow guessing down).
CREATE TABLE IF NOT EXISTS nutshell_layouts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('draft', 'published')),
  doc TEXT NOT NULL,
  label TEXT,
  author TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS nutshell_layouts_slug ON nutshell_layouts (slug, status, id);

CREATE TABLE IF NOT EXISTS nutshell_library (
  id TEXT PRIMARY KEY,
  spec TEXT NOT NULL,
  author TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS nutshell_login_attempts (
  ip TEXT NOT NULL,
  at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS nutshell_login_attempts_at ON nutshell_login_attempts (at);
