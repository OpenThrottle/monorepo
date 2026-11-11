-- Heartbeat + staleness cutoff for stranded IN_PROGRESS plan_runs (OT plan f9fd7c96).
--
-- The sibling plan f6cafff5 made a detached CLI run (and, via the worker path, a
-- BullMQ run) settle its plan_runs row on graceful exit (SIGINT/SIGTERM/beforeExit).
-- A HARD crash that skips the settle path — SIGKILL, laptop sleep/lid-close, power
-- loss, network partition, OOM — strands the row IN_PROGRESS forever with a stale
-- hostname/pid, so the UI keeps offering Kill Run on a process that is already dead.
--
-- This adds a dedicated liveness timestamp the owning run process bumps every ~15s.
-- A dedicated column (NOT updated_at) is required: updated_at is a TypeORM
-- @UpdateDateColumn auto-bumped by unrelated writes, so it cannot distinguish a live
-- heartbeat from an incidental status/marker update — it would report false liveness.
--
-- Readers (the run-display resolver) treat an IN_PROGRESS row whose heartbeat is older
-- than the staleness cutoff (~120s) as dead; a worker-gated sweeper settles such rows
-- to a terminal STALE status and reconciles the stranded plan. The partial index below
-- keeps the sweeper's stale-scan cheap (only IN_PROGRESS rows are ever candidates).

ALTER TABLE plan_runs ADD COLUMN IF NOT EXISTS last_heartbeat_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_plan_runs_inprogress_heartbeat
  ON plan_runs (last_heartbeat_at)
  WHERE status = 'IN_PROGRESS';

COMMENT ON COLUMN plan_runs.last_heartbeat_at IS 'Liveness bump written by the owning run process (detached CLI loop or in-server worker) roughly every 15s while the run executes, and stamped at run start. An IN_PROGRESS row whose heartbeat is older than the staleness cutoff (~120s) is treated as dead: the run-display reader marks it stale (hiding Kill) and the staleness sweeper settles it to STALE and reconciles the plan. Dedicated column (not updated_at, which is auto-bumped by unrelated writes -> false liveness). NULL for legacy rows / rows that never started heartbeating.';
