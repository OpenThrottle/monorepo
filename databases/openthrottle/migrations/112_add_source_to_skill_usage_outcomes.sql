-- Add a `source` (producer) column to skill_usage_outcomes, closing the gap
-- migration 086 left when it added the same column to skill_usage_events only
-- (OT plan ef00279a).
--
-- Events have been attributable to their capturing tool since 086; outcomes
-- never were. That was invisible while one producer emitted outcomes. It stops
-- being invisible the moment a second one does: every outcome row becomes
-- unattributable at the same instant, and "which agent actually finishes the
-- skills it starts" turns from a query into a guess. This lands BEFORE the
-- second producer's completion adapter so no unattributed row is ever written.
--
-- Deliberately mirrors 086 rather than improving on it: nullable, free text,
-- indexed, and with NO CHECK constraint. The absence of the constraint is the
-- point — adding a producer stays a code-only change, with no migration to
-- coordinate against a hook bundle that may be running from an older checkout.
--
-- Nullable: rows ingested before this column existed have no known producer,
-- and a backfill would be a guess indistinguishable from a record afterwards.
--
-- Idempotent: re-running is a no-op. Deliberately performs no backfill.

ALTER TABLE skill_usage_outcomes
    ADD COLUMN IF NOT EXISTS source TEXT;

CREATE INDEX IF NOT EXISTS idx_skill_usage_outcomes_source
    ON skill_usage_outcomes (source);

COMMENT ON COLUMN skill_usage_outcomes.source IS
    'Producer id of the tool/adapter that recorded this outcome (e.g. claude-code, cursor). Null for rows ingested before source tracking; stamped by the per-tool skill-usage adapter. Matches skill_usage_events.source, so the two tables join on producer as well as on session_id + skill_name.';
