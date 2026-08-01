-- Skill usage events for OpenThrottle: one row per Skill-tool (or slash)
-- invocation captured by the harness PreToolUse / UserPromptExpansion hook.
-- System of record for skill observability (ours + third-party). Client
-- privacy seam truncates/redacts args before ingest; the server stores the
-- payload as sent and never re-expands. See OT plan d3759118.

CREATE TABLE IF NOT EXISTS skill_usage_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    skill_name TEXT NOT NULL,
    args TEXT,
    session_id TEXT,
    cwd TEXT,
    git_branch TEXT,
    scope TEXT NOT NULL,
    invocation_path TEXT,
    privacy_level TEXT NOT NULL DEFAULT 'truncated',
    agent_id TEXT,
    agent_type TEXT,
    tool_use_id TEXT,
    prompt_id TEXT,
    hook_event_name TEXT,
    occurred_at TIMESTAMP WITH TIME ZONE NOT NULL,
    received_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT skill_usage_events_scope_check
      CHECK (scope IN ('ours', 'third-party')),
    CONSTRAINT skill_usage_events_privacy_level_check
      CHECK (privacy_level IN ('name-only', 'truncated', 'full'))
);

CREATE INDEX IF NOT EXISTS idx_skill_usage_events_skill_name
    ON skill_usage_events (skill_name);

CREATE INDEX IF NOT EXISTS idx_skill_usage_events_occurred_at
    ON skill_usage_events (occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_skill_usage_events_scope
    ON skill_usage_events (scope);

COMMENT ON TABLE skill_usage_events IS
    'Harness-captured skill invocations for OpenThrottle observability. One immutable row per Skill-tool or slash invocation (ours and third-party). Args arrive already privacy-processed by the client; server stores as-sent.';

COMMENT ON COLUMN skill_usage_events.skill_name IS
    'Skill identifier from the harness payload (e.g. ot-plans, vercel:deploy).';

COMMENT ON COLUMN skill_usage_events.args IS
    'Skill args after client privacy seam (truncated/redacted by default). Null when privacy_level is name-only. Server must not re-expand.';

COMMENT ON COLUMN skill_usage_events.session_id IS
    'Harness session id when present; correlates invocations within one agent session.';

COMMENT ON COLUMN skill_usage_events.cwd IS
    'Working directory reported by the harness at invocation time.';

COMMENT ON COLUMN skill_usage_events.git_branch IS
    'Git branch at capture time (best-effort from the hook).';

COMMENT ON COLUMN skill_usage_events.scope IS
    'ours = authored under skills/; third-party = plugin-namespaced (name contains :) or not under skills/.';

COMMENT ON COLUMN skill_usage_events.invocation_path IS
    'How the skill was invoked: skill_tool (Skill tool / PreToolUse) or slash (UserPromptExpansion).';

COMMENT ON COLUMN skill_usage_events.privacy_level IS
    'Client privacy level applied before ingest: name-only | truncated | full. Fixed default is truncated for this plan.';

COMMENT ON COLUMN skill_usage_events.agent_id IS
    'Subagent id when the Skill call happened inside a nested agent; null for top-level.';

COMMENT ON COLUMN skill_usage_events.agent_type IS
    'Subagent type (e.g. general-purpose) when present.';

COMMENT ON COLUMN skill_usage_events.tool_use_id IS
    'Harness tool_use_id for the Skill call when present.';

COMMENT ON COLUMN skill_usage_events.prompt_id IS
    'Harness prompt_id when present.';

COMMENT ON COLUMN skill_usage_events.hook_event_name IS
    'Hook that captured the event (PreToolUse or UserPromptExpansion).';

COMMENT ON COLUMN skill_usage_events.occurred_at IS
    'Client-reported invocation timestamp (JSONL timestamp). Primary axis for time-window queries.';

COMMENT ON COLUMN skill_usage_events.received_at IS
    'Server receipt time; set on insert. Used for lag/debug, not the usage-over-time axis.';
