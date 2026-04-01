-- Add optional summary (TEXT) to plans for PRD summarization: next actions, usage guides, wrap-up notes.
ALTER TABLE plans ADD COLUMN IF NOT EXISTS summary TEXT;
