-- Per-job shell command allowlist for scheduled agent jobs. A scheduled run is headless, so its
-- agent CLI can only run a shell command the project settings already allow; anything else waits
-- for an approval nobody is there to give, and the run "succeeds" having done nothing. This column
-- lists the command patterns ONE job may run without a prompt (Claude Code's `Bash(<pattern>)`
-- syntax minus the wrapper, e.g. `pnpm run social:x-post *`), so a job gets exactly what it needs
-- without widening the repository's shared allowlist for every agent session (OT plan 12f0c806).
--
-- The server validates each entry, refuses the list for a driver that cannot enforce it, and stores
-- an agent-created (`created_via = 'mcp'`) job with a non-empty list as pending human approval even
-- when SCHEDULED_AGENT_JOBS_MCP_REQUIRE_APPROVAL is off: an agent must not widen its own run's shell
-- access unreviewed. Default empty = no change for existing rows.
-- Additive + idempotent.

ALTER TABLE scheduled_agent_jobs
  ADD COLUMN IF NOT EXISTS allowed_commands TEXT[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN scheduled_agent_jobs.allowed_commands IS 'Shell command patterns this job''s headless run may execute without a permission prompt (Claude Code Bash(<pattern>) syntax without the wrapper). Empty (default) adds nothing. Validated server-side and refused for drivers without a command allowlist; a non-empty list on an mcp-created job forces human approval.';
