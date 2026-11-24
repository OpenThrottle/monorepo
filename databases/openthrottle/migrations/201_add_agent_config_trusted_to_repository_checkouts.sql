-- Per-checkout trust gate for repo-local agent configuration. Running a plan in a
-- registered or cloned foreign checkout used to load that repository's own agent
-- config headlessly with no consent step: Claude Code in `-p` mode connects every
-- server in the workspace `.mcp.json` and fires the hooks in `.claude/settings.json`.
-- While this flag is FALSE, plan runs spawn their agent so only OpenThrottle-supplied
-- MCP servers and OpenThrottle plugin hooks load (docs/monorepo/agent-config-trust.md).
--
-- Like foreign_skill_injection_enabled (migration 090) it lives on
-- repository_checkouts, the per-user table, NOT on the shared `repositories` row:
-- trusting a repository is one user's consent, not everyone's.
--
-- Default FALSE = opt-in, and existing rows backfill to FALSE through the default.
-- The OpenThrottle install's own checkout is treated as trusted by the server
-- (effective trust = this flag OR the checkout is the OpenThrottle root), so the
-- column needs no knowledge of where OpenThrottle is installed.
-- Additive + idempotent.

ALTER TABLE repository_checkouts
  ADD COLUMN IF NOT EXISTS agent_config_trusted BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN repository_checkouts.agent_config_trusted IS 'True when this user has trusted the checkout''s repo-local agent config (.claude/settings.json hooks, .mcp.json servers and their equivalents) to run during plan runs. FALSE (default) spawns agents with that config suppressed, so only OpenThrottle-supplied MCP servers and plugin hooks load. The OpenThrottle install''s own checkout is always treated as trusted by the server regardless of this value.';
