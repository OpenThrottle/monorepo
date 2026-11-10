-- Add `injected` to the skill-usage scope vocabulary (OT plan 25f11313).
--
-- Foreign skill injection links OpenThrottle-authored skills into workspaces
-- that do not author them: `.agents/skills/<name>` in the foreign repo is a
-- symlink to `<openthrottle checkout>/skills/<name>`. The capture hook only
-- knew three answers, found no `skills/<name>` in the foreign repo, and filed
-- every such invocation as `third-party` — the same bucket as a plugin or a
-- skills-lock install. They are OpenThrottle skills used somewhere else, which
-- is its own answer, so it gets its own member rather than borrowing `ours`
-- (whose meaning is "every checkout of THIS repo has it").
--
-- The CHECK is widened first, then the closed set of historical foreign rows is
-- restamped. Like migration 153, that set is pinned: OT skill slugs, scope
-- still `third-party`, and the two foreign workspaces they were recorded in.
-- `probe-skill` (a bring-up fixture) and plugin-namespaced names are excluded.
--
-- Idempotent: the constraints are dropped-if-exists and re-added, and the
-- UPDATEs filter on the value they replace, so a re-run changes nothing.

ALTER TABLE skill_usage_events
  DROP CONSTRAINT IF EXISTS skill_usage_events_scope_check;

ALTER TABLE skill_usage_events
  ADD CONSTRAINT skill_usage_events_scope_check
  CHECK (scope IN ('injected', 'ours', 'personal', 'third-party'));

ALTER TABLE skill_usage_outcomes
  DROP CONSTRAINT IF EXISTS skill_usage_outcomes_scope_check;

ALTER TABLE skill_usage_outcomes
  ADD CONSTRAINT skill_usage_outcomes_scope_check
  CHECK (scope IN ('injected', 'ours', 'personal', 'third-party'));

UPDATE skill_usage_events
   SET scope = 'injected'
 WHERE scope = 'third-party'
   AND skill_name IN ('github-squash', 'ot-loop', 'ot-onboarding', 'ot-plans')
   AND cwd IN (
       '/Users/matt/Development/github/shiftsmart/services/native-apps',
       '/Users/matt/Development/github/shiftsmart/services/ssm'
   );

UPDATE skill_usage_outcomes
   SET scope = 'injected'
 WHERE scope = 'third-party'
   AND skill_name IN ('github-squash', 'ot-loop', 'ot-onboarding', 'ot-plans')
   AND cwd IN (
       '/Users/matt/Development/github/shiftsmart/services/native-apps',
       '/Users/matt/Development/github/shiftsmart/services/ssm'
   );

COMMENT ON COLUMN skill_usage_events.scope IS
    'Who the invocation belongs to: ours = authored under the repo''s skills/ directory, so every checkout has it; personal = authored by the invoking user under their personal skills root (~/.openthrottle/skills or OPENTHROTTLE_PERSONAL_SKILLS_DIR), on disk and invokable but outside the repo; injected = an OpenThrottle skill authored under ANOTHER checkout''s skills/<name> and linked into this workspace by foreign skill injection; third-party = plugin-namespaced (name contains :) or installed from elsewhere. Enforced by skill_usage_events_scope_check. Historical rows were reclassified only in closed, root-caused sets (migrations 153 and 154); there is no rule that rewrites rows going forward. Distinct from the /agents registry provenance vocabulary (committed | installed | external), which answers where the file came from rather than who the invocation belongs to.';

COMMENT ON COLUMN skill_usage_outcomes.scope IS
    'Mirrors skill_usage_events.scope (ours | personal | injected | third-party) for filter parity with starts. Historical rows were reclassified only in closed, root-caused sets (migrations 153 and 154) — see skill_usage_events.scope.';
