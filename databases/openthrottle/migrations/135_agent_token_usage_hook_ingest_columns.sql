-- Let agent_token_usage take hook-ingested rows (Claude Code) next to the chat rows, and make
-- that ingest idempotent.
--
-- Until now the only writer was ConversationStreamService (OpenThrottle chat), one row per
-- persisted assistant turn. A harness hook can re-send the same API request, so rows from that
-- path carry the producer, the agent session and the API request id, and a partial UNIQUE index
-- over (source, session_id, request_id) lets the writer use ON CONFLICT DO NOTHING.
--
-- Columns:
--   source      producer id, free text like skill_usage_events.source (086). Chat rows are
--               stamped 'openthrottle-chat'; hook rows use the harness id ('claude-code').
--   session_id  the agent's own session string. NOT a work_sessions foreign key.
--   request_id  the provider API request id (the idempotency key).
--   cwd         working directory the harness reported.
--   git_branch  git branch the harness reported.
--
-- Rows without a request_id (every chat row) stay unconstrained, as before.
--
-- Idempotent: ADD COLUMN IF NOT EXISTS (no REFERENCES involved), the backfill only touches
-- rows whose source is still NULL, CREATE UNIQUE INDEX IF NOT EXISTS, COMMENT ON is re-runnable.

ALTER TABLE agent_token_usage
ADD COLUMN IF NOT EXISTS source TEXT,
ADD COLUMN IF NOT EXISTS session_id TEXT,
ADD COLUMN IF NOT EXISTS request_id TEXT,
ADD COLUMN IF NOT EXISTS cwd TEXT,
ADD COLUMN IF NOT EXISTS git_branch TEXT;

COMMENT ON COLUMN agent_token_usage.source IS 'Producer id of the writer that recorded this row: openthrottle-chat for OpenThrottle chat turns (ConversationStreamService), claude-code for rows ingested from a Claude Code hook. Free text, like skill_usage_events.source. Backfilled to openthrottle-chat by migration 135; capture health groups by COALESCE(NULLIF(source, ''''), provider).';

COMMENT ON COLUMN agent_token_usage.session_id IS 'The agent harness''s own session string (for example a Claude Code session id). Not a foreign key to work_sessions. Null for chat rows.';

COMMENT ON COLUMN agent_token_usage.request_id IS 'Provider API request id for the turn, the idempotency key for hook ingest: (source, session_id, request_id) is unique where request_id is not null, so a re-sent row is a no-op. Null for chat rows.';

COMMENT ON COLUMN agent_token_usage.cwd IS 'Working directory the harness reported when the turn ran. Null for chat rows.';

COMMENT ON COLUMN agent_token_usage.git_branch IS 'Git branch the harness reported when the turn ran. Null for chat rows.';

-- Every row written before this migration came from the chat path.
UPDATE agent_token_usage
SET source = 'openthrottle-chat'
WHERE source IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_agent_token_usage_request ON agent_token_usage (
    source,
    session_id,
    request_id
)
WHERE
    request_id IS NOT NULL;
