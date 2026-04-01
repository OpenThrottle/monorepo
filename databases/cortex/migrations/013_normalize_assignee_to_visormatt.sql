-- Normalize assignee to visormatt
-- Sets all existing non-null assignee values on plans and tasks to 'visormatt'
-- to flush out legacy/inconsistent formats before enforcing GH-username-only rule.
UPDATE plans
SET assignee = 'visormatt'
WHERE assignee IS NOT NULL;

UPDATE tasks
SET assignee = 'visormatt'
WHERE assignee IS NOT NULL;
