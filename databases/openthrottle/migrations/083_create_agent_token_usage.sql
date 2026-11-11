-- Durable, aggregatable per-turn token/cost usage for OpenThrottle agent-CLI chat.
-- One row per completed assistant turn, written by ConversationStreamService after
-- folding the turn's heterogeneous backend usage metadata through the shared
-- @openthrottle/agentic-token-usage normalizer (sums opencode's mid-stream chunks).
-- Decoupled fact table (not columns on agent_conversation_messages) so future
-- non-chat sources (plan runs, Ralph) can write here too. Private-mode turns
-- (persist=false) write NOTHING — the turn is ephemeral. See OT plan a55b76ba.

CREATE TABLE IF NOT EXISTS agent_token_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    conversation_id UUID REFERENCES agent_conversations (id) ON DELETE SET NULL,
    message_id UUID REFERENCES agent_conversation_messages (id) ON DELETE SET NULL,
    provider TEXT NOT NULL,
    model TEXT,
    input_tokens BIGINT,
    output_tokens BIGINT,
    cached_read_tokens BIGINT,
    cached_write_tokens BIGINT,
    reasoning_tokens BIGINT,
    total_tokens BIGINT,
    cost_usd NUMERIC(12, 6),
    raw_usage JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Primary query surface: a user's usage over a date range, newest first.
CREATE INDEX IF NOT EXISTS idx_agent_token_usage_user_created_at
    ON agent_token_usage (user_id, created_at DESC);

-- Same, narrowed to a single provider (the Usage route's provider filter).
CREATE INDEX IF NOT EXISTS idx_agent_token_usage_user_provider_created_at
    ON agent_token_usage (user_id, provider, created_at DESC);

-- Look up all usage rows for a conversation (drill-down / cascade housekeeping).
CREATE INDEX IF NOT EXISTS idx_agent_token_usage_conversation_id
    ON agent_token_usage (conversation_id)
    WHERE conversation_id IS NOT NULL;

COMMENT ON TABLE agent_token_usage IS
    'Per-turn normalized token/cost usage for agent-CLI chat. One immutable row per persisted assistant turn (Private-mode turns write nothing). Decoupled from chat messages so future non-chat sources can also write here. v1 surfaces it on the developer Usage route.';

COMMENT ON COLUMN agent_token_usage.user_id IS
    'Owning user; every persisted turn has one. ON DELETE CASCADE. All reads are user-scoped by this column.';

COMMENT ON COLUMN agent_token_usage.conversation_id IS
    'Chat conversation the turn belonged to, when sourced from chat; ON DELETE SET NULL so usage totals survive conversation deletion. Null for non-chat sources.';

COMMENT ON COLUMN agent_token_usage.message_id IS
    'Assistant message the usage was folded from, when sourced from chat; ON DELETE SET NULL. Null for non-chat sources.';

COMMENT ON COLUMN agent_token_usage.provider IS
    'Usage provider identity: run.provider ?? run.backend (driver id: claude|codex|cursor|grok|opencode|openai). Lowercased, never null.';

COMMENT ON COLUMN agent_token_usage.model IS
    'Model the usage is attributed to: backend-reported model (most accurate) else run.model. Null when unknown.';

COMMENT ON COLUMN agent_token_usage.input_tokens IS
    'Prompt/input tokens for the turn; null when the backend did not report it.';

COMMENT ON COLUMN agent_token_usage.output_tokens IS
    'Completion/output tokens for the turn; null when the backend did not report it.';

COMMENT ON COLUMN agent_token_usage.cached_read_tokens IS
    'Tokens served from the prompt cache (claude cache_read_input_tokens, opencode cache.read); null when unreported.';

COMMENT ON COLUMN agent_token_usage.cached_write_tokens IS
    'Tokens written to the prompt cache (claude cache_creation_input_tokens, opencode cache.write); null when unreported.';

COMMENT ON COLUMN agent_token_usage.reasoning_tokens IS
    'Reasoning/thinking tokens accounted separately (opencode tokens.reasoning, grok usage.reasoning_tokens); null when unreported.';

COMMENT ON COLUMN agent_token_usage.total_tokens IS
    'Total tokens: the backend explicit total else input+output when either present; null when nothing reported.';

COMMENT ON COLUMN agent_token_usage.cost_usd IS
    'Reported dollar cost of the turn when the backend prices it (claude totalCostUsd, opencode summed cost); null when unpriced.';

COMMENT ON COLUMN agent_token_usage.raw_usage IS
    'The turn''s normalized usage payload (NormalizedTokenUsage) as JSONB, retained for audit/debug and future re-derivation.';

COMMENT ON COLUMN agent_token_usage.created_at IS
    'Turn completion timestamp; the axis all Usage-route date-range filters and ordering use.';
