-- Normalize status: any 'complete' → 'completed' in plans and tasks (only when column is still TEXT; no-op after 028).
-- Canonical statuses: pending, in_progress, completed, blocked, skipped
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'plans' AND column_name = 'status' AND data_type = 'text') THEN
    UPDATE plans SET status = 'completed' WHERE status = 'complete';
    UPDATE tasks SET status = 'completed' WHERE status = 'complete';
  END IF;
END $$;
