-- Plan workflow run configuration (versioned JSON): target, workspace, Ralph tuning.
-- Lifecycle hooks remain on plans.job_run_hooks.
ALTER TABLE plans
ADD COLUMN IF NOT EXISTS run_config JSONB NOT NULL DEFAULT '{"version":1}'::jsonb;

COMMENT ON COLUMN plans.run_config IS 'Versioned workflow-ralph defaults for this plan (PlanRunConfigStorage v1 in @openthrottle/nestjs-repositories). Fields: version, target (mode, taskId), workspace (workingDirectory), ralph (executionBackend, iterations, prompt, worktree, etc.). planId is implicit (plans.id). Validated on GraphQL write; see plan-run-config-storage.validation.ts.';
