-- Add PROMOTED to plan_task_status (plans and tasks; see "What PROMOTED means" in
-- docs/openthrottle/authoring-plans-via-mcp.md).
-- PROMOTED = not finished here; the work continued as its own plan. Written by promote_task
-- on the source task, which previously closed it as SKIPPED + a `promoted` tag.
--
-- Anchored AFTER 'PENDING' so the enum order reads … QUEUED, PENDING, PROMOTED, SKIPPED.
-- No data changes here: a value added by ALTER TYPE ... ADD VALUE cannot be used in the
-- transaction that added it, so the backfill of historical rows is its own migration.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'plan_task_status' AND e.enumlabel = 'PROMOTED'
  ) THEN
    ALTER TYPE plan_task_status ADD VALUE 'PROMOTED' AFTER 'PENDING';
  END IF;
END $$;

COMMENT ON COLUMN plans.status IS 'Definitive enum: BACKLOG, BLOCKED, CANCELED, COMPLETED, IN_PROGRESS, PENDING, PROMOTED, QUEUED, SKIPPED (QUEUED: plans only, when job enqueued in BullMQ; PROMOTED: work continued as its own plan).';
COMMENT ON COLUMN tasks.status IS 'Definitive enum: BACKLOG, BLOCKED, CANCELED, COMPLETED, IN_PROGRESS, PENDING, PROMOTED, SKIPPED (PROMOTED: set by promote_task, the work continued as its own plan).';
