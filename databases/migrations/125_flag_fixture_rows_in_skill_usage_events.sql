-- Flag the instrumentation-fixture rows in skill_usage_events so they stop
-- inflating invocation counts (OT plan e4bca7d5).
--
-- The earliest rows in this table are not real usage: they are the probes that
-- brought the telemetry pipeline up. Measured before writing this migration,
-- they are exactly 7 rows out of 617 — and ALL SEVEN are attributed to
-- `ot-plans`, which is 7 of its 42 invocations. Globally that is 1.1% and would
-- not be worth a migration; for the one skill that carries them it is 17%, and
-- 17% is the difference between "this skill is used more than you think" and a
-- number you cannot cite.
--
-- The set is closed. These sessions were run by hand during bring-up and will
-- never grow, so flagging the known ids is a complete answer rather than a rule
-- that has to keep being right about future rows.
--
-- Flagged, not deleted: they are genuine evidence that the pipeline worked, and
-- a query can still ask for them. The default filter simply stops counting them
-- as usage.
--
-- Idempotent: re-running re-flags the same closed set and changes nothing else.

ALTER TABLE skill_usage_events
    ADD COLUMN IF NOT EXISTS is_fixture BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE skill_usage_events
   SET is_fixture = TRUE
 WHERE is_fixture = FALSE
   AND session_id IN (
       'agentic-hooks-e2e',
       'cursor-e2e',
       'phase2b-curl',
       'phase2b-online',
       'phase2b-online-persist',
       'phase2b-verify',
       'verify-row',
       'verify-session-1'
   );

CREATE INDEX IF NOT EXISTS idx_skill_usage_events_is_fixture
    ON skill_usage_events (is_fixture);

COMMENT ON COLUMN skill_usage_events.is_fixture IS
    'True for instrumentation probes recorded while bringing the telemetry pipeline up, not real skill usage. A closed set of 8 hand-run session ids (7 rows present, all attributed to ot-plans). /usage excludes these by default so they stop inflating invocation counts; they are retained rather than deleted because they are the evidence the pipeline worked.';
