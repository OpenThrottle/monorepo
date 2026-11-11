-- OpenThrottle CMS: content fragments, the building blocks of a layout.
-- Ported from RocketCMS (20240601061315_add_fragments_table.sql).

CREATE TABLE IF NOT EXISTS fragments (
    uuid        UUID                     NOT NULL DEFAULT gen_random_uuid(),
    created_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    is_deleted  BOOLEAN                           DEFAULT false,
    is_system   BOOLEAN                           DEFAULT false,
    updated_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    name        CHARACTER VARYING        NOT NULL,
    properties  JSONB                    NOT NULL DEFAULT '{}'::jsonb,
    schema_uuid UUID                     NOT NULL,
    typename    CHARACTER VARYING        NOT NULL,

    CONSTRAINT fragments_pkey PRIMARY KEY (uuid)
);

COMMENT ON TABLE fragments IS 'OpenThrottle CMS fragments: a named, typed piece of content whose properties conform to a schema. Fragments nest through fragments_children, and a layout is rooted at one fragment.';
COMMENT ON COLUMN fragments.properties IS 'The fragment''s content, validated against schemas.json_schema of schema_uuid.';
COMMENT ON COLUMN fragments.typename IS 'Content type name, denormalized from the referenced schema so renderers can dispatch without a join.';
COMMENT ON COLUMN fragments.is_system IS 'True for fragments the CMS itself owns (e.g. a layout''s root); editors should not delete or rename them.';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fragments_schema_uuid_fkey') THEN
    ALTER TABLE fragments ADD CONSTRAINT fragments_schema_uuid_fkey
      FOREIGN KEY (schema_uuid) REFERENCES schemas (uuid) ON DELETE RESTRICT;
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_fragments_name ON fragments (name);
CREATE INDEX IF NOT EXISTS idx_fragments_schema_uuid ON fragments (schema_uuid);
CREATE INDEX IF NOT EXISTS idx_fragments_typename ON fragments (typename);
