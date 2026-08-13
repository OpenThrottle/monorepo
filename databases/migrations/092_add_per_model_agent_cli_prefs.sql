-- Per-MODEL agent-CLI preferences (plan 6c944b95, follow-up to 84d4a42b / migration 091).
--
-- Two axes, each a single-purpose presence table so "a row means X" stays crisp:
--
-- 1. DISABLE — extend user_disabled_agent_clis with a nullable `model`. Presence-as-disabled
--    is preserved and generalized: `model IS NULL` means the WHOLE agent is off (the existing
--    agent-level rows, no backfill), `model = '<id>'` means that one model is off within an
--    otherwise-enabled agent. An agent-level OFF hard-overrides individual model state
--    downstream (enforced in the resolver overlay + run-gates, not here).
-- 2. FAVORITE — new user_favorite_agent_models, presence-as-favorite. Favorite is the opposite
--    polarity to disable, so it lives in its own table rather than a discriminator column. You
--    never favorite a whole agent, so `model` is NOT NULL here.
--
-- Postgres treats NULLs as DISTINCT in a UNIQUE index, so a plain UNIQUE (user_id, backend, model)
-- would allow duplicate whole-agent (model IS NULL) rows. We therefore replace the old
-- (user_id, backend) unique with TWO partial unique indexes — one for the NULL (whole-agent) case
-- and one for the non-null (per-model) case. `model` (like `backend`) is an opaque driver-supplied
-- string validated server-side against the drivers registry (isDriverId for backend); no FK/catalog.
--
-- Additive + idempotent (safe to re-run via the schema_migrations ledger); no data re-stamp.

-- 1. Per-model DISABLE: widen the disabled table.
ALTER TABLE user_disabled_agent_clis ADD COLUMN IF NOT EXISTS model TEXT;

COMMENT ON COLUMN user_disabled_agent_clis.model IS 'Which model this disable row targets. NULL = the WHOLE agent is disabled (the original agent-level semantics; no backfill needed). A non-null value is the opaque driver-supplied model id (e.g. ''gpt-5.2'') for a single disabled model within an otherwise-enabled agent. An agent-level OFF (model IS NULL) hard-overrides per-model rows downstream.';

-- Replace the (user_id, backend) unique constraint with two partial unique indexes so the NULL
-- (whole-agent) row and the per-model rows are each uniquely constrained (NULLs are distinct in a
-- plain UNIQUE, which would otherwise permit duplicate whole-agent rows).
ALTER TABLE user_disabled_agent_clis
  DROP CONSTRAINT IF EXISTS uq_user_disabled_agent_clis_user_backend;

CREATE UNIQUE INDEX IF NOT EXISTS uq_user_disabled_agent_clis_user_backend_agent
  ON user_disabled_agent_clis (user_id, backend)
  WHERE model IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_user_disabled_agent_clis_user_backend_model
  ON user_disabled_agent_clis (user_id, backend, model)
  WHERE model IS NOT NULL;

-- 2. Per-model FAVORITE: new presence-as-favorite table.
CREATE TABLE IF NOT EXISTS user_favorite_agent_models (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    backend TEXT NOT NULL,
    model TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_user_favorite_agent_models_user_backend_model UNIQUE (user_id, backend, model)
);

COMMENT ON TABLE user_favorite_agent_models IS 'Per-user set of FAVORITED agent-CLI models. Presence-as-favorite: a row (user_id, backend, model) means the user starred that model; absence means not-favorited. Favorite is orthogonal to enablement — it does not enable a disabled model; it only floats the model to the top of / highlights it in chat/model pickers and run selection. A favorite on a later-disabled model is inert but persists (revives when re-enabled).';

COMMENT ON COLUMN user_favorite_agent_models.user_id IS 'Owner of the preference. User-scoped; cascades on user delete.';

COMMENT ON COLUMN user_favorite_agent_models.backend IS 'Driver id / backend discriminator (e.g. ''claude'', ''cursor''), validated server-side against the @openthrottle/openthrottle-drivers registry (isDriverId) before insert. No FK because the allowlist is code, not a table.';

COMMENT ON COLUMN user_favorite_agent_models.model IS 'Opaque driver-supplied model id as returned by discoverAgentClis (e.g. ''gpt-5.2''). Not validated against a catalog — models are probed and can change between scans; a favorite for a model not currently discovered is ignored at read time (never auto-pruned) and revives if the model reappears.';

CREATE INDEX IF NOT EXISTS idx_user_favorite_agent_models_user_id
  ON user_favorite_agent_models (user_id);
