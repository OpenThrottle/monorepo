-- Give the batch 5 work-ledger tables the BaseHardDeleteModel shape
-- (@openthrottle/nestjs-postgres): a uuidv7 `id` default and a `created_at`, with no
-- soft-delete column. The work ledger is append-only history, so a row is never
-- user-deleted; the only deletes are FK cascades from a removed session, plan or task.
-- Batch 5 of moving the entities into @openthrottle/nestjs-repositories-server
-- (OT plan ed353f0e-e25d-4776-860f-7184c12b1dd7).
--
-- Existing ids are untouched; only rows inserted from now on get a uuidv7.
-- work_sessions and work_artifacts already have `created_at` (068). Neither gets an
-- `updated_at`: their few in-place writes (closing a session, verifying an artifact)
-- each stamp their own lifecycle column (`ended_at`, `verified_at`).

ALTER TABLE work_sessions ALTER COLUMN id SET DEFAULT uuidv7();
ALTER TABLE work_session_subjects ALTER COLUMN id SET DEFAULT uuidv7();
ALTER TABLE work_artifacts ALTER COLUMN id SET DEFAULT uuidv7();

-- `created_at` is the insert time every base model shares. work_session_subjects
-- already records it as `attached_at`, which stays: its consumers and queries keep
-- reading it. The new column is backfilled from it, so the two agree for every existing
-- row. Added nullable, backfilled, then constrained, so a re-run is a no-op.

ALTER TABLE work_session_subjects ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE;
UPDATE work_session_subjects SET created_at = attached_at WHERE created_at IS NULL;
ALTER TABLE work_session_subjects ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE work_session_subjects ALTER COLUMN created_at SET NOT NULL;

COMMENT ON COLUMN work_session_subjects.created_at IS
  'When this row was inserted; equals attached_at, kept for the shared BaseHardDeleteModel shape';
