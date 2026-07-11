-- Normalize assignee to visormatt
-- Sets all existing non-null assignee values on plans and tasks to 'visormatt'
-- to flush out legacy/inconsistent formats before enforcing GH-username-only rule.
-- Guarded so re-runs touch no rows (NULL assignees stay NULL; already-normalized
-- rows are skipped, avoiding a spurious updated_at re-stamp via the trigger).
UPDATE plans
SET assignee = 'visormatt'
WHERE assignee IS NOT NULL
  AND assignee IS DISTINCT FROM 'visormatt';

UPDATE tasks
SET assignee = 'visormatt'
WHERE assignee IS NOT NULL
  AND assignee IS DISTINCT FROM 'visormatt';
