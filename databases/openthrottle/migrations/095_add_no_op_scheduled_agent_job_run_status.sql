-- Add a 'no_op' terminal run status for scheduled agent jobs.
--
-- Until now the processor mapped the child process exit code straight onto the
-- run status: exit 0 -> 'succeeded'. Agent CLIs exit 0 when the model declines
-- to act, so a run whose agent explicitly refused its task (e.g. because a
-- required MCP server was not attached) was indistinguishable from one that did
-- the work. Every MCP-dependent scheduled job had been silently green.
--
-- 'no_op' means: the process ran and exited cleanly, but the agent reported that
-- it did not perform the work. It is terminal and NOT an error — 'failed' is
-- reserved for a non-zero exit, timeout, or spawn failure.
--
-- Populated only when the agent emits the explicit OT_RUN_OUTCOME sentinel that
-- a job's prompt opts into, so existing jobs keep their current mapping and no
-- historical row changes meaning. Idempotent: the CHECK is dropped and recreated.

ALTER TABLE scheduled_agent_job_runs
    DROP CONSTRAINT IF EXISTS chk_scheduled_agent_job_runs_status;

ALTER TABLE scheduled_agent_job_runs
    ADD CONSTRAINT chk_scheduled_agent_job_runs_status CHECK (
        status IN ('queued', 'running', 'succeeded', 'failed', 'cancelled', 'no_op')
    );

COMMENT ON COLUMN scheduled_agent_job_runs.status IS 'queued (pre-created by run-now) -> running (claimed by processor) -> succeeded | no_op | failed | cancelled. Mapped from runAgentPrompt RunAgentStatus, except no_op which comes from the agent-emitted OT_RUN_OUTCOME sentinel: the process exited 0 but the agent reported it did not do the work. no_op is terminal and is NOT an error.';
