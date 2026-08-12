-- Add the skill `description` to project_skills so the developer app's `/skills`
-- autocomplete works in deployed environments with no local checkout (filesystem
-- discovery unavailable → the menu falls back to the ingested description over
-- GraphQL). The value is the SKILL.md frontmatter `description`, the same text
-- ingested into custom_prompts.description; NULL when the frontmatter omits it.
-- Populated by the agent-asset ingest via @openthrottle/openthrottle-skills
-- (toProjectSkillInputs). Surfaced read-only through the projectSkills GraphQL
-- query. Additive + idempotent.

ALTER TABLE project_skills ADD COLUMN IF NOT EXISTS description TEXT;

COMMENT ON COLUMN project_skills.description IS 'Skill description from SKILL.md frontmatter (the same text ingested into custom_prompts.description); NULL when the frontmatter omits it. Surfaced read-only through the projectSkills GraphQL query so the developer app''s /skills slash-command menu can show descriptions in deployed environments that have no local checkout for filesystem discovery.';
