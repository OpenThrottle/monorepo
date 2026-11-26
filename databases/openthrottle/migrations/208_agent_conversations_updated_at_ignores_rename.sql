-- Renaming a conversation no longer counts as activity (OT plan 6177a67e).
--
-- updated_at drives the conversation list order and the Today / Previous 7 days buckets. 193 kept
-- it still across soft delete and restore, and 207 across pinning and grouping. A rename still
-- stamped NOW(), so renaming an old chat moved it to Today after a reload. The only writer of a
-- title is the user's own rename (updateAgentConversationTitle), so a title change joins pinned
-- and group_id as an organizing change: when nothing but those three columns changed, the trigger
-- puts OLD.updated_at back (overriding the value TypeORM's @UpdateDateColumn sends). Every other
-- update, a chat turn's model or metadata write included, still stamps NOW().
--
-- Idempotent: CREATE OR REPLACE only. The trigger from 193 already calls this function, and no
-- rows are rewritten.

CREATE OR REPLACE FUNCTION agent_conversations_touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status
     AND (OLD.status = 'deleted' OR NEW.status = 'deleted') THEN
    NEW.updated_at = OLD.updated_at;
  ELSIF (OLD.pinned IS DISTINCT FROM NEW.pinned
         OR OLD.group_id IS DISTINCT FROM NEW.group_id
         OR OLD.title IS DISTINCT FROM NEW.title)
     AND OLD.user_id IS NOT DISTINCT FROM NEW.user_id
     AND OLD.status IS NOT DISTINCT FROM NEW.status
     AND OLD.plan_id IS NOT DISTINCT FROM NEW.plan_id
     AND OLD.project_id IS NOT DISTINCT FROM NEW.project_id
     AND OLD.model_provider IS NOT DISTINCT FROM NEW.model_provider
     AND OLD.model_name IS NOT DISTINCT FROM NEW.model_name
     AND OLD.metadata IS NOT DISTINCT FROM NEW.metadata
     AND OLD.deleted_at IS NOT DISTINCT FROM NEW.deleted_at THEN
    NEW.updated_at = OLD.updated_at;
  ELSE
    NEW.updated_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION agent_conversations_touch_updated_at() IS
    'BEFORE UPDATE trigger for agent_conversations. Stamps updated_at = NOW(), except when status moves into or out of ''deleted'' (a soft delete or a restore) or when only title, pinned and group_id changed: then it keeps OLD.updated_at, overriding an app-supplied value too, so delete, Undo, renaming, pinning and grouping do not reorder the conversation list.';

COMMENT ON COLUMN agent_conversations.updated_at IS
    'Last activity on the conversation; orders the conversation list. Maintained by agent_conversations_touch_updated_at(): soft delete and restore, and changes to only title, pinned and group_id, leave it unchanged, while every other update stamps NOW().';

COMMENT ON COLUMN agent_conversations.title IS
    'User-visible conversation title, or NULL before one is set. Renaming does not move updated_at.';
