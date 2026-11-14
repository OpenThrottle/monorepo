-- Normalized repository identity on hook-ingested usage telemetry
-- (docs/monorepo/child-repo-hook-telemetry-contract.md §3).
--
-- skill_usage_events.cwd and agent_token_usage.cwd store the raw absolute working directory from
-- every hook payload, foreign repos included, which leaks the user's home-directory layout. §3 says
-- a repo's identity is its normalized git remote, never a path. This adds that identity alongside
-- cwd; senders populate it and foreign repos stop sending cwd. Purely additive: cwd is kept and
-- never rewritten here (deprecated in the GraphQL schema, not removed).
--
-- Idempotent: ADD COLUMN IF NOT EXISTS and CREATE INDEX IF NOT EXISTS; COMMENT ON is re-runnable.

ALTER TABLE skill_usage_events ADD COLUMN IF NOT EXISTS repo_identity TEXT;

ALTER TABLE agent_token_usage ADD COLUMN IF NOT EXISTS repo_identity TEXT;

CREATE INDEX IF NOT EXISTS idx_skill_usage_events_repo_identity
    ON skill_usage_events (repo_identity)
    WHERE repo_identity IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_agent_token_usage_repo_identity
    ON agent_token_usage (repo_identity)
    WHERE repo_identity IS NOT NULL;

COMMENT ON COLUMN skill_usage_events.repo_identity IS 'Normalized https git remote of the repository the skill ran in (e.g. https://github.com/org/repo), normalized client-side and again server-side with normalizeRemoteUrl. NULL when the checkout had no usable remote or the sender predates the field; never a filesystem path. Supersedes cwd as the repo filter key (contract section 3).';

COMMENT ON COLUMN agent_token_usage.repo_identity IS 'Normalized https git remote of the repository the turn ran in (e.g. https://github.com/org/repo), normalized client-side and again server-side with normalizeRemoteUrl. NULL for chat rows, when the checkout had no usable remote or the sender predates the field; never a filesystem path. Supersedes cwd as the repo filter key (contract section 3).';

COMMENT ON COLUMN skill_usage_events.cwd IS 'Working directory reported by the harness at invocation time. Deprecated in favour of repo_identity: foreign-repo senders send NULL, since an absolute path leaks the home-directory layout (contract section 3). Kept for existing rows and OpenThrottle-checkout senders; never rewritten.';

COMMENT ON COLUMN agent_token_usage.cwd IS 'Working directory the harness reported when the turn ran; null for chat rows. Deprecated in favour of repo_identity: foreign-repo senders send NULL, since an absolute path leaks the home-directory layout (contract section 3). Kept for existing rows and OpenThrottle-checkout senders; never rewritten.';
