-- Job-run lifecycle hooks (phase 1): versioned with plan, copied onto BullMQ enqueue payload.
ALTER TABLE plans
ADD COLUMN IF NOT EXISTS job_run_hooks JSONB NOT NULL DEFAULT '{"hooks":[]}'::jsonb;

COMMENT ON COLUMN plans.job_run_hooks IS 'Ordered before_run / after_run hooks ({ hooks: [...] }). See JOB_RUN_LIFECYCLE_HOOKS.md and @tools/workflows job-run-lifecycle-hooks types.';
