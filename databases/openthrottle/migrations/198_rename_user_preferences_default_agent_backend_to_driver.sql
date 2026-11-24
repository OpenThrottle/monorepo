-- Rename user_preferences.default_agent_backend to default_agent_driver (OT plan 3b05db1a, follow-up
-- to 624a1036 decision Q16).
--
-- The value has always been a driver id (validated with isDriverId), and the plan-run surface already
-- says `driver` (migration 194). This brings the stored column, its pairing CHECK and the comments
-- that name it in line. No data changes.
--
-- Idempotent: every step is guarded, so a re-run is a no-op.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'user_preferences'
      AND column_name = 'default_agent_backend'
  ) THEN
    ALTER TABLE user_preferences RENAME COLUMN default_agent_backend TO default_agent_driver;
  END IF;
END
$$;

-- A CHECK follows its column through a rename, so only the constraint name is stale.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'user_preferences'::regclass
      AND conname = 'chk_user_preferences_agent_backend_model_paired'
  ) THEN
    ALTER TABLE user_preferences
      RENAME CONSTRAINT chk_user_preferences_agent_backend_model_paired TO chk_user_preferences_agent_driver_model_paired;
  END IF;
END
$$;

COMMENT ON TABLE user_preferences IS 'OpenThrottle per-user preferences: a 1:1 user-level row keyed by user_id, holding defaults that follow the user across browsers and restarts (default editor, default agent driver + model + effort). One typed nullable column per preference; NULL means use the system default. Values are validated in the service, not by a catalog FK (same pattern as user_favorite_agent_models, migration 092); a preference that is no longer valid is ignored at read time, never deleted. A missing row is equivalent to an all-NULL row — reads never insert. New preferences arrive as additive nullable columns.';

COMMENT ON COLUMN user_preferences.default_agent_driver IS 'Driver id of the default agent CLI (e.g. ''claude'', ''cursor''), validated in the service with isDriverId. Set and cleared together with default_agent_model (chk_user_preferences_agent_driver_model_paired). NULL = system default. Ignored at read time when that agent is disabled for the user.';

COMMENT ON COLUMN user_preferences.default_agent_model IS 'Opaque driver-supplied model id for the default agent (as returned by agent discovery, e.g. ''gpt-5.2''); not validated against a catalog, like migration 092. Always set together with default_agent_driver. NULL = system default. Ignored at read time when the model is no longer discovered or is disabled.';

COMMENT ON COLUMN user_preferences.default_agent_effort IS 'Default reasoning effort for the default agent — a ChatReasoningLevel value, validated in the service. May be NULL even when an agent is set, meaning the driver''s own default effort. Ignored at read time when the driver does not support effort.';
