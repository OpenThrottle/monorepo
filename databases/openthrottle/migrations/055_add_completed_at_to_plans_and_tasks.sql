-- Immutable completion timestamp for daily_stats day-range attribution.
-- Set once in app code on transition into COMPLETED; cleared if status leaves COMPLETED.
-- Do NOT drive this column from update_updated_at_column() / BEFORE UPDATE triggers —
-- migrate-time mass UPDATEs would re-stamp it the same way they corrupt updated_at.
-- No backfill here; see the dedicated backfill + daily_stats recompute task.

ALTER TABLE plans
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE NULL;

ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE NULL;

COMMENT ON COLUMN plans.completed_at IS
  'Set once when status transitions into COMPLETED (app write path only); cleared if status leaves COMPLETED. Immutable to later edits and to BEFORE UPDATE updated_at triggers. Used by daily_stats for day-range completion counts.';

COMMENT ON COLUMN tasks.completed_at IS
  'Set once when status transitions into COMPLETED (app write path only); cleared if status leaves COMPLETED. Immutable to later edits and to BEFORE UPDATE updated_at triggers. Used by daily_stats for day-range completion counts.';

CREATE INDEX IF NOT EXISTS idx_plans_completed_at ON plans (completed_at)
WHERE completed_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_tasks_completed_at ON tasks (completed_at)
WHERE completed_at IS NOT NULL;
