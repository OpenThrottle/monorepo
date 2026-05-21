-- Service accounts for system-to-system auth (MCP, CI, Ralph workers).
-- Credentials store bcrypt/argon2 hash only; bearer format ot_sa_<prefix>_<secret>.
-- service_account_roles: same Role entities as human users (user_roles pattern).

CREATE TABLE IF NOT EXISTS service_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    disabled_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_service_accounts_name ON service_accounts (name);

CREATE INDEX IF NOT EXISTS idx_service_accounts_disabled_at ON service_accounts (disabled_at)
WHERE
    disabled_at IS NOT NULL;

CREATE TABLE IF NOT EXISTS service_account_credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_account_id UUID NOT NULL REFERENCES service_accounts (id) ON DELETE CASCADE,
    prefix TEXT NOT NULL,
    secret_hash TEXT NOT NULL,
    label TEXT,
    expires_at TIMESTAMP WITH TIME ZONE,
    last_used_at TIMESTAMP WITH TIME ZONE,
    revoked_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_service_account_credentials_prefix ON service_account_credentials (prefix);

CREATE INDEX IF NOT EXISTS idx_service_account_credentials_service_account_id ON service_account_credentials (service_account_id);

CREATE INDEX IF NOT EXISTS idx_service_account_credentials_active ON service_account_credentials (service_account_id)
WHERE
    revoked_at IS NULL;

CREATE TABLE IF NOT EXISTS service_account_roles (
    role_id UUID NOT NULL REFERENCES roles (id) ON DELETE CASCADE,
    service_account_id UUID NOT NULL REFERENCES service_accounts (id) ON DELETE CASCADE,
    PRIMARY KEY (service_account_id, role_id)
);

CREATE INDEX IF NOT EXISTS idx_service_account_roles_service_account_id ON service_account_roles (service_account_id);

CREATE INDEX IF NOT EXISTS idx_service_account_roles_role_id ON service_account_roles (role_id);
