-- Give the batch 2 telemetry tables the BaseHardDeleteModel shape
-- (@openthrottle/nestjs-postgres): a uuidv7 `id` default and a `created_at`, with no
-- soft-delete column. These rows are append-only or upserted, so a delete is real.
-- Batch 2 of moving the entities into @openthrottle/nestjs-repositories-server
-- (OT plan 4b4ee8b4-1c66-4b1d-87d7-d73ae54ea70a).
--
-- Existing ids are untouched; only rows inserted from now on get a uuidv7.
-- `code_embeddings` and `code_index_snapshots` keep their natural keys and are not
-- changed here (see packages/nestjs-repositories-server/AGENTS.md § Natural-key tables).

ALTER TABLE daily_stats ALTER COLUMN id SET DEFAULT uuidv7();
ALTER TABLE telemetry_heartbeats ALTER COLUMN id SET DEFAULT uuidv7();
ALTER TABLE worktree_removals ALTER COLUMN id SET DEFAULT uuidv7();
ALTER TABLE skill_usage_events ALTER COLUMN id SET DEFAULT uuidv7();
ALTER TABLE skill_usage_outcomes ALTER COLUMN id SET DEFAULT uuidv7();

-- `created_at` is the insert time every base model shares. These three tables already
-- record it under a domain name (`received_at`, `first_seen_at`), which stays: its
-- consumers and queries keep reading it. The new column is backfilled from it, so the
-- two agree for every existing row. Added nullable, backfilled, then constrained, so a
-- re-run is a no-op.

ALTER TABLE skill_usage_events ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE;
UPDATE skill_usage_events SET created_at = received_at WHERE created_at IS NULL;
ALTER TABLE skill_usage_events ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE skill_usage_events ALTER COLUMN created_at SET NOT NULL;

COMMENT ON COLUMN skill_usage_events.created_at IS
  'When this row was inserted; equals received_at, kept for the shared BaseHardDeleteModel shape';

ALTER TABLE skill_usage_outcomes ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE;
UPDATE skill_usage_outcomes SET created_at = received_at WHERE created_at IS NULL;
ALTER TABLE skill_usage_outcomes ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE skill_usage_outcomes ALTER COLUMN created_at SET NOT NULL;

COMMENT ON COLUMN skill_usage_outcomes.created_at IS
  'When this row was inserted; equals received_at, kept for the shared BaseHardDeleteModel shape';

ALTER TABLE telemetry_heartbeats ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE;
UPDATE telemetry_heartbeats SET created_at = first_seen_at WHERE created_at IS NULL;
ALTER TABLE telemetry_heartbeats ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE telemetry_heartbeats ALTER COLUMN created_at SET NOT NULL;

COMMENT ON COLUMN telemetry_heartbeats.created_at IS
  'When this row was inserted; equals first_seen_at, kept for the shared BaseHardDeleteModel shape';
