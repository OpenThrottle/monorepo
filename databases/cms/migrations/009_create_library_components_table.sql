-- OpenThrottle CMS: the components inside a library.
-- Ported from RocketCMS (20241220000002_add_library_components_table.sql).

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'library_component_status') THEN
    CREATE TYPE library_component_status AS ENUM ('ACTIVE', 'DISABLED', 'DRAFT');
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS library_components (
    uuid         UUID                     NOT NULL DEFAULT gen_random_uuid(),
    created_at   TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    is_deleted   BOOLEAN                           DEFAULT false,
    updated_at   TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    code         TEXT                     NOT NULL,
    library_uuid UUID                     NOT NULL,
    name         CHARACTER VARYING        NOT NULL,
    props_schema JSONB                    NOT NULL DEFAULT '{}'::jsonb,
    status       library_component_status          DEFAULT 'DRAFT',
    typename     CHARACTER VARYING        NOT NULL,

    CONSTRAINT library_components_pkey PRIMARY KEY (uuid)
);

COMMENT ON TABLE library_components IS 'OpenThrottle CMS library components: the renderable component for one typename within a library, with the props it accepts.';
COMMENT ON COLUMN library_components.code IS 'Component source code, stored as text and rendered by the CMS for fragments of this typename.';
COMMENT ON COLUMN library_components.props_schema IS 'JSON Schema of the props the component accepts.';
COMMENT ON COLUMN library_components.typename IS 'Fragment typename this component renders; matches fragments.typename and schemas.typename.';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'library_components_library_uuid_fkey') THEN
    ALTER TABLE library_components ADD CONSTRAINT library_components_library_uuid_fkey
      FOREIGN KEY (library_uuid) REFERENCES libraries (uuid) ON DELETE RESTRICT;
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_library_components_library_uuid ON library_components (library_uuid);
CREATE INDEX IF NOT EXISTS idx_library_components_name ON library_components (name);
CREATE INDEX IF NOT EXISTS idx_library_components_status ON library_components (status);
CREATE INDEX IF NOT EXISTS idx_library_components_typename ON library_components (typename);
