-- Rollout feature flags: OpenThrottle's feature-flagging system. A flag is a named
-- boolean toggle with optional RBAC role targeting. Evaluation (server-side): a flag is
-- ON for an actor when enabled = TRUE AND (target_roles is empty => everyone, else the
-- actor holds at least one of target_roles). The domain lives in @openthrottle/nestjs-rollout
-- (entity + RolloutService); the GraphQL resolver lives in openthrottle-server. Permissions
-- flags:read / flags:write are seeded in migration 085.

CREATE TABLE IF NOT EXISTS rollout_flags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT NOT NULL,
    description TEXT NULL,
    enabled BOOLEAN NOT NULL DEFAULT FALSE,
    target_roles TEXT[] NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_rollout_flags_key CHECK (length(btrim(key)) > 0)
);

COMMENT ON TABLE rollout_flags IS 'Feature flags for the rollout system. Each row is a named boolean toggle with optional RBAC role targeting; evaluated server-side by @openthrottle/nestjs-rollout RolloutService.isEnabled. Global + role-targeting only (no percentage/per-user/env targeting in v1).';

COMMENT ON COLUMN rollout_flags.key IS 'Unique flag key (kebab/dotted string, e.g. new-dashboard or billing.invoices). Non-empty (chk_rollout_flags_key); uniqueness enforced by idx_rollout_flags_key.';

COMMENT ON COLUMN rollout_flags.description IS 'Human-readable description of what the flag gates. Optional.';

COMMENT ON COLUMN rollout_flags.enabled IS 'Master switch. When FALSE the flag is OFF for everyone regardless of target_roles.';

COMMENT ON COLUMN rollout_flags.target_roles IS 'RBAC role names (from @openthrottle/nestjs-rbac / the roles table) the flag targets. Empty array => enabled for everyone; otherwise ON only for actors holding at least one listed role.';

CREATE UNIQUE INDEX IF NOT EXISTS idx_rollout_flags_key ON rollout_flags (key);

DROP TRIGGER IF EXISTS update_rollout_flags_updated_at ON rollout_flags;

CREATE TRIGGER update_rollout_flags_updated_at
  BEFORE UPDATE ON rollout_flags
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
