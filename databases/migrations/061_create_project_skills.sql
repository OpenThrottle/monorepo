-- Per-project skill registry: the server-queryable universe of skills most recently
-- ingested for a project's linked repository, carrying each skill's static frontmatter
-- `tags` and tri-state `disable-model-invocation` flag WITHOUT disk access. Written by the
-- agent-asset ingest path (scripts/openthrottle-ingest-agent-assets.ts for the monorepo's own
-- dogfood project; the same reconcile interface serves connected workspace repos). Read by
-- ProjectSkillsService.getSkillsForProject to feed resolveSkillAvailability.
-- See docs/monorepo/skill-availability-design.md ("Topology" + "Output contract").

-- One row per (project, skill slug). slug is a kebab-case slug matching AGENT_ASSET_SLUG_PATTERN
-- (/^[a-z0-9]+(?:-[a-z0-9]+)*$/) in @openthrottle/openthrottle-skills. disable_model_invocation is
-- deliberately NULLABLE to preserve the frontmatter tri-state (true | false | unset); NULL means
-- the skill omits the key (invocable by default) and must stay distinct from an explicit false.
CREATE TABLE IF NOT EXISTS project_skills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects (id) ON DELETE CASCADE,
    slug TEXT NOT NULL,
    tags TEXT[] NOT NULL DEFAULT '{}',
    disable_model_invocation BOOLEAN,
    source_path TEXT NOT NULL,
    ingested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_project_skills_slug_kebab CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
    CONSTRAINT uq_project_skills_project_slug UNIQUE (project_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_project_skills_project_id ON project_skills (project_id);

DROP TRIGGER IF EXISTS update_project_skills_updated_at ON project_skills;

CREATE TRIGGER update_project_skills_updated_at
  BEFORE UPDATE ON project_skills
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE project_skills IS 'Per-project skill registry: skills most recently ingested for a project''s linked repository, with static frontmatter tags and the tri-state disable-model-invocation flag, queryable server-side without disk access. Written by the agent-asset ingest path; read by ProjectSkillsService.getSkillsForProject. See docs/monorepo/skill-availability-design.md.';

COMMENT ON COLUMN project_skills.id IS 'Surrogate primary key.';

COMMENT ON COLUMN project_skills.project_id IS 'Owning project (projects.id); cascade-deleted with the project. The skill universe is scoped per project.';

COMMENT ON COLUMN project_skills.slug IS 'Kebab-case skill slug (the .agents/skills/<slug> directory name; matches AGENT_ASSET_SLUG_PATTERN). Unique per project.';

COMMENT ON COLUMN project_skills.tags IS 'Static frontmatter tags for the skill; empty array when the skill declares none. Referenced by skill-availability rules.';

COMMENT ON COLUMN project_skills.disable_model_invocation IS 'Static frontmatter disable-model-invocation flag, tri-state: TRUE suppresses model-initiated invocation, FALSE forces it invocable, NULL means the key is unset (invocable by default). NULL is deliberately distinct from FALSE.';

COMMENT ON COLUMN project_skills.source_path IS 'Repo-relative SKILL.md path the skill was ingested from (e.g. .agents/skills/<slug>/SKILL.md).';

COMMENT ON COLUMN project_skills.ingested_at IS 'Timestamp of the most recent ingest that upserted this row.';

COMMENT ON COLUMN project_skills.created_at IS 'Row creation timestamp.';

COMMENT ON COLUMN project_skills.updated_at IS 'Last-update timestamp, maintained by the update_updated_at_column() trigger.';
