-- Best-effort backfill of plans/tasks.completed_at + recompute daily_stats
-- completion columns from completed_at (UTC day buckets).
--
-- Caveat: completed_at is copied from updated_at for currently-COMPLETED rows.
-- Past database:migrate runs re-stamped updated_at via BEFORE UPDATE triggers
-- (notably mass UPDATEs in 010/013 before the schema_migrations ledger), so
-- true historical completion dates for those rows are collapsed onto the
-- migrate-run day and are not recoverable. Going forward, app write paths set
-- completed_at once on transition into COMPLETED and do not touch it on edits.
--
-- Triggers are disabled for the backfill UPDATEs so we do not re-stamp
-- updated_at (the same failure mode this column exists to avoid).

-- ---------------------------------------------------------------------------
-- 1. Backfill completed_at (idempotent: only NULL rows)
-- ---------------------------------------------------------------------------

ALTER TABLE plans DISABLE TRIGGER update_plans_updated_at;

UPDATE plans
SET completed_at = updated_at
WHERE status = 'COMPLETED'
  AND completed_at IS NULL
  AND updated_at IS NOT NULL;

ALTER TABLE plans ENABLE TRIGGER update_plans_updated_at;

ALTER TABLE tasks DISABLE TRIGGER update_tasks_updated_at;

UPDATE tasks
SET completed_at = updated_at
WHERE status = 'COMPLETED'
  AND completed_at IS NULL
  AND updated_at IS NOT NULL;

ALTER TABLE tasks ENABLE TRIGGER update_tasks_updated_at;

-- ---------------------------------------------------------------------------
-- 2. Recompute daily_stats.plans_completed / tasks_completed from completed_at
-- ---------------------------------------------------------------------------

-- Zero existing completion columns so phantom updated_at-based spikes clear.
UPDATE daily_stats
SET
  plans_completed = 0,
  tasks_completed = 0;

-- Upsert UTC-day buckets from completed_at. Inserts missing days that only
-- have completions (created/updated stay 0); updates completion counts on
-- existing rows without touching created/updated / by_status rollups.
WITH plan_counts AS (
  SELECT
    (timezone('UTC', completed_at))::date AS d,
    COUNT(*)::integer AS c
  FROM plans
  WHERE completed_at IS NOT NULL
  GROUP BY 1
),
task_counts AS (
  SELECT
    (timezone('UTC', completed_at))::date AS d,
    COUNT(*)::integer AS c
  FROM tasks
  WHERE completed_at IS NOT NULL
  GROUP BY 1
),
all_dates AS (
  SELECT d FROM plan_counts
  UNION
  SELECT d FROM task_counts
)
INSERT INTO daily_stats (date, plans_completed, tasks_completed)
SELECT
  ad.d,
  COALESCE(pc.c, 0),
  COALESCE(tc.c, 0)
FROM all_dates ad
LEFT JOIN plan_counts pc ON pc.d = ad.d
LEFT JOIN task_counts tc ON tc.d = ad.d
ON CONFLICT (date) DO UPDATE SET
  plans_completed = EXCLUDED.plans_completed,
  tasks_completed = EXCLUDED.tasks_completed;
