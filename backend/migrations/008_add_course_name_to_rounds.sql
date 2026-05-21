-- course_name is denormalized onto rounds so list screens can show where the round was played
-- without joining back through tees and courses.
ALTER TABLE rounds ADD COLUMN course_name TEXT NOT NULL DEFAULT '';
