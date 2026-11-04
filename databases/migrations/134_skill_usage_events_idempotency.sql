-- Make skill_usage_events ingest idempotent, and flag (never delete) the historic twins.
--
-- Why: 96 of 755 claude-code events had a twin. Cause, proven in OT plan e7b74d81 task
-- 60f0d1b4: inside this repo BOTH the in-repo .claude/settings.json hooks AND the user-scoped
-- openthrottle plugin (plugins/openthrottle) register the same capture hook, so one Skill call
-- POSTed twice. Every twin shares one tool_use_id (PreToolUse) or one prompt_id
-- (UserPromptExpansion), and they cluster between 2026-09-13 (plugin installed) and 2026-09-23.
--
-- Decision on history: FLAG, do not delete. The later row of each twin pair gets
-- duplicate_of_id = the surviving row's id; /usage aggregates exclude flagged rows. Deleting
-- would be unrecoverable if the key ever proves too coarse, and flagging costs one column.
--
-- Idempotency keys (partial unique indexes over unflagged rows; inserts use ON CONFLICT DO
-- NOTHING, so a re-sent event is a no-op):
--   tool_use_id present  -> (source, session_id, hook_event_name, tool_use_id)
--   prompt-expansion     -> (source, session_id, hook_event_name, prompt_id, skill_name)
-- Rows with neither key (older senders) stay unconstrained, as before.
--
-- Idempotent: ADD COLUMN IF NOT EXISTS, the FK guarded on pg_constraint, the backfill only
-- touches unflagged rows, CREATE UNIQUE INDEX IF NOT EXISTS.

ALTER TABLE skill_usage_events
ADD COLUMN IF NOT EXISTS duplicate_of_id UUID;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'skill_usage_events_duplicate_of_id_fkey'
  ) THEN
    ALTER TABLE skill_usage_events ADD CONSTRAINT skill_usage_events_duplicate_of_id_fkey
      FOREIGN KEY (duplicate_of_id) REFERENCES skill_usage_events (id) ON DELETE SET NULL;
  END IF;
END
$$;

COMMENT ON COLUMN skill_usage_events.duplicate_of_id IS 'Set when this row is a duplicate capture of another event (same idempotency key), pointing at the row that survives. Flagged rows are kept for history but excluded from every /usage aggregate. Backfilled by migration 134; new duplicates are refused at insert by the unique indexes instead.';

-- Flag the historic twins: keep the earliest-received row of each key group.
WITH
    keyed AS (
        SELECT
            id,
            FIRST_VALUE(id) OVER w AS keep_id,
            ROW_NUMBER() OVER w AS rn
        FROM skill_usage_events
        WHERE
            duplicate_of_id IS NULL
            AND tool_use_id IS NOT NULL
        WINDOW w AS (
            PARTITION BY source, session_id, hook_event_name, tool_use_id
            ORDER BY received_at, id
        )
    )
UPDATE skill_usage_events e
SET duplicate_of_id = keyed.keep_id
FROM keyed
WHERE
    e.id = keyed.id
    AND keyed.rn > 1;

WITH
    keyed AS (
        SELECT
            id,
            FIRST_VALUE(id) OVER w AS keep_id,
            ROW_NUMBER() OVER w AS rn
        FROM skill_usage_events
        WHERE
            duplicate_of_id IS NULL
            AND tool_use_id IS NULL
            AND prompt_id IS NOT NULL
        WINDOW w AS (
            PARTITION BY source, session_id, hook_event_name, prompt_id, skill_name
            ORDER BY received_at, id
        )
    )
UPDATE skill_usage_events e
SET duplicate_of_id = keyed.keep_id
FROM keyed
WHERE
    e.id = keyed.id
    AND keyed.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS uq_skill_usage_events_tool_use ON skill_usage_events (
    source,
    session_id,
    hook_event_name,
    tool_use_id
)
WHERE
    tool_use_id IS NOT NULL
    AND duplicate_of_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_skill_usage_events_prompt ON skill_usage_events (
    source,
    session_id,
    hook_event_name,
    prompt_id,
    skill_name
)
WHERE
    tool_use_id IS NULL
    AND prompt_id IS NOT NULL
    AND duplicate_of_id IS NULL;
