-- Project runs: a project's plans run one after another, one draft PR each.
--
-- A project run walks the project's plans in `plans.project_sort_order` order, enqueues each on
-- the existing plan-run queue (respecting the plan's runner), waits for its run to settle, and
-- only then starts the next. Strictly sequential. The state lives here, not in memory, so a
-- server restart mid-run resumes: the advance step reads this row and makes one move.
--
-- `plan_runs.project_run_id` tags the plan runs a project run started, so the advance step can
-- tell "our run" from an unrelated one on the same plan.
--
-- Runs are history and are written in place (status, current plan, cancel marker), so the table
-- is a BaseHardDeleteModel shape with its own `updated_at`.

CREATE TABLE IF NOT EXISTS project_runs (
    id UUID PRIMARY KEY DEFAULT uuidv7(),
    project_id UUID NOT NULL,
    status TEXT NOT NULL DEFAULT 'QUEUED',
    current_plan_id UUID,
    stopped_by_plan_id UUID,
    stopped_reason TEXT,
    cancel_requested_at TIMESTAMP WITH TIME ZONE,
    cancel_requested_by UUID,
    actor_user_id UUID,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    started_at TIMESTAMP WITH TIME ZONE,
    settled_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'project_runs_status_check') THEN
    ALTER TABLE project_runs ADD CONSTRAINT project_runs_status_check
      CHECK (status IN ('QUEUED', 'IN_PROGRESS', 'COMPLETED', 'STOPPED', 'CANCELLED'));
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'project_runs_project_id_fkey') THEN
    ALTER TABLE project_runs ADD CONSTRAINT project_runs_project_id_fkey
      FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'project_runs_current_plan_id_fkey') THEN
    ALTER TABLE project_runs ADD CONSTRAINT project_runs_current_plan_id_fkey
      FOREIGN KEY (current_plan_id) REFERENCES plans (id) ON DELETE SET NULL;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'project_runs_stopped_by_plan_id_fkey') THEN
    ALTER TABLE project_runs ADD CONSTRAINT project_runs_stopped_by_plan_id_fkey
      FOREIGN KEY (stopped_by_plan_id) REFERENCES plans (id) ON DELETE SET NULL;
  END IF;
END
$$;

-- Run history for a project, newest first.
CREATE INDEX IF NOT EXISTS idx_project_runs_project_id_created_at
  ON project_runs (project_id, created_at DESC);

-- At most one active project run per project: a second runProject while one is live is refused.
CREATE UNIQUE INDEX IF NOT EXISTS uq_project_runs_one_active_per_project
  ON project_runs (project_id)
  WHERE status IN ('QUEUED', 'IN_PROGRESS');

DROP TRIGGER IF EXISTS update_project_runs_updated_at ON project_runs;

CREATE TRIGGER update_project_runs_updated_at
  BEFORE UPDATE ON project_runs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE plan_runs ADD COLUMN IF NOT EXISTS project_run_id UUID;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'plan_runs_project_run_id_fkey') THEN
    ALTER TABLE plan_runs ADD CONSTRAINT plan_runs_project_run_id_fkey
      FOREIGN KEY (project_run_id) REFERENCES project_runs (id) ON DELETE SET NULL;
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_plan_runs_project_run_id
  ON plan_runs (project_run_id)
  WHERE project_run_id IS NOT NULL;

COMMENT ON TABLE project_runs IS 'OpenThrottle project runs: one row per run of a project, which enqueues the project''s plans one after another in plans.project_sort_order order, waits for each plan run to settle with a draft PR, and stops on the first plan that does not. Strictly sequential; at most one active (QUEUED/IN_PROGRESS) run per project.';

COMMENT ON COLUMN project_runs.id IS 'Surrogate primary key (uuidv7).';

COMMENT ON COLUMN project_runs.project_id IS 'The project being run (projects.id); cascade-deleted with the project row.';

COMMENT ON COLUMN project_runs.status IS 'QUEUED (created, nothing enqueued yet), IN_PROGRESS (a plan is running), COMPLETED (every plan done), STOPPED (a plan did not finish; see stopped_by_plan_id and stopped_reason) or CANCELLED (a cancel was requested). Only QUEUED and IN_PROGRESS are active.';

COMMENT ON COLUMN project_runs.current_plan_id IS 'The plan the run is on now (plans.id), or the last one it was on once settled. NULL before the first plan is enqueued. Set NULL if that plan is deleted.';

COMMENT ON COLUMN project_runs.stopped_by_plan_id IS 'For a STOPPED run, the plan that stopped it (plans.id); a fresh run of the project resumes there. NULL otherwise.';

COMMENT ON COLUMN project_runs.stopped_reason IS 'Human-readable reason a STOPPED run stopped: the plan run status that ended it, a plan already BLOCKED, an unrelated active run on the plan, or an enqueue refusal. NULL otherwise.';

COMMENT ON COLUMN project_runs.cancel_requested_at IS 'When a cancel was requested; the advance step cancels the current plan run and settles CANCELLED. NULL when none was requested.';

COMMENT ON COLUMN project_runs.cancel_requested_by IS 'User (auth sub) who requested the cancel; NULL for none or a system cancel.';

COMMENT ON COLUMN project_runs.actor_user_id IS 'User who started the run; plan runs it enqueues are attributed to this user. NULL for service-account or system runs.';

COMMENT ON COLUMN project_runs.created_at IS 'When the run was created.';

COMMENT ON COLUMN project_runs.started_at IS 'When the run enqueued its first plan (QUEUED -> IN_PROGRESS). NULL until then.';

COMMENT ON COLUMN project_runs.settled_at IS 'When the run reached a terminal status (COMPLETED, STOPPED, CANCELLED). NULL while active.';

COMMENT ON COLUMN project_runs.updated_at IS 'Last-update timestamp, maintained by the update_updated_at_column() trigger.';

COMMENT ON COLUMN plan_runs.project_run_id IS 'The project run that enqueued this plan run (project_runs.id), so the advance step can tell its own run from an unrelated one on the same plan. NULL for every plan run started on its own. Set NULL if the project run is deleted.';
