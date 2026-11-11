-- Tag dimension for the per-user vocabulary: 'domain' (subject area, e.g. github,
-- database) vs 'phase' (lifecycle stage, e.g. breakdown, design). All pre-existing
-- rows are domain tags, hence the DEFAULT. The existing UNIQUE (user_id, tag)
-- deliberately stays unchanged and spans dimensions: a tag name exists in exactly
-- one dimension per user ('breakdown' can never be both). Seeded on first read from
-- the dimensioned defaults in @openthrottle/openthrottle-skills.
-- See docs/monorepo/plan-task-tags-rules-design.md ("One vocabulary, two dimensions").

ALTER TABLE user_skill_tags
ADD COLUMN IF NOT EXISTS dimension TEXT NOT NULL DEFAULT 'domain';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_user_skill_tags_dimension'
  ) THEN
    ALTER TABLE user_skill_tags
      ADD CONSTRAINT chk_user_skill_tags_dimension CHECK (dimension IN ('domain', 'phase'));
  END IF;
END $$;

COMMENT ON COLUMN user_skill_tags.dimension IS 'Vocabulary axis for this tag: domain (subject area; the only dimension skills may carry) or phase (plan/task lifecycle stage; never attaches to skills). UNIQUE (user_id, tag) spans dimensions, so a tag name lives in exactly one dimension per user.';
