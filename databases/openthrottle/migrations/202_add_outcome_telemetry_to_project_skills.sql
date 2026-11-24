-- Record a skill's outcome-telemetry opt-out on project_skills. A skill with no
-- finish line of its own (a convention reference such as ot-stack) declares
-- `metadata.outcome-telemetry: 'none'` in its SKILL.md frontmatter instead of
-- reporting an outcome (OT plan e1928cf3). Ingest copies that value here so the
-- developer app's /skills leaderboard can say "Not reported by design" rather
-- than "Not measured" (OT plan 8a632efe). NULL means the skill does not opt out.

ALTER TABLE project_skills ADD COLUMN IF NOT EXISTS outcome_telemetry TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chk_project_skills_outcome_telemetry'
      AND conrelid = 'project_skills'::regclass
  ) THEN
    ALTER TABLE project_skills
      ADD CONSTRAINT chk_project_skills_outcome_telemetry CHECK (outcome_telemetry IN ('none'));
  END IF;
END $$;

COMMENT ON COLUMN project_skills.outcome_telemetry IS 'The SKILL.md frontmatter `metadata.outcome-telemetry` value: ''none'' when the skill deliberately reports no outcome or duration (so usage views show "Not reported by design"), NULL when the skill does not opt out. An unrecognized frontmatter value normalizes to NULL at parse time.';
