-- Rename user_favorite_agent_models.backend to driver (OT plan 3b05db1a, follow-up to 624a1036
-- decision Q16).
--
-- The value has always been a driver id (validated with isDriverId). This renames the column, its
-- named NOT NULL constraint and the unique constraint from migration 092 (which renames its backing
-- index with it), and refreshes the comments. No data changes.
--
-- Idempotent: every step is guarded, so a re-run is a no-op.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'user_favorite_agent_models'
      AND column_name = 'backend'
  ) THEN
    ALTER TABLE user_favorite_agent_models RENAME COLUMN backend TO driver;
  END IF;
END
$$;

-- The named NOT NULL constraint (Postgres 18) keeps the old column name after a rename.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'user_favorite_agent_models'::regclass
      AND conname = 'user_favorite_agent_models_backend_not_null'
  ) THEN
    ALTER TABLE user_favorite_agent_models
      RENAME CONSTRAINT user_favorite_agent_models_backend_not_null TO user_favorite_agent_models_driver_not_null;
  END IF;
END
$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'user_favorite_agent_models'::regclass
      AND conname = 'uq_user_favorite_agent_models_user_backend_model'
  ) THEN
    ALTER TABLE user_favorite_agent_models
      RENAME CONSTRAINT uq_user_favorite_agent_models_user_backend_model TO uq_user_favorite_agent_models_user_driver_model;
  END IF;
END
$$;

COMMENT ON TABLE user_favorite_agent_models IS 'Per-user set of FAVORITED agent-CLI models. Presence-as-favorite: a row (user_id, driver, model) means the user starred that model; absence means not-favorited. Favorite is orthogonal to enablement — it does not enable a disabled model; it only floats the model to the top of / highlights it in chat/model pickers and run selection. A favorite on a later-disabled model is inert but persists (revives when re-enabled).';

COMMENT ON COLUMN user_favorite_agent_models.driver IS 'Driver id (e.g. ''claude'', ''cursor''), validated server-side against the @openthrottle/openthrottle-drivers registry (isDriverId) before insert. No FK because the allowlist is code, not a table.';
