-- Document canonical plan/task statuses (including backlog)
-- Canonical statuses: backlog, blocked, completed, in_progress, pending, skipped
COMMENT ON COLUMN plans.status IS 'Canonical values: backlog, blocked, completed, in_progress, pending, skipped';
COMMENT ON COLUMN tasks.status IS 'Canonical values: backlog, blocked, completed, in_progress, pending, skipped';
