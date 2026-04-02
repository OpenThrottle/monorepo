-- Add disabled_at for admin user management (disable/enable). When set, user is disabled and cannot log in.
-- See docs/openthrottle/admin-portal-architecture.md and OpenThrottle admin plan.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS disabled_at TIMESTAMP WITH TIME ZONE;

COMMENT ON COLUMN users.disabled_at IS 'When set, user is disabled and login is rejected; null means active.';
