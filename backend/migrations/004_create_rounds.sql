CREATE TABLE rounds (
  id TEXT PRIMARY KEY,
  -- Restrict prevents rounds from being deleted in the case someone tries to delete a set of tees
  tee_id TEXT NOT NULL REFERENCES tees(id) ON DELETE RESTRICT,
  date DATE NOT NULL,
  input_mode TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);