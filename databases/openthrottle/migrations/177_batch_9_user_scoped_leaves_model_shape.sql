-- Give the batch 9 user-scoped leaf tables their base-model shapes (@openthrottle/nestjs-postgres).
-- Batch 9 of moving the entities into @openthrottle/nestjs-repositories-server
-- (OT plan e5df1465-f29a-4007-9384-c6afa4ad06dc).
--
--   agent_accounts, user_skill_tags → BaseHardDeleteModel: uuidv7 `id` default
--                                     (agent_accounts also gains `created_at`)
--   subscriptions                   → BaseModel: `deleted_at` + uuidv7 `id` default
--
-- Existing ids are untouched; only rows inserted from now on get a uuidv7.
--
-- agent_accounts are observed telemetry identities, upserted by the usage writers, and
-- user_skill_tags are a user's vocabulary toggles; a deleted row of either is simply
-- recreated, so both stay hard-deleted. Both keep their own timestamps: agent_accounts
-- bumps `last_seen_at` on every upsert, user_skill_tags keeps `updated_at` (060) for renames.
--
-- subscriptions keep the billing history, so a deleted subscription is soft deleted.
-- Nothing deletes a subscription today, so no delete path changes behavior. The Stripe
-- webhook upsert looks a subscription up by `stripe_subscription_id` among live rows, then
-- inserts on a miss, so the unique index on that column becomes unique among live rows
-- only: a soft-deleted row must not make the webhook's insert fail.

-- ---------------------------------------------------------------------------
-- agent_accounts (BaseHardDeleteModel)
-- ---------------------------------------------------------------------------

ALTER TABLE agent_accounts ALTER COLUMN id SET DEFAULT uuidv7();

-- `created_at` is the insert time every base model shares. agent_accounts already
-- records it as `first_seen_at`, which stays: its consumers and queries keep reading it.
-- The new column is backfilled from it, so the two agree for every existing row. Added
-- nullable, backfilled, then constrained, so a re-run is a no-op.

ALTER TABLE agent_accounts ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE;
UPDATE agent_accounts SET created_at = first_seen_at WHERE created_at IS NULL;
ALTER TABLE agent_accounts ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE agent_accounts ALTER COLUMN created_at SET NOT NULL;

COMMENT ON COLUMN agent_accounts.created_at IS
  'When this row was inserted; equals first_seen_at, kept for the shared BaseHardDeleteModel shape';

-- ---------------------------------------------------------------------------
-- user_skill_tags (BaseHardDeleteModel)
-- ---------------------------------------------------------------------------
-- Already has `id`, `created_at` and `updated_at` (060).

ALTER TABLE user_skill_tags ALTER COLUMN id SET DEFAULT uuidv7();

-- ---------------------------------------------------------------------------
-- subscriptions (BaseModel)
-- ---------------------------------------------------------------------------
-- Already has `id`, `created_at` and `updated_at` with its trigger (035).

ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE NULL;

COMMENT ON COLUMN subscriptions.deleted_at IS
  'When this subscription was soft deleted; NULL for live subscriptions. A soft-deleted row keeps its billing history and frees its Stripe subscription id for a live row.';

ALTER TABLE subscriptions ALTER COLUMN id SET DEFAULT uuidv7();

DROP INDEX IF EXISTS idx_subscriptions_stripe_subscription_id;

CREATE UNIQUE INDEX IF NOT EXISTS idx_subscriptions_stripe_subscription_id_live
  ON subscriptions (stripe_subscription_id)
  WHERE stripe_subscription_id IS NOT NULL AND deleted_at IS NULL;
