-- Settle the queued plan_runs rows that no code path was ever able to settle
-- (OT plan f3bce00e).
--
-- Until the fix shipped alongside this migration, NOTHING on the queued/BullMQ
-- path ever wrote plan_runs.status. The row was not inert while this happened --
-- hostname/pid were stamped, a 15s heartbeat ran, and the run-location columns
-- were cleared on exit -- but status was never a target. Every row an enqueue
-- recorded therefore stayed QUEUED for its entire life, including runs that
-- demonstrably succeeded and runs that exhausted their retries.
--
-- Measured on a dev database before writing this: 171 rows across 91 distinct
-- plans, spanning 2026-05-12 to 2026-08-23, and 100% of them QUEUED -- not one
-- COMPLETED, FAILED, CANCELLED or STALE in four months. The newest is 24 days
-- old, so none can plausibly still be running. The WHERE clause below, not that
-- count, defines the set; other databases will differ in size but not in shape.
--
-- WHY NOT LEAVE THEM. Doing nothing is not free, because a permanently-QUEUED
-- row is not merely cosmetic. reconcileStrandedPlan (the stale sweeper's plan
-- reconcile) treats QUEUED as evidence of a LIVE run and bails out when it sees
-- one, looking back over a plan's 20 most recent runs. 167 of the 171 sit inside
-- that window, so each one permanently vetoes reconcile for its plan: if a
-- FUTURE run of one of those 91 plans hard-crashes and is swept, the ancient row
-- suppresses the cleanup. Leaving these rows preserves a standing lie that
-- actively disables recovery machinery.
--
-- WHY STALE, AND WHY THAT IS NOT A GUESS. The outcome of an individual run is
-- genuinely NOT recoverable, and this migration does not pretend otherwise.
-- Their BullMQ jobs aged out of Redis long ago. The surviving columns are
-- suggestive but not decisive: 167 rows have hostname and pid NULL, which proves
-- only that the worker reached its `finally` -- success, graceful failure and
-- cancellation all clear those columns identically -- and the 4 that still carry
-- them merely never got there. 5 carry a cancel marker, which records that a
-- cancel was REQUESTED, not that the run honoured it. 170 of the 171 hang off a
-- plan that is now COMPLETED, but a plan can be completed by a later run or by a
-- human, so that says nothing about this row.
--
-- Writing COMPLETED or FAILED here would be exactly the failure mode plan
-- d8b857c0 rejected for `model`: converting "we do not know" into a confident
-- wrong value in a provenance column. STALE asserts something strictly weaker
-- and strictly true -- contact with this run was lost and its outcome was never
-- recorded. plan-runs.constants.ts already defines it as precisely that, kept
-- "distinct from FAILED (an actual run error) so operators can tell 'lost
-- contact' from 'the run errored'". That is the honest answer, and it is already
-- in the vocabulary, so no new status is needed and no reader has to change.
--
-- WHY THIS CANNOT CASCADE INTO PLAN/TASK RESETS -- the check this plan demanded
-- before any row was written:
--   1. Backfilling to IN_PROGRESS would be catastrophic: findStaleInProgressRuns
--      selects on status = 'IN_PROGRESS', so it would hand four-month-old rows to
--      reconcileStrandedPlan, which resets the plan and every IN_PROGRESS task to
--      PENDING. This migration therefore writes STALE, never IN_PROGRESS.
--   2. STALE is terminal and is not selected by findStaleInProgressRuns,
--      findStaleUnsupervisedRuns or findLiveRunsByCheckoutIds (all three require
--      IN_PROGRESS), so these rows never re-enter the sweep.
--   3. reconcileStrandedPlan is only ever called from the sweeper's own loop over
--      rows it just settled. A direct UPDATE does not invoke it at all, so no
--      plan or task status is rewritten by this migration -- it touches exactly
--      one column on one table.
--   4. settleSupersededUnsupervisedRuns is scoped to heartbeat_expected = false;
--      these rows are true, so it is not in play either.
--
-- The date bound keeps the set closed. Under the fix that ships with this
-- migration a queued run settles itself, so nothing created from here on can
-- need this; a run genuinely in flight across the deploy is left alone and will
-- write its own terminal status.
--
-- Idempotent: re-running matches only rows still QUEUED, so it re-settles the
-- same closed set and changes nothing else. No data is re-stamped.

UPDATE plan_runs
   SET status = 'STALE',
       hostname = NULL,
       pid = NULL,
       worker_id = NULL
 WHERE status = 'QUEUED'
   AND bullmq_job_id IS NOT NULL
   AND heartbeat_expected
   AND created_at < DATE '2026-09-17';
