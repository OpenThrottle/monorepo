-- Widen the skill_usage_outcomes.outcome CHECK to admit `session_ended`
-- (OT plan e4bca7d5 — honest skill-usage outcomes).
--
-- Migration 085 created the CHECK allowing ('success', 'abandoned', 'error').
-- In practice `success` was not a measurement: the automatic session-end hook
-- passed it as a hardcoded default, so every clean session end scored a win
-- regardless of what happened. A harness Stop payload carries a session id and
-- nothing else — no error signal, no per-skill signal — so that path cannot
-- tell whether the skill helped, was followed, or was even read. The Outcomes
-- column therefore measured liveness while reading as quality.
--
-- `session_ended` is the honest value for that path: the session that loaded
-- this skill ended normally, and nothing more is claimed. `success` and `error`
-- survive as QUALITY claims, now reserved for a reporter that actually knows
-- how the work went (the opt-in skill-usage-outcome helper, or a harness that
-- reports a real failure status the way Cursor's `final_status` does).
--
-- Widening, not replacing: existing rows are NOT rewritten. They were written
-- by the old automatic path and are semantically `session_ended`, but rewriting
-- them would destroy the ability to tell a measured value from an assumed one.
-- Migration 114 adds the discriminator that lets /usage exclude them instead.
--
-- Drops and re-adds the constraint, following 079. Idempotent: re-running is a
-- no-op. Deliberately performs no backfill.

ALTER TABLE skill_usage_outcomes
  DROP CONSTRAINT IF EXISTS skill_usage_outcomes_outcome_check;

ALTER TABLE skill_usage_outcomes
  ADD CONSTRAINT skill_usage_outcomes_outcome_check
  CHECK (outcome IN ('abandoned', 'error', 'session_ended', 'success'));

COMMENT ON COLUMN skill_usage_outcomes.outcome IS
    'success | error — QUALITY claims, only ever written by a deliberate reporter that knows how the work went. session_ended — the automatic session-end path; the session that loaded this skill ended normally, no quality claim. abandoned — the stale-session sweep; the process died without a clean end. Only success and error belong in an "outcomes reported" numerator. Enforced by skill_usage_outcomes_outcome_check.';

COMMENT ON COLUMN skill_usage_outcomes.duration_ms IS
    'Wall-clock duration from skill start to outcome emit, reported ONLY by a deliberate reporter. Null on every automatic path: no harness hook brackets a skill''s own work (PostToolUse on Skill fires when the skill file is injected, not when its work completes), so the only figure available there is session-tail length, which is not this skill''s duration.';
