-- Ensure at most one project per nx_project_name to avoid duplicates.
-- Run after cleanup-cortex-projects-apps-only.ts so duplicate rows are merged first.
-- Multiple NULL nx_project_name remain allowed (partial unique index).
CREATE UNIQUE INDEX IF NOT EXISTS idx_projects_nx_project_name_unique
ON projects (nx_project_name)
WHERE nx_project_name IS NOT NULL;
