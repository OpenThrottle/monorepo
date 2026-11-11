-- Repository/checkout identity model: split workspace_local_repositories into a shared
-- repositories table (identity = normalized git remote URL) and per-user repository_checkouts.
-- Lifts existing rows, then DROPS the old table in the same transaction (signed-off decision,
-- 2026-07-24). See applications/openthrottle-server/docs/workspace-onboarding-repository-model-design.md.

CREATE TABLE IF NOT EXISTS repositories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    normalized_remote_url TEXT NULL,
    name TEXT NOT NULL,
    default_branch TEXT NULL,
    project_id UUID NULL REFERENCES projects (id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE repositories IS 'OpenThrottle repository identity, keyed by normalized git remote URL; provisional (NULL remote) rows exist for local-only folders until a remote is detected.';

COMMENT ON COLUMN repositories.normalized_remote_url IS 'Canonical https form (host lowercased, ssh converted, .git and trailing slash stripped); NULL for provisional local-only repositories.';

COMMENT ON COLUMN repositories.project_id IS 'OpenThrottle project link, owned at the repository level (not per-checkout) so all users sharing a remote share one project link.';

CREATE UNIQUE INDEX IF NOT EXISTS uq_repositories_normalized_remote_url ON repositories (normalized_remote_url)
WHERE
    normalized_remote_url IS NOT NULL;

DROP TRIGGER IF EXISTS update_repositories_updated_at ON repositories;

CREATE TRIGGER update_repositories_updated_at
  BEFORE UPDATE ON repositories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS repository_checkouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    repository_id UUID NOT NULL REFERENCES repositories (id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    filesystem_path TEXT NOT NULL,
    display_name TEXT NOT NULL,
    managed BOOLEAN NOT NULL DEFAULT FALSE,
    kind TEXT NOT NULL DEFAULT 'primary' CHECK (kind IN ('primary', 'worktree')),
    inspection JSONB NULL,
    scanned_at TIMESTAMP WITH TIME ZONE NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_repository_checkouts_user_path UNIQUE (user_id, filesystem_path)
);

COMMENT ON TABLE repository_checkouts IS 'Per-user on-disk instances of an OpenThrottle repository; the DB row is a cache over the manifest and git state actually on disk.';

COMMENT ON COLUMN repository_checkouts.managed IS 'True when OpenThrottle cloned this checkout (into OPENTHROTTLE_CHECKOUT_ROOT); false for user-registered existing folders.';

COMMENT ON COLUMN repository_checkouts.kind IS 'primary = the user''s main checkout; worktree = reserved for future workflow worktree-pool unification.';

COMMENT ON COLUMN repository_checkouts.inspection IS 'Cached RepositoryInspectionService snapshot (git/stack/agent-config detection); disk is the source of truth, this is a refreshable cache keyed by scanned_at.';

CREATE INDEX IF NOT EXISTS idx_repository_checkouts_repository_id ON repository_checkouts (repository_id);

DROP TRIGGER IF EXISTS update_repository_checkouts_updated_at ON repository_checkouts;

CREATE TRIGGER update_repository_checkouts_updated_at
  BEFORE UPDATE ON repository_checkouts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- SQL twin of normalizeRemoteUrl() in @openthrottle/nestjs-repositories; session-local (pg_temp)
-- so it exists only for the data lift below.
CREATE OR REPLACE FUNCTION pg_temp.normalize_remote_url (raw TEXT) RETURNS TEXT LANGUAGE plpgsql AS $fn$
DECLARE
  url TEXT := trim(coalesce(raw, ''));
  host TEXT;
BEGIN
  IF url = '' THEN
    RETURN NULL;
  END IF;
  url := regexp_replace(url, '^git@([^:/]+):', 'https://\1/');
  url := regexp_replace(url, '^ssh://(?:[^@/]+@)?', 'https://');
  url := regexp_replace(url, '^http://', 'https://');
  url := regexp_replace(url, '^https://[^@/]+@', 'https://');
  IF url !~ '^https://[^/]+/.+' THEN
    RETURN NULL;
  END IF;
  url := regexp_replace(url, '\.git$', '');
  url := regexp_replace(url, '/+$', '');
  host := substring(url from '^https://([^/]+)');
  RETURN 'https://' || lower(host) || substring(url from 9 + length(host));
END;
$fn$;

-- Data lift: one repositories row per distinct normalized remote (earliest-created row wins for
-- name/default_branch/project link; conflicting project links are logged), one provisional
-- repositories row per local-only original row, and one repository_checkouts row per original row.
DO $$
DECLARE
  conflict RECORD;
BEGIN
  IF to_regclass('public.workspace_local_repositories') IS NULL THEN
    RETURN;
  END IF;

  CREATE TEMP TABLE tmp_wlr_lift ON COMMIT DROP AS
  SELECT
    id AS old_id,
    user_id,
    filesystem_path,
    display_name,
    git_default_branch,
    project_id,
    created_at,
    pg_temp.normalize_remote_url(git_remote_url) AS normalized_remote_url,
    NULL::uuid AS provisional_repository_id
  FROM workspace_local_repositories;

  FOR conflict IN
    SELECT normalized_remote_url, array_agg(DISTINCT project_id) AS project_ids
    FROM tmp_wlr_lift
    WHERE normalized_remote_url IS NOT NULL AND project_id IS NOT NULL
    GROUP BY normalized_remote_url
    HAVING count(DISTINCT project_id) > 1
  LOOP
    RAISE NOTICE 'workspace_local_repositories lift: % carries conflicting project links %; keeping the earliest-created row''s link',
      conflict.normalized_remote_url, conflict.project_ids;
  END LOOP;

  INSERT INTO repositories (normalized_remote_url, name, default_branch, project_id)
  SELECT DISTINCT ON (l.normalized_remote_url)
    l.normalized_remote_url,
    l.display_name,
    l.git_default_branch,
    (
      SELECT p.project_id
      FROM tmp_wlr_lift p
      WHERE p.normalized_remote_url = l.normalized_remote_url
        AND p.project_id IS NOT NULL
      ORDER BY p.created_at ASC
      LIMIT 1
    )
  FROM tmp_wlr_lift l
  WHERE l.normalized_remote_url IS NOT NULL
  ORDER BY l.normalized_remote_url, l.created_at ASC
  ON CONFLICT (normalized_remote_url) WHERE normalized_remote_url IS NOT NULL DO NOTHING;

  UPDATE tmp_wlr_lift
  SET provisional_repository_id = gen_random_uuid()
  WHERE normalized_remote_url IS NULL;

  INSERT INTO repositories (id, normalized_remote_url, name, default_branch, project_id)
  SELECT provisional_repository_id, NULL, display_name, git_default_branch, project_id
  FROM tmp_wlr_lift
  WHERE normalized_remote_url IS NULL;

  INSERT INTO repository_checkouts (repository_id, user_id, filesystem_path, display_name, managed, kind, created_at)
  SELECT
    COALESCE(r.id, l.provisional_repository_id),
    l.user_id,
    l.filesystem_path,
    l.display_name,
    FALSE,
    'primary',
    l.created_at
  FROM tmp_wlr_lift l
  LEFT JOIN repositories r ON r.normalized_remote_url = l.normalized_remote_url
  ON CONFLICT (user_id, filesystem_path) DO NOTHING;
END $$;

-- Signed-off decision (2026-07-24): drop immediately in the same transaction, no rename/view shim.
DROP TABLE IF EXISTS workspace_local_repositories;
