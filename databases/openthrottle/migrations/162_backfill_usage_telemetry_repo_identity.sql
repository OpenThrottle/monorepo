-- Backfill repo_identity on usage telemetry from registered checkouts
-- (docs/monorepo/child-repo-hook-telemetry-contract.md §3; columns added by migration 161).
--
-- A row whose cwd is a registered repository_checkouts.filesystem_path, or lies beneath one, takes
-- that checkout's repositories.normalized_remote_url. The deepest matching checkout wins, so a worktree
-- nested under another checkout resolves to itself. A row whose deepest match is ambiguous (two
-- checkouts at the same path pointing at different remotes) is left NULL rather than guessed, as is
-- every row matching no checkout or only a provisional, remote-less repository.
--
-- cwd is read, never written: existing values are neither rewritten nor deleted.
--
-- Idempotent: only rows with repo_identity IS NULL are touched, so a re-run fills what a newly
-- registered checkout can now explain and leaves every resolved row alone.

WITH matches AS (
    SELECT e.id, r.normalized_remote_url, length(rtrim(c.filesystem_path, '/')) AS depth
    FROM skill_usage_events e
    JOIN repository_checkouts c
        ON rtrim(e.cwd, '/') = rtrim(c.filesystem_path, '/')
        OR starts_with(e.cwd, rtrim(c.filesystem_path, '/') || '/')
    JOIN repositories r ON r.id = c.repository_id
    WHERE e.repo_identity IS NULL
      AND e.cwd IS NOT NULL
      AND r.normalized_remote_url IS NOT NULL
),
deepest AS (
    SELECT DISTINCT ON (id) id, normalized_remote_url, depth
    FROM matches
    ORDER BY id, depth DESC
),
resolved AS (
    SELECT d.id, d.normalized_remote_url
    FROM deepest d
    WHERE NOT EXISTS (
        SELECT 1
        FROM matches m
        WHERE m.id = d.id
          AND m.depth = d.depth
          AND m.normalized_remote_url <> d.normalized_remote_url
    )
)
UPDATE skill_usage_events e
SET repo_identity = resolved.normalized_remote_url
FROM resolved
WHERE e.id = resolved.id;

WITH matches AS (
    SELECT u.id, r.normalized_remote_url, length(rtrim(c.filesystem_path, '/')) AS depth
    FROM agent_token_usage u
    JOIN repository_checkouts c
        ON rtrim(u.cwd, '/') = rtrim(c.filesystem_path, '/')
        OR starts_with(u.cwd, rtrim(c.filesystem_path, '/') || '/')
    JOIN repositories r ON r.id = c.repository_id
    WHERE u.repo_identity IS NULL
      AND u.cwd IS NOT NULL
      AND r.normalized_remote_url IS NOT NULL
),
deepest AS (
    SELECT DISTINCT ON (id) id, normalized_remote_url, depth
    FROM matches
    ORDER BY id, depth DESC
),
resolved AS (
    SELECT d.id, d.normalized_remote_url
    FROM deepest d
    WHERE NOT EXISTS (
        SELECT 1
        FROM matches m
        WHERE m.id = d.id
          AND m.depth = d.depth
          AND m.normalized_remote_url <> d.normalized_remote_url
    )
)
UPDATE agent_token_usage u
SET repo_identity = resolved.normalized_remote_url
FROM resolved
WHERE u.id = resolved.id;
