-- OpenThrottle CMS: versioned JSON Schemas that define the shape of a fragment's
-- properties. Ported from RocketCMS (20240601061200_add_schemas_table.sql).

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'schema_status') THEN
    CREATE TYPE schema_status AS ENUM ('ACTIVE', 'DISABLED', 'DRAFT');
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS schemas (
    uuid        UUID                     NOT NULL DEFAULT gen_random_uuid(),
    created_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    is_deleted  BOOLEAN                           DEFAULT false,
    updated_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    json_schema JSONB                    NOT NULL DEFAULT '{}'::jsonb,
    status      schema_status                     DEFAULT 'DRAFT',
    typename    CHARACTER VARYING        NOT NULL,
    version     CHARACTER VARYING        NOT NULL,

    CONSTRAINT schemas_pkey PRIMARY KEY (uuid)
);

COMMENT ON TABLE schemas IS 'OpenThrottle CMS schemas: one versioned JSON Schema per (typename, version), describing the properties a fragment of that typename may carry.';
COMMENT ON COLUMN schemas.json_schema IS 'The JSON Schema document that validates fragments.properties for this typename and version.';
COMMENT ON COLUMN schemas.typename IS 'Content type name the schema describes (e.g. Hero, Card); fragments reference it by schema_uuid and repeat it in fragments.typename.';
COMMENT ON COLUMN schemas.is_deleted IS 'Soft-delete flag; rows are hidden, never removed, so fragments keep a valid schema_uuid.';

CREATE INDEX IF NOT EXISTS idx_schemas_typename_version ON schemas (typename, version);
