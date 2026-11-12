-- Narrow the plan_runs.execution_backend CHECK to drop the gemini driver
-- (OT plan 98e6be73 — tear down the Gemini CLI driver).
--
-- Antigravity (`agy`, driver id `antigravity`, migration 106) officially
-- replaces the Gemini CLI. The `gemini` driver is removed from
-- @openthrottle/openthrottle-drivers, so DRIVER_IDS is now: antigravity,
-- claude, codex, cursor, grok, opencode. There are no real consumers of the
-- gemini backend, so any rows that still name it are remapped to antigravity
-- rather than blocking the narrower constraint.
--
-- Migration 106 last widened this CHECK; this remaps, then drops and re-adds it
-- without gemini. Idempotent: re-running is a no-op.

UPDATE plan_runs
  SET execution_backend = 'antigravity'
  WHERE execution_backend = 'gemini';

-- scheduled_agent_jobs.driver_id is not CHECK-constrained, but a job left on
-- gemini would fail parseDriverId at fire time, so remap it too.
UPDATE scheduled_agent_jobs
  SET driver_id = 'antigravity'
  WHERE driver_id = 'gemini';

ALTER TABLE plan_runs
  DROP CONSTRAINT IF EXISTS plan_runs_execution_backend_check;

ALTER TABLE plan_runs
  ADD CONSTRAINT plan_runs_execution_backend_check
  CHECK (execution_backend IN ('antigravity', 'claude', 'codex', 'cursor', 'grok', 'opencode'));

COMMENT ON COLUMN plan_runs.execution_backend IS 'Agent-CLI backend that executed this run. One of the openthrottle-drivers DRIVER_IDS (antigravity, claude, codex, cursor, grok, opencode); enforced by plan_runs_execution_backend_check. Defaults to cursor.';

COMMENT ON COLUMN scheduled_agent_jobs.driver_id IS 'openthrottle-drivers DRIVER_IDS value (antigravity|claude|codex|cursor|grok|opencode). Validated app-side via parseDriverId; not CHECK-constrained because the driver set grows.';
