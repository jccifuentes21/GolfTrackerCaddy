-- rounds is the parent table for user-entered play.
-- It references a tee, not only a course, because the tee determines yardage, par, and rating.
CREATE TABLE rounds (
  id TEXT PRIMARY KEY,
  -- ON DELETE RESTRICT protects user history from disappearing if tee metadata is removed.
  tee_id TEXT NOT NULL REFERENCES tees(id) ON DELETE RESTRICT,
  date DATE NOT NULL,
  -- input_mode records the UX flow used to enter the round: live, front/back, or full.
  input_mode TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);