-- Widen the plan_runs.execution_backend CHECK to include the antigravity driver
-- (OT plan caca71c0 — Antigravity CLI (agy) agent driver).
--
-- The drivers package (@openthrottle/openthrottle-drivers) gained an
-- `antigravity` driver (Google Antigravity CLI, binary `agy`), Google's
-- replacement for the Gemini CLI, which is deprecated for consumer tiers on
-- 2026-06-18. The `gemini` driver is deliberately KEPT alongside it, so
-- DRIVER_IDS is now: antigravity, claude, codex, cursor, gemini, grok,
-- opencode. A PlanRun row must be allowed to record the new one.
--
-- Migration 105 last widened this CHECK (to the six-driver set); this drops and
-- re-adds it with antigravity included. Idempotent: re-running is a no-op.

ALTER TABLE plan_runs
  DROP CONSTRAINT IF EXISTS plan_runs_execution_backend_check;

ALTER TABLE plan_runs
  ADD CONSTRAINT plan_runs_execution_backend_check
  CHECK (execution_backend IN ('antigravity', 'claude', 'codex', 'cursor', 'gemini', 'grok', 'opencode'));

COMMENT ON COLUMN plan_runs.execution_backend IS 'Agent-CLI backend that executed this run. One of the openthrottle-drivers DRIVER_IDS (antigravity, claude, codex, cursor, gemini, grok, opencode); enforced by plan_runs_execution_backend_check. Defaults to cursor.';

-- scheduled_agent_jobs.driver_id is deliberately NOT CHECK-constrained (the
-- driver set grows; validated app-side via parseDriverId) — refresh its
-- documenting comment to the seven-driver set.
COMMENT ON COLUMN scheduled_agent_jobs.driver_id IS 'openthrottle-drivers DRIVER_IDS value (antigravity|claude|codex|cursor|gemini|grok|opencode). Validated app-side via parseDriverId; not CHECK-constrained because the driver set grows.';
