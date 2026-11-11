-- OpenThrottle CMS: tag vocabulary.
-- Ported from RocketCMS (20240601061332_add_tags_table.sql).

CREATE TABLE IF NOT EXISTS tags (
    uuid        UUID                     NOT NULL DEFAULT gen_random_uuid(),
    created_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    is_deleted  BOOLEAN                           DEFAULT false,
    updated_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    description CHARACTER VARYING        NOT NULL,
    name        CHARACTER VARYING        NOT NULL,

    CONSTRAINT tags_pkey PRIMARY KEY (uuid)
);

COMMENT ON TABLE tags IS 'OpenThrottle CMS tags: a named, described label. Not yet referenced by other tables; layouts.tags holds free-text labels.';
