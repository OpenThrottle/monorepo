-- OpenThrottle CMS: publishable pages, each rooted at one fragment.
-- Ported from RocketCMS (20240601061320_add_layouts_table.sql). The source named
-- both the foreign key and the unique index idx_layouts_fragment_uuid; the
-- foreign key is layouts_fragment_uuid_fkey here.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'layout_status') THEN
    CREATE TYPE layout_status AS ENUM ('ACTIVE', 'DISABLED', 'DRAFT');
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS layouts (
    uuid          UUID                     NOT NULL DEFAULT gen_random_uuid(),
    created_at    TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    is_deleted    BOOLEAN                           DEFAULT false,
    updated_at    TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    fragment_uuid UUID                     NOT NULL,
    metadata      JSONB                    NOT NULL DEFAULT '{}'::jsonb,
    name          CHARACTER VARYING        NOT NULL,
    slug          CHARACTER VARYING        NOT NULL,
    status        layout_status                     DEFAULT 'DRAFT',
    tags          CHARACTER VARYING[]      NOT NULL DEFAULT '{}'::character varying[],

    CONSTRAINT layouts_pkey PRIMARY KEY (uuid)
);

COMMENT ON TABLE layouts IS 'OpenThrottle CMS layouts: a publishable page addressed by slug, whose content is the fragment tree rooted at fragment_uuid.';
COMMENT ON COLUMN layouts.fragment_uuid IS 'Root fragment of this layout''s tree; unique, so a root belongs to exactly one layout.';
COMMENT ON COLUMN layouts.metadata IS 'Page-level metadata (title, description, social cards, …) as a free-form JSON object.';
COMMENT ON COLUMN layouts.tags IS 'Free-text labels for filtering layouts in the editor.';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'layouts_fragment_uuid_fkey') THEN
    ALTER TABLE layouts ADD CONSTRAINT layouts_fragment_uuid_fkey
      FOREIGN KEY (fragment_uuid) REFERENCES fragments (uuid);
  END IF;
END
$$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_layouts_fragment_uuid ON layouts (fragment_uuid);
CREATE UNIQUE INDEX IF NOT EXISTS idx_layouts_slug ON layouts (slug);
