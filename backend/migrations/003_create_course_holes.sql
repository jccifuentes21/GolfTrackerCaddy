-- course_holes stores static scorecard data for each tee set.
-- These rows describe the course itself, not how a user played it.
CREATE TABLE course_holes (
  id TEXT PRIMARY KEY,
  -- A tee owns its 18-hole layout. Deleting a tee deletes its static hole metadata too.
  tee_id TEXT NOT NULL REFERENCES tees(id) ON DELETE CASCADE,
  hole_number INT NOT NULL,
  par INT NOT NULL,
  yardage INT NOT NULL,
  handicap INT NOT NULL,
  -- Prevent duplicate hole numbers for the same tee set and enable idempotent imports.
  UNIQUE (tee_id, hole_number)
);