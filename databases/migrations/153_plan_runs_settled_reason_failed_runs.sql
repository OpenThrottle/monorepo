-- plan_runs.settled_reason: also why a FAILED run stopped.
--
-- Migration 150 added the column for scheduled runs that settled without starting (MISSED,
-- SUPERSEDED, SKIPPED). The Ralph orchestrator now also stops a run FAILED when the agent CLI's
-- account cannot serve requests (no credit, an invalid key, no model access) instead of burning
-- every iteration, and the plans processor stores its operator-readable description -- the error,
-- which credential the CLI used, and the fix -- here so run history says why. Comment-only: no DDL.

COMMENT ON COLUMN plan_runs.settled_reason IS 'Human-readable reason a run settled the way it did: the fire-time policy''s reason for a MISSED, SUPERSEDED or SKIPPED scheduled run (migration 150), or why a FAILED run stopped when the orchestrator recorded one -- a fatal agent account error names the error, the credential the agent CLI used and the fix (migration 153). NULL for every other run, and for runs settled before those migrations.';
