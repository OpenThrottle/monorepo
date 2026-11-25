-- Per-user starred projects. Presence-as-favorite, like user_favorite_agent_models (092): a row
-- (user_id, project_id) means the user starred that project; absence means not starred. Keyed by
-- the pair, so there is no surrogate id and a re-star is an idempotent insert.
--
-- Idempotent: the table, comments and index are all re-runnable. The foreign keys are added in
-- their own pg_constraint-guarded statements, never inline under IF NOT EXISTS (README § Foreign
-- keys in migrations).

CREATE TABLE IF NOT EXISTS user_favorite_projects (
    user_id UUID NOT NULL,
    project_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, project_id)
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_favorite_projects_user_id_fkey'
  ) THEN
    ALTER TABLE user_favorite_projects
      ADD CONSTRAINT user_favorite_projects_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_favorite_projects_project_id_fkey'
  ) THEN
    ALTER TABLE user_favorite_projects
      ADD CONSTRAINT user_favorite_projects_project_id_fkey
      FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE;
  END IF;
END
$$;

COMMENT ON TABLE user_favorite_projects IS 'Per-user set of starred OpenThrottle projects. Presence-as-favorite: a row (user_id, project_id) means the user starred that project; absence means not starred. Starring only floats or highlights a project in the user''s own lists. Rows cascade when either the user or the project is deleted.';

COMMENT ON COLUMN user_favorite_projects.user_id IS 'Owner of the star. User-scoped; cascades on user delete.';

COMMENT ON COLUMN user_favorite_projects.project_id IS 'The starred project. Cascades on project delete.';

COMMENT ON COLUMN user_favorite_projects.created_at IS 'When the user starred the project.';

CREATE INDEX IF NOT EXISTS idx_user_favorite_projects_project_id
  ON user_favorite_projects (project_id);
