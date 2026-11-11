-- Typed feature flags + percentage fallthrough for OpenThrottle Rollout
-- (LaunchDarkly-inspired variations). Extends rollout_flags beyond the boolean
-- + role-targeting v1 from migration 084.
--
-- Storage choice: variations and fallthrough stay as jsonb on the flag row
-- (single-row config) rather than normalized child tables. Evaluation always
-- loads the whole flag; there is no need to query individual variations or
-- weights independently in v1. Stickiness / per-user assignment tables,
-- environments, rules, and segments are explicitly deferred.
--
-- Weights are integer percents 0–100 that must sum to 100 (enforced in
-- @openthrottle/nestjs-rollout on write; not a DB CHECK — summing a jsonb
-- array in a constraint is brittle). Bucketing is non-sticky (principal id →
-- mod 100); sticky hashing comes later.

ALTER TABLE rollout_flags
  ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'boolean',
  ADD COLUMN IF NOT EXISTS variations JSONB NOT NULL DEFAULT '[{"value": false}, {"value": true}]'::jsonb,
  ADD COLUMN IF NOT EXISTS off_variation INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fallthrough JSONB NOT NULL DEFAULT '{"variations": [{"variation": 1, "weight": 100}]}'::jsonb;

-- Backfill rows that lack a usable LD boolean shape. ADD COLUMN ... DEFAULT
-- already stamps existing rows on first apply; this UPDATE is idempotent
-- insurance for partial re-runs before constraints are added.
UPDATE rollout_flags
SET
  kind = CASE
    WHEN btrim(kind) = '' THEN 'boolean'
    ELSE kind
  END,
  variations = CASE
    WHEN jsonb_typeof(variations) <> 'array'
      OR jsonb_array_length(variations) = 0
    THEN '[{"value": false}, {"value": true}]'::jsonb
    ELSE variations
  END,
  fallthrough = CASE
    WHEN jsonb_typeof(fallthrough) <> 'object'
    THEN '{"variations": [{"variation": 1, "weight": 100}]}'::jsonb
    ELSE fallthrough
  END;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chk_rollout_flags_kind'
      AND conrelid = 'rollout_flags'::regclass
  ) THEN
    ALTER TABLE rollout_flags
      ADD CONSTRAINT chk_rollout_flags_kind
      CHECK (kind IN ('boolean', 'string', 'number', 'json'));
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chk_rollout_flags_off_variation'
      AND conrelid = 'rollout_flags'::regclass
  ) THEN
    ALTER TABLE rollout_flags
      ADD CONSTRAINT chk_rollout_flags_off_variation
      CHECK (off_variation >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chk_rollout_flags_variations_array'
      AND conrelid = 'rollout_flags'::regclass
  ) THEN
    ALTER TABLE rollout_flags
      ADD CONSTRAINT chk_rollout_flags_variations_array
      CHECK (jsonb_typeof(variations) = 'array' AND jsonb_array_length(variations) >= 1);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chk_rollout_flags_fallthrough_object'
      AND conrelid = 'rollout_flags'::regclass
  ) THEN
    ALTER TABLE rollout_flags
      ADD CONSTRAINT chk_rollout_flags_fallthrough_object
      CHECK (jsonb_typeof(fallthrough) = 'object');
  END IF;
END $$;

COMMENT ON TABLE rollout_flags IS 'Feature flags for the OpenThrottle Rollout system. Each row is a typed flag (boolean | string | number | json) with ordered variations, an off/default variation index, a percentage fallthrough allocation, and optional RBAC role targeting. Evaluated server-side by @openthrottle/nestjs-rollout. Variations and fallthrough are jsonb on the flag row (single-row config; no child tables in v1). Percentage bucketing is non-sticky (principal id mod 100); sticky assignment, environments, segments, and rules are deferred.';

COMMENT ON COLUMN rollout_flags.kind IS 'Flag value kind: boolean | string | number | json (chk_rollout_flags_kind). Controls how variation.value is interpreted. Default boolean for backfilled v1 flags.';

COMMENT ON COLUMN rollout_flags.variations IS 'Ordered jsonb array of { name?, description?, value } where value matches kind. LD-like boolean default: [{value:false},{value:true}]. Shape validated in app; DB only checks non-empty array.';

COMMENT ON COLUMN rollout_flags.off_variation IS 'Zero-based index into variations returned when the flag is disabled or the actor fails the target_roles gate. Must be >= 0 (chk_rollout_flags_off_variation); in-range vs variations length enforced in app.';

COMMENT ON COLUMN rollout_flags.fallthrough IS 'Percentage allocation among variations when the flag is enabled and the actor passes targeting. Shape: { variations: [{ variation: <index>, weight: <0-100 int> }, ...] }. Weights are integer percents that must sum to 100 (enforced in app). Default: 100% on variation 1 (true) for backfilled boolean flags.';

COMMENT ON COLUMN rollout_flags.enabled IS 'Master switch. When FALSE, evaluation returns the off_variation value for everyone regardless of target_roles or fallthrough.';

COMMENT ON COLUMN rollout_flags.target_roles IS 'RBAC role names the flag targets. Empty array => eligible for everyone (then fallthrough applies); otherwise the actor must hold at least one listed role before fallthrough; on miss, off_variation is returned.';
