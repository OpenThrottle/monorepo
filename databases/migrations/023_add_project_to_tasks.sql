-- Add optional project (NX project name) to tasks for filtering
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS project TEXT;

CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks (project)
WHERE
    project IS NOT NULL;
