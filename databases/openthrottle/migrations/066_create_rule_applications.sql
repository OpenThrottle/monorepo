-- Apply-once ledger for tag→action rule executions. One row per (rule, plan) —
-- UNIQUE (rule_id, plan_id) is the fingerprint that makes at-least-once BullMQ
-- delivery and concurrent evaluation safe: an executor that finds a row in ANY
-- state no-ops. States: applied (action performed), pre-satisfied (world already
-- satisfied the rule on first evaluation), flagged (blocked by the executor's own
-- gating, details says why), orphaned (rule un-matched after applied; the action is
-- NEVER undone). Surfaced as the flagged/orphaned queue in the developer app.
-- See docs/monorepo/plan-task-tags-rules-design.md ("Executor contract").

CREATE TABLE IF NOT EXISTS rule_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_id UUID NOT NULL REFERENCES tag_action_rules (id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES plans (id) ON DELETE CASCADE,
    task_id UUID REFERENCES tasks (id) ON DELETE SET NULL,
    state TEXT NOT NULL,
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_rule_applications_state CHECK (state IN ('applied', 'pre-satisfied', 'flagged', 'orphaned')),
    CONSTRAINT uq_rule_applications_rule_plan UNIQUE (rule_id, plan_id)
);

CREATE INDEX IF NOT EXISTS idx_rule_applications_plan_id ON rule_applications (plan_id);

CREATE INDEX IF NOT EXISTS idx_rule_applications_task_id ON rule_applications (task_id);

DROP TRIGGER IF EXISTS update_rule_applications_updated_at ON rule_applications;

CREATE TRIGGER update_rule_applications_updated_at
  BEFORE UPDATE ON rule_applications
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE rule_applications IS 'Apply-once ledger for tag_action_rules executions against plans. UNIQUE (rule_id, plan_id) is the idempotency fingerprint (any-state row ⇒ executor no-op), making at-least-once redelivery and races safe. States: applied | pre-satisfied | flagged | orphaned; actions are never undone. See docs/monorepo/plan-task-tags-rules-design.md.';

COMMENT ON COLUMN rule_applications.id IS 'Surrogate primary key.';

COMMENT ON COLUMN rule_applications.rule_id IS 'The rule that was evaluated (tag_action_rules.id); cascade-deleted with the rule, taking its ledger history with it.';

COMMENT ON COLUMN rule_applications.plan_id IS 'The plan the rule was evaluated against (plans.id); cascade-deleted with the plan.';

COMMENT ON COLUMN rule_applications.task_id IS 'For inject-task applications, the injected (or pre-satisfying) task (tasks.id). SET NULL when a human deletes that task — the applied row survives so the rule is never re-applied.';

COMMENT ON COLUMN rule_applications.state IS 'Outcome: applied (action performed), pre-satisfied (already satisfied on first evaluation), flagged (blocked by executor gating; see details), orphaned (rule un-matched after applied; action left in place).';

COMMENT ON COLUMN rule_applications.details IS 'Executor-specific context for the state (e.g. {reason: ''skill-unavailable''} on flagged rows, matched tags at apply time). Rendered in the developer-app applications queue.';

COMMENT ON COLUMN rule_applications.created_at IS 'Row creation timestamp (first evaluation that produced a ledger row).';

COMMENT ON COLUMN rule_applications.updated_at IS 'Last-update timestamp (e.g. applied → orphaned flip), maintained by the update_updated_at_column() trigger.';
