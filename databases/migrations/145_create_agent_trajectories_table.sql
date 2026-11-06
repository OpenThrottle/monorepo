-- Agent trajectories: one recorded run iteration per row, stored as an ATIF v1.8 document.
--
-- Decision 5 of docs/openthrottle/eval-system-adr.md. The full trajectory lives in JSONB; the
-- summary columns (tool_call_count, tokens, cost, duration, exit code, outcome) exist so graders
-- and reports can filter and aggregate without parsing the document. Capture is fail-open: a
-- capture error is logged and never fails the run, so a missing row is not evidence of a failure.
--
-- source is CHECK-constrained TEXT (no Postgres enum), mirrored by an
-- `as const` object in TypeScript. Foreign keys are added in their own pg_constraint-guarded
-- statements so a re-run against an existing table still lands them (see databases/README.md
-- § Foreign keys).

CREATE TABLE IF NOT EXISTS agent_trajectories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_run_id UUID NOT NULL,
    task_id UUID NULL,
    source TEXT NOT NULL,
    driver TEXT NOT NULL,
    model TEXT NULL,
    schema_version TEXT NOT NULL,
    trajectory JSONB NOT NULL,
    tool_call_count INTEGER NOT NULL DEFAULT 0,
    input_tokens INTEGER NULL,
    cached_tokens INTEGER NULL,
    output_tokens INTEGER NULL,
    cost_usd NUMERIC(12, 6) NULL,
    duration_ms INTEGER NULL,
    exit_code INTEGER NULL,
    outcome TEXT NULL,
    byte_size INTEGER NOT NULL,
    truncated BOOLEAN NOT NULL DEFAULT FALSE,
    incomplete BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_agent_trajectories_source CHECK (source IN ('spawned', 'session_upload'))
);

COMMENT ON TABLE agent_trajectories IS 'OpenThrottle agent trajectories: one row per agent run iteration. The trajectory column is an ATIF v1.8 document; the other columns are summaries for filtering without parsing it. Capture is fail-open, so a run can legitimately have no row. See docs/openthrottle/eval-system-adr.md (Decisions 5 and 6).';

COMMENT ON COLUMN agent_trajectories.id IS 'Surrogate key.';

COMMENT ON COLUMN agent_trajectories.plan_run_id IS 'Plan run the iteration belongs to (FK plan_runs.id, ON DELETE CASCADE).';

COMMENT ON COLUMN agent_trajectories.task_id IS 'Task the iteration worked on (FK tasks.id, ON DELETE SET NULL). NULL for runs not scoped to one task.';

COMMENT ON COLUMN agent_trajectories.source IS 'How the trajectory was captured: spawned (the OpenThrottle runner recorded the driver stream) or session_upload (a Stop-hook transcript upload from an interactive session). chk_agent_trajectories_source.';

COMMENT ON COLUMN agent_trajectories.driver IS 'Agent driver (CLI) that produced the run, e.g. claude or codex.';

COMMENT ON COLUMN agent_trajectories.model IS 'Model the driver ran, as reported by the CLI. NULL when the CLI does not report one.';

COMMENT ON COLUMN agent_trajectories.schema_version IS 'ATIF schema version of the trajectory document, e.g. ATIF-v1.8.';

COMMENT ON COLUMN agent_trajectories.trajectory IS 'The ATIF v1.8 document (agent, steps, final_metrics). Observation contents may have been elided by the size caps; see truncated.';

COMMENT ON COLUMN agent_trajectories.tool_call_count IS 'Number of tool calls across all steps. 0 when the CLI reports none.';

COMMENT ON COLUMN agent_trajectories.input_tokens IS 'Total prompt tokens, INCLUDING cached_tokens (ATIF accounting). NULL when the CLI reports no usage.';

COMMENT ON COLUMN agent_trajectories.cached_tokens IS 'Prompt tokens served from the provider cache; a subset of input_tokens. NULL when not reported.';

COMMENT ON COLUMN agent_trajectories.output_tokens IS 'Total completion tokens. NULL when not reported.';

COMMENT ON COLUMN agent_trajectories.cost_usd IS 'Run cost in USD, six decimal places. NULL means unpriceable (for example a subscription-backed CLI), never zero.';

COMMENT ON COLUMN agent_trajectories.duration_ms IS 'Wall-clock duration of the iteration in milliseconds. NULL when unknown.';

COMMENT ON COLUMN agent_trajectories.exit_code IS 'Process exit code of the CLI. NULL when the run did not exit normally or the code is unknown.';

COMMENT ON COLUMN agent_trajectories.outcome IS 'Free-text outcome label recorded by the runner (for example completed, failed, usage_limited). NULL when not classified.';

COMMENT ON COLUMN agent_trajectories.byte_size IS 'UTF-8 byte length of the stored trajectory JSON, after any capping.';

COMMENT ON COLUMN agent_trajectories.truncated IS 'TRUE when a size cap elided part of the trajectory (a 16 KiB per-observation cap or the 4 MiB whole-document cap).';

COMMENT ON COLUMN agent_trajectories.incomplete IS 'TRUE when the run ended before the driver emitted a final result, so the trajectory is a prefix of what happened.';

COMMENT ON COLUMN agent_trajectories.created_at IS 'Row creation time. The retention sweep prunes by this column.';

CREATE INDEX IF NOT EXISTS idx_agent_trajectories_plan_run_id ON agent_trajectories (plan_run_id);

CREATE INDEX IF NOT EXISTS idx_agent_trajectories_task_id ON agent_trajectories (task_id);

CREATE INDEX IF NOT EXISTS idx_agent_trajectories_created_at ON agent_trajectories (created_at);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'agent_trajectories_plan_run_id_fkey') THEN
    ALTER TABLE agent_trajectories ADD CONSTRAINT agent_trajectories_plan_run_id_fkey
      FOREIGN KEY (plan_run_id) REFERENCES plan_runs (id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'agent_trajectories_task_id_fkey') THEN
    ALTER TABLE agent_trajectories ADD CONSTRAINT agent_trajectories_task_id_fkey
      FOREIGN KEY (task_id) REFERENCES tasks (id) ON DELETE SET NULL;
  END IF;
END
$$;
