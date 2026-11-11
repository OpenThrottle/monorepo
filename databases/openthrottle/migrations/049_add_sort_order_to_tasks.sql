-- Add explicit sort_order on tasks for intentional execution/list sequence within a plan.
-- Backfill existing rows per plan by created_at ASC → 1000, 2000, …
-- Enforce UNIQUE (plan_id, sort_order) and index for list/max queries.

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS sort_order INTEGER;

-- Backfill any rows missing sort_order (first run or interrupted migration).
UPDATE tasks AS t
SET sort_order = ranked.assigned_sort_order
FROM (
  SELECT
    id,
    (ROW_NUMBER() OVER (PARTITION BY plan_id ORDER BY created_at ASC) * 1000) AS assigned_sort_order
  FROM tasks
) AS ranked
WHERE t.id = ranked.id
  AND t.sort_order IS NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'tasks'
      AND column_name = 'sort_order'
      AND is_nullable = 'YES'
  ) AND NOT EXISTS (SELECT 1 FROM tasks WHERE sort_order IS NULL) THEN
    ALTER TABLE tasks ALTER COLUMN sort_order SET NOT NULL;
  END IF;
END $$;

COMMENT ON COLUMN tasks.sort_order IS
  'Execution/list order within plan (gap-based: 1000, 2000, …). UNIQUE per plan_id. Canonical sort: sort_order ASC, created_at ASC.';

CREATE UNIQUE INDEX IF NOT EXISTS idx_tasks_plan_id_sort_order ON tasks (plan_id, sort_order);
