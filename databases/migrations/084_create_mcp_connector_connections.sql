-- Per-user connection state for the curated MCP connectors catalog (plan 09568a86).
-- The catalog itself is a server-side code seed (as-const metadata); this table only
-- records which connectors a user has connected, whether each is enabled, and a MASKED
-- credential hint. No raw secret is ever stored: for api_token connectors we keep a
-- bcrypt hash + a display prefix (mirroring service_account_credentials); for oauth
-- connectors no secret is stored (live OAuth token exchange is a follow-up plan).

CREATE TABLE IF NOT EXISTS mcp_connector_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    connector_key TEXT NOT NULL,
    user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    auth_type TEXT NOT NULL CHECK (auth_type IN ('api_token', 'oauth')),
    credential_prefix TEXT NULL,
    credential_secret_hash TEXT NULL,
    credential_label TEXT NULL,
    connected_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    last_used_at TIMESTAMP WITH TIME ZONE NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_mcp_connector_connections_user_key UNIQUE (user_id, connector_key)
);

COMMENT ON TABLE mcp_connector_connections IS 'Per-user connection state for the curated MCP connectors catalog; the catalog metadata is a server-side code seed, this table is only the user''s connect/enable state + a masked credential hint (no raw secrets).';

COMMENT ON COLUMN mcp_connector_connections.connector_key IS 'Stable key into the server-side connector catalog seed (e.g. ''github''); no FK because the catalog is code, not a table.';

COMMENT ON COLUMN mcp_connector_connections.user_id IS 'Owner of the connection. Baseline is user-scoped; a future workspace scope would add a nullable workspace column alongside this.';

COMMENT ON COLUMN mcp_connector_connections.enabled IS 'Whether the connection is active for the user; enable/disable flips this boolean and retains the credential hint.';

COMMENT ON COLUMN mcp_connector_connections.auth_type IS 'Auth mechanism at connect time, denormalized from the catalog seed: api_token or oauth.';

COMMENT ON COLUMN mcp_connector_connections.credential_prefix IS 'Masked display hint for an api_token credential (e.g. ''sk_live_…abcd''); NULL for oauth connections. Never the raw secret.';

COMMENT ON COLUMN mcp_connector_connections.credential_secret_hash IS 'bcrypt hash of the supplied api_token, mirroring service_account_credentials.secret_hash; NULL for oauth. Retained for parity/duplicate-detection only — not recoverable, and not replayable to the external server (that is deferred to the agent-run-wiring follow-up).';

COMMENT ON COLUMN mcp_connector_connections.credential_label IS 'Optional user-supplied label for the connection''s credential.';

COMMENT ON COLUMN mcp_connector_connections.last_used_at IS 'Reserved: set when an enabled connection is used by an agent run (agent-run wiring is a follow-up plan).';

CREATE INDEX IF NOT EXISTS idx_mcp_connector_connections_user_id ON mcp_connector_connections (user_id);

DROP TRIGGER IF EXISTS update_mcp_connector_connections_updated_at ON mcp_connector_connections;

CREATE TRIGGER update_mcp_connector_connections_updated_at
  BEFORE UPDATE ON mcp_connector_connections
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
