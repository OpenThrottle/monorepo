-- Resolved workflow-ralph configuration at enqueue time (audit trail per plan run).
ALTER TABLE plan_runs
ADD COLUMN IF NOT EXISTS run_config_snapshot JSONB NULL;

COMMENT ON COLUMN plan_runs.run_config_snapshot IS 'Resolved PlanRunConfigSnapshot v1 at enqueue: target, workspace, Ralph tuning, optional embedded jobRunHooks. Null for runs queued before this column existed. See plan-run-config-snapshot in @openthrottle/nestjs-repositories.';
