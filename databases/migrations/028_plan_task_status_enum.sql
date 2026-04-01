-- Use definitive status enums for plans and tasks (barguide-style).
-- Replaces TEXT status with plan_task_status enum; canonical values uppercase.

-- Normalize any remaining 'complete' to 'completed' before enum migration (only when status is still TEXT).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'plans' AND column_name = 'status' AND data_type = 'text') THEN
    UPDATE plans SET status = 'completed' WHERE LOWER(TRIM(status)) = 'complete';
    UPDATE tasks SET status = 'completed' WHERE LOWER(TRIM(status)) = 'complete';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'plan_task_status') THEN
    CREATE TYPE plan_task_status AS ENUM (
      'BACKLOG',
      'BLOCKED',
      'CANCELED',
      'COMPLETED',
      'IN_PROGRESS',
      'PENDING',
      'SKIPPED'
    );
  END IF;
END $$;

-- plans and tasks: add enum column, migrate data, drop old column, rename, recreate indexes (only when status is still TEXT)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'plans' AND column_name = 'status' AND data_type = 'text') THEN
    -- plans
    ALTER TABLE plans ADD COLUMN status_new plan_task_status;
    UPDATE plans
    SET status_new = CASE LOWER(TRIM(status))
      WHEN 'backlog' THEN 'BACKLOG'::plan_task_status
      WHEN 'blocked' THEN 'BLOCKED'::plan_task_status
      WHEN 'canceled' THEN 'CANCELED'::plan_task_status
      WHEN 'complete' THEN 'COMPLETED'::plan_task_status
      WHEN 'completed' THEN 'COMPLETED'::plan_task_status
      WHEN 'in_progress' THEN 'IN_PROGRESS'::plan_task_status
      WHEN 'pending' THEN 'PENDING'::plan_task_status
      WHEN 'skipped' THEN 'SKIPPED'::plan_task_status
      ELSE 'PENDING'::plan_task_status
    END;
    ALTER TABLE plans ALTER COLUMN status_new SET DEFAULT 'PENDING'::plan_task_status;
    ALTER TABLE plans ALTER COLUMN status_new SET NOT NULL;
    DROP INDEX IF EXISTS idx_plans_status;
    DROP INDEX IF EXISTS idx_plans_status_created_at;
    DROP INDEX IF EXISTS idx_plans_status_updated_at;
    ALTER TABLE plans DROP COLUMN status;
    ALTER TABLE plans RENAME COLUMN status_new TO status;
    CREATE INDEX idx_plans_status ON plans (status);
    CREATE INDEX idx_plans_status_created_at ON plans (status, created_at DESC);
    CREATE INDEX idx_plans_status_updated_at ON plans (status, updated_at DESC);
    COMMENT ON COLUMN plans.status IS 'Definitive enum: BACKLOG, BLOCKED, CANCELED, COMPLETED, IN_PROGRESS, PENDING, SKIPPED';

    -- tasks
    ALTER TABLE tasks ADD COLUMN status_new plan_task_status;
    UPDATE tasks
    SET status_new = CASE LOWER(TRIM(status))
      WHEN 'backlog' THEN 'BACKLOG'::plan_task_status
      WHEN 'blocked' THEN 'BLOCKED'::plan_task_status
      WHEN 'canceled' THEN 'CANCELED'::plan_task_status
      WHEN 'complete' THEN 'COMPLETED'::plan_task_status
      WHEN 'completed' THEN 'COMPLETED'::plan_task_status
      WHEN 'in_progress' THEN 'IN_PROGRESS'::plan_task_status
      WHEN 'pending' THEN 'PENDING'::plan_task_status
      WHEN 'skipped' THEN 'SKIPPED'::plan_task_status
      ELSE 'PENDING'::plan_task_status
    END;
    ALTER TABLE tasks ALTER COLUMN status_new SET DEFAULT 'PENDING'::plan_task_status;
    ALTER TABLE tasks ALTER COLUMN status_new SET NOT NULL;
    DROP INDEX IF EXISTS idx_tasks_status;
    ALTER TABLE tasks DROP COLUMN status;
    ALTER TABLE tasks RENAME COLUMN status_new TO status;
    CREATE INDEX idx_tasks_status ON tasks (status);
    COMMENT ON COLUMN tasks.status IS 'Definitive enum: BACKLOG, BLOCKED, CANCELED, COMPLETED, IN_PROGRESS, PENDING, SKIPPED';
  END IF;
END $$;
