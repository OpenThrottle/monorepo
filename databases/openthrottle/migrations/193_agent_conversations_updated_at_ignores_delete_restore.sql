-- Keep agent_conversations.updated_at stable across soft delete and restore
-- (OT plan 01a20100).
--
-- updated_at drives the conversation list order (idx_agent_conversations_user_status_updated_at),
-- so it should move only on real activity. Deleting a conversation and then pressing Undo used to
-- move it to the top of the list after a reload, because two things stamped updated_at on that
-- round trip:
--   1. the shared update_updated_at_column() BEFORE UPDATE trigger (051), and
--   2. TypeORM's @UpdateDateColumn on BaseModel.updatedAt, which adds
--      `updated_at = CURRENT_TIMESTAMP` to the SET clause of every repository.update().
-- A trigger that only skipped its own stamp would still let (2) through, so this one puts
-- OLD.updated_at back whenever status moves into or out of 'deleted'. Every other update, archive
-- included, still stamps NOW().
--
-- The shared update_updated_at_column() is left unchanged; other tables keep using it.
-- Idempotent: CREATE OR REPLACE and DROP TRIGGER IF EXISTS. No rows are rewritten.

CREATE OR REPLACE FUNCTION agent_conversations_touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status
     AND (OLD.status = 'deleted' OR NEW.status = 'deleted') THEN
    NEW.updated_at = OLD.updated_at;
  ELSE
    NEW.updated_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION agent_conversations_touch_updated_at() IS
    'BEFORE UPDATE trigger for agent_conversations. Stamps updated_at = NOW(), except when status moves into or out of ''deleted'' (a soft delete or a restore): then it keeps OLD.updated_at, overriding an app-supplied value too, so delete and Undo do not reorder the conversation list.';

DROP TRIGGER IF EXISTS update_agent_conversations_updated_at ON agent_conversations;

CREATE TRIGGER update_agent_conversations_updated_at
    BEFORE UPDATE ON agent_conversations
    FOR EACH ROW
    EXECUTE FUNCTION agent_conversations_touch_updated_at();

COMMENT ON COLUMN agent_conversations.updated_at IS
    'Last activity on the conversation; orders the conversation list. Maintained by agent_conversations_touch_updated_at(): soft delete and restore (status moving into or out of deleted) leave it unchanged, while every other update stamps NOW().';
