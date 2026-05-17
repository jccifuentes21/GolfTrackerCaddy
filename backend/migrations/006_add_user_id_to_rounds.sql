-- user_id prepares rounds for auth ownership.
-- The temporary default keeps the migration safe for existing rows before real auth is wired.
  ALTER TABLE rounds ADD COLUMN user_id TEXT NOT NULL DEFAULT '';