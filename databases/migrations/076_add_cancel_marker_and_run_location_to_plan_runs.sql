-- Honest plan-run cancellation + cross-process kill (OT plan 2ab62876).
-- Adds the durable cancel-request marker (the cross-process/host/CLI stop
-- guarantee) and run-location columns (observability + same-host escalation
-- groundwork) to plan_runs, and relaxes the (queue_name, bullmq_job_id)
-- uniqueness so a detached-CLI run can persist a row with no BullMQ job id.
--
-- Channel 1 (durable marker): cancel_requested_at/by are stamped by
-- PlanStatusService.cancelRun and polled by the run loop at the same iteration
-- boundaries it already checks abortSignal.aborted — so cancellation always
-- eventually takes effect regardless of which process/host owns the run.
-- Location columns are populated at job start (alongside the in-memory
-- AbortController attach) and cleared in the worker finally (alongside detach).
-- Cross-host OS kill is explicitly out of scope; pid/hostname are diagnostic.
-- See databases README + docs plan 2ab62876 (kill-semantics matrix).

-- Durable cancel-request marker (Channel 1).
ALTER TABLE plan_runs ADD COLUMN IF NOT EXISTS cancel_requested_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE plan_runs ADD COLUMN IF NOT EXISTS cancel_requested_by UUID;

-- Run-location columns (observability + same-host escalation groundwork).
ALTER TABLE plan_runs ADD COLUMN IF NOT EXISTS hostname TEXT;
ALTER TABLE plan_runs ADD COLUMN IF NOT EXISTS pid INTEGER;
ALTER TABLE plan_runs ADD COLUMN IF NOT EXISTS worker_id TEXT;

-- Detached-CLI runs have no BullMQ job id: allow NULL and swap the full unique
-- constraint for a PARTIAL unique index so BullMQ uniqueness still holds only
-- where a job id is present (locked knob #3).
ALTER TABLE plan_runs ALTER COLUMN bullmq_job_id DROP NOT NULL;
ALTER TABLE plan_runs DROP CONSTRAINT IF EXISTS plan_runs_queue_job_unique;
CREATE UNIQUE INDEX IF NOT EXISTS plan_runs_queue_job_unique_idx
  ON plan_runs (queue_name, bullmq_job_id)
  WHERE bullmq_job_id IS NOT NULL;

COMMENT ON COLUMN plan_runs.cancel_requested_at IS 'Durable cancel-request marker (Channel 1): when cancelRun stamped a stop request for this run. The run loop polls this at each iteration boundary and aborts if set, guaranteeing cross-process/host/CLI cancellation even if the Redis pub/sub fast-path message was missed. NULL when no cancel was requested.';
COMMENT ON COLUMN plan_runs.cancel_requested_by IS 'User (auth sub) who requested cancellation; NULL for service-account/system cancels or when no cancel was requested. Auditable companion to cancel_requested_at.';
COMMENT ON COLUMN plan_runs.hostname IS 'Host the worker executing this run is on (os.hostname()); populated at job start, cleared in the worker finally. Observability + same-host escalation groundwork only — cross-host OS kill is out of scope. NULL when the run is not actively executing.';
COMMENT ON COLUMN plan_runs.pid IS 'OS process id of the worker executing this run; populated at job start, cleared in the worker finally. Diagnostic + future same-host pid-targeted escalation. NULL when not actively executing.';
COMMENT ON COLUMN plan_runs.worker_id IS 'Identifier of the worker instance executing this run (BullMQ worker id); populated at job start, cleared in the worker finally. NULL when not actively executing.';
COMMENT ON COLUMN plan_runs.bullmq_job_id IS 'BullMQ job id for this run; NULL for detached-CLI runs that carry no queue job. Unique per queue_name via the partial index plan_runs_queue_job_unique_idx (only where NOT NULL).';
