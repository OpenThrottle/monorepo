-- Widen the skill-usage scope vocabulary to three members
-- (OT plan a5f2ce0b — Make `personal` a first-class skill-usage scope).
--
-- When the personal skills tier was added (per-user root ~/.openthrottle/skills
-- / OPENTHROTTLE_PERSONAL_SKILLS_DIR, symlinked into .agents/skills and fanned
-- out per tool), the usage-telemetry vocabulary was not widened with it. Scope
-- detection answered only `ours` (a directory exists at <repoRoot>/skills/<name>)
-- or `third-party` (everything else), so a personal skill — which has no
-- in-repo skills/<name> directory — was captured as `third-party`.
--
-- `personal` means: authored by this user, on disk and invokable, but outside
-- the repo, so nobody else's checkout has it. It is distinct from `third-party`
-- (installed or plugin-namespaced, authored by someone else).
--
-- Migration 084 created skill_usage_events with the two-member CHECK; 085 did
-- the same for skill_usage_outcomes. This drops and re-adds both with
-- `personal` included. Idempotent: re-running is a no-op.
--
-- NO RETROACTIVE RECLASSIFICATION. Personal skill roots are per-user and live
-- outside the repo; the server cannot resolve another machine's personal root,
-- so it cannot tell which historical `third-party` rows were really personal.
-- Pre-migration invocations of a personal skill therefore stay recorded as
-- `third-party` forever, and a personal skill's history may read as split
-- across two scopes until the older rows age out of the reporting window.

ALTER TABLE skill_usage_events
  DROP CONSTRAINT IF EXISTS skill_usage_events_scope_check;

ALTER TABLE skill_usage_events
  ADD CONSTRAINT skill_usage_events_scope_check
  CHECK (scope IN ('ours', 'personal', 'third-party'));

ALTER TABLE skill_usage_outcomes
  DROP CONSTRAINT IF EXISTS skill_usage_outcomes_scope_check;

ALTER TABLE skill_usage_outcomes
  ADD CONSTRAINT skill_usage_outcomes_scope_check
  CHECK (scope IN ('ours', 'personal', 'third-party'));

COMMENT ON TABLE skill_usage_events IS
    'Harness-captured skill invocations for OpenThrottle observability. One immutable row per Skill-tool or slash invocation (ours, personal and third-party). Args arrive already privacy-processed by the client; server stores as-sent.';

COMMENT ON COLUMN skill_usage_events.scope IS
    'Who the invocation belongs to: ours = authored under the repo''s skills/ directory, so every checkout has it; personal = authored by the invoking user under their personal skills root (~/.openthrottle/skills or OPENTHROTTLE_PERSONAL_SKILLS_DIR), on disk and invokable but outside the repo; third-party = plugin-namespaced (name contains :) or installed from elsewhere. Enforced by skill_usage_events_scope_check. Rows are never retroactively reclassified: personal roots are per-user and unresolvable server-side, so invocations captured before the personal member existed remain third-party. Distinct from the /agents registry provenance vocabulary (committed | installed | external), which answers where the file came from rather than who the invocation belongs to.';

COMMENT ON COLUMN skill_usage_outcomes.scope IS
    'Mirrors skill_usage_events.scope (ours | personal | third-party) for filter parity with starts. Normally ours or personal, since outcome enrichment requires a skill we can instrument. Never retroactively reclassified — see skill_usage_events.scope.';
