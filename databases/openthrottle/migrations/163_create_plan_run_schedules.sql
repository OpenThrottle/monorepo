-- Recurring plan runs: plan_run_schedules, plus plan_runs.plan_run_schedule_id.
--
-- A schedule is a recurrence rule for a plan. It materializes exactly ONE future occurrence at a
-- time as an ordinary SCHEDULED plan_runs row (migration 140) that carries plan_run_schedule_id;
-- when that run fires or settles, the next occurrence is materialized. The table holds the rule
-- only; computing slots and materializing runs is application logic.
--
-- Idempotent: table and indexes are IF NOT EXISTS, constraints are added in their own statements
-- guarded on pg_constraint, ADD COLUMN IF NOT EXISTS, the trigger is DROP IF EXISTS + CREATE,
-- COMMENT ON is re-runnable.

CREATE TABLE IF NOT EXISTS plan_run_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id UUID NOT NULL,
    schedule_kind TEXT NOT NULL DEFAULT 'cron',
    cron_pattern TEXT NOT NULL,
    timezone TEXT,
    misfire_policy TEXT NOT NULL DEFAULT 'skip',
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    run_overrides JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_by TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'plan_run_schedules_plan_id_fkey') THEN
    ALTER TABLE plan_run_schedules ADD CONSTRAINT plan_run_schedules_plan_id_fkey
      FOREIGN KEY (plan_id) REFERENCES plans (id) ON DELETE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_plan_run_schedules_schedule_kind') THEN
    ALTER TABLE plan_run_schedules ADD CONSTRAINT chk_plan_run_schedules_schedule_kind
      CHECK (schedule_kind IN ('cron'));
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_plan_run_schedules_misfire_policy') THEN
    ALTER TABLE plan_run_schedules ADD CONSTRAINT chk_plan_run_schedules_misfire_policy
      CHECK (misfire_policy IN ('skip', 'run_once'));
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_plan_run_schedules_plan_id
    ON plan_run_schedules (plan_id);

DROP TRIGGER IF EXISTS update_plan_run_schedules_updated_at ON plan_run_schedules;

CREATE TRIGGER update_plan_run_schedules_updated_at
  BEFORE UPDATE ON plan_run_schedules
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE plan_runs
ADD COLUMN IF NOT EXISTS plan_run_schedule_id UUID;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'plan_runs_plan_run_schedule_id_fkey') THEN
    ALTER TABLE plan_runs ADD CONSTRAINT plan_runs_plan_run_schedule_id_fkey
      FOREIGN KEY (plan_run_schedule_id) REFERENCES plan_run_schedules (id) ON DELETE SET NULL;
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_plan_runs_plan_run_schedule_id
    ON plan_runs (plan_run_schedule_id);

COMMENT ON TABLE plan_run_schedules IS 'Recurrence rules for plan runs. A schedule materializes exactly one future occurrence at a time as an ordinary SCHEDULED plan_runs row (scheduled_for, migration 140) carrying plan_run_schedule_id; when that run fires or settles the next occurrence is materialized. The table stores the rule only; slot computation and materialization live in application code. Deleting the plan deletes its schedules.';

COMMENT ON COLUMN plan_run_schedules.id IS 'Surrogate primary key.';

COMMENT ON COLUMN plan_run_schedules.plan_id IS 'Plan the schedule runs. FK plans(id) ON DELETE CASCADE: a deleted plan takes its schedules with it.';

COMMENT ON COLUMN plan_run_schedules.schedule_kind IS 'How recurrence is expressed. CHECK-constrained to cron today; a new kind is a CHECK change plus a code path.';

COMMENT ON COLUMN plan_run_schedules.cron_pattern IS 'Cron expression for the recurrence, evaluated in timezone. Validated by the application before it is stored.';

COMMENT ON COLUMN plan_run_schedules.timezone IS 'IANA timezone name (e.g. Europe/Berlin) the cron_pattern is evaluated in. NULL means UTC.';

COMMENT ON COLUMN plan_run_schedules.misfire_policy IS 'What to do when an occurrence was missed (server down at fire time): skip drops it and waits for the next slot; run_once fires a single catch-up run. CHECK-constrained; defaults to skip.';

COMMENT ON COLUMN plan_run_schedules.enabled IS 'Whether the schedule keeps materializing occurrences. Disabling stops new occurrences; it does not delete the schedule.';

COMMENT ON COLUMN plan_run_schedules.run_overrides IS 'Per-schedule overrides applied to each materialized run on top of the plan''s run configuration (e.g. backend, model, branch). Opaque JSON object validated by the application; {} means no overrides.';

COMMENT ON COLUMN plan_run_schedules.created_by IS 'GitHub username or principal id of whoever created the schedule. NULL for system-created schedules.';

COMMENT ON COLUMN plan_run_schedules.created_at IS 'When the schedule was created.';

COMMENT ON COLUMN plan_run_schedules.updated_at IS 'Last change to the schedule; maintained by the update_plan_run_schedules_updated_at trigger.';

COMMENT ON COLUMN plan_runs.plan_run_schedule_id IS 'The recurring schedule (plan_run_schedules) that materialized this run; NULL for every run not created by a schedule. FK ON DELETE SET NULL, so deleting a schedule keeps its run history. Kept after the row settles.';
