-- OpenThrottle CMS: link a profile to the OpenThrottle user it belongs to, by value.
-- Postgres cannot reference a table in another database, so this is a plain nullable UUID with a
-- unique index, written and checked by the server that holds both connections (see
-- databases/cms/README.md § profile identity). Idempotent.

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS openthrottle_user_id UUID;

CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_openthrottle_user_id
    ON profiles (openthrottle_user_id);

COMMENT ON COLUMN profiles.openthrottle_user_id IS 'users.id of the OpenThrottle user this profile belongs to, in the openthrottle database. No foreign key (cross-database); unique and app-checked. NULL for a profile not linked to a user.';

COMMENT ON TABLE profiles IS 'OpenThrottle CMS editor profiles: display details for people who edit CMS content. Linked to an OpenThrottle user by value through openthrottle_user_id (see databases/cms/README.md).';
