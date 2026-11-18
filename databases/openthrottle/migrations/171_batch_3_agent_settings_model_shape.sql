-- Give the batch 3 per-user agent settings tables their base-model shapes
-- (@openthrottle/nestjs-postgres). Batch 3 of moving the entities into
-- @openthrottle/nestjs-repositories-server (OT plan 9c512a50-4301-4065-89d9-abccdfb40f77).
--
-- Existing ids are untouched; only rows inserted from now on get a uuidv7.

-- 1. mcp_connector_connections → BaseModel: a user connects and disconnects a connector,
--    so a disconnect becomes a soft delete. It already has created_at, updated_at and the
--    update_mcp_connector_connections_updated_at trigger from 084.

ALTER TABLE mcp_connector_connections ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE NULL;

COMMENT ON COLUMN mcp_connector_connections.deleted_at IS
  'When this connection was disconnected (soft deleted); NULL for live connections';

ALTER TABLE mcp_connector_connections ALTER COLUMN id SET DEFAULT uuidv7();

-- A user holds at most one LIVE connection per connector. The full unique constraint
-- would make reconnecting after a disconnect collide with the soft-deleted row, so it
-- becomes a partial unique index over live rows only. Its leading user_id column also
-- serves the per-user list, which reads live rows only.
ALTER TABLE mcp_connector_connections
  DROP CONSTRAINT IF EXISTS uq_mcp_connector_connections_user_key;

CREATE UNIQUE INDEX IF NOT EXISTS uq_mcp_connector_connections_user_key_live
  ON mcp_connector_connections (user_id, connector_key)
  WHERE deleted_at IS NULL;

-- 2. user_disabled_agent_clis and user_favorite_agent_models → BaseHardDeleteModel: they
--    are presence toggles, inserted to turn a preference on and deleted to turn it off, so
--    a delete stays a hard delete and their unique constraints stay as they are. Both
--    already have id and created_at.

ALTER TABLE user_disabled_agent_clis ALTER COLUMN id SET DEFAULT uuidv7();
ALTER TABLE user_favorite_agent_models ALTER COLUMN id SET DEFAULT uuidv7();
