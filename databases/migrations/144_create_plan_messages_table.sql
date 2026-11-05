-- Plan inbox: the single plan-scoped home for human prose on an OpenThrottle plan.
--
-- A human can steer or queue a message to a plan while a run is live (kind STEER / QUEUE), or
-- leave post-run feedback (kind FEEDBACK, written by the reflection skills). STEER and QUEUE
-- rows start PENDING and are consumed exactly once by claimPlanMessages, which flips them to
-- DELIVERED and appends one audit chunk per message to plan_output_stream in the same
-- transaction. FEEDBACK rows are never delivered: they are created RECORDED and only read.
--
-- The inbox is plan-scoped, not run-scoped: a PENDING message outlives a stopped or cancelled
-- run and is delivered to the plan's next run.
--
-- kind / status are CHECK-constrained TEXT (no Postgres enum), mirrored by `as const` objects
-- in TypeScript. Foreign keys are added in their own pg_constraint-guarded statements so a
-- re-run against an existing table still lands them (see databases/README.md § Foreign keys).

CREATE TABLE IF NOT EXISTS plan_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id UUID NOT NULL,
    task_id UUID NULL,
    kind TEXT NOT NULL,
    author TEXT NOT NULL,
    body TEXT NOT NULL,
    status TEXT NOT NULL,
    plan_run_id UUID NULL,
    delivered_at TIMESTAMP WITH TIME ZONE NULL,
    delivered_to_task_id UUID NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_plan_messages_kind CHECK (kind IN ('STEER', 'QUEUE', 'FEEDBACK')),
    CONSTRAINT chk_plan_messages_status CHECK (status IN ('PENDING', 'DELIVERED', 'WITHDRAWN', 'RECORDED')),
    CONSTRAINT chk_plan_messages_body CHECK (length(btrim(body)) > 0),
    CONSTRAINT chk_plan_messages_author CHECK (length(btrim(author)) > 0),
    CONSTRAINT chk_plan_messages_feedback_recorded CHECK ((kind = 'FEEDBACK') = (status = 'RECORDED')),
    CONSTRAINT chk_plan_messages_delivered_at CHECK ((status = 'DELIVERED') = (delivered_at IS NOT NULL))
);

COMMENT ON TABLE plan_messages IS 'Plan inbox: human messages about an OpenThrottle plan. STEER/QUEUE messages are delivered to a live run at its next task boundary (claimPlanMessages); FEEDBACK is post-run reflection that is recorded, never delivered. The one plan-scoped home for human prose on a plan.';

COMMENT ON COLUMN plan_messages.id IS 'Surrogate key.';

COMMENT ON COLUMN plan_messages.plan_id IS 'Plan the message is about (FK plans.id, ON DELETE CASCADE). Delivery is plan-scoped: a PENDING message goes to whichever run of this plan claims next.';

COMMENT ON COLUMN plan_messages.task_id IS 'Task the human was looking at when they wrote the message (FK tasks.id, ON DELETE SET NULL). Context only -- it does not decide where the message is delivered.';

COMMENT ON COLUMN plan_messages.kind IS 'STEER (a correction that overrides the task description where they conflict; delivered first), QUEUE (an extra requirement for the upcoming work; delivered after STEERs) or FEEDBACK (post-run reflection; never delivered). chk_plan_messages_kind.';

COMMENT ON COLUMN plan_messages.author IS 'GitHub username of the human who wrote the message (same convention as plans.author).';

COMMENT ON COLUMN plan_messages.body IS 'Message text. Non-empty (chk_plan_messages_body). Editable only while PENDING.';

COMMENT ON COLUMN plan_messages.status IS 'PENDING (waiting for the next task boundary), DELIVERED (claimed by a run; immutable), WITHDRAWN (retracted by its author before delivery) or RECORDED (FEEDBACK rows only, enforced by chk_plan_messages_feedback_recorded).';

COMMENT ON COLUMN plan_messages.plan_run_id IS 'Run that consumed the message, stamped on delivery (FK plan_runs.id, ON DELETE SET NULL). NULL until DELIVERED, and for claims made outside a registered run.';

COMMENT ON COLUMN plan_messages.delivered_at IS 'When the message was claimed. Set iff status = DELIVERED (chk_plan_messages_delivered_at).';

COMMENT ON COLUMN plan_messages.delivered_to_task_id IS 'Task the agent was about to start when the message was applied (FK tasks.id, ON DELETE SET NULL). NULL until DELIVERED.';

COMMENT ON COLUMN plan_messages.created_at IS 'Row creation time; delivery order is created_at ascending within each kind.';

COMMENT ON COLUMN plan_messages.updated_at IS 'Last modification time; maintained by the update_plan_messages_updated_at trigger.';

CREATE INDEX IF NOT EXISTS idx_plan_messages_plan_id_status_created_at ON plan_messages (plan_id, status, created_at);

CREATE INDEX IF NOT EXISTS idx_plan_messages_pending ON plan_messages (plan_id, created_at) WHERE status = 'PENDING';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'plan_messages_plan_id_fkey') THEN
    ALTER TABLE plan_messages ADD CONSTRAINT plan_messages_plan_id_fkey
      FOREIGN KEY (plan_id) REFERENCES plans (id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'plan_messages_task_id_fkey') THEN
    ALTER TABLE plan_messages ADD CONSTRAINT plan_messages_task_id_fkey
      FOREIGN KEY (task_id) REFERENCES tasks (id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'plan_messages_plan_run_id_fkey') THEN
    ALTER TABLE plan_messages ADD CONSTRAINT plan_messages_plan_run_id_fkey
      FOREIGN KEY (plan_run_id) REFERENCES plan_runs (id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'plan_messages_delivered_to_task_id_fkey') THEN
    ALTER TABLE plan_messages ADD CONSTRAINT plan_messages_delivered_to_task_id_fkey
      FOREIGN KEY (delivered_to_task_id) REFERENCES tasks (id) ON DELETE SET NULL;
  END IF;
END
$$;

DROP TRIGGER IF EXISTS update_plan_messages_updated_at ON plan_messages;

CREATE TRIGGER update_plan_messages_updated_at
  BEFORE UPDATE ON plan_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
