-- Scheduled plan runs.
--
-- A plan run can now be scheduled for a later instant from the Plan Details run dialog (or the
-- MCP). A scheduled run IS a plan_runs row -- status SCHEDULED plus a delayed BullMQ job, reusing
-- the usage-limit-resume machinery -- rather than a separate table, so it inherits the frozen
-- run_config_snapshot, run history and cancel.
--
-- scheduled_for is an ABSOLUTE UTC instant. There is deliberately no timezone column: a one-off
-- instant needs none (unlike the recurring cron jobs in scheduled_agent_jobs); the browser picks
-- and displays it in its local zone.
--
-- The new statuses SCHEDULED / MISSED / SUPERSEDED are plain TEXT values -- plan_runs.status
-- carries no CHECK -- so there is no DDL for them beyond the refreshed column comment.
--
-- The partial index serves the boot reconcile, which scans only SCHEDULED rows by fire time.

ALTER TABLE plan_runs ADD COLUMN IF NOT EXISTS scheduled_for TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS plan_runs_scheduled_status_scheduled_for_idx
  ON plan_runs (status, scheduled_for)
  WHERE status = 'SCHEDULED';

COMMENT ON COLUMN plan_runs.status IS 'Run lifecycle (plain TEXT, no CHECK): SCHEDULED (a run scheduled for scheduled_for; a delayed job is waiting and the run holds no worktree until it fires), QUEUED (job enqueued, possibly delayed), IN_PROGRESS (executing), COMPLETED, FAILED, CANCELLED, STALE (contact lost; set only by the stale sweeper or a human escape hatch), USAGE_LIMITED (the run stopped cleanly because the agent account hit a subscription usage limit; terminal for this row, a continuation run may have been enqueued -- see resume_of_run_id), MISSED (a scheduled run that could not fire within the 1-hour grace window; terminal), SUPERSEDED (a scheduled run held at fire time because the plan already had an active run; terminal, never double-runs a plan).';
COMMENT ON COLUMN plan_runs.scheduled_for IS 'The absolute UTC instant a SCHEDULED run fires at. Set only on runs created by schedulePlanRun and kept after the row settles, so run history still shows when it was meant to fire. NULL for every run that was enqueued to run now.';
