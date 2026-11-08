-- At most one SCHEDULED plan_runs row per plan, and plans.status = SCHEDULED exactly when the
-- plan has one (OT plan 764c7654, decisions D2, D3, D9).
--
-- Migration 151 added SCHEDULED to plan_task_status; it could not be written in that transaction
-- (ALTER TYPE ... ADD VALUE), so the data half lives here. Three steps, in this order:
--
--   1. Cancel every SCHEDULED run that breaks the rules (D9). Per plan, keep the soonest
--      SCHEDULED run (scheduled_for, then id) ONLY when the plan is PENDING or BACKLOG -- the
--      only statuses a plan may be scheduled from (D2). Every other SCHEDULED row -- duplicates,
--      and scheduled runs on QUEUED / IN_PROGRESS / BLOCKED / terminal plans -- becomes
--      CANCELLED, with the reason recorded in plan_runs.settled_reason (migration 150).
--   2. Create the partial unique index that enforces the invariant from here on (D3).
--   3. Set every plan that still holds a SCHEDULED run to plans.status = SCHEDULED.
--
-- ORPHANED DELAYED JOBS ARE HARMLESS. Step 1 leaves each cancelled run's delayed BullMQ job in
-- Redis. When one fires, the fire-time claim (PlanRunsService.transitionScheduledRun) is guarded
-- on status = 'SCHEDULED', so it matches 0 rows against a CANCELLED run and the processor does
-- nothing. The boot reconcile reads only SCHEDULED rows, so it never re-adds one either.
--
-- Idempotent: step 1 only touches SCHEDULED rows that still break the rules (none on a re-run),
-- the index is IF NOT EXISTS, and step 3 only touches plans not already SCHEDULED.

WITH ranked AS (
  SELECT r.id,
         p.status AS plan_status,
         ROW_NUMBER() OVER (
           PARTITION BY r.plan_id
           ORDER BY r.scheduled_for ASC NULLS LAST, r.id ASC
         ) AS rn
    FROM plan_runs r
    JOIN plans p ON p.id = r.plan_id
   WHERE r.status = 'SCHEDULED'
)
UPDATE plan_runs
   SET status = 'CANCELLED',
       settled_reason = 'Cancelled by migration 152: a plan may hold one scheduled run, and only while it is PENDING or BACKLOG.',
       updated_at = now()
  FROM ranked
 WHERE plan_runs.id = ranked.id
   AND (ranked.rn > 1 OR ranked.plan_status::text NOT IN ('PENDING', 'BACKLOG', 'SCHEDULED'));

CREATE UNIQUE INDEX IF NOT EXISTS plan_runs_one_scheduled_per_plan_idx
  ON plan_runs (plan_id)
  WHERE status = 'SCHEDULED';

COMMENT ON INDEX plan_runs_one_scheduled_per_plan_idx IS 'Invariant: a plan has at most one SCHEDULED run (OT plan 764c7654, D3). schedulePlanRun rejects a second schedule with PLAN_ALREADY_SCHEDULED unless replaceScheduled cancels the old row first; a race that reaches this index maps to the same code. Together with plans.status = SCHEDULED (set exactly while this row exists), it is how lists and filters see a scheduled plan.';

UPDATE plans
   SET status = 'SCHEDULED',
       updated_at = now()
 WHERE status IN ('PENDING', 'BACKLOG')
   AND EXISTS (
     SELECT 1 FROM plan_runs r
      WHERE r.plan_id = plans.id
        AND r.status = 'SCHEDULED'
   );
