-- Many-to-many projects ↔ repositories.
--
-- A project is a cross-repo initiative, so one project can span several repositories and one
-- repository can serve several projects. Until now a repository carried a single
-- `repositories.project_id`; that column stays (nothing is dropped) and is deprecated in favour
-- of this join table. The repository code writes both until the UI moves over.
--
-- The link is toggled on and off, so the table is a BaseHardDeleteModel shape (uuidv7 `id`,
-- `created_at`, `updated_at`; a delete is a hard DELETE): an unlinked pair is simply re-linked.
-- It has no `deleted_at`, so a soft delete of a project or repository fires no cascade here;
-- reads filter on the live project and repository.

CREATE TABLE IF NOT EXISTS project_repositories (
    id UUID PRIMARY KEY DEFAULT uuidv7(),
    project_id UUID NOT NULL,
    repository_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_project_repositories_project_repository UNIQUE (project_id, repository_id)
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'project_repositories_project_id_fkey') THEN
    ALTER TABLE project_repositories ADD CONSTRAINT project_repositories_project_id_fkey
      FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'project_repositories_repository_id_fkey') THEN
    ALTER TABLE project_repositories ADD CONSTRAINT project_repositories_repository_id_fkey
      FOREIGN KEY (repository_id) REFERENCES repositories (id) ON DELETE CASCADE;
  END IF;
END
$$;

-- The unique key covers lookups by project_id; this one serves "which projects is a repository in".
CREATE INDEX IF NOT EXISTS idx_project_repositories_repository_id
  ON project_repositories (repository_id);

DROP TRIGGER IF EXISTS update_project_repositories_updated_at ON project_repositories;

CREATE TRIGGER update_project_repositories_updated_at
  BEFORE UPDATE ON project_repositories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE project_repositories IS 'OpenThrottle many-to-many link between projects and repositories: one row per (project, repository) pair, so a project can span several repositories and a repository can belong to several projects. Supersedes the single repositories.project_id, which stays in sync until the UI moves over.';

COMMENT ON COLUMN project_repositories.id IS 'Surrogate primary key (uuidv7).';

COMMENT ON COLUMN project_repositories.project_id IS 'Linked project (projects.id); cascade-deleted with the project row. A soft-deleted project is filtered out on read.';

COMMENT ON COLUMN project_repositories.repository_id IS 'Linked repository (repositories.id); cascade-deleted with the repository row. A soft-deleted repository is filtered out on read.';

COMMENT ON COLUMN project_repositories.created_at IS 'When the pair was linked.';

COMMENT ON COLUMN project_repositories.updated_at IS 'Last-update timestamp, maintained by the update_updated_at_column() trigger.';

-- Backfill from the legacy single-project link: live repositories pointing at a live project.
-- Re-running is a no-op (the unique key swallows rows that already exist).
INSERT INTO project_repositories (project_id, repository_id)
SELECT r.project_id, r.id
FROM repositories r
JOIN projects p ON p.id = r.project_id AND p.deleted_at IS NULL
WHERE r.project_id IS NOT NULL
  AND r.deleted_at IS NULL
ON CONFLICT (project_id, repository_id) DO NOTHING;

COMMENT ON COLUMN repositories.project_id IS 'DEPRECATED: use project_repositories (many-to-many). The single project link, kept in sync with the join table by the repository code until the UI moves to the join table; it will be dropped in a later migration. Originally the project link owned at the repository level so all users sharing a remote share one link.';
