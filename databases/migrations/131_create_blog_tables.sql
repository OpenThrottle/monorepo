-- Blog: the database-backed blog on the public marketing site (openthrottle-website).
-- Four tables — blog_authors, blog_posts, blog_tags, and the blog_post_tags join.
--
-- Public visibility rule (single definition, enforced server-side by
-- @openthrottle/nestjs-repositories BlogPostsService): a post is publicly visible iff
-- status = 'PUBLISHED' AND published_at <= now(). Drafts, archived and future-scheduled
-- posts are never served by the public GraphQL queries.
--
-- Sample content is a dev-only seed, never a migration: fixture posts must not land in
-- production. Foreign keys are added in their own pg_constraint-guarded statements so a
-- re-run against an existing table still lands them (see databases/README.md § Foreign keys).

-- ---------------------------------------------------------------------------
-- blog_authors
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS blog_authors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT NOT NULL,
    display_name TEXT NOT NULL,
    bio TEXT NULL,
    avatar_url TEXT NULL,
    user_id UUID NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_blog_authors_slug CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
    CONSTRAINT chk_blog_authors_display_name CHECK (length(btrim(display_name)) > 0)
);

COMMENT ON TABLE blog_authors IS 'Public byline identities for OpenThrottle blog posts. Separate from users because users only carries github_username/email, which must never be exposed on the public site, and guest authors have no user row.';

COMMENT ON COLUMN blog_authors.id IS 'Surrogate key.';

COMMENT ON COLUMN blog_authors.slug IS 'Public, URL-safe author key. Lowercase kebab-case (chk_blog_authors_slug); unique via idx_blog_authors_slug.';

COMMENT ON COLUMN blog_authors.display_name IS 'Name shown in the byline. Non-empty (chk_blog_authors_display_name).';

COMMENT ON COLUMN blog_authors.bio IS 'Short public biography shown alongside the byline. Optional.';

COMMENT ON COLUMN blog_authors.avatar_url IS 'Absolute URL of the author avatar image. Optional.';

COMMENT ON COLUMN blog_authors.user_id IS 'Optional link to the OpenThrottle user this byline belongs to (FK users.id, ON DELETE SET NULL). Unique when set (idx_blog_authors_user_id); NULL for guest authors. Never exposed publicly.';

COMMENT ON COLUMN blog_authors.created_at IS 'Row creation time.';

COMMENT ON COLUMN blog_authors.updated_at IS 'Last modification time; maintained by the update_blog_authors_updated_at trigger.';

CREATE UNIQUE INDEX IF NOT EXISTS idx_blog_authors_slug ON blog_authors (slug);

CREATE UNIQUE INDEX IF NOT EXISTS idx_blog_authors_user_id ON blog_authors (user_id) WHERE user_id IS NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'blog_authors_user_id_fkey') THEN
    ALTER TABLE blog_authors ADD CONSTRAINT blog_authors_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL;
  END IF;
END
$$;

DROP TRIGGER IF EXISTS update_blog_authors_updated_at ON blog_authors;

CREATE TRIGGER update_blog_authors_updated_at
  BEFORE UPDATE ON blog_authors
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ---------------------------------------------------------------------------
-- blog_posts
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS blog_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT NOT NULL,
    title TEXT NOT NULL,
    excerpt TEXT NULL,
    body_markdown TEXT NOT NULL,
    cover_image_url TEXT NULL,
    cover_image_alt TEXT NULL,
    seo_title TEXT NULL,
    seo_description TEXT NULL,
    status TEXT NOT NULL DEFAULT 'DRAFT',
    published_at TIMESTAMP WITH TIME ZONE NULL,
    author_id UUID NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_blog_posts_slug CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
    CONSTRAINT chk_blog_posts_title CHECK (length(btrim(title)) > 0),
    CONSTRAINT chk_blog_posts_status CHECK (status IN ('DRAFT', 'PUBLISHED', 'ARCHIVED')),
    CONSTRAINT chk_blog_posts_published_at CHECK (status <> 'PUBLISHED' OR published_at IS NOT NULL)
);

COMMENT ON TABLE blog_posts IS 'OpenThrottle blog posts rendered on the public marketing site. Publicly visible iff status = PUBLISHED AND published_at <= now(); that rule lives once, in @openthrottle/nestjs-repositories BlogPostsService.';

COMMENT ON COLUMN blog_posts.id IS 'Surrogate key.';

COMMENT ON COLUMN blog_posts.slug IS 'Public URL key (/blog/<slug>). Lowercase kebab-case (chk_blog_posts_slug); unique via idx_blog_posts_slug.';

COMMENT ON COLUMN blog_posts.title IS 'Post headline. Non-empty (chk_blog_posts_title).';

COMMENT ON COLUMN blog_posts.excerpt IS 'Short summary for preview cards; also the meta-description fallback when seo_description is NULL. Optional.';

COMMENT ON COLUMN blog_posts.body_markdown IS 'Post body as Markdown, rendered by @openthrottle/react-router-markdown. Reading time is derived from it at read time, never stored.';

