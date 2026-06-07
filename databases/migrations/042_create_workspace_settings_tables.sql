-- Workspace settings: per-user profile (contact, editor prefs) and local filesystem repositories.
-- Scoped by authenticated user (users.id). See applications/openthrottle-server/docs/workspace-settings-graphql-design.md.

-- One row per user: contact fields and enabled editor list (JSONB array of editor ids).
CREATE TABLE IF NOT EXISTS user_workspace_settings (
    user_id UUID PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
    contact_display_name TEXT,
    contact_email TEXT,
    enabled_editors JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_workspace_settings_updated_at ON user_workspace_settings (updated_at DESC);

DROP TRIGGER IF EXISTS update_user_workspace_settings_updated_at ON user_workspace_settings;

CREATE TRIGGER update_user_workspace_settings_updated_at
  BEFORE UPDATE ON user_workspace_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Local checkout paths registered by the user; optional link to a OpenThrottle project.
CREATE TABLE IF NOT EXISTS workspace_local_repositories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    filesystem_path TEXT NOT NULL,
    display_name TEXT NOT NULL,
    git_remote_url TEXT,
    git_default_branch TEXT,
    project_id UUID REFERENCES projects (id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_workspace_local_repos_user_path UNIQUE (user_id, filesystem_path)
);

CREATE INDEX IF NOT EXISTS idx_workspace_local_repos_user_id ON workspace_local_repositories (user_id);

CREATE INDEX IF NOT EXISTS idx_workspace_local_repos_user_created_at ON workspace_local_repositories (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_workspace_local_repos_project_id ON workspace_local_repositories (project_id)
WHERE
    project_id IS NOT NULL;

DROP TRIGGER IF EXISTS update_workspace_local_repositories_updated_at ON workspace_local_repositories;

CREATE TRIGGER update_workspace_local_repositories_updated_at
  BEFORE UPDATE ON workspace_local_repositories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
