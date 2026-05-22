-- fairway_miss tracks which direction a tee shot missed the fairway.
-- Only meaningful when fairway_hit = false. 'none' is the default (no miss to record, or par 3).
-- green_miss replaces the original miss_direction column — clearer name now that fairway_miss exists alongside it.
-- penalties tracks stroke-and-distance or lateral penalties taken on the hole.
ALTER TABLE holes
  RENAME COLUMN miss_direction TO green_miss;

ALTER TABLE holes
  ADD COLUMN fairway_miss TEXT NOT NULL DEFAULT 'none',
  ADD COLUMN penalties INT NOT NULL DEFAULT 0;
