-- Usage-limit awareness for plan runs.
--
-- A Claude subscription usage limit (5-hour / weekly window) stops a Ralph run mid-plan. The run is
-- now settled with the new terminal status USAGE_LIMITED -- a plain TEXT value, plan_runs.status
-- carries no CHECK, so there is no DDL for the value itself -- and, when the reset is near, the
-- plans worker enqueues a delayed continuation run. These columns record the limit that stopped the
-- run and link the continuation back to it.
--
-- resume_of_run_id is the idempotency anchor: the partial UNIQUE index below allows at most ONE
-- continuation per limited run, so a stalled-and-retried job cannot fork the chain. ON DELETE SET
-- NULL (not CASCADE) because deleting an old limited run must not delete its successor.
--
-- The FK is added in its own pg_constraint-guarded statement, never inline with ADD COLUMN IF NOT
-- EXISTS (see skills/ot-postgres/SKILL.md, "Foreign keys").

ALTER TABLE plan_runs ADD COLUMN IF NOT EXISTS usage_limit_resets_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE plan_runs ADD COLUMN IF NOT EXISTS usage_limit_type TEXT;
ALTER TABLE plan_runs ADD COLUMN IF NOT EXISTS resume_of_run_id UUID;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'plan_runs_resume_of_run_id_fkey') THEN
    ALTER TABLE plan_runs ADD CONSTRAINT plan_runs_resume_of_run_id_fkey
      FOREIGN KEY (resume_of_run_id) REFERENCES plan_runs (id) ON DELETE SET NULL;
  END IF;
END
$$;

CREATE UNIQUE INDEX IF NOT EXISTS plan_runs_resume_of_run_id_unique_idx
  ON plan_runs (resume_of_run_id)
  WHERE resume_of_run_id IS NOT NULL;

COMMENT ON COLUMN plan_runs.status IS 'Run lifecycle (plain TEXT, no CHECK): QUEUED (job enqueued, possibly delayed), IN_PROGRESS (executing), COMPLETED, FAILED, CANCELLED, STALE (contact lost; set only by the stale sweeper or a human escape hatch), USAGE_LIMITED (the run stopped cleanly because the agent account hit a subscription usage limit; terminal for this row, a continuation run may have been enqueued -- see resume_of_run_id).';
COMMENT ON COLUMN plan_runs.usage_limit_resets_at IS 'When the usage limit that stopped this run lifts, as reported by the agent CLI. NULL when the run was not usage-limited or the CLI did not report a reset time.';
COMMENT ON COLUMN plan_runs.usage_limit_type IS 'Raw name of the usage-limit window that stopped this run (five_hour, seven_day, ...), kept as TEXT because the agent CLI adds windows over time. NULL when the run was not usage-limited or the window was not reported.';
COMMENT ON COLUMN plan_runs.resume_of_run_id IS 'The usage-limited run this run continues, set on the continuation run the plans worker enqueues after a usage limit. NULL for every ordinary run. The partial UNIQUE index on this column allows at most one continuation per limited run (the idempotency anchor), and walking it backwards bounds how many times a plan is auto-resumed.';
