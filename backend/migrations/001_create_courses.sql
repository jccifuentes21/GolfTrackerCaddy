CREATE TABLE courses (
  id TEXT PRIMARY KEY,
  club_name TEXT NOT NULL,
  course_name TEXT NOT NULL,
  address TEXT,
  city TEXT,
  state TEXT,
  country TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);