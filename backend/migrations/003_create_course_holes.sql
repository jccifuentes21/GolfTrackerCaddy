CREATE TABLE course_holes (
  id TEXT PRIMARY KEY,
  tee_id TEXT NOT NULL REFERENCES tees(id) ON DELETE CASCADE,
  hole_number INT NOT NULL,
  par INT NOT NULL,
  yardage INT NOT NULL,
  handicap INT NOT NULL,
  -- prevents duplicate course holes on the same set of tees (shouldn't happen)
  UNIQUE (tee_id, hole_number)
);