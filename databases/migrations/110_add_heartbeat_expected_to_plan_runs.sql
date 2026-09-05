-- Make plan_runs safe for a run that cannot heartbeat (OT plan d8b857c0).
--
-- Every liveness judgement on plan_runs today is a heartbeat judgement:
-- COALESCE(last_heartbeat_at, created_at) against a 120s cutoff (STALE_CUTOFF_MS)
-- drives the stale sweep, PlanRunObject.isStale, and worktree activity. That
-- works because every run owner so far -- the in-server worker and the detached
-- workflow-ralph CLI -- owns a ~15s timer.
--
-- An interactive /ot-loop run has no timer. It is an agent turn: a single
-- `check:local` or `nx test` blows past 120s with nothing to bump, so quiet gaps
-- are its NORMAL state, not its failure state. Judging it by heartbeat is not
-- merely inaccurate -- the sweeper's reconcileStrandedPlan resets the plan and
-- every IN_PROGRESS task to PENDING, so a false stale verdict destroys live work.
--
-- heartbeat_expected marks which kind of owner a row has. FALSE means "this run
-- carries no timer, so heartbeat says nothing about whether it is alive": such
-- rows are excluded from the stale sweep, always report isStale = false, and are
-- treated as live-by-status for worktree activity. It is a statement about the
-- OWNER, never a liveness claim -- an unsupervised run's liveness is simply
-- unknown, and readers should surface this flag beside isStale so the two are
-- not confused.
--
-- DEFAULT TRUE is the safety property, not a convenience: every existing row,
-- every queued run and every detached-CLI run keeps today's behaviour untouched.
-- Only rows that explicitly opt out change. NOT NULL deliberately -- a third
-- "unknown" meaning is exactly what this column exists to avoid.
--
-- Idempotent: re-running is a no-op.

ALTER TABLE plan_runs
  ADD COLUMN IF NOT EXISTS heartbeat_expected BOOLEAN NOT NULL DEFAULT TRUE;

COMMENT ON COLUMN plan_runs.heartbeat_expected IS 'Whether this run''s owner bumps last_heartbeat_at on a timer. TRUE (the default, and every queued or detached-CLI run) means heartbeat-based liveness applies as before. FALSE marks a run whose owner has no timer -- an interactive /ot-loop agent turn -- and therefore cannot be judged live or dead by heartbeat: such rows are excluded from the stale sweep (findStaleInProgressRuns), always report isStale = false, and count as live-by-status for heartbeat-based worktree liveness (findLiveRunsByCheckoutIds). A statement about the owner, never a liveness claim; an unsupervised run''s liveness is unknown, so read this flag alongside isStale. Because such rows are exempt from the sweep, nothing server-side ever settles them -- the owning skill (and, under Claude Code, a Stop-hook backstop) is responsible for settling them terminally.';
