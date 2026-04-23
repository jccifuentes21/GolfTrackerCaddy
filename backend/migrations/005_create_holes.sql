CREATE TABLE holes (
  id TEXT PRIMARY KEY,
  round_id TEXT NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
  hole_number INT NOT NULL,
  score INT NOT NULL,
  fairway_hit BOOLEAN NOT NULL,
  GIR BOOLEAN NOT NULL,
  putts INT NOT NULL,
  miss_direction TEXT NOT NULL,
  UNIQUE (round_id, hole_number)
);