COMMENT ON COLUMN blog_posts.cover_image_url IS 'Absolute URL of the cover image; also used as og:image. Optional.';

COMMENT ON COLUMN blog_posts.cover_image_alt IS 'Alt text for cover_image_url. Optional, but expected whenever cover_image_url is set.';

COMMENT ON COLUMN blog_posts.seo_title IS 'Overrides title in the document <title>/og:title when set. Optional.';

COMMENT ON COLUMN blog_posts.seo_description IS 'Meta description / og:description; falls back to excerpt when NULL. Optional.';

COMMENT ON COLUMN blog_posts.status IS 'Lifecycle: DRAFT (default, never public), PUBLISHED (public once published_at <= now()), ARCHIVED (withdrawn, never public). Enforced by chk_blog_posts_status.';

COMMENT ON COLUMN blog_posts.published_at IS 'Publication time. Required when status = PUBLISHED (chk_blog_posts_published_at); a future value schedules the post. Orders the public list (newest first).';

COMMENT ON COLUMN blog_posts.author_id IS 'Byline (FK blog_authors.id, ON DELETE SET NULL). Optional.';

COMMENT ON COLUMN blog_posts.created_at IS 'Row creation time.';

COMMENT ON COLUMN blog_posts.updated_at IS 'Last modification time; maintained by the update_blog_posts_updated_at trigger. Used as sitemap lastmod.';

CREATE UNIQUE INDEX IF NOT EXISTS idx_blog_posts_slug ON blog_posts (slug);

CREATE INDEX IF NOT EXISTS idx_blog_posts_published ON blog_posts (published_at DESC, id DESC) WHERE status = 'PUBLISHED';

CREATE INDEX IF NOT EXISTS idx_blog_posts_author_id ON blog_posts (author_id);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'blog_posts_author_id_fkey') THEN
    ALTER TABLE blog_posts ADD CONSTRAINT blog_posts_author_id_fkey
      FOREIGN KEY (author_id) REFERENCES blog_authors (id) ON DELETE SET NULL;
  END IF;
END
$$;

DROP TRIGGER IF EXISTS update_blog_posts_updated_at ON blog_posts;

CREATE TRIGGER update_blog_posts_updated_at
  BEFORE UPDATE ON blog_posts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ---------------------------------------------------------------------------
-- blog_tags
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS blog_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_blog_tags_slug CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
    CONSTRAINT chk_blog_tags_name CHECK (length(btrim(name)) > 0)
);

COMMENT ON TABLE blog_tags IS 'Topics OpenThrottle blog posts are filed under; each has a public tag page (/blog/tags/<slug>).';

COMMENT ON COLUMN blog_tags.id IS 'Surrogate key.';

COMMENT ON COLUMN blog_tags.slug IS 'Public URL key (/blog/tags/<slug>). Lowercase kebab-case (chk_blog_tags_slug); unique via idx_blog_tags_slug.';

COMMENT ON COLUMN blog_tags.name IS 'Display name. Non-empty (chk_blog_tags_name).';

COMMENT ON COLUMN blog_tags.description IS 'Short description shown on the tag page. Optional.';

COMMENT ON COLUMN blog_tags.created_at IS 'Row creation time.';

COMMENT ON COLUMN blog_tags.updated_at IS 'Last modification time; maintained by the update_blog_tags_updated_at trigger.';

CREATE UNIQUE INDEX IF NOT EXISTS idx_blog_tags_slug ON blog_tags (slug);

DROP TRIGGER IF EXISTS update_blog_tags_updated_at ON blog_tags;

CREATE TRIGGER update_blog_tags_updated_at
  BEFORE UPDATE ON blog_tags
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ---------------------------------------------------------------------------
-- blog_post_tags
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS blog_post_tags (
    post_id UUID NOT NULL,
    tag_id UUID NOT NULL,
    PRIMARY KEY (post_id, tag_id)
);

COMMENT ON TABLE blog_post_tags IS 'Many-to-many join between OpenThrottle blog posts and blog tags. Rows are removed with either side (ON DELETE CASCADE).';

COMMENT ON COLUMN blog_post_tags.post_id IS 'Tagged post (FK blog_posts.id, ON DELETE CASCADE).';

COMMENT ON COLUMN blog_post_tags.tag_id IS 'Applied tag (FK blog_tags.id, ON DELETE CASCADE). Indexed by idx_blog_post_tags_tag_id for tag-page lookups.';

CREATE INDEX IF NOT EXISTS idx_blog_post_tags_tag_id ON blog_post_tags (tag_id);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'blog_post_tags_post_id_fkey') THEN
    ALTER TABLE blog_post_tags ADD CONSTRAINT blog_post_tags_post_id_fkey
      FOREIGN KEY (post_id) REFERENCES blog_posts (id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'blog_post_tags_tag_id_fkey') THEN
    ALTER TABLE blog_post_tags ADD CONSTRAINT blog_post_tags_tag_id_fkey
      FOREIGN KEY (tag_id) REFERENCES blog_tags (id) ON DELETE CASCADE;
  END IF;
END
$$;
