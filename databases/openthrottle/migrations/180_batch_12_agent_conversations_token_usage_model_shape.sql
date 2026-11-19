-- Give the batch 12 chat and usage tables their base-model shapes (@openthrottle/nestjs-postgres).
-- Batch 12 of moving the entities into @openthrottle/nestjs-repositories-server
-- (OT plan b9e4bc07-d274-4eac-9fe0-1fd7051313fa).
--
--   agent_conversations          → BaseModel: `deleted_at` + uuidv7 `id` default
--   agent_conversation_messages  → BaseHardDeleteModel: uuidv7 `id` default
--   agent_token_usage            → BaseHardDeleteModel: uuidv7 `id` default
--
-- Existing ids are untouched; only rows inserted from now on get a uuidv7.
--
-- Delete semantics (decided in this batch):
--
--   * Deleting a conversation was already a soft delete: it flips `status` to 'deleted'
--     (081) and keeps the row and its messages. From now on the same delete also stamps
--     `deleted_at`, which is the column BaseRepository reads, so a deleted conversation
--     disappears from every repository read, not just from the default list. `status`
--     keeps 'deleted' so the GraphQL `status` field reads as before.
--   * Messages are append-only and are not soft deleted on their own. They stay with a
--     soft-deleted conversation, unreadable (every message read is gated on the owning
--     conversation), until the data-retention job purges the conversation 30 days after
--     its delete and ON DELETE CASCADE takes them with it.
--   * Private mode (persist=false) writes no conversation, message or usage row at all,
--     so there is nothing for it to delete, soft or hard.
--   * agent_token_usage is a per-turn log. Its rows are hard deleted by retention by age,
--     and lose only the conversation link (ON DELETE SET NULL) when a conversation is purged.
--
-- Existing 'deleted' conversations are backfilled with `deleted_at = updated_at`: the
-- soft delete itself bumped `updated_at` (an @UpdateDateColumn plus the 051 trigger),
-- so that is the delete time the retention window has always measured from.

-- ---------------------------------------------------------------------------
-- agent_conversations (BaseModel)
-- ---------------------------------------------------------------------------
-- Already has `id`, `created_at` and `updated_at` with its trigger (051).

ALTER TABLE agent_conversations ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE NULL;

COMMENT ON COLUMN agent_conversations.deleted_at IS
  'When this conversation was soft deleted (always alongside status = ''deleted''); NULL for live conversations. Its messages are kept until data retention purges the conversation 30 days later.';

UPDATE agent_conversations
   SET deleted_at = updated_at
 WHERE status = 'deleted'
   AND deleted_at IS NULL;

ALTER TABLE agent_conversations ALTER COLUMN id SET DEFAULT uuidv7();

-- ---------------------------------------------------------------------------
-- agent_conversation_messages (BaseHardDeleteModel)
-- ---------------------------------------------------------------------------
-- Already has `id` and `created_at` (051); rows are never updated, so no `updated_at`.

ALTER TABLE agent_conversation_messages ALTER COLUMN id SET DEFAULT uuidv7();

-- ---------------------------------------------------------------------------
-- agent_token_usage (BaseHardDeleteModel)
-- ---------------------------------------------------------------------------
-- Already has `id` and `created_at` (083); rows are immutable, so no `updated_at`.

ALTER TABLE agent_token_usage ALTER COLUMN id SET DEFAULT uuidv7();
