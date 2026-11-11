-- Persist queued Ralph plan runs for auditability.
-- BullMQ remains the execution queue; this table stores the API-visible run record.
CREATE TABLE IF NOT EXISTS plan_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
    queue_name TEXT NOT NULL DEFAULT 'plans',
    bullmq_job_id TEXT NOT NULL,
    run_kind TEXT NOT NULL DEFAULT 'spawn',
    execution_backend TEXT NOT NULL DEFAULT 'cursor',
    status TEXT NOT NULL DEFAULT 'QUEUED',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT plan_runs_run_kind_check CHECK (run_kind IN ('spawn', 'orchestrator')),
    CONSTRAINT plan_runs_execution_backend_check CHECK (execution_backend IN ('cursor', 'claude')),
    CONSTRAINT plan_runs_queue_job_unique UNIQUE (queue_name, bullmq_job_id)
);

CREATE INDEX IF NOT EXISTS idx_plan_runs_plan_created_at ON plan_runs (plan_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_plan_runs_execution_backend ON plan_runs (execution_backend);

COMMENT ON TABLE plan_runs IS 'Audit table for queued Ralph plan runs. Each row stores the single execution backend selected for that run.';
COMMENT ON COLUMN plan_runs.execution_backend IS 'Execution backend selected once for the whole plan run: cursor or claude.';
