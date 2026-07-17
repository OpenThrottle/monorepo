-- Declarative tag→action rules: when a plan's effective tag set (plan ∪ tasks)
-- satisfies tag_all (AND semantics) plus optional status/environment/project
-- qualifiers, the typed action_payload is dispatched to the ActionExecutor registry
-- by the plan-rules:evaluate worker. Owned per user (workspace) following the
-- user_skill_tags precedent. action_payload is Zod-validated per action_type at
-- write time; matching is evaluated by the pure evaluateTagActionRules function.
-- See docs/monorepo/plan-task-tags-rules-design.md ("Rules engine").

CREATE TABLE IF NOT EXISTS tag_action_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects (id) ON DELETE SET NULL,
    tag_all TEXT[] NOT NULL DEFAULT '{}',
    status plan_task_status,
    environment TEXT,
    action_type TEXT NOT NULL,
    action_payload JSONB NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_tag_action_rules_environment CHECK (environment IN ('ci', 'interactive', 'ralph')),
    CONSTRAINT chk_tag_action_rules_action_type CHECK (action_type IN ('inject-task', 'availability-exception'))
);

CREATE INDEX IF NOT EXISTS idx_tag_action_rules_user_id ON tag_action_rules (user_id);

CREATE INDEX IF NOT EXISTS idx_tag_action_rules_project_id ON tag_action_rules (project_id);

DROP TRIGGER IF EXISTS update_tag_action_rules_updated_at ON tag_action_rules;

CREATE TRIGGER update_tag_action_rules_updated_at
  BEFORE UPDATE ON tag_action_rules
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE tag_action_rules IS 'Declarative tag→action rules, owned per user. A rule matches a plan when enabled AND project (NULL or equal) AND environment (NULL or equal) AND tag_all ⊆ effective tag set AND status (NULL or equal); all matched actions dispatch (no global priority). Evaluated by the pure evaluateTagActionRules function inside the plan-rules:evaluate worker; applications are ledgered in rule_applications. See docs/monorepo/plan-task-tags-rules-design.md.';

COMMENT ON COLUMN tag_action_rules.id IS 'Surrogate primary key; referenced by rule_applications.rule_id and used in provenance strings ("rule:<id>").';

COMMENT ON COLUMN tag_action_rules.user_id IS 'Owning user (users.id); cascade-deleted with the user. Rules are per-user (workspace), following the user_skill_tags precedent.';

COMMENT ON COLUMN tag_action_rules.project_id IS 'Optional project scope (projects.id): NULL matches every project; a value restricts the rule to that project. SET NULL on project deletion widens the rule rather than dropping it.';

COMMENT ON COLUMN tag_action_rules.tag_all IS 'Tags that must ALL be present in the plan''s effective tag set (plan ∪ tasks) for the rule to match; empty array matches every plan. Unknown tags never match (graceful degrade).';

COMMENT ON COLUMN tag_action_rules.status IS 'Optional plan-status qualifier: NULL matches any status; a value requires the plan to be in that status at evaluation time.';

COMMENT ON COLUMN tag_action_rules.environment IS 'Optional environment qualifier: NULL applies to every environment; a value (ci | interactive | ralph) scopes the rule to that environment.';

COMMENT ON COLUMN tag_action_rules.action_type IS 'Which ActionExecutor handles the payload: inject-task (require/inject a task into the plan) or availability-exception (ephemeral skill-availability resolver inputs on plan-context reads).';

COMMENT ON COLUMN tag_action_rules.action_payload IS 'Typed action parameters, Zod-validated per action_type at write time (inject-task: skillSlug/placement/anchor/templates, placement first|last|before|after with before/after requiring an anchor {taskId|skillSlug|titleMatch}; availability-exception: tagAllow/tagDeny/slugAllow/slugDeny).';

COMMENT ON COLUMN tag_action_rules.enabled IS 'Soft on/off switch; disabled rules never match. Preferred over deletion so the rule_applications ledger history survives.';

COMMENT ON COLUMN tag_action_rules.created_at IS 'Row creation timestamp.';

COMMENT ON COLUMN tag_action_rules.updated_at IS 'Last-update timestamp, maintained by the update_updated_at_column() trigger.';
