-- Add optional summary (TEXT) to tasks for per-task wrap-up: actions, usage notes, or why blocked.
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS summary TEXT;
