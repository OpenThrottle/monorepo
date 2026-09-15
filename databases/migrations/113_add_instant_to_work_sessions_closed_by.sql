-- Widen chk_work_sessions_closed_by to allow 'instant', separating a session that is
-- instantaneous by nature from one genuinely closed after real work (OT plan ac5bf17f).
--
-- 068 gave closed_by two values and folded instant sessions into 'explicit', documenting
-- them as "endWorkSession / instant session". That made the two indistinguishable except
-- by comparing ended_at = started_at. The comparison is not just awkward, it is what let a
-- real regression hide: 435 of 436 sessions in a week were instant, every one of them
-- labelled 'explicit', and nothing in the ledger said so. A value that has to be inferred
-- from a timestamp identity is not a value the data carries.
--
-- With 'instant' recorded explicitly, "sessions that represent a span" is a predicate on
-- closed_by rather than an arithmetic accident, and the duration views can filter honestly.
--
-- Deliberately performs NO backfill. Existing instant rows keep 'explicit'. Re-labelling
-- them would be a guess dressed as a record: the rows are a faithful account of a period
-- when the distinction was not captured, and erasing that erases the only evidence of when
-- it started being captured. New rows carry the new value; history stays as it was written.
--
-- Idempotent: the constraint is dropped and recreated, so re-running is a no-op.

ALTER TABLE work_sessions
    DROP CONSTRAINT IF EXISTS chk_work_sessions_closed_by;

ALTER TABLE work_sessions
    ADD CONSTRAINT chk_work_sessions_closed_by
        CHECK (closed_by IS NULL OR closed_by IN ('explicit', 'sweeper', 'instant'));

COMMENT ON COLUMN work_sessions.closed_by IS
    'How the session ended: explicit (endWorkSession after real work), instant (instantaneous by nature — a single first-party mutation with no span to record), or sweeper (abandoned past the 24h TTL). NULL while still open. Rows written before migration 113 record instant sessions as explicit and are deliberately not backfilled. A Ralph-reliability signal, not just hygiene (design §4.4).';
