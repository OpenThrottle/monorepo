-- Optional depth enrichment for skills we author: outcome + duration events
-- correlated to harness start captures (skill_usage_events) by session_id +
-- skill_name (and optionally tool_use_id). Additive only — never replaces
-- PreToolUse / UserPromptExpansion capture. Missing outcomes are normal
-- (third-party skills, abandoned runs, skills that opt out). See OT plan
-- d3759118 Phase 4.

CREATE TABLE IF NOT EXISTS skill_usage_outcomes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    skill_name TEXT NOT NULL,
    session_id TEXT,
    tool_use_id TEXT,
    outcome TEXT NOT NULL,
    duration_ms INTEGER,
    cwd TEXT,
    git_branch TEXT,
    scope TEXT NOT NULL DEFAULT 'ours',
    occurred_at TIMESTAMP WITH TIME ZONE NOT NULL,
    received_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT skill_usage_outcomes_outcome_check
      CHECK (outcome IN ('success', 'abandoned', 'error')),
    CONSTRAINT skill_usage_outcomes_scope_check
      CHECK (scope IN ('ours', 'third-party')),
    CONSTRAINT skill_usage_outcomes_duration_ms_check
      CHECK (duration_ms IS NULL OR duration_ms >= 0)
);

CREATE INDEX IF NOT EXISTS idx_skill_usage_outcomes_skill_name
    ON skill_usage_outcomes (skill_name);

CREATE INDEX IF NOT EXISTS idx_skill_usage_outcomes_occurred_at
    ON skill_usage_outcomes (occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_skill_usage_outcomes_session_skill
    ON skill_usage_outcomes (session_id, skill_name);

COMMENT ON TABLE skill_usage_outcomes IS
    'Opt-in outcome/duration enrichment for OpenThrottle-authored skills. Correlates to skill_usage_events starts by session_id + skill_name; never replaces harness PreToolUse capture.';

COMMENT ON COLUMN skill_usage_outcomes.skill_name IS
    'Skill identifier matching the start event (skills/ authored names).';

COMMENT ON COLUMN skill_usage_outcomes.session_id IS
    'Harness session id when known; primary correlation key with skill_name.';

COMMENT ON COLUMN skill_usage_outcomes.tool_use_id IS
    'Optional harness tool_use_id for tighter start↔outcome correlation.';

COMMENT ON COLUMN skill_usage_outcomes.outcome IS
    'success | abandoned | error — reported by the skill at completion (opt-in).';

COMMENT ON COLUMN skill_usage_outcomes.duration_ms IS
    'Wall-clock duration from skill start to outcome emit, when the skill reports it.';

COMMENT ON COLUMN skill_usage_outcomes.scope IS
    'Normally ours (enrichment is for skills we control). Retained for filter parity with starts.';

COMMENT ON COLUMN skill_usage_outcomes.occurred_at IS
    'Client-reported outcome timestamp. Primary axis for time-window correlation.';

COMMENT ON COLUMN skill_usage_outcomes.received_at IS
    'Server receipt time; set on insert.';
