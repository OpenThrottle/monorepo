-- Rename user_disabled_agent_clis.backend to driver (OT plan 3b05db1a, follow-up to 624a1036
-- decision Q16).
--
-- The value has always been a driver id (validated with isDriverId). This renames the column, its
-- named NOT NULL constraint and the two partial unique indexes from migration 092, and refreshes the
-- comments. No data changes.
--
-- Idempotent: every step is guarded, so a re-run is a no-op.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'user_disabled_agent_clis'
      AND column_name = 'backend'
  ) THEN
    ALTER TABLE user_disabled_agent_clis RENAME COLUMN backend TO driver;
  END IF;
END
$$;

-- The named NOT NULL constraint (Postgres 18) keeps the old column name after a rename.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'user_disabled_agent_clis'::regclass
      AND conname = 'user_disabled_agent_clis_backend_not_null'
  ) THEN
    ALTER TABLE user_disabled_agent_clis
      RENAME CONSTRAINT user_disabled_agent_clis_backend_not_null TO user_disabled_agent_clis_driver_not_null;
  END IF;
END
$$;

ALTER INDEX IF EXISTS uq_user_disabled_agent_clis_user_backend_agent
  RENAME TO uq_user_disabled_agent_clis_user_driver_agent;

ALTER INDEX IF EXISTS uq_user_disabled_agent_clis_user_backend_model
  RENAME TO uq_user_disabled_agent_clis_user_driver_model;

COMMENT ON TABLE user_disabled_agent_clis IS 'Per-user set of DISABLED agent CLI drivers. Presence-as-disabled: a row means the user turned that agent off; absence means enabled. Empty table = the default all-enabled posture (no backfill). Disabled agents are hidden from chat/model pickers and rejected when starting new runs.';

COMMENT ON COLUMN user_disabled_agent_clis.driver IS 'Driver id (e.g. ''claude'', ''cursor''), validated server-side against the @openthrottle/openthrottle-drivers registry (isDriverId) before insert. No FK because the allowlist is code, not a table.';
