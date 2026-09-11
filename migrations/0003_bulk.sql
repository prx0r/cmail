-- Beast mode ledger: every bulk run persisted so P(hit | rules) compounds.
CREATE TABLE IF NOT EXISTS bulk_runs (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  rules_hash TEXT NOT NULL,
  rules_json TEXT NOT NULL DEFAULT '{}',
  total INTEGER NOT NULL DEFAULT 0,
  hits INTEGER NOT NULL DEFAULT 0,
  hit_rate REAL NOT NULL DEFAULT 0,
  results_json TEXT NOT NULL DEFAULT '[]'
);
CREATE INDEX IF NOT EXISTS idx_bulk_runs_hash ON bulk_runs(rules_hash);
