-- Give the batch 6 identity tables their base-model shapes (@openthrottle/nestjs-postgres).
-- Batch 6 of moving the entities into @openthrottle/nestjs-repositories-server
-- (OT plan 8a341c01-544d-44ae-8c12-f8d6a9802ab5).
--
--   users, roles, service_accounts          → BaseModel: `deleted_at` + uuidv7 `id` default
--                                             (service_accounts also gains `updated_at`)
--   permissions, service_account_credentials → BaseHardDeleteModel: uuidv7 `id` default only
--
-- Existing ids are untouched; only rows inserted from now on get a uuidv7.
--
-- USER DELETION: users are SOFT deleted. Until now nothing deleted a user at all (the app
-- only disables one through `disabled_at`), so no delete path changes behavior today. A
-- user is the actor on plans, runs, settings and the work ledger, so a delete that wipes
-- that history through the FK cascades is the wrong default; a soft delete can still be
-- purged later. To keep a soft-deleted user from blocking their email or GitHub username,
-- both unique indexes become partial: unique among live users only.
--
-- DELETE SEMANTICS CHANGE for roles. Deleting a role was a hard DELETE whose FKs cascaded
-- away its role_permissions, user_roles and service_account_roles rows. It is now an UPDATE,
-- so the join rows stay; TypeORM's relation loading filters the soft-deleted role out of
-- every user's and service account's roles, so the grant is gone the moment the role is.
-- A later purge (a hard DELETE) still cascades exactly as before.
--
-- permissions are seeded by migrations and never user-deleted; service_account_credentials
-- are revoked through `revoked_at`, and a deleted credential must really be gone, so both
-- stay hard-deleted. Neither gets `updated_at`: credentials stamp their own lifecycle
-- columns (`last_used_at`, `revoked_at`), and permissions are never updated.
--
-- Every seed migration inserts users, roles and service accounts with `WHERE NOT EXISTS`,
-- never `ON CONFLICT (name)`, so the partial unique indexes below break no existing seed.
-- A future seed must keep that form (or spell `ON CONFLICT (name) WHERE deleted_at IS NULL`).

-- ---------------------------------------------------------------------------
-- users
-- ---------------------------------------------------------------------------

ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE NULL;

COMMENT ON COLUMN users.deleted_at IS
  'When this user was soft deleted; NULL for live users. A soft-deleted user frees their email and GitHub username for reuse; their history (plans, runs, ledger) stays in place.';

ALTER TABLE users ALTER COLUMN id SET DEFAULT uuidv7();

-- A soft-deleted user must not block reusing their GitHub username or email.
DROP INDEX IF EXISTS idx_users_github_username;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_github_username_live
  ON users (github_username)
  WHERE deleted_at IS NULL;

DROP INDEX IF EXISTS idx_users_email_unique;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_live
  ON users (email)
  WHERE email IS NOT NULL AND deleted_at IS NULL;

DROP INDEX IF EXISTS idx_users_created_at;

CREATE INDEX IF NOT EXISTS idx_users_live_created_at
  ON users (created_at DESC)
  WHERE deleted_at IS NULL;

-- ---------------------------------------------------------------------------
-- roles
-- ---------------------------------------------------------------------------

ALTER TABLE roles ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE NULL;

COMMENT ON COLUMN roles.deleted_at IS
  'When this role was soft deleted; NULL for live roles. Its role_permissions, user_roles and service_account_roles rows stay, but a soft-deleted role grants nothing: relation loading reads live roles only.';

ALTER TABLE roles ALTER COLUMN id SET DEFAULT uuidv7();

DROP INDEX IF EXISTS idx_roles_name;

CREATE UNIQUE INDEX IF NOT EXISTS idx_roles_name_live
  ON roles (name)
  WHERE deleted_at IS NULL;

-- ---------------------------------------------------------------------------
-- service_accounts
-- ---------------------------------------------------------------------------

ALTER TABLE service_accounts ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE NULL;

COMMENT ON COLUMN service_accounts.deleted_at IS
  'When this service account was soft deleted; NULL for live accounts. Its credentials and role grants stay in place, unreachable through the deleted account.';

-- `updated_at` is backfilled from `created_at`, so existing rows read "never updated".
ALTER TABLE service_accounts ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE;
UPDATE service_accounts SET updated_at = created_at WHERE updated_at IS NULL;
ALTER TABLE service_accounts ALTER COLUMN updated_at SET DEFAULT now();
ALTER TABLE service_accounts ALTER COLUMN updated_at SET NOT NULL;

COMMENT ON COLUMN service_accounts.updated_at IS
  'When this service account was last updated (name, description, acting user, disabled state)';

DROP TRIGGER IF EXISTS update_service_accounts_updated_at ON service_accounts;

CREATE TRIGGER update_service_accounts_updated_at
  BEFORE UPDATE ON service_accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE service_accounts ALTER COLUMN id SET DEFAULT uuidv7();

DROP INDEX IF EXISTS idx_service_accounts_name;

CREATE UNIQUE INDEX IF NOT EXISTS idx_service_accounts_name_live
  ON service_accounts (name)
  WHERE deleted_at IS NULL;

-- ---------------------------------------------------------------------------
-- permissions, service_account_credentials (BaseHardDeleteModel)
-- ---------------------------------------------------------------------------
-- Both already have `id` and `created_at`.

ALTER TABLE permissions ALTER COLUMN id SET DEFAULT uuidv7();
ALTER TABLE service_account_credentials ALTER COLUMN id SET DEFAULT uuidv7();
