-- Add a `source` (producer) column to skill_usage_events so harness-captured
-- invocations are attributable to the tool that captured them (e.g. claude-code,
-- cursor). The capture side is tool-neutral (.agents/hooks/skill-usage/) with a
-- thin per-tool adapter that stamps this id. Nullable: rows ingested before this
-- column existed have no known producer. See OT plan d3759118.

ALTER TABLE skill_usage_events
    ADD COLUMN IF NOT EXISTS source TEXT;

CREATE INDEX IF NOT EXISTS idx_skill_usage_events_source
    ON skill_usage_events (source);

COMMENT ON COLUMN skill_usage_events.source IS
    'Producer id of the tool/adapter that captured this invocation (e.g. claude-code, cursor). Null for rows ingested before source tracking; stamped by the per-tool skill-usage adapter.';
