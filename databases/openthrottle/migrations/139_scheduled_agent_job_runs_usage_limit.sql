-- Usage-limit awareness for scheduled agent job runs.
--
-- A Claude subscription usage limit (5-hour / weekly window) stops a scheduled run's agent CLI. The
-- run was recorded `failed` ("Agent exited with code N"), indistinguishable from a real failure and
-- never retried. It is now recorded with the new terminal status 'usage_limited' and, when the reset
-- is near and the job's own schedule will not fire first, the processor enqueues a delayed
-- continuation run (trigger 'resume'). These columns record the limit that stopped the run and link
-- the continuation back to it. Mirrors plan_runs (138_plan_runs_usage_limit.sql).
--
-- resume_of_run_id is the idempotency anchor: the partial UNIQUE index below allows at most ONE
-- continuation per limited run. ON DELETE SET NULL (not CASCADE) because deleting an old limited run
-- must not delete its successor.
--
-- The FK is added in its own pg_constraint-guarded statement, never inline with ADD COLUMN IF NOT
-- EXISTS (see skills/ot-postgres/SKILL.md, "Foreign keys"). Both CHECK constraints are dropped and
-- recreated, so the file is idempotent; no existing row changes meaning.

ALTER TABLE scheduled_agent_job_runs
    DROP CONSTRAINT IF EXISTS chk_scheduled_agent_job_runs_status;

ALTER TABLE scheduled_agent_job_runs
    ADD CONSTRAINT chk_scheduled_agent_job_runs_status CHECK (
        status IN ('queued', 'running', 'succeeded', 'failed', 'cancelled', 'no_op', 'usage_limited')
    );

ALTER TABLE scheduled_agent_job_runs
    DROP CONSTRAINT IF EXISTS chk_scheduled_agent_job_runs_trigger;

ALTER TABLE scheduled_agent_job_runs
    ADD CONSTRAINT chk_scheduled_agent_job_runs_trigger CHECK (
        trigger IN ('schedule', 'manual', 'resume')
    );

ALTER TABLE scheduled_agent_job_runs ADD COLUMN IF NOT EXISTS usage_limit_resets_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE scheduled_agent_job_runs ADD COLUMN IF NOT EXISTS usage_limit_type TEXT;
ALTER TABLE scheduled_agent_job_runs ADD COLUMN IF NOT EXISTS resume_of_run_id UUID;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'scheduled_agent_job_runs_resume_of_run_id_fkey') THEN
    ALTER TABLE scheduled_agent_job_runs ADD CONSTRAINT scheduled_agent_job_runs_resume_of_run_id_fkey
      FOREIGN KEY (resume_of_run_id) REFERENCES scheduled_agent_job_runs (id) ON DELETE SET NULL;
  END IF;
END
$$;

CREATE UNIQUE INDEX IF NOT EXISTS scheduled_agent_job_runs_resume_of_run_id_unique_idx
  ON scheduled_agent_job_runs (resume_of_run_id)
  WHERE resume_of_run_id IS NOT NULL;

COMMENT ON COLUMN scheduled_agent_job_runs.status IS 'queued (pre-created by run-now, or a delayed usage-limit resume) -> running (claimed by processor) -> succeeded | no_op | failed | cancelled | usage_limited. Mapped from runAgentPrompt RunAgentStatus, except no_op which comes from the agent-emitted OT_RUN_OUTCOME sentinel (process exited 0 but the agent reported it did not do the work; terminal, NOT an error), and usage_limited, which is set when the agent CLI reported a Claude subscription usage limit (terminal for this row, NOT an error; a continuation run may have been enqueued -- see resume_of_run_id).';
COMMENT ON COLUMN scheduled_agent_job_runs.trigger IS 'schedule = cron fire; manual = run-now; resume = the delayed continuation of a usage_limited run (see resume_of_run_id).';
COMMENT ON COLUMN scheduled_agent_job_runs.usage_limit_resets_at IS 'When the usage limit that stopped this run lifts, as reported by the agent CLI. NULL when the run was not usage-limited or the CLI did not report a reset time.';
COMMENT ON COLUMN scheduled_agent_job_runs.usage_limit_type IS 'Raw name of the usage-limit window that stopped this run (five_hour, seven_day, ...), kept as TEXT because the agent CLI adds windows over time. NULL when the run was not usage-limited or the window was not reported.';
COMMENT ON COLUMN scheduled_agent_job_runs.resume_of_run_id IS 'The usage_limited run this run continues, set on the continuation run the processor enqueues after a usage limit (trigger = resume). NULL for every ordinary run. The partial UNIQUE index on this column allows at most one continuation per limited run (the idempotency anchor), and walking it backwards bounds how many times a job is auto-resumed.';
