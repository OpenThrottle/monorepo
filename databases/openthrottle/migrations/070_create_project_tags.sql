-- Project tag attachments: one row per (project, tag), mirroring plan_tags/task_tags
-- (migration 064). Same shape and semantics — vocabulary dimension denormalized at
-- write time, writing identity recorded as source (provenance ladder: human > agent
-- > server-llm). tag has no FK — service-layer validated against the caller's
-- user_skill_tags vocabulary (mirroring project_skills.tags), so vocabulary edits
-- never break attachments. Multiple tags per project are allowed (no ≤1-phase
-- constraint — that limit is plan-only). Written by the TagsService add/remove
-- mutations; a project's tags feed the effective-tag-set rollup for its plans and
-- the tag→action rules engine.
-- See docs/monorepo/plan-task-tags-rules-design.md ("Tag storage").

CREATE TABLE IF NOT EXISTS project_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects (id) ON DELETE CASCADE,
    tag TEXT NOT NULL,
    dimension TEXT NOT NULL,
    source TEXT NOT NULL,
    confidence NUMERIC,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_project_tags_tag_kebab CHECK (tag ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
    CONSTRAINT chk_project_tags_dimension CHECK (dimension IN ('domain', 'phase')),
    CONSTRAINT chk_project_tags_source CHECK (source IN ('human', 'agent', 'server-llm')),
    CONSTRAINT uq_project_tags_project_tag UNIQUE (project_id, tag)
);

CREATE INDEX IF NOT EXISTS idx_project_tags_project_id ON project_tags (project_id);

DROP TRIGGER IF EXISTS update_project_tags_updated_at ON project_tags;

CREATE TRIGGER update_project_tags_updated_at
  BEFORE UPDATE ON project_tags
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE project_tags IS 'Tags attached to projects (one row per project+tag). Same shape and semantics as plan_tags/task_tags: service-layer vocabulary validation (no FK), identity-derived source for the provenance ladder. Multiple tags per project allowed (no ≤1-phase constraint). A project''s tags feed the effective-tag-set rollup for its plans and tag_action_rules matching. See docs/monorepo/plan-task-tags-rules-design.md.';

COMMENT ON COLUMN project_tags.id IS 'Surrogate primary key.';

COMMENT ON COLUMN project_tags.project_id IS 'Tagged project (projects.id); cascade-deleted with the project.';

COMMENT ON COLUMN project_tags.tag IS 'Kebab-case tag slug (matches AGENT_ASSET_SLUG_PATTERN in @openthrottle/openthrottle-skills). Unique per project; validated against the caller''s vocabulary at write time.';

COMMENT ON COLUMN project_tags.dimension IS 'Vocabulary axis, denormalized from user_skill_tags at write time: domain (subject area) or phase (lifecycle stage).';

COMMENT ON COLUMN project_tags.source IS 'Writing identity class, derived server-side (never caller-supplied): human (developer-app session), agent (agent token), or server-llm (tagging service account). Ranked human > agent > server-llm for replace/remove arbitration.';

COMMENT ON COLUMN project_tags.confidence IS 'Model confidence for server-llm rows (0-1); NULL for human/agent rows. Stored for observability; non-gating in v1.';

COMMENT ON COLUMN project_tags.created_at IS 'Row creation timestamp.';

COMMENT ON COLUMN project_tags.updated_at IS 'Last-update timestamp, maintained by the update_updated_at_column() trigger.';
