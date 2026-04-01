-- Add optional project (NX project name) to plans for filtering
ALTER TABLE plans ADD COLUMN IF NOT EXISTS project TEXT;

CREATE INDEX IF NOT EXISTS idx_plans_project ON plans (project)
WHERE
    project IS NOT NULL;
