-- Widen the plan_runs.execution_backend CHECK to the full agent-CLI driver set
-- (OT plan dde67342 — openthrottle-drivers).
--
-- The drivers package (@openthrottle/openthrottle-drivers) is now the single
-- source of truth for supported agent CLIs, and WORKFLOW_RUNNER_IDS derives from
-- its DRIVER_IDS: claude, codex, cursor, grok, opencode. Ralph can now actually
-- run codex/grok/opencode (previously opencode threw and codex/grok were rejected),
-- so a PlanRun row must be allowed to record any of them.
--
-- Migration 038 created the CHECK allowing only ('cursor', 'claude'); this drops
-- and re-adds it with the widened set. Idempotent: re-running is a no-op.

ALTER TABLE plan_runs
  DROP CONSTRAINT IF EXISTS plan_runs_execution_backend_check;

ALTER TABLE plan_runs
  ADD CONSTRAINT plan_runs_execution_backend_check
  CHECK (execution_backend IN ('claude', 'codex', 'cursor', 'grok', 'opencode'));

COMMENT ON COLUMN plan_runs.execution_backend IS 'Agent-CLI backend that executed this run. One of the openthrottle-drivers DRIVER_IDS (claude, codex, cursor, grok, opencode); enforced by plan_runs_execution_backend_check. Defaults to cursor.';
