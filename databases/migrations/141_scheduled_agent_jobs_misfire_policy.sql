-- Explicit misfire policy for scheduled agent jobs, and visible "missed" runs.
--
-- A cron fire that comes due while the server is down used to be decided by a boot-order race inside
-- BullMQ (proven in scheduled-agent-jobs.misfire.integration.test.ts): either ONE unbounded-late
-- catch-up ran, or every missed fire was dropped silently. Nothing was ever recorded. Now each job
-- carries a policy, and every fire the policy does not run becomes a run row with status 'missed'.
--
-- misfire_policy:
--   skip          -- a fire more than misfire_threshold_ms late is recorded 'missed' and not run.
--   catch_up_once -- the most recent late fire runs once, however late; earlier ones are 'missed'.
-- Either way a fire within the threshold still runs, and at most one late run ever happens per
-- outage. 'skip' is the default (T3 Code's fixed-time behaviour): a late agent run against a moved-on
-- repository is rarely what anyone wanted.
--
-- scheduled_for is the cron slot a 'schedule'-trigger run belongs to. The partial UNIQUE index makes
-- "one row per slot" a database fact, so the boot reconcile (which records missed slots) and the
-- worker (which may already be processing BullMQ's one surviving overdue job) can never both claim a
-- slot, whichever of them wins the race.
--
-- Idempotent: guarded ADD COLUMNs, CHECKs dropped and recreated, IF NOT EXISTS index. No existing row
-- changes meaning; legacy runs keep scheduled_for NULL and are outside the index.

ALTER TABLE scheduled_agent_jobs ADD COLUMN IF NOT EXISTS misfire_policy TEXT NOT NULL DEFAULT 'skip';
ALTER TABLE scheduled_agent_jobs ADD COLUMN IF NOT EXISTS misfire_threshold_ms INTEGER NOT NULL DEFAULT 600000;

ALTER TABLE scheduled_agent_jobs
    DROP CONSTRAINT IF EXISTS chk_scheduled_agent_jobs_misfire_policy;

ALTER TABLE scheduled_agent_jobs
    ADD CONSTRAINT chk_scheduled_agent_jobs_misfire_policy CHECK (
        misfire_policy IN ('skip', 'catch_up_once')
    );

ALTER TABLE scheduled_agent_jobs
    DROP CONSTRAINT IF EXISTS chk_scheduled_agent_jobs_misfire_threshold_ms;

ALTER TABLE scheduled_agent_jobs
    ADD CONSTRAINT chk_scheduled_agent_jobs_misfire_threshold_ms CHECK (
        misfire_threshold_ms >= 60000
    );

ALTER TABLE scheduled_agent_job_runs
    DROP CONSTRAINT IF EXISTS chk_scheduled_agent_job_runs_status;

ALTER TABLE scheduled_agent_job_runs
    ADD CONSTRAINT chk_scheduled_agent_job_runs_status CHECK (
        status IN ('queued', 'running', 'succeeded', 'failed', 'cancelled', 'no_op', 'usage_limited', 'missed')
    );

ALTER TABLE scheduled_agent_job_runs ADD COLUMN IF NOT EXISTS scheduled_for TIMESTAMP WITH TIME ZONE;

CREATE UNIQUE INDEX IF NOT EXISTS scheduled_agent_job_runs_schedule_slot_unique_idx
  ON scheduled_agent_job_runs (scheduled_agent_job_id, scheduled_for)
  WHERE trigger = 'schedule' AND scheduled_for IS NOT NULL;

COMMENT ON COLUMN scheduled_agent_jobs.misfire_policy IS 'What happens to a cron fire that comes due more than misfire_threshold_ms late (server down, or a backed-up queue): skip = record it as a missed run and do not run it; catch_up_once = run the most recent late fire once, recording any earlier ones as missed. A fire within the threshold always runs. Default skip.';
COMMENT ON COLUMN scheduled_agent_jobs.misfire_threshold_ms IS 'How late (ms after its cron slot) a fire may start and still count as on time. At least 60000 so ordinary queue jitter never trips the policy; default 600000 (10 minutes).';
COMMENT ON COLUMN scheduled_agent_job_runs.status IS 'queued (pre-created by run-now, or a delayed usage-limit resume) -> running (claimed by processor) -> succeeded | no_op | failed | cancelled | usage_limited. Mapped from runAgentPrompt RunAgentStatus, except no_op which comes from the agent-emitted OT_RUN_OUTCOME sentinel (process exited 0 but the agent reported it did not do the work; terminal, NOT an error), and usage_limited, which is set when the agent CLI reported a Claude subscription usage limit (terminal for this row, NOT an error; a continuation run may have been enqueued -- see resume_of_run_id). missed is created terminal: a cron fire the misfire policy did not run (see scheduled_for and scheduled_agent_jobs.misfire_policy); no agent was spawned.';
COMMENT ON COLUMN scheduled_agent_job_runs.scheduled_for IS 'The cron slot this run belongs to, for trigger = schedule (including missed rows). Unique per (scheduled_agent_job_id, scheduled_for) among schedule-trigger rows, so a slot is claimed at most once. NULL for manual and resume runs and for runs recorded before migration 141.';
