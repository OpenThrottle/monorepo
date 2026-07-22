-- Add nullable task attribution to plan_output_stream (OT plan e166dd58).
-- Foundation for task-scoped output: the Task detail Output tab renders only the
-- chunks an agent tagged with the task it was actively working. Attribution is
-- loose/best-effort (one task can span iterations; one iteration can complete
-- several tasks), so task_id is nullable and historical chunks have none.
--
-- ON DELETE SET NULL (NOT CASCADE): deleting a task must not erase its output
-- history — the chunks stay on the plan stream, just unattributed. Mirrors the
-- rule_applications.task_id convention.
--
-- Idempotent: ADD COLUMN IF NOT EXISTS carries the inline FK, so re-running skips
-- the whole add (column already present); the index + comment guards are no-ops.

ALTER TABLE plan_output_stream
  ADD COLUMN IF NOT EXISTS task_id UUID REFERENCES tasks (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_plan_output_stream_task_id_created_at
  ON plan_output_stream (task_id, created_at);

COMMENT ON COLUMN plan_output_stream.task_id IS 'Task this output chunk was attributed to; NULL for plan-scoped chunks (server-written metrics, lifecycle/job-run hooks) and all historical rows. Best-effort attribution set by the agent tagging its append_plan_output call with the task it is actively working. ON DELETE SET NULL preserves output history when a task is removed.';
