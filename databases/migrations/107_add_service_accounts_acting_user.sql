-- Let a service account act as a user (OT plan 93a9a96f — fix MCP plan
-- workspace seeding).
--
-- Plans created through the OT MCP authenticate as a service account, so the
-- workspace-seeding convenience added in plan 8c1396b8 (resolve the creating
-- checkout against the CALLER'S registered repository_checkouts) always found
-- zero rows: checkouts belong to human users, and a service account is its own
-- principal. acting_user_id names the human user this machine identity acts as
-- for such user-scoped conveniences.
--
-- Idempotent: re-running is a no-op.

ALTER TABLE service_accounts
  ADD COLUMN IF NOT EXISTS acting_user_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'service_accounts_acting_user_id_fkey'
      AND conrelid = 'service_accounts'::regclass
  ) THEN
    ALTER TABLE service_accounts
      ADD CONSTRAINT service_accounts_acting_user_id_fkey
      FOREIGN KEY (acting_user_id) REFERENCES users(id) ON DELETE SET NULL;
  END IF;
END $$;

COMMENT ON COLUMN service_accounts.acting_user_id IS 'The human user this machine identity acts as for user-scoped conveniences (e.g. resolving a plan''s creating workspace against that user''s registered checkouts). NULL means the account acts as no one and those conveniences no-op. A hint, never a permission grant — authorization still comes from service_account_roles. Provisioned for the bootstrap accounts by scripts/bootstrap-default-user.ts; editable via the updateServiceAccount GraphQL mutation.';
