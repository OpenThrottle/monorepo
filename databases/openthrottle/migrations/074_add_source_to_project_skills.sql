-- Add skill provenance to project_skills: `source` distinguishes OpenThrottle-managed
-- skills (frontmatter `source: openthrottle`) from skills installed from an external
-- origin, and `source_url` optionally records that origin (marketplace/repo URL).
-- Values come from SKILL.md frontmatter via @openthrottle/openthrottle-skills
-- (parseSkillFrontmatter): an omitted or unrecognized frontmatter value normalizes to
-- 'external' before ingest, so the column default matches the parser's conservative
-- default. Surfaced read-only through the projectSkills GraphQL query for the
-- developer app's skills index/detail routes.

ALTER TABLE project_skills ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'external';

ALTER TABLE project_skills ADD COLUMN IF NOT EXISTS source_url TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chk_project_skills_source'
      AND conrelid = 'project_skills'::regclass
  ) THEN
    ALTER TABLE project_skills
      ADD CONSTRAINT chk_project_skills_source CHECK (source IN ('external', 'openthrottle'));
  END IF;
END $$;

COMMENT ON COLUMN project_skills.source IS 'Skill provenance from SKILL.md frontmatter: ''openthrottle'' for skills OpenThrottle authors and manages, ''external'' for skills installed from an outside source. Omitted or unrecognized frontmatter values normalize to ''external'' at parse time (conservative: only explicitly claimed skills read as ours), which the column default mirrors.';

COMMENT ON COLUMN project_skills.source_url IS 'Optional origin URL for external skills (marketplace listing or upstream repo) from the SKILL.md frontmatter `sourceUrl` key; NULL when the frontmatter omits it. Not meaningful for source = ''openthrottle''.';
