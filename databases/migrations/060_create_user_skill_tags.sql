-- Per-user skill-tag vocabulary: the DB-authoritative controlled set of tags a user's
-- skill-availability rules may reference. Scoped by authenticated user (users.id),
-- following the user_workspace_settings precedent (OT has no standalone workspace entity).
-- The platform-default 16-tag seed is NOT applied here: the vocabulary is seeded on first
-- read, per user, from DEFAULT_SKILL_TAG_VOCABULARY in @openthrottle/openthrottle-skills
-- (see SkillTagsService.listForUser and docs/monorepo/skill-availability-design.md, "Tags").

-- One row per (user, tag). tag is a kebab-case slug matching AGENT_ASSET_SLUG_PATTERN
-- (/^[a-z0-9]+(?:-[a-z0-9]+)*$/) in @openthrottle/openthrottle-skills.
CREATE TABLE IF NOT EXISTS user_skill_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    tag TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_user_skill_tags_tag_kebab CHECK (tag ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
    CONSTRAINT uq_user_skill_tags_user_tag UNIQUE (user_id, tag)
);

CREATE INDEX IF NOT EXISTS idx_user_skill_tags_user_id ON user_skill_tags (user_id);

DROP TRIGGER IF EXISTS update_user_skill_tags_updated_at ON user_skill_tags;

CREATE TRIGGER update_user_skill_tags_updated_at
  BEFORE UPDATE ON user_skill_tags
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE user_skill_tags IS 'Per-user skill-tag vocabulary (DB-authoritative controlled set). Seeded on first read from DEFAULT_SKILL_TAG_VOCABULARY in @openthrottle/openthrottle-skills; users add/rename/remove their own tags. Backs skill-availability rules that reference skills by tag. See docs/monorepo/skill-availability-design.md.';

COMMENT ON COLUMN user_skill_tags.id IS 'Surrogate primary key.';

COMMENT ON COLUMN user_skill_tags.user_id IS 'Owning user (users.id); cascade-deleted with the user. Vocabulary is per-user, following the user_workspace_settings precedent.';

COMMENT ON COLUMN user_skill_tags.tag IS 'Kebab-case tag slug (matches AGENT_ASSET_SLUG_PATTERN in @openthrottle/openthrottle-skills). Unique per user.';

COMMENT ON COLUMN user_skill_tags.created_at IS 'Row creation timestamp.';

COMMENT ON COLUMN user_skill_tags.updated_at IS 'Last-update timestamp, maintained by the update_updated_at_column() trigger.';
