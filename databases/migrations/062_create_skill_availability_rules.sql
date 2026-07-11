-- Per-project skill-availability rules: the storage that feeds resolveSkillAvailability in
-- @openthrottle/openthrottle-skills. Two levels make the cardinality explicit: a rule SET
-- (at most one per project, carrying the single per-project posture) owns zero or more RULES
-- (tag/slug allow/deny lists, optionally scoped to an environment). No rule set for a project
-- means passthrough (invariant 3). Written by the skill-availability GraphQL/MCP mutations,
-- read by SkillAvailabilityService.getRuleSetForProject.
-- See docs/monorepo/skill-availability-design.md ("Rules" + "Precedence ladder").

-- One rule set per project (UNIQUE project_id ⇒ ≤ 1). posture is the single per-project value
-- (rung 3): 'allow' = today's behavior minus explicit denies; 'deny' = nothing model-invocable
-- except explicit allows. Posture is deliberately NOT environment-qualified in v1, so rung 3 can
-- never conflict.
CREATE TABLE IF NOT EXISTS skill_availability_rule_sets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects (id) ON DELETE CASCADE,
    posture TEXT NOT NULL DEFAULT 'allow',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_skill_availability_rule_sets_posture CHECK (posture IN ('allow', 'deny')),
    CONSTRAINT uq_skill_availability_rule_sets_project UNIQUE (project_id)
);

DROP TRIGGER IF EXISTS update_skill_availability_rule_sets_updated_at ON skill_availability_rule_sets;

CREATE TRIGGER update_skill_availability_rule_sets_updated_at
  BEFORE UPDATE ON skill_availability_rule_sets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Zero or more rules per rule set. Each rule carries tag/slug allow+deny lists (empty arrays are
-- legal) and an optional environment qualifier (NULL ⇒ applies to every environment; a value scopes
-- the rule to that environment). editor and role are reserved-inert nullable columns: they exist so
-- storage can carry them forward, but the v1 resolver ignores them entirely (adding them as real
-- axes later is additive — no migration, no signature change).
CREATE TABLE IF NOT EXISTS skill_availability_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_set_id UUID NOT NULL REFERENCES skill_availability_rule_sets (id) ON DELETE CASCADE,
    tag_allow TEXT[] NOT NULL DEFAULT '{}',
    tag_deny TEXT[] NOT NULL DEFAULT '{}',
    slug_allow TEXT[] NOT NULL DEFAULT '{}',
    slug_deny TEXT[] NOT NULL DEFAULT '{}',
    environment TEXT,
    editor TEXT,
    role TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_skill_availability_rules_environment CHECK (environment IN ('ci', 'interactive', 'ralph'))
);

CREATE INDEX IF NOT EXISTS idx_skill_availability_rules_rule_set_id ON skill_availability_rules (rule_set_id);

DROP TRIGGER IF EXISTS update_skill_availability_rules_updated_at ON skill_availability_rules;

CREATE TRIGGER update_skill_availability_rules_updated_at
  BEFORE UPDATE ON skill_availability_rules
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE skill_availability_rule_sets IS 'Per-project skill-availability rule set (at most one per project). Carries the single per-project posture; owns zero or more skill_availability_rules. Read by SkillAvailabilityService.getRuleSetForProject to feed resolveSkillAvailability; no rule set ⇒ passthrough. See docs/monorepo/skill-availability-design.md.';

COMMENT ON COLUMN skill_availability_rule_sets.id IS 'Surrogate primary key; referenced by skill_availability_rules.rule_set_id.';

COMMENT ON COLUMN skill_availability_rule_sets.project_id IS 'Owning project (projects.id); cascade-deleted with the project. UNIQUE — at most one rule set per project.';

COMMENT ON COLUMN skill_availability_rule_sets.posture IS 'The single per-project posture (precedence rung 3): allow = today''s behavior minus explicit denies; deny = nothing model-invocable except explicit allows. NOT environment-qualified in v1.';

COMMENT ON COLUMN skill_availability_rule_sets.created_at IS 'Row creation timestamp.';

COMMENT ON COLUMN skill_availability_rule_sets.updated_at IS 'Last-update timestamp, maintained by the update_updated_at_column() trigger.';

COMMENT ON TABLE skill_availability_rules IS 'Individual skill-availability rules owned by a rule set. Each rule matches skills by tag (primary) and slug (one-off exceptions) with allow/deny lists, optionally scoped to an environment. Evaluated at precedence rungs 1-2 by resolveSkillAvailability. See docs/monorepo/skill-availability-design.md.';

COMMENT ON COLUMN skill_availability_rules.id IS 'Surrogate primary key; used as the stable rule identifier in resolver provenance strings and tie-breaks.';

COMMENT ON COLUMN skill_availability_rules.rule_set_id IS 'Owning rule set (skill_availability_rule_sets.id); cascade-deleted with the rule set.';

COMMENT ON COLUMN skill_availability_rules.tag_allow IS 'Tags this rule allows (rung 2); empty array when none. Validated against the workspace vocabulary at write time.';

COMMENT ON COLUMN skill_availability_rules.tag_deny IS 'Tags this rule denies (rung 2); empty array when none. Validated against the workspace vocabulary at write time.';

COMMENT ON COLUMN skill_availability_rules.slug_allow IS 'Skill slugs this rule allows (rung 1, one-off exceptions); empty array when none.';

COMMENT ON COLUMN skill_availability_rules.slug_deny IS 'Skill slugs this rule denies (rung 1, one-off exceptions); empty array when none.';

COMMENT ON COLUMN skill_availability_rules.environment IS 'Environment qualifier (rung 0 pre-filter): NULL applies to all environments; a value (ci | interactive | ralph) scopes the rule to that environment.';

COMMENT ON COLUMN skill_availability_rules.editor IS 'Reserved-inert nullable column: exists so storage can carry an editor axis forward, but the v1 resolver ignores it entirely.';

COMMENT ON COLUMN skill_availability_rules.role IS 'Reserved-inert nullable column: exists so storage can carry a role (persona) axis forward, but the v1 resolver ignores it entirely.';

COMMENT ON COLUMN skill_availability_rules.created_at IS 'Row creation timestamp.';

COMMENT ON COLUMN skill_availability_rules.updated_at IS 'Last-update timestamp, maintained by the update_updated_at_column() trigger.';
