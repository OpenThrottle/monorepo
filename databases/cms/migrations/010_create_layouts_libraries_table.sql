-- OpenThrottle CMS: which component libraries a layout renders with.
-- Ported from RocketCMS (20241220000003_add_layouts_libraries_table.sql).

CREATE TABLE IF NOT EXISTS layouts_libraries (
    uuid         UUID                     NOT NULL DEFAULT gen_random_uuid(),
    created_at   TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    layout_uuid  UUID                     NOT NULL,
    library_uuid UUID                     NOT NULL,

    CONSTRAINT layouts_libraries_pkey PRIMARY KEY (uuid)
);

COMMENT ON TABLE layouts_libraries IS 'OpenThrottle CMS layout-to-library links: each row makes a library''s components available to a layout. Unique per (layout, library); removed with either side.';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'layouts_libraries_layout_uuid_fkey') THEN
    ALTER TABLE layouts_libraries ADD CONSTRAINT layouts_libraries_layout_uuid_fkey
      FOREIGN KEY (layout_uuid) REFERENCES layouts (uuid) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'layouts_libraries_library_uuid_fkey') THEN
    ALTER TABLE layouts_libraries ADD CONSTRAINT layouts_libraries_library_uuid_fkey
      FOREIGN KEY (library_uuid) REFERENCES libraries (uuid) ON DELETE CASCADE;
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_layouts_libraries_layout_uuid ON layouts_libraries (layout_uuid);
CREATE INDEX IF NOT EXISTS idx_layouts_libraries_library_uuid ON layouts_libraries (library_uuid);
CREATE UNIQUE INDEX IF NOT EXISTS idx_layouts_libraries_unique ON layouts_libraries (layout_uuid, library_uuid);
