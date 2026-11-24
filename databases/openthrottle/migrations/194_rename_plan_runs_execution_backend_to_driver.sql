-- Rename plan_runs.execution_backend to plan_runs.driver (OT plan 624a1036, decision Q16).
--
-- The Ralph runner is retired and OT Loop is the only plan runner, so "execution backend" is just the
-- agent CLI driver the run used. The GraphQL surface already says `driver` (the plan-run schema rename);
-- this brings the stored column, its CHECK constraint, its NOT NULL constraint and its index in line.
-- The allowed set is unchanged from migration 156: the openthrottle-drivers DRIVER_IDS.
--
-- plan_runs is the only table with an execution_backend column (migration 038; 087 added branch, model
-- and checkout_id, none of which carry the name).
--
-- Idempotent: every step is guarded, so a re-run is a no-op.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'plan_runs'
      AND column_name = 'execution_backend'
  ) THEN
    ALTER TABLE plan_runs RENAME COLUMN execution_backend TO driver;
  END IF;
END
$$;

-- The named NOT NULL constraint (Postgres 18) keeps the old column name after a rename.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'plan_runs'::regclass
      AND conname = 'plan_runs_execution_backend_not_null'
  ) THEN
    ALTER TABLE plan_runs RENAME CONSTRAINT plan_runs_execution_backend_not_null TO plan_runs_driver_not_null;
  END IF;
END
$$;

ALTER TABLE plan_runs
  DROP CONSTRAINT IF EXISTS plan_runs_execution_backend_check;

ALTER TABLE plan_runs
  DROP CONSTRAINT IF EXISTS plan_runs_driver_check;

ALTER TABLE plan_runs
  ADD CONSTRAINT plan_runs_driver_check
  CHECK (driver IN ('antigravity', 'claude', 'codex', 'cursor', 'grok', 'opencode'));

ALTER INDEX IF EXISTS idx_plan_runs_execution_backend RENAME TO idx_plan_runs_driver;

COMMENT ON COLUMN plan_runs.driver IS 'Agent CLI driver that executed this run, selected once for the whole run. One of the openthrottle-drivers DRIVER_IDS (antigravity, claude, codex, cursor, grok, opencode); enforced by plan_runs_driver_check. Defaults to cursor.';

COMMENT ON TABLE plan_runs IS 'Audit table for plan runs. One row per enqueue or interactive /ot-loop registration, recording the single agent CLI driver selected for the run, its lifecycle status and the resolved run configuration.';
