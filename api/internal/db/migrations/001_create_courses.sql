-- courses caches course identity and location data from the external Golf Course API.
-- The API's course id is stored as TEXT so the app can preserve upstream identity directly.
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