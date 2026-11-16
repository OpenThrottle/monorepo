-- OpenThrottle CMS: one live schema row per (typename, version). The server syncs the generated
-- block schemas on every boot (see databases/cms/README.md § Schema sync trigger), so two replicas
-- booting together could both insert the same version. A unique index lets the sync insert with
-- ON CONFLICT DO NOTHING. Partial, like the sync's own match: a soft-deleted row never blocks a
-- live one. Replaces the plain btree from migration 001. Idempotent.

DO $$
DECLARE
  duplicate TEXT;
BEGIN
  SELECT typename || '@' || version INTO duplicate
  FROM schemas
  WHERE is_deleted IS NOT TRUE
  GROUP BY typename, version
  HAVING COUNT(*) > 1
  LIMIT 1;

  IF duplicate IS NOT NULL THEN
    RAISE EXCEPTION 'schemas has more than one live row for %; soft delete (is_deleted = true) the extras that no fragment references, then re-run', duplicate;
  END IF;
END
$$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_schemas_typename_version
    ON schemas (typename, version)
    WHERE is_deleted IS NOT TRUE;

DROP INDEX IF EXISTS idx_schemas_typename_version;

COMMENT ON INDEX uq_schemas_typename_version IS 'At most one live (not soft-deleted) schema row per typename and version; the boot-time schema sync inserts against it with ON CONFLICT DO NOTHING.';

COMMENT ON COLUMN schemas.version IS 'Schema version. For a generated block schema, the first 16 hex characters of the sha256 of its key-sorted JSON (cms-schemas:write); a new version is a new row, never an update.';
