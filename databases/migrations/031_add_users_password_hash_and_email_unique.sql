-- Add password_hash and email uniqueness for OpenThrottle local auth (Cortex as user store).
-- See docs/openthrottle/openthrottle-server-auth.md and plan "Implement Passport local strategy for OpenThrottle auth (Cortex DB)".
--
-- password_hash: nullable so existing users (e.g. github_username-only) are not broken.
-- New auth users should set password_hash (bcrypt) and email for login.
--
-- email: unique constraint so login can look up by email; multiple NULL emails remain allowed.
--
-- Optional: If you prefer a clean schema, you can drop and recreate the users table instead:
--   DROP TABLE IF EXISTS users;
--   -- then run a single migration that CREATE TABLE users (id, created_at, updated_at, email TEXT NOT NULL UNIQUE, github_username TEXT, password_hash TEXT NOT NULL, ...);
-- Existing plan/task assignee references (e.g. author/assignee as GitHub username) can stay
-- as text; linking to users.id is a separate migration if desired.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS password_hash TEXT;

-- Unique index on email for login lookups; allows multiple NULLs (existing rows without email).
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_unique ON users (email) WHERE email IS NOT NULL;
