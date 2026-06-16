-- Record who enqueued a plan run, so user-scoped notifications (user:<userId>:notifications)
-- have an actor key. Nullable: runs enqueued by a service account or system have no user actor,
-- and rows queued before this column existed are null.
ALTER TABLE plan_runs
ADD COLUMN IF NOT EXISTS actor_user_id UUID NULL REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_plan_runs_actor_user_id ON plan_runs (actor_user_id);

COMMENT ON COLUMN plan_runs.actor_user_id IS 'User who enqueued this run (auth sub when the principal is a user). Null for service-account/system runs and for rows queued before this column existed. Keys user-scoped notifications.';
