-- Create projects table
-- Groups plans/tasks by NX project or logical project (slug/name).
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    description TEXT,
    name TEXT NOT NULL,
    nx_project_name TEXT,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_projects_nx_project_name ON projects (nx_project_name)
WHERE
    nx_project_name IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_projects_created_at ON projects (created_at DESC);

DROP TRIGGER IF EXISTS update_projects_updated_at ON projects;

CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
