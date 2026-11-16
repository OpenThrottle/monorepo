-- OAuth 2.1 authorization server tables for the public MCP domain (OT plan 16f321a7).
--
-- openthrottle-server is the authorization server; the MCP server is the resource server. A human
-- signs in to the developer app and consents; the MCP client gets an opaque access token bound to
-- that user, scoped (mcp:read / mcp:write), expiring, and individually revocable. Design:
-- docs/openthrottle/mcp-oauth-design.md.
--
-- Tokens are opaque and stored as SHA-256 hashes of a 256-bit random secret, looked up by a short
-- public prefix — the ot_sa_ service-account scheme (migration 044), not JWTs, because per-token
-- revocation and a token list are the requirement.
--
-- Idempotent: tables and indexes are IF NOT EXISTS; FKs and CHECKs are added in
-- pg_constraint-guarded statements.

CREATE TABLE IF NOT EXISTS oauth_clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id TEXT NOT NULL,
    registration_kind TEXT NOT NULL,
    client_name TEXT,
    client_uri TEXT,
    logo_uri TEXT,
    redirect_uris TEXT[] NOT NULL DEFAULT '{}',
    metadata_fetched_at TIMESTAMP WITH TIME ZONE,
    last_used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_oauth_clients_client_id ON oauth_clients (client_id);

CREATE TABLE IF NOT EXISTS oauth_authorization_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL,
    redirect_uri TEXT NOT NULL,
    state TEXT,
    code_challenge TEXT NOT NULL,
    requested_scopes TEXT[] NOT NULL DEFAULT '{}',
    resource TEXT NOT NULL,
    user_id UUID,
    granted_scopes TEXT[],
    code_hash TEXT,
    grant_id UUID,
    status TEXT NOT NULL DEFAULT 'pending',
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    decided_at TIMESTAMP WITH TIME ZONE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_oauth_authorization_requests_code_hash
    ON oauth_authorization_requests (code_hash)
    WHERE code_hash IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_oauth_authorization_requests_expires_at
    ON oauth_authorization_requests (expires_at);

CREATE TABLE IF NOT EXISTS oauth_grants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    client_id UUID NOT NULL,
    scopes TEXT[] NOT NULL,
    resource TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    last_used_at TIMESTAMP WITH TIME ZONE,
    revoked_at TIMESTAMP WITH TIME ZONE,
    revoked_reason TEXT
);

