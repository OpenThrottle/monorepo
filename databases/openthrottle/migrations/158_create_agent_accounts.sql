-- Agent accounts: which agent-CLI login (subscription or API key) a usage row was billed to
-- (OT plan f4c4fa7c).
--
-- One row per (user, provider, external account) — e.g. the same OpenThrottle user's personal
-- Claude login and their company Team login are two rows. agent_token_usage gains a nullable
-- agent_account_id that writers stamp AT WRITE TIME: a user can log out and back in within one
-- config dir, so resolving the account when reading would mislabel history. Rows written before
-- this migration stay NULL ("unattributed"); there is no backfill.
--
-- The account is identified from what each CLI reports about itself (`claude auth status`,
-- `cursor-agent status`, the plain account_id in ~/.codex/auth.json, ...). No credential contents
-- are stored or read. Emails ARE stored, deliberately: who is spending, on which plan, is the point.
--
-- Idempotent: tables and indexes are IF NOT EXISTS, foreign keys and the CHECK are added in their
-- own statements guarded on pg_constraint, ADD COLUMN IF NOT EXISTS, COMMENT ON is re-runnable.

CREATE TABLE IF NOT EXISTS agent_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    provider TEXT NOT NULL,
    external_account_id TEXT NOT NULL,
    email TEXT,
    org_id TEXT,
    org_name TEXT,
    plan TEXT,
    credential_kind TEXT NOT NULL DEFAULT 'unknown',
    first_seen_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    last_seen_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'agent_accounts_user_id_fkey') THEN
    ALTER TABLE agent_accounts ADD CONSTRAINT agent_accounts_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_agent_accounts_credential_kind') THEN
    ALTER TABLE agent_accounts ADD CONSTRAINT chk_agent_accounts_credential_kind
      CHECK (credential_kind IN ('api_key', 'subscription', 'unknown'));
  END IF;
END
$$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_agent_accounts_user_provider_external
    ON agent_accounts (user_id, provider, external_account_id);

ALTER TABLE agent_token_usage
ADD COLUMN IF NOT EXISTS agent_account_id UUID;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'agent_token_usage_agent_account_id_fkey') THEN
    ALTER TABLE agent_token_usage ADD CONSTRAINT agent_token_usage_agent_account_id_fkey
      FOREIGN KEY (agent_account_id) REFERENCES agent_accounts (id) ON DELETE SET NULL;
  END IF;
END
$$;

-- The Usage route's per-account breakdown and account filter: a user's rows by account over a range.
CREATE INDEX IF NOT EXISTS idx_agent_token_usage_user_account_created_at
    ON agent_token_usage (user_id, agent_account_id, created_at DESC);

COMMENT ON TABLE agent_accounts IS 'OpenThrottle agent-CLI accounts: the logins (a subscription such as a Claude Team seat, or an API key) that agent_token_usage rows were billed to. One row per (user_id, provider, external_account_id), upserted by the usage writers whenever they stamp a row, so first_seen_at / last_seen_at track when the account was in use. Identity comes from what each CLI reports about itself; no credential contents are stored. Emails are stored on purpose, for per-account spend visibility.';

COMMENT ON COLUMN agent_accounts.user_id IS 'OpenThrottle user who ran the agent under this account. Cascades on user delete. All reads are user-scoped by this column.';

COMMENT ON COLUMN agent_accounts.provider IS 'Driver id the account belongs to (claude, cursor, codex, ...), lowercased — the same value as agent_token_usage.provider.';

COMMENT ON COLUMN agent_accounts.external_account_id IS 'The provider''s own stable identity for the login, as built by resolveAgentAccount: claude <orgId>:<email>, cursor the email, codex the plain tokens.account_id from auth.json (never the id_token), and so on. Unique per (user_id, provider).';

COMMENT ON COLUMN agent_accounts.email IS 'Login email the CLI reported, when it reports one (claude, cursor, gemini). Null for codex, which is identified by account id only.';

COMMENT ON COLUMN agent_accounts.org_id IS 'Provider organization / team id the CLI reported (claude orgId, cursor team id), else null.';

COMMENT ON COLUMN agent_accounts.org_name IS 'Provider organization / team display name the CLI reported, else null.';

COMMENT ON COLUMN agent_accounts.plan IS 'Subscription plan the CLI reported (claude subscriptionType: pro, max, team, ...), else null. Overwritten with the latest value on every upsert.';

COMMENT ON COLUMN agent_accounts.credential_kind IS 'What the runs actually billed: subscription (a logged-in plan), api_key (a key, which wins over a login in claude -p mode), or unknown. Drives whether the Usage route shows dollars or a list-price estimate.';

COMMENT ON COLUMN agent_accounts.first_seen_at IS 'When a usage writer first stamped a row with this account.';

COMMENT ON COLUMN agent_accounts.last_seen_at IS 'When a usage writer last stamped a row with this account; bumped on every upsert.';

COMMENT ON COLUMN agent_token_usage.agent_account_id IS 'Agent account the turn was billed to, stamped by the writer at write time (never resolved at read time). Null when the account could not be identified, and for every row written before migration 158. ON DELETE SET NULL so usage totals survive an account row being removed.';
