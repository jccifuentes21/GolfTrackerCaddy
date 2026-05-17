-- tees stores playable tee sets for a course.
-- This is a separate table because yardage, par, course rating, and slope vary by tee.
CREATE TABLE tees (
  id TEXT PRIMARY KEY,
  -- This foreign key enforces that every tee belongs to a real course.
  -- ON DELETE CASCADE removes child tees when a cached course is removed.
  course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  tee_name TEXT NOT NULL,
  course_rating DECIMAL(4, 1) NOT NULL,
  slope_rating INT NOT NULL,
  total_yards INT NOT NULL,
  par INT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  -- The API can repeat tee names across male and female groups, so one course should only
  -- have one row for a given tee name.
  UNIQUE (course_id, tee_name)
);

