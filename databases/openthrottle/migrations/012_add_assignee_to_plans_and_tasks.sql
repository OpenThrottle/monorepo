-- Add optional assignee (e.g. GitHub username) to plans and tasks
ALTER TABLE plans ADD COLUMN IF NOT EXISTS assignee TEXT;

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS assignee TEXT;

CREATE INDEX IF NOT EXISTS idx_plans_assignee ON plans (assignee)
WHERE
    assignee IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_tasks_assignee ON tasks (assignee)
WHERE
    assignee IS NOT NULL;