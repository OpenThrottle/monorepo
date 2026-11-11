-- OpenThrottle CMS: editor profiles.
-- Ported from RocketCMS (20240601061328_add_profiles_table.sql). The source tied
-- profiles.uuid to Supabase's auth.users (id); this repository has no auth
-- schema and Postgres cannot reference another database, so profiles stand
-- alone. How a profile maps to an OpenThrottle user is recorded in
-- databases/cms/README.md.

CREATE TABLE IF NOT EXISTS profiles (
    uuid       UUID                     NOT NULL DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    is_deleted BOOLEAN                           DEFAULT false,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    avatar_url TEXT,
    email      CHARACTER VARYING        NOT NULL,
    first_name CHARACTER VARYING,
    last_name  CHARACTER VARYING,
    username   TEXT,
    website    TEXT,

    CONSTRAINT profiles_pkey PRIMARY KEY (uuid),
    CONSTRAINT profiles_username_key UNIQUE (username),
    CONSTRAINT profiles_username_length CHECK (char_length(username) >= 3)
);

COMMENT ON TABLE profiles IS 'OpenThrottle CMS editor profiles: display details for people who edit CMS content. Standalone in the cms database; not linked to OpenThrottle users yet (see databases/cms/README.md).';
COMMENT ON COLUMN profiles.username IS 'Optional public handle; unique and at least 3 characters when set.';
