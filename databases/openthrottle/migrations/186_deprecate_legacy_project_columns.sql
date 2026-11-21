-- Deprecate the legacy project columns. No columns are dropped: the project is an initiative
-- (projects + plans.project_id + project_repositories), and these columns predate that model.
-- None had a comment before, so each one states what it was and what replaces it.

COMMENT ON COLUMN tasks.project_id IS 'DEPRECATED: a task''s project is its plan''s project (plans.project_id); read that instead. Originally a direct link from the task to a project (projects.id), kept writable until it is dropped in a later migration.';

COMMENT ON COLUMN plans.project IS 'DEPRECATED: free-text project label, unrelated to the projects table and superseded by plans.project_id. Kept until it is dropped in a later migration.';

COMMENT ON COLUMN tasks.project IS 'DEPRECATED: free-text project label, unrelated to the projects table and superseded by the plan''s project (plans.project_id). Kept until it is dropped in a later migration.';

COMMENT ON COLUMN projects.nx_project_name IS 'DEPRECATED: projects are initiatives, not Nx projects. Still read as the skills default lookup (nx_project_name = ''monorepo'') until skills move to the repository; unique among live projects.';
