-- Attribute skill_usage_events to a user instead of guessing from cwd and
-- branch (OT plan 2ad2ad66).
--
-- The table has carried `session_id` (an agent session string, not a
-- work_sessions FK), `cwd` and `git_branch` since migration 084, but no actor.
-- Consumers that want "who ran this" have had to stand in a cwd/branch
-- heuristic and disclose that it is not user scoping — most recently the
-- /timeline grilling lane.
--
-- Nullable on purpose. Ingest stamps this only when the authenticated
-- principal resolves to a human user (a human JWT, or a service account via
-- its acting_user_id from migration 107). Rows ingested before this column
-- existed, and rows whose principal does not resolve, stay NULL.
--
-- ON DELETE NO ACTION (the default), matching the work_sessions actor FKs in
-- migration 068: users are soft-delete-only (disabled_at) and history must
-- never lose its actor.
--
-- Idempotent: re-running is a no-op. Deliberately performs no backfill.

ALTER TABLE skill_usage_events
    ADD COLUMN IF NOT EXISTS user_id UUID;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'skill_usage_events_user_id_fkey'
      AND conrelid = 'skill_usage_events'::regclass
  ) THEN
    ALTER TABLE skill_usage_events
      ADD CONSTRAINT skill_usage_events_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES users (id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_skill_usage_events_user_id
    ON skill_usage_events (user_id);

COMMENT ON COLUMN skill_usage_events.user_id IS
    'The human user this invocation is attributed to, resolved server-side at ingest from the authenticated principal (a human JWT sub directly; a service account via its acting_user_id). NULL means ingest had no resolvable principal, or the row predates this column — never that no one ran it. Never backfilled by heuristic: a guessed actor is indistinguishable from a recorded one afterwards, whereas a NULL is honest. Consumers must fall back to the cwd/git_branch heuristic when this is NULL rather than dropping the row.';
