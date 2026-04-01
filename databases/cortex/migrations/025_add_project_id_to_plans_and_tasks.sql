-- Add optional project_id FK to plans and tasks (projects table from 024).
-- Existing project TEXT column is kept for backward compatibility.
ALTER TABLE plans ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects (id) ON DELETE SET NULL;

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_plans_project_id ON plans (project_id)
WHERE
    project_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks (project_id)
WHERE
    project_id IS NOT NULL;
