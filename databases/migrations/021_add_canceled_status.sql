-- Document canonical plan/task statuses (including canceled)
-- Canonical statuses: backlog, blocked, canceled, completed, in_progress, pending, skipped
-- canceled = closed with no work / not doing; completed = work done; skipped = deferred or skipped for now
COMMENT ON COLUMN plans.status IS 'Canonical values: backlog, blocked, canceled, completed, in_progress, pending, skipped';
COMMENT ON COLUMN tasks.status IS 'Canonical values: backlog, blocked, canceled, completed, in_progress, pending, skipped';
