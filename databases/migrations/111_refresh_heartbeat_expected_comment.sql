-- Refresh the plan_runs.heartbeat_expected comment now that unsupervised rows DO get
-- swept (OT plan 79e8c132, task cb46f70f).
--
-- Migration 110 documented the exemption honestly for the state of the world at the
-- time: heartbeat_expected = false removed a row from findStaleInProgressRuns, and
-- nothing server-side ever settled one. That last clause is no longer true. A second,
-- separate sweep pass now settles these rows on AGE (UNSUPERVISED_STALE_CUTOFF_MS, 12h)
-- via findStaleUnsupervisedRuns, and registerCliRun settles superseded unsupervised runs
-- on the same plan before inserting a new one.
--
-- What has NOT changed is the property the exemption exists to protect: the unsupervised
-- pass settles the run row only and never runs reconcileStrandedPlan, so plan and task
-- status are still never rewritten on the strength of a missing heartbeat. Leaving the
-- old comment in place would tell the next reader that abandoning a row is permanent,
-- and that a false positive could cost them their plan state — both now wrong, and wrong
-- in ways that would shape a design decision.
--
-- Comment-only. No data or schema change. Idempotent: re-running is a no-op.

COMMENT ON COLUMN plan_runs.heartbeat_expected IS 'Whether this run''s owner bumps last_heartbeat_at on a timer. TRUE (the default, and every queued or detached-CLI run) means heartbeat-based liveness applies: the 120s stale sweep (findStaleInProgressRuns) may settle the run AND reconcile its plan. FALSE marks a run whose owner has no timer -- an interactive /ot-loop agent turn -- and therefore cannot be judged live or dead by heartbeat: such rows are excluded from that 120s sweep, always report isStale = false, and count as live-by-status for heartbeat-based worktree liveness (findLiveRunsByCheckoutIds). A statement about the owner, never a liveness claim; an unsupervised run''s liveness is unknown, so read this flag alongside isStale. Such rows are NOT unswept: a separate pass settles them to STALE on sheer age (findStaleUnsupervisedRuns, UNSUPERVISED_STALE_CUTOFF_MS = 12h), and registerCliRun settles superseded unsupervised runs on the same plan. Both settle the RUN ROW ONLY and never touch plan or task status -- nothing may reset a plan to PENDING on the strength of a missing heartbeat, which is the hazard this column exists to avoid. The owning skill settling its own row terminally remains primary; these are backstops that can only ever report STALE.';
