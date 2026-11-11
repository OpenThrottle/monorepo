-- Persisted web chat/agent conversation threads and ordered messages for OpenThrottle.
-- Separate from plan_output_stream (Ralph iteration logs stay in plan_output_stream).
-- App-level size caps (not DB CHECK): message content 256KB, tool_metadata 64KB; truncate with metadata flag when clipped.

CREATE TABLE IF NOT EXISTS agent_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    title TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    plan_id UUID REFERENCES plans (id) ON DELETE SET NULL,
    project_id UUID REFERENCES projects (id) ON DELETE SET NULL,
    model_provider TEXT,
    model_name TEXT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT agent_conversations_status_check CHECK (status IN ('active', 'archived'))
);

CREATE TABLE IF NOT EXISTS agent_conversation_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES agent_conversations (id) ON DELETE CASCADE,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    sort_order INTEGER NOT NULL,
    routing_tier TEXT,
    routing_confidence DOUBLE PRECISION,
    routing_model TEXT,
    routing_reason TEXT,
    tool_metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT agent_conversation_messages_role_check CHECK (role IN ('user', 'assistant', 'system', 'tool'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_agent_conversation_messages_conversation_sort_order
    ON agent_conversation_messages (conversation_id, sort_order);

CREATE INDEX IF NOT EXISTS idx_agent_conversations_user_status_updated_at
    ON agent_conversations (user_id, status, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_agent_conversations_plan_id
    ON agent_conversations (plan_id)
    WHERE plan_id IS NOT NULL;

DROP TRIGGER IF EXISTS update_agent_conversations_updated_at ON agent_conversations;

CREATE TRIGGER update_agent_conversations_updated_at
    BEFORE UPDATE ON agent_conversations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE agent_conversations IS
    'User-scoped persisted agent/web chat threads for OpenThrottle. Archive-only lifecycle in v1 (status active|archived). Not used for Ralph plan_output_stream logs.';

COMMENT ON TABLE agent_conversation_messages IS
    'Ordered messages within an agent conversation. sort_order is monotonic per conversation; user and assistant rows for a turn are written consecutively in one transaction.';

COMMENT ON COLUMN agent_conversations.status IS
    'Lifecycle: active (default) or archived. No hard delete in v1.';

COMMENT ON COLUMN agent_conversations.plan_id IS
    'Optional link to an OpenThrottle plan; ON DELETE SET NULL when plan is removed.';

COMMENT ON COLUMN agent_conversations.project_id IS
    'Optional link to an OpenThrottle project; ON DELETE SET NULL when project is removed.';

COMMENT ON COLUMN agent_conversations.model_provider IS
    'Last router LLM provider snapshot; updated on persist turns when router LLM runs; null for heuristic-only routing.';

COMMENT ON COLUMN agent_conversations.model_name IS
    'Last router LLM model snapshot; updated on persist turns when router LLM runs; null for heuristic-only routing.';

COMMENT ON COLUMN agent_conversations.metadata IS
    'Extensibility envelope (JSONB). Application validates shape and size.';

COMMENT ON COLUMN agent_conversation_messages.sort_order IS
    'Monotonic ordering within conversation (not gap-based). UNIQUE per conversation_id.';

COMMENT ON COLUMN agent_conversation_messages.routing_tier IS
    'Denormalized routing tier on assistant rows (e.g. from agentsRunChatTurn router).';

COMMENT ON COLUMN agent_conversation_messages.routing_confidence IS
    'Denormalized routing confidence on assistant rows.';

COMMENT ON COLUMN agent_conversation_messages.routing_model IS
    'Denormalized routing model identifier on assistant rows.';

COMMENT ON COLUMN agent_conversation_messages.routing_reason IS
    'Denormalized routing reason on assistant rows.';

COMMENT ON COLUMN agent_conversation_messages.tool_metadata IS
    'Capped JSONB audit of MCP tool turns on assistant rows (app cap 64KB; set truncated flag in envelope when clipped).';

COMMENT ON COLUMN agent_conversation_messages.content IS
    'Message body (app cap 256KB on insert; truncate with metadata flag when clipped).';
