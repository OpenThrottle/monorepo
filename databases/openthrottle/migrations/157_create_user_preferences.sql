-- Per-user preferences: default editor and default agent (OT plan 0da997f8, decisions D2/D3).
--
-- One row per user, keyed by user_id. Each preference is a typed, nullable column and NULL means
-- "use the system default". Values are validated in the service (UserPreferencesService), the same
-- pattern as migration 092: there is no catalog FK, because the allowlists (editor ids, driver ids,
-- reasoning levels) are code, not tables. A preference that later becomes invalid (agent disabled,
-- model gone) is ignored at read time and never deleted here.
--
-- New preferences arrive as additive columns in later migrations — never a JSONB blob, so every
-- value stays typed, commented and queryable.
--
-- Idempotent: the table is IF NOT EXISTS, and the FK and CHECK are added in their own statements
-- guarded on pg_constraint (an inline REFERENCES under IF NOT EXISTS can silently never land).

CREATE TABLE IF NOT EXISTS user_preferences (
    user_id UUID PRIMARY KEY,
    default_editor TEXT,
    default_agent_backend TEXT,
    default_agent_model TEXT,
    default_agent_effort TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_preferences_user_id_fkey') THEN
    ALTER TABLE user_preferences ADD CONSTRAINT user_preferences_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_user_preferences_agent_backend_model_paired') THEN
    ALTER TABLE user_preferences ADD CONSTRAINT chk_user_preferences_agent_backend_model_paired
      CHECK ((default_agent_backend IS NULL) = (default_agent_model IS NULL));
  END IF;
END
$$;

DROP TRIGGER IF EXISTS update_user_preferences_updated_at ON user_preferences;

CREATE TRIGGER update_user_preferences_updated_at
  BEFORE UPDATE ON user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE user_preferences IS 'OpenThrottle per-user preferences: a 1:1 user-level row keyed by user_id, holding defaults that follow the user across browsers and restarts (default editor, default agent backend + model + effort). One typed nullable column per preference; NULL means use the system default. Values are validated in the service, not by a catalog FK (same pattern as user_favorite_agent_models, migration 092); a preference that is no longer valid is ignored at read time, never deleted. A missing row is equivalent to an all-NULL row — reads never insert. New preferences arrive as additive nullable columns.';

COMMENT ON COLUMN user_preferences.user_id IS 'Owner of the preferences; primary key, so one row per user. Cascades on user delete.';

COMMENT ON COLUMN user_preferences.default_editor IS 'Preferred editor for generic open-in-editor links and the primary button in multi-editor action groups — a WorkspaceEditorId (e.g. ''vscode'', ''cursor''), validated in the service with isWorkspaceEditorId. NULL = system default (VS Code). Not required to be in user_workspace_settings.enabled_editors; the UI warns when it is not, and never auto-enables it.';

COMMENT ON COLUMN user_preferences.default_agent_backend IS 'Driver id of the default agent CLI (e.g. ''claude'', ''cursor''), validated in the service with isDriverId. Set and cleared together with default_agent_model (chk_user_preferences_agent_backend_model_paired). NULL = system default. Ignored at read time when that agent is disabled for the user.';

COMMENT ON COLUMN user_preferences.default_agent_model IS 'Opaque driver-supplied model id for the default agent (as returned by agent discovery, e.g. ''gpt-5.2''); not validated against a catalog, like migration 092. Always set together with default_agent_backend. NULL = system default. Ignored at read time when the model is no longer discovered or is disabled.';

COMMENT ON COLUMN user_preferences.default_agent_effort IS 'Default reasoning effort for the default agent — a ChatReasoningLevel value, validated in the service. May be NULL even when an agent is set, meaning the backend''s own default effort. Ignored at read time when the backend does not support effort.';

COMMENT ON COLUMN user_preferences.created_at IS 'When the row was first written (first saved preference).';

COMMENT ON COLUMN user_preferences.updated_at IS 'Last change to any preference; maintained by the update_user_preferences_updated_at trigger.';
