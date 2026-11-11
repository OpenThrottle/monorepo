-- Widen the agent_conversations.status CHECK to allow a distinct 'deleted'
-- lifecycle state for soft-delete (OT plan 16c97e11 — conversations sidebar).
--
-- Soft-delete keeps the row + its messages (reversible; a later purge job may
-- hard-delete). 'deleted' is intentionally distinct from 'archived': archived
-- remains a user-visible "put away" state, while deleted is hidden from the
-- default list. Migration 051 created the CHECK allowing ('active','archived');
-- this drops and re-adds it with 'deleted' included. Idempotent: re-running is a
-- no-op and no rows are re-stamped.

ALTER TABLE agent_conversations
  DROP CONSTRAINT IF EXISTS agent_conversations_status_check;

ALTER TABLE agent_conversations
  ADD CONSTRAINT agent_conversations_status_check
  CHECK (status IN ('active', 'archived', 'deleted'));

COMMENT ON COLUMN agent_conversations.status IS
    'Lifecycle: active (default), archived, or deleted. deleted is a soft-delete (row + messages retained, hidden from the default list; reversible, a later purge job may hard-delete). Enforced by agent_conversations_status_check.';
