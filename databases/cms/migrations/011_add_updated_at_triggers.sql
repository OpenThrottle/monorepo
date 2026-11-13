-- OpenThrottle CMS: maintain updated_at in the database, as the openthrottle database does.
-- TypeORM already stamps updated_at on every save and update it builds; this trigger is the
-- backstop for every other writer (raw SQL, seeds, psql fixes, future sync jobs). Idempotent.

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_updated_at_column() IS 'Trigger function: sets updated_at to NOW() on every UPDATE of the row. Attached BEFORE UPDATE to every cms table that has an updated_at column.';

DO $$
DECLARE
  table_name TEXT;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'fragments',
    'layouts',
    'libraries',
    'library_components',
    'profiles',
    'schemas',
    'surveys',
    'tags'
  ]
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON %I', 'update_' || table_name || '_updated_at', table_name);
    EXECUTE format(
      'CREATE TRIGGER %I BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()',
      'update_' || table_name || '_updated_at',
      table_name
    );
  END LOOP;
END
$$;
