-- Give the batch 4 blog tables the BaseModel shape (@openthrottle/nestjs-postgres): a
-- `deleted_at` soft-delete marker and a uuidv7 `id` default. Batch 4 of moving the entities
-- into @openthrottle/nestjs-repositories-server (OT plan e854d0e3-5af2-4e6b-a4d7-8a108fcdca0c).
-- The owner decided the blog stays in the openthrottle database rather than moving to cms.
--
-- Existing ids are untouched; only rows inserted from now on get a uuidv7. The
-- update_blog_*_updated_at triggers from 131 stay.
--
-- The blog_post_tags join is not reshaped: it is a pure (post_id, tag_id) join with a
-- composite primary key and no id, maintained by TypeORM's @ManyToMany, so it stays a hard
-- delete. Soft-deleting a post or tag leaves its join rows in place; reads never reach them,
-- because the live-row filter applies to the joined post or tag.
--
-- Each slug unique (and the blog_authors user_id unique) becomes a partial unique index over
-- live rows, so a soft-deleted row never blocks reusing its slug. The upserts that conflict
-- on slug name the same predicate (ON CONFLICT (slug) WHERE deleted_at IS NULL).

-- ---------------------------------------------------------------------------
-- blog_authors
-- ---------------------------------------------------------------------------

ALTER TABLE blog_authors ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE NULL;

COMMENT ON COLUMN blog_authors.deleted_at IS
  'When this author was soft deleted; NULL for live authors';

ALTER TABLE blog_authors ALTER COLUMN id SET DEFAULT uuidv7();

DROP INDEX IF EXISTS idx_blog_authors_slug;

CREATE UNIQUE INDEX IF NOT EXISTS idx_blog_authors_slug_live
  ON blog_authors (slug)
  WHERE deleted_at IS NULL;

DROP INDEX IF EXISTS idx_blog_authors_user_id;

CREATE UNIQUE INDEX IF NOT EXISTS idx_blog_authors_user_id_live
  ON blog_authors (user_id)
  WHERE user_id IS NOT NULL AND deleted_at IS NULL;

COMMENT ON COLUMN blog_authors.slug IS
  'Public, URL-safe author key. Lowercase kebab-case (chk_blog_authors_slug); unique among live authors via idx_blog_authors_slug_live.';

COMMENT ON COLUMN blog_authors.user_id IS
  'Optional link to the OpenThrottle user this byline belongs to (FK users.id, ON DELETE SET NULL). Unique among live authors when set (idx_blog_authors_user_id_live); NULL for guest authors. Never exposed publicly.';

-- ---------------------------------------------------------------------------
-- blog_posts
-- ---------------------------------------------------------------------------

ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE NULL;

COMMENT ON COLUMN blog_posts.deleted_at IS
  'When this post was soft deleted; NULL for live posts. A soft-deleted post is never publicly visible.';

ALTER TABLE blog_posts ALTER COLUMN id SET DEFAULT uuidv7();

DROP INDEX IF EXISTS idx_blog_posts_slug;

CREATE UNIQUE INDEX IF NOT EXISTS idx_blog_posts_slug_live
  ON blog_posts (slug)
  WHERE deleted_at IS NULL;

COMMENT ON COLUMN blog_posts.slug IS
  'Public URL key (/blog/<slug>). Lowercase kebab-case (chk_blog_posts_slug); unique among live posts via idx_blog_posts_slug_live.';

-- The public feed reads live, published posts newest first; the partial index now excludes
-- soft-deleted rows too.
DROP INDEX IF EXISTS idx_blog_posts_published;

CREATE INDEX IF NOT EXISTS idx_blog_posts_published_live
  ON blog_posts (published_at DESC, id DESC)
  WHERE status = 'PUBLISHED' AND deleted_at IS NULL;

-- ---------------------------------------------------------------------------
-- blog_tags
-- ---------------------------------------------------------------------------

ALTER TABLE blog_tags ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE NULL;

COMMENT ON COLUMN blog_tags.deleted_at IS
  'When this tag was soft deleted; NULL for live tags';

ALTER TABLE blog_tags ALTER COLUMN id SET DEFAULT uuidv7();

DROP INDEX IF EXISTS idx_blog_tags_slug;

CREATE UNIQUE INDEX IF NOT EXISTS idx_blog_tags_slug_live
  ON blog_tags (slug)
  WHERE deleted_at IS NULL;

COMMENT ON COLUMN blog_tags.slug IS
  'Public URL key (/blog/tags/<slug>). Lowercase kebab-case (chk_blog_tags_slug); unique among live tags via idx_blog_tags_slug_live.';
