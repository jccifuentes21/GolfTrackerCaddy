CREATE TABLE tees (
  id TEXT PRIMARY KEY,
  -- Foreing key (constraint basically) that will delete the tee if the course is deleted
  course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  tee_name TEXT NOT NULL,
  course_rating DECIMAL(4, 1) NOT NULL,
  slope_rating INT NOT NULL,
  total_yards INT NOT NULL,
  par INT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  -- handles deduplication of tees as gender can repeat tee names
  UNIQUE (course_id, tee_name)
);