CREATE INDEX IF NOT EXISTS idx_oauth_grants_user_created
    ON oauth_grants (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS oauth_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    grant_id UUID NOT NULL,
    kind TEXT NOT NULL,
    prefix TEXT NOT NULL,
    secret_hash TEXT NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    revoked_at TIMESTAMP WITH TIME ZONE,
    replaced_by UUID
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_oauth_tokens_prefix ON oauth_tokens (prefix);

CREATE INDEX IF NOT EXISTS idx_oauth_tokens_grant_id ON oauth_tokens (grant_id);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'oauth_clients_registration_kind_check') THEN
    ALTER TABLE oauth_clients ADD CONSTRAINT oauth_clients_registration_kind_check
      CHECK (registration_kind IN ('cimd', 'dcr'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'oauth_authorization_requests_status_check') THEN
    ALTER TABLE oauth_authorization_requests ADD CONSTRAINT oauth_authorization_requests_status_check
      CHECK (status IN ('approved', 'denied', 'exchanged', 'pending'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'oauth_grants_revoked_reason_check') THEN
    ALTER TABLE oauth_grants ADD CONSTRAINT oauth_grants_revoked_reason_check
      CHECK (revoked_reason IS NULL OR revoked_reason IN ('admin', 'code_reuse', 'refresh_reuse', 'user', 'user_disabled'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'oauth_tokens_kind_check') THEN
    ALTER TABLE oauth_tokens ADD CONSTRAINT oauth_tokens_kind_check
      CHECK (kind IN ('access', 'refresh'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'oauth_authorization_requests_client_id_fkey') THEN
    ALTER TABLE oauth_authorization_requests ADD CONSTRAINT oauth_authorization_requests_client_id_fkey
      FOREIGN KEY (client_id) REFERENCES oauth_clients (id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'oauth_authorization_requests_user_id_fkey') THEN
    ALTER TABLE oauth_authorization_requests ADD CONSTRAINT oauth_authorization_requests_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'oauth_authorization_requests_grant_id_fkey') THEN
    ALTER TABLE oauth_authorization_requests ADD CONSTRAINT oauth_authorization_requests_grant_id_fkey
      FOREIGN KEY (grant_id) REFERENCES oauth_grants (id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'oauth_grants_user_id_fkey') THEN
    ALTER TABLE oauth_grants ADD CONSTRAINT oauth_grants_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'oauth_grants_client_id_fkey') THEN
    ALTER TABLE oauth_grants ADD CONSTRAINT oauth_grants_client_id_fkey
      FOREIGN KEY (client_id) REFERENCES oauth_clients (id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'oauth_tokens_grant_id_fkey') THEN
    ALTER TABLE oauth_tokens ADD CONSTRAINT oauth_tokens_grant_id_fkey
      FOREIGN KEY (grant_id) REFERENCES oauth_grants (id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'oauth_tokens_replaced_by_fkey') THEN
    ALTER TABLE oauth_tokens ADD CONSTRAINT oauth_tokens_replaced_by_fkey
      FOREIGN KEY (replaced_by) REFERENCES oauth_tokens (id) ON DELETE SET NULL;
  END IF;
END
$$;

COMMENT ON TABLE oauth_clients IS 'OpenThrottle OAuth clients: MCP clients (Claude Code, Cursor, Codex, …) known to the authorization server, registered by Dynamic Client Registration (RFC 7591) or resolved from a Client ID Metadata Document. Public clients only — none holds a secret; PKCE stands in for client authentication.';
COMMENT ON COLUMN oauth_clients.client_id IS 'The OAuth client_id the client presents: a generated opaque id for DCR, the metadata document URL itself for CIMD.';
COMMENT ON COLUMN oauth_clients.registration_kind IS 'How the client became known: dcr (POST /oauth/register) or cimd (fetched Client ID Metadata Document).';
COMMENT ON COLUMN oauth_clients.client_name IS 'Self-asserted display name, shown on the consent screen beside the client host. Untrusted.';
COMMENT ON COLUMN oauth_clients.redirect_uris IS 'Exact redirect URIs the client may use; loopback http URIs match on any port (RFC 8252).';
COMMENT ON COLUMN oauth_clients.metadata_fetched_at IS 'CIMD only: when the metadata document was last fetched, for cache expiry.';
COMMENT ON COLUMN oauth_clients.last_used_at IS 'Last authorize request from this client; DCR clients unused for 30 days are garbage-collected.';

COMMENT ON TABLE oauth_authorization_requests IS 'OpenThrottle OAuth authorization requests: one per GET /oauth/authorize, validated before the browser is sent to the developer-app consent screen, then decided by the signed-in user. Approval mints a single-use authorization code (stored hashed) that the token endpoint exchanges once.';
COMMENT ON COLUMN oauth_authorization_requests.code_challenge IS 'PKCE S256 code_challenge; the token request must present the matching code_verifier.';
COMMENT ON COLUMN oauth_authorization_requests.resource IS 'RFC 8707 resource indicator: the canonical MCP URI the token will be audience-bound to.';
COMMENT ON COLUMN oauth_authorization_requests.user_id IS 'The user who decided the request; NULL while pending.';
COMMENT ON COLUMN oauth_authorization_requests.granted_scopes IS 'The scopes the user approved, a subset of requested_scopes; NULL until approved.';
COMMENT ON COLUMN oauth_authorization_requests.code_hash IS 'SHA-256 of the authorization code, set on approval; the code itself is never stored.';
COMMENT ON COLUMN oauth_authorization_requests.grant_id IS 'The grant the code produced once exchanged; a second exchange attempt revokes it (code reuse).';
COMMENT ON COLUMN oauth_authorization_requests.status IS 'pending → approved | denied; approved → exchanged once the code is redeemed.';
COMMENT ON COLUMN oauth_authorization_requests.expires_at IS 'Pending: 10 minutes for the consent step. Approved: 60 seconds for the code.';

COMMENT ON TABLE oauth_grants IS 'OpenThrottle OAuth grants: a user''s consent for one client to act on one MCP resource with a set of scopes, for 30 days. Every access and refresh token belongs to a grant, and revoking the grant revokes them all. This is the row the developer app''s connected-clients list shows.';
COMMENT ON COLUMN oauth_grants.scopes IS 'Granted scopes (mcp:read, mcp:write). Scopes only subtract from the user''s own RBAC; they never add permissions.';
COMMENT ON COLUMN oauth_grants.resource IS 'The canonical MCP URI the grant''s tokens are valid for; re-checked against configuration on every request.';
COMMENT ON COLUMN oauth_grants.expires_at IS '30 days after consent. Refreshing never extends it; re-consent creates a new grant.';
COMMENT ON COLUMN oauth_grants.last_used_at IS 'Last request authenticated by one of this grant''s access tokens, written at most once a minute.';
COMMENT ON COLUMN oauth_grants.revoked_reason IS 'Why the grant was revoked: user, admin, user_disabled, refresh_reuse (a rotated refresh token was replayed) or code_reuse (an authorization code was redeemed twice).';

COMMENT ON TABLE oauth_tokens IS 'OpenThrottle OAuth access and refresh tokens, stored as a public lookup prefix plus a SHA-256 hash of the secret (ot_oat_<prefix>_<secret>, ot_ort_<prefix>_<secret>). Access tokens live an hour; refresh tokens rotate on every use and live until their grant expires.';
COMMENT ON COLUMN oauth_tokens.prefix IS 'Public, unique lookup prefix embedded in the token; safe to log and display.';
COMMENT ON COLUMN oauth_tokens.secret_hash IS 'Hex SHA-256 of the token secret, compared in constant time.';
COMMENT ON COLUMN oauth_tokens.replaced_by IS 'Refresh tokens: the token that replaced this one on rotation. A revoked refresh token with replaced_by set being presented again is reuse, and revokes the grant.';
