-- Widen the plan_runs.execution_backend CHECK to include the gemini driver
-- (OT plan 99541038 — Gemini CLI agent driver).
--
-- The drivers package (@openthrottle/openthrottle-drivers) gained a `gemini`
-- driver (Google Gemini CLI, binary `gemini`), so DRIVER_IDS is now: claude,
-- codex, cursor, gemini, grok, opencode. A PlanRun row must be allowed to
-- record it.
--
-- Migration 079 last widened this CHECK (to the five-driver set); this drops
-- and re-adds it with gemini included. Idempotent: re-running is a no-op.

ALTER TABLE plan_runs
  DROP CONSTRAINT IF EXISTS plan_runs_execution_backend_check;

ALTER TABLE plan_runs
  ADD CONSTRAINT plan_runs_execution_backend_check
  CHECK (execution_backend IN ('claude', 'codex', 'cursor', 'gemini', 'grok', 'opencode'));

COMMENT ON COLUMN plan_runs.execution_backend IS 'Agent-CLI backend that executed this run. One of the openthrottle-drivers DRIVER_IDS (claude, codex, cursor, gemini, grok, opencode); enforced by plan_runs_execution_backend_check. Defaults to cursor.';

-- scheduled_agent_jobs.driver_id is deliberately NOT CHECK-constrained (the
-- driver set grows; validated app-side via parseDriverId) — refresh its
-- documenting comment to the six-driver set.
COMMENT ON COLUMN scheduled_agent_jobs.driver_id IS 'openthrottle-drivers DRIVER_IDS value (claude|codex|cursor|gemini|grok|opencode). Validated app-side via parseDriverId; not CHECK-constrained because the driver set grows.';
