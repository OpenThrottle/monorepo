-- Add QUEUED to plan_task_status (plans only; tasks keep existing semantics).
-- Used when Run plan is clicked and the job is enqueued in BullMQ until the worker picks it up.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'plan_task_status' AND e.enumlabel = 'QUEUED'
  ) THEN
    ALTER TYPE plan_task_status ADD VALUE 'QUEUED' BEFORE 'PENDING';
  END IF;
END $$;

COMMENT ON COLUMN plans.status IS 'Definitive enum: BACKLOG, BLOCKED, CANCELED, COMPLETED, IN_PROGRESS, PENDING, QUEUED, SKIPPED (QUEUED: plans only, when job enqueued in BullMQ).';
