-- Plan/task tag attachments: one row per (entity, tag) with the vocabulary dimension
-- denormalized and the writing identity recorded as source (provenance ladder:
-- human > agent > server-llm). tag has no FK — it is service-layer validated against
-- the caller's user_skill_tags vocabulary, mirroring project_skills.tags — so
-- vocabulary edits never break attachments (unknown tags degrade at evaluate time).
-- Written by the TagsService (add/remove mutations + tagging jobs); read by the
-- effective-tag-set rollup and the tag→action rules engine.
-- See docs/monorepo/plan-task-tags-rules-design.md ("Tag storage").

CREATE TABLE IF NOT EXISTS plan_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id UUID NOT NULL REFERENCES plans (id) ON DELETE CASCADE,
    tag TEXT NOT NULL,
    dimension TEXT NOT NULL,
    source TEXT NOT NULL,
    confidence NUMERIC,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_plan_tags_tag_kebab CHECK (tag ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
    CONSTRAINT chk_plan_tags_dimension CHECK (dimension IN ('domain', 'phase')),
    CONSTRAINT chk_plan_tags_source CHECK (source IN ('human', 'agent', 'server-llm')),
    CONSTRAINT uq_plan_tags_plan_tag UNIQUE (plan_id, tag)
);

CREATE INDEX IF NOT EXISTS idx_plan_tags_plan_id ON plan_tags (plan_id);

DROP TRIGGER IF EXISTS update_plan_tags_updated_at ON plan_tags;

CREATE TRIGGER update_plan_tags_updated_at
  BEFORE UPDATE ON plan_tags
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS task_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES tasks (id) ON DELETE CASCADE,
    tag TEXT NOT NULL,
    dimension TEXT NOT NULL,
    source TEXT NOT NULL,
    confidence NUMERIC,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_task_tags_tag_kebab CHECK (tag ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
    CONSTRAINT chk_task_tags_dimension CHECK (dimension IN ('domain', 'phase')),
    CONSTRAINT chk_task_tags_source CHECK (source IN ('human', 'agent', 'server-llm')),
    CONSTRAINT uq_task_tags_task_tag UNIQUE (task_id, tag)
);

CREATE INDEX IF NOT EXISTS idx_task_tags_task_id ON task_tags (task_id);

DROP TRIGGER IF EXISTS update_task_tags_updated_at ON task_tags;

CREATE TRIGGER update_task_tags_updated_at
  BEFORE UPDATE ON task_tags
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE plan_tags IS 'Tags attached to plans (one row per plan+tag). tag is service-layer validated against the caller''s user_skill_tags vocabulary (no FK, mirroring project_skills.tags); source records the writing identity for the provenance ladder (human > agent > server-llm). Feeds the effective-tag-set rollup and tag_action_rules matching. See docs/monorepo/plan-task-tags-rules-design.md.';

COMMENT ON COLUMN plan_tags.id IS 'Surrogate primary key.';

COMMENT ON COLUMN plan_tags.plan_id IS 'Tagged plan (plans.id); cascade-deleted with the plan.';

COMMENT ON COLUMN plan_tags.tag IS 'Kebab-case tag slug (matches AGENT_ASSET_SLUG_PATTERN in @openthrottle/openthrottle-skills). Unique per plan; validated against the caller''s vocabulary at write time.';

COMMENT ON COLUMN plan_tags.dimension IS 'Vocabulary axis, denormalized from user_skill_tags at write time: domain (subject area) or phase (lifecycle stage; at most one phase tag per plan, service-enforced).';

COMMENT ON COLUMN plan_tags.source IS 'Writing identity class, derived server-side (never caller-supplied): human (developer-app session), agent (agent token), or server-llm (tagging service account). Ranked human > agent > server-llm for replace/remove arbitration.';

COMMENT ON COLUMN plan_tags.confidence IS 'Model confidence for server-llm rows (0-1); NULL for human/agent rows. Stored for observability; non-gating in v1.';

COMMENT ON COLUMN plan_tags.created_at IS 'Row creation timestamp.';

COMMENT ON COLUMN plan_tags.updated_at IS 'Last-update timestamp, maintained by the update_updated_at_column() trigger.';

COMMENT ON TABLE task_tags IS 'Tags attached to tasks (one row per task+tag). Same shape and semantics as plan_tags: service-layer vocabulary validation (no FK), identity-derived source for the provenance ladder. Feeds the effective-tag-set rollup (task ∪ plan) and tag_action_rules matching. See docs/monorepo/plan-task-tags-rules-design.md.';

COMMENT ON COLUMN task_tags.id IS 'Surrogate primary key.';

COMMENT ON COLUMN task_tags.task_id IS 'Tagged task (tasks.id); cascade-deleted with the task.';

COMMENT ON COLUMN task_tags.tag IS 'Kebab-case tag slug (matches AGENT_ASSET_SLUG_PATTERN in @openthrottle/openthrottle-skills). Unique per task; validated against the caller''s vocabulary at write time.';

COMMENT ON COLUMN task_tags.dimension IS 'Vocabulary axis, denormalized from user_skill_tags at write time: domain (subject area) or phase (lifecycle stage).';

COMMENT ON COLUMN task_tags.source IS 'Writing identity class, derived server-side (never caller-supplied): human (developer-app session), agent (agent token), or server-llm (tagging service account). Ranked human > agent > server-llm for replace/remove arbitration.';

COMMENT ON COLUMN task_tags.confidence IS 'Model confidence for server-llm rows (0-1); NULL for human/agent rows. Stored for observability; non-gating in v1.';

COMMENT ON COLUMN task_tags.created_at IS 'Row creation timestamp.';

COMMENT ON COLUMN task_tags.updated_at IS 'Last-update timestamp, maintained by the update_updated_at_column() trigger.';
