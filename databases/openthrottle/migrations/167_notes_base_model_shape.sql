-- Give `notes` the BaseModel shape (@openthrottle/nestjs-postgres): a `deleted_at`
-- soft-delete marker and a uuidv7 `id` default. First openthrottle table to adopt it,
-- as the pilot for moving the entities into @openthrottle/nestjs-repositories-server
-- (OT plan 052d37b0-f76a-43e1-8a39-4434d0f537d4).
--
-- Existing ids are untouched; only rows inserted from now on get a uuidv7. The
-- `update_notes_updated_at` trigger from 009 stays.

ALTER TABLE notes ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE NULL;

COMMENT ON COLUMN notes.deleted_at IS
  'When this row was soft deleted; NULL for rows that are still live';

ALTER TABLE notes ALTER COLUMN id SET DEFAULT uuidv7();

-- The `notes` query lists live rows newest first; this partial index serves it.
CREATE INDEX IF NOT EXISTS idx_notes_live_created_at
  ON notes (created_at DESC)
  WHERE deleted_at IS NULL;
