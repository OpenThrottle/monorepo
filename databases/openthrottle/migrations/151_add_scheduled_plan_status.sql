-- Add SCHEDULED to plan_task_status (plans only; see "What each status means" in
-- docs/openthrottle/authoring-plans-via-mcp.md, and OT plan 764c7654).
-- SCHEDULED = the plan has exactly one SCHEDULED plan_runs row (a delayed run). Only the
-- scheduling code paths write it; a manual status write of SCHEDULED is rejected, and tasks
-- never take it (same as QUEUED).
--
-- Anchored BEFORE 'QUEUED' so the enum order reads … PROMOTED, SCHEDULED, QUEUED, SKIPPED —
-- a scheduled plan is one step before a queued one.
-- No data changes here: a value added by ALTER TYPE ... ADD VALUE cannot be used in the
-- transaction that added it, so the one-scheduled-run index and backfill are migration 152.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'plan_task_status' AND e.enumlabel = 'SCHEDULED'
  ) THEN
    ALTER TYPE plan_task_status ADD VALUE 'SCHEDULED' BEFORE 'QUEUED';
  END IF;
END $$;

COMMENT ON COLUMN plans.status IS 'Definitive enum: BACKLOG, BLOCKED, CANCELED, COMPLETED, IN_PROGRESS, PENDING, PROMOTED, QUEUED, SCHEDULED, SKIPPED (QUEUED: plans only, when job enqueued in BullMQ; SCHEDULED: plans only, server-written, exactly when the plan has a SCHEDULED plan_runs row; PROMOTED: work continued as its own plan).';
COMMENT ON COLUMN tasks.status IS 'Definitive enum: BACKLOG, BLOCKED, CANCELED, COMPLETED, IN_PROGRESS, PENDING, PROMOTED, SKIPPED (PROMOTED: set by promote_task, the work continued as its own plan). QUEUED and SCHEDULED are plans-only.';
