-- Pinned conversations and user-defined conversation groups for the chat sidebar.
--
-- The sidebar shows Pinned, then the user's custom groups (in sort_order), then date buckets. A
-- conversation is pinned (agent_conversations.pinned) or belongs to at most one custom group
-- (agent_conversations.group_id), never both: the server clears pinned when it moves a chat into
-- a group. A group belongs to one user. It is a BaseHardDeleteModel shape (uuidv7 `id`,
-- `created_at`, `updated_at`; a delete is a hard DELETE), and deleting it leaves its
-- conversations in place with group_id back to NULL (ON DELETE SET NULL).
--
-- updated_at drives the conversation list order and the Today / Previous 7 days buckets, so,
-- like soft delete and restore in 193, pinning and grouping are not activity: the trigger puts
-- OLD.updated_at back when the only columns that changed are pinned and group_id (overriding the
-- value TypeORM's @UpdateDateColumn sends). Every other update still stamps NOW().
-- Additive + idempotent: IF NOT EXISTS guards, CREATE OR REPLACE, DROP TRIGGER IF EXISTS.

CREATE TABLE IF NOT EXISTS agent_conversation_groups (
    id UUID PRIMARY KEY DEFAULT uuidv7(),
    user_id UUID NOT NULL,
    name TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'agent_conversation_groups_user_id_fkey') THEN
    ALTER TABLE agent_conversation_groups ADD CONSTRAINT agent_conversation_groups_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE;
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_agent_conversation_groups_user_sort_order
    ON agent_conversation_groups (user_id, sort_order);

DROP TRIGGER IF EXISTS update_agent_conversation_groups_updated_at ON agent_conversation_groups;

CREATE TRIGGER update_agent_conversation_groups_updated_at
    BEFORE UPDATE ON agent_conversation_groups
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE agent_conversation_groups IS
    'User-defined groups that organise a user''s OpenThrottle chat conversations in the sidebar. Scoped to one user; sort_order orders the groups. Deleting a group keeps its conversations and clears their group_id.';

COMMENT ON COLUMN agent_conversation_groups.name IS
    'Display name; trimmed, non-empty, at most 80 characters (enforced by the server).';

COMMENT ON COLUMN agent_conversation_groups.sort_order IS
    'Position among the user''s groups, ascending. New groups append at max(sort_order) + 1000; reordering rewrites it.';

ALTER TABLE agent_conversations
  ADD COLUMN IF NOT EXISTS pinned BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE agent_conversations
  ADD COLUMN IF NOT EXISTS group_id UUID;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'agent_conversations_group_id_fkey') THEN
    ALTER TABLE agent_conversations ADD CONSTRAINT agent_conversations_group_id_fkey
      FOREIGN KEY (group_id) REFERENCES agent_conversation_groups (id) ON DELETE SET NULL;
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_agent_conversations_group_id
    ON agent_conversations (group_id)
    WHERE group_id IS NOT NULL;

COMMENT ON COLUMN agent_conversations.pinned IS
    'True when the user pinned the conversation to the top of the chat sidebar. Never true together with group_id: moving a conversation into a group clears it. Changing it does not move updated_at.';

COMMENT ON COLUMN agent_conversations.group_id IS
    'The user-defined group (agent_conversation_groups) the conversation sits in, or NULL when ungrouped. Set NULL when the group is deleted. Changing it does not move updated_at.';

CREATE OR REPLACE FUNCTION agent_conversations_touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status
     AND (OLD.status = 'deleted' OR NEW.status = 'deleted') THEN
    NEW.updated_at = OLD.updated_at;
  ELSIF (OLD.pinned IS DISTINCT FROM NEW.pinned OR OLD.group_id IS DISTINCT FROM NEW.group_id)
     AND OLD.title IS NOT DISTINCT FROM NEW.title
     AND OLD.status IS NOT DISTINCT FROM NEW.status
     AND OLD.plan_id IS NOT DISTINCT FROM NEW.plan_id
     AND OLD.project_id IS NOT DISTINCT FROM NEW.project_id
     AND OLD.model_provider IS NOT DISTINCT FROM NEW.model_provider
     AND OLD.model_name IS NOT DISTINCT FROM NEW.model_name
     AND OLD.metadata IS NOT DISTINCT FROM NEW.metadata THEN
    NEW.updated_at = OLD.updated_at;
  ELSE
    NEW.updated_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION agent_conversations_touch_updated_at() IS
    'BEFORE UPDATE trigger for agent_conversations. Stamps updated_at = NOW(), except when status moves into or out of ''deleted'' (a soft delete or a restore) or when only pinned and group_id changed: then it keeps OLD.updated_at, overriding an app-supplied value too, so delete, Undo, pinning and grouping do not reorder the conversation list.';
