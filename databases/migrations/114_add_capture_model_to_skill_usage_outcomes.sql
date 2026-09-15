-- Quarantine the pre-fix skill_usage_outcomes rows behind a capture-model
-- discriminator (OT plan e4bca7d5 — honest skill-usage outcomes).
--
-- Every row written before migration 113 came from an automatic session-end
-- path that passed `success` as a hardcoded default. As of this migration that
-- is 546 `success` rows and 26 `abandoned`, with ZERO `error` ever recorded —
-- the signature of a column that was reporting liveness, not quality.
--
-- Those rows cannot simply be rewritten to `session_ended`: they would then be
-- indistinguishable from rows a reporter actually measured, which is the same
-- confusion in the opposite direction. And they cannot be left alone either,
-- because their `success` value is inside the new quality numerator and would
-- keep scoring wins nobody measured.
--
-- So discriminate rather than destroy. `capture_model` records WHICH contract a
-- row was written under:
--   legacy_assumed_success — written before 113; `success` here is an assumption
--                            the old code made, not an observation.
--   reported_v1            — written under the honest contract: success/error
--                            only ever come from a deliberate reporter, and
--                            session_ended/abandoned make no quality claim.
--
-- Deliberately ordered: ADD the column NULLable, backfill the existing rows to
-- the legacy value, and only THEN attach the default for future rows. Adding it
-- with the default in place would stamp `reported_v1` onto the very rows this
-- exists to mark, silently destroying the distinction.
--
-- Idempotent: re-running adds nothing, backfills nothing (no NULLs remain), and
-- re-asserts the default and NOT NULL as no-ops. Deletes no history.

ALTER TABLE skill_usage_outcomes
    ADD COLUMN IF NOT EXISTS capture_model TEXT;

UPDATE skill_usage_outcomes
   SET capture_model = 'legacy_assumed_success'
 WHERE capture_model IS NULL;

ALTER TABLE skill_usage_outcomes
    ALTER COLUMN capture_model SET DEFAULT 'reported_v1';

ALTER TABLE skill_usage_outcomes
    ALTER COLUMN capture_model SET NOT NULL;

ALTER TABLE skill_usage_outcomes
    DROP CONSTRAINT IF EXISTS skill_usage_outcomes_capture_model_check;

ALTER TABLE skill_usage_outcomes
    ADD CONSTRAINT skill_usage_outcomes_capture_model_check
    CHECK (capture_model IN ('legacy_assumed_success', 'reported_v1'));

CREATE INDEX IF NOT EXISTS idx_skill_usage_outcomes_capture_model
    ON skill_usage_outcomes (capture_model);

COMMENT ON COLUMN skill_usage_outcomes.capture_model IS
    'Which capture contract wrote this row. legacy_assumed_success = written before migration 113, when the automatic session-end path hardcoded outcome=success; its outcome value is an assumption, not a measurement, and /usage excludes these rows from every count. reported_v1 = written under the honest contract. Backfilled once, never rewritten — the point is to tell a measured value from an assumed one.';
