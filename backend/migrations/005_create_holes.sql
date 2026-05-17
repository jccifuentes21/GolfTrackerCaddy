-- holes stores the user's score and stats for each hole in a played round.
-- This table is separate from course_holes because these values change every round.
CREATE TABLE holes (
  id TEXT PRIMARY KEY,
  -- If a round is deleted, its entered hole stats should be deleted with it.
  round_id TEXT NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
  hole_number INT NOT NULL,
  score INT NOT NULL,
  fairway_hit BOOLEAN NOT NULL,
  GIR BOOLEAN NOT NULL,
  putts INT NOT NULL,
  miss_direction TEXT NOT NULL,
  -- One round should only have one score entry for each hole number.
  -- The store relies on this constraint for upsert behavior.
  UNIQUE (round_id, hole_number)
);