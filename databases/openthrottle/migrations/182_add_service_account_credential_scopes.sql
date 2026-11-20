-- Per-credential scopes for service-account credentials (OT plan 618c3670).
--
-- Until now an ot_sa_ credential carried its service account's full reach: a
-- role-less account still passes every `@authz-stance: authenticated-only`
-- resolver, plan/task/note writes included. The local server writes a token
-- into ~/.openthrottle/.env for zero-config telemetry, so that token needs to
-- be narrowable to the ingest mutations alone.
--
-- scopes is an allow-list checked by the server's global auth guard against
-- the scope a handler declares with @CredentialScope(). NULL keeps today's
-- behaviour (unrestricted). A non-NULL list can never be empty: an empty
-- allow-list would be a credential that authenticates and can do nothing,
-- which is a revocation spelled wrong.
--
-- Idempotent: re-running is a no-op.

ALTER TABLE service_account_credentials
  ADD COLUMN IF NOT EXISTS scopes text[];

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'service_account_credentials_scopes_not_empty'
      AND conrelid = 'service_account_credentials'::regclass
  ) THEN
    ALTER TABLE service_account_credentials
      ADD CONSTRAINT service_account_credentials_scopes_not_empty
      CHECK (scopes IS NULL OR cardinality(scopes) > 0);
  END IF;
END $$;

COMMENT ON COLUMN service_account_credentials.scopes IS 'Allow-list of credential scopes (e.g. telemetry:ingest). NULL means unrestricted: the credential reaches whatever its service account can. A non-NULL list limits the credential to handlers that declare one of these scopes with @CredentialScope(); every other GraphQL operation or REST route is refused with 403, fail-closed. Unknown values grant nothing. Never empty (CHECK). Narrows a credential only; authorization still comes from service_account_roles.';
