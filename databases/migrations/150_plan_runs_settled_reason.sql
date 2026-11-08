-- plan_runs.settled_reason: why a scheduled run settled without starting.
--
-- The fire-time policy settles a SCHEDULED run MISSED (too late), SUPERSEDED (the plan already had
-- an active run) or SKIPPED (nothing runnable was left). Until now the reason existed only in an
-- ephemeral notification, so run history showed a bare status. The decision's human reason is now
-- stored on the row.
--
-- SKIPPED is a new plain TEXT status value: plan_runs.status carries no CHECK, so there is no
-- constraint DDL beyond the refreshed column comment. A scheduled run that fires with nothing to
-- run used to settle COMPLETED, which read like a successful run; older rows keep that status.

ALTER TABLE plan_runs ADD COLUMN IF NOT EXISTS settled_reason TEXT NULL;

COMMENT ON COLUMN plan_runs.settled_reason IS 'Why a scheduled run settled without starting: the fire-time policy''s human-readable reason for a MISSED, SUPERSEDED or SKIPPED run. NULL for every other run, and for runs settled before migration 150.';
COMMENT ON COLUMN plan_runs.status IS 'Run lifecycle (plain TEXT, no CHECK): SCHEDULED (a run scheduled for scheduled_for; a delayed job is waiting and the run holds no worktree until it fires), QUEUED (job enqueued, possibly delayed), IN_PROGRESS (executing), COMPLETED, FAILED, CANCELLED, STALE (contact lost; set only by the stale sweeper or a human escape hatch), USAGE_LIMITED (the run stopped cleanly because the agent account hit a subscription usage limit; terminal for this row, a continuation run may have been enqueued -- see resume_of_run_id), MISSED (a scheduled run that could not fire within the 1-hour grace window; terminal), SUPERSEDED (a scheduled run held at fire time because the plan already had an active run; terminal, never double-runs a plan), SKIPPED (a scheduled run that fired with nothing runnable left; terminal, the run never started -- see settled_reason).';
