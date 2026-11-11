-- OpenThrottle CMS: component libraries.
-- Ported from RocketCMS (20241220000001_add_libraries_table.sql).

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'library_status') THEN
    CREATE TYPE library_status AS ENUM ('ACTIVE', 'DISABLED', 'DRAFT');
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS libraries (
    uuid        UUID                     NOT NULL DEFAULT gen_random_uuid(),
    created_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    is_deleted  BOOLEAN                           DEFAULT false,
    updated_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    description TEXT,
    name        CHARACTER VARYING        NOT NULL,
    status      library_status                    DEFAULT 'DRAFT',

    CONSTRAINT libraries_pkey PRIMARY KEY (uuid)
);

COMMENT ON TABLE libraries IS 'OpenThrottle CMS component libraries: a named set of library_components a layout can render with (see layouts_libraries).';

CREATE INDEX IF NOT EXISTS idx_libraries_name ON libraries (name);
CREATE INDEX IF NOT EXISTS idx_libraries_status ON libraries (status);
