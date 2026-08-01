-- Generic scheduled agent jobs: user-defined "run a prompt with a provider/model on a cron
-- schedule" jobs that run on ONE shared BullMQ queue (no per-job queue). scheduled_agent_jobs is
-- the user-authored schedule; scheduled_agent_job_runs is the append-only run history (status/
-- timing) — run *logs* live in the JSONL sink (queueJobLogs/queueJobLogTail), joined by
-- bullmq_job_id. See docs/monorepo/scheduled-agent-jobs-design.md.

CREATE TABLE IF NOT EXISTS scheduled_agent_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    prompt TEXT NOT NULL,
    driver_id TEXT NOT NULL,
    model TEXT NULL,
    settings JSONB NOT NULL DEFAULT '{}'::jsonb,
    cron_pattern TEXT NOT NULL,
    timezone TEXT NULL,
    timeout_ms INTEGER NULL,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    scheduler_key TEXT NOT NULL,
    cwd TEXT NULL,
    owner_user_id UUID NULL REFERENCES users (id) ON DELETE SET NULL,
    last_run_at TIMESTAMP WITH TIME ZONE NULL,
    next_run_at TIMESTAMP WITH TIME ZONE NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_scheduled_agent_jobs_scheduler_key UNIQUE (scheduler_key)
);

COMMENT ON TABLE scheduled_agent_jobs IS 'User-defined scheduled agent jobs: a prompt + driver/model/settings run on a cron schedule via one shared BullMQ queue. DB is authoritative; BullMQ repeatable schedulers are a projection reconciled by scheduler_key.';

COMMENT ON COLUMN scheduled_agent_jobs.driver_id IS 'openthrottle-drivers DRIVER_IDS value (claude|codex|cursor|grok|opencode). Validated app-side via parseDriverId; not CHECK-constrained because the driver set grows.';

COMMENT ON COLUMN scheduled_agent_jobs.settings IS 'Exactly the AgentPromptSettings subset (endpoint without apiKey, worktree); validated on write. NOT an arbitrary JSON bag — unknown keys are rejected, and endpoint.apiKey is disallowed (never persist a plaintext key).';

COMMENT ON COLUMN scheduled_agent_jobs.cron_pattern IS '5- or 6-field cron pattern, validated on write (rejects every-minute / bare-number foot-guns). Interpreted in `timezone` (IANA) or UTC when null.';

COMMENT ON COLUMN scheduled_agent_jobs.timeout_ms IS 'Per-job worker-layer timeout override; null falls back to SCHEDULED_AGENT_JOBS_TIMEOUT_MS.';

COMMENT ON COLUMN scheduled_agent_jobs.scheduler_key IS 'Stable BullMQ upsertJobScheduler id (scheduled-job:<id>). Unique so reconciliation is idempotent (upsert replaces, never duplicates).';

COMMENT ON COLUMN scheduled_agent_jobs.cwd IS 'Process cwd for the agent CLI; null falls back to WORKSPACE_ROOT ?? process.cwd().';

COMMENT ON COLUMN scheduled_agent_jobs.next_run_at IS 'Next fire time, read back from the BullMQ scheduler (getJobScheduler) after each upsert/fire; advisory cache, the scheduler is authoritative.';

CREATE INDEX IF NOT EXISTS idx_scheduled_agent_jobs_owner ON scheduled_agent_jobs (owner_user_id);

CREATE INDEX IF NOT EXISTS idx_scheduled_agent_jobs_enabled ON scheduled_agent_jobs (enabled)
WHERE
    enabled = TRUE;

DROP TRIGGER IF EXISTS update_scheduled_agent_jobs_updated_at ON scheduled_agent_jobs;

CREATE TRIGGER update_scheduled_agent_jobs_updated_at
  BEFORE UPDATE ON scheduled_agent_jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS scheduled_agent_job_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scheduled_agent_job_id UUID NOT NULL REFERENCES scheduled_agent_jobs (id) ON DELETE CASCADE,
    bullmq_job_id TEXT NULL,
    status TEXT NOT NULL DEFAULT 'queued',
    driver_id TEXT NOT NULL,
    model TEXT NULL,
    trigger TEXT NOT NULL DEFAULT 'schedule',
    exit_code INTEGER NULL,
    error_message TEXT NULL,
    cancel_requested_at TIMESTAMP WITH TIME ZONE NULL,
    started_at TIMESTAMP WITH TIME ZONE NULL,
    finished_at TIMESTAMP WITH TIME ZONE NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_scheduled_agent_job_runs_status CHECK (
        status IN ('queued', 'running', 'succeeded', 'failed', 'cancelled')
    ),
    CONSTRAINT chk_scheduled_agent_job_runs_trigger CHECK (trigger IN ('schedule', 'manual'))
);

COMMENT ON TABLE scheduled_agent_job_runs IS 'Append-only run history (status/timing/exit) for scheduled_agent_jobs. Run *logs* are not here — they stream to the JSONL sink (queueJobLogs/queueJobLogTail), joined by bullmq_job_id.';

COMMENT ON COLUMN scheduled_agent_job_runs.bullmq_job_id IS 'BullMQ job id; the join key to queueJobLogs (queueName, jobId). Equals the run id for run-now (jobId = runId); set inside the processor for scheduled fires.';

COMMENT ON COLUMN scheduled_agent_job_runs.status IS 'queued (pre-created by run-now) -> running (claimed by processor) -> succeeded | failed | cancelled. Mapped from runAgentPrompt RunAgentStatus.';

COMMENT ON COLUMN scheduled_agent_job_runs.trigger IS 'schedule = cron fire; manual = run-now.';

COMMENT ON COLUMN scheduled_agent_job_runs.exit_code IS 'Child process exit code from runAgentPrompt; null on timeout/cancel/spawn error.';

COMMENT ON COLUMN scheduled_agent_job_runs.cancel_requested_at IS 'Durable cancel marker set by cancelScheduledAgentJobRun; the processor aborts the run when set (paired with a cross-process cancel channel).';

CREATE INDEX IF NOT EXISTS idx_scheduled_agent_job_runs_job ON scheduled_agent_job_runs (scheduled_agent_job_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_scheduled_agent_job_runs_bullmq_job_id ON scheduled_agent_job_runs (bullmq_job_id)
WHERE
    bullmq_job_id IS NOT NULL;
