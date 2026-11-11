-- Recompute daily_stats completion columns after the completed_at re-dates in
-- migrations 057 (plan_output_stream) and 058 (git commit dates).
--
-- Same recompute shape as migration 056: zero the completion columns, then
-- upsert UTC-day buckets of completed_at. Inherently idempotent — it derives
-- entirely from the current completed_at values, so re-running reproduces the
-- same result. Touches ONLY plans_completed / tasks_completed; created/updated
-- counts and the *_by_status rollups are left as-is. Does not touch plans/tasks,
-- so their updated_at is unaffected.

UPDATE daily_stats
SET
  plans_completed = 0,
  tasks_completed = 0;

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
