-- Per-user store of DISABLED agent CLI backends (plan 84d4a42b).
-- Semantics are presence-as-disabled: a row (user_id, backend) means the user has
-- turned that agent CLI OFF; the ABSENCE of a row means it is enabled. The default
-- posture is therefore "all enabled" with an empty table — no backfill needed.
-- `backend` is the driver id string (e.g. 'claude', 'cursor'); it is validated
-- server-side against the @openthrottle/openthrottle-drivers registry allowlist
-- (isDriverId) before a row is written, so no FK/catalog table exists here.
-- Rows are only ever inserted (disable) or deleted (enable) — never updated — so
-- there is no updated_at column or trigger.

CREATE TABLE IF NOT EXISTS user_disabled_agent_clis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    backend TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_user_disabled_agent_clis_user_backend UNIQUE (user_id, backend)
);

COMMENT ON TABLE user_disabled_agent_clis IS 'Per-user set of DISABLED agent CLI backends. Presence-as-disabled: a row means the user turned that agent off; absence means enabled. Empty table = the default all-enabled posture (no backfill). Disabled agents are hidden from chat/model pickers and rejected when starting new runs.';

COMMENT ON COLUMN user_disabled_agent_clis.user_id IS 'Owner of the preference. User-scoped; cascades on user delete.';

COMMENT ON COLUMN user_disabled_agent_clis.backend IS 'Driver id / backend discriminator (e.g. ''claude'', ''cursor''), validated server-side against the @openthrottle/openthrottle-drivers registry (isDriverId) before insert. No FK because the allowlist is code, not a table.';

CREATE INDEX IF NOT EXISTS idx_user_disabled_agent_clis_user_id
  ON user_disabled_agent_clis (user_id);
