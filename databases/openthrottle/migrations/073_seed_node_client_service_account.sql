-- Seed the credential-less 'node-client' service account that owns work-ledger rows written by the
-- direct-Postgres @openthrottle/node-client (createCommitLink, part of the commit_links retirement:
-- node-client has no NestJS DI / GraphQL path, so it stamps this service account directly as the
-- session actor). Idempotent, mirroring 067_seed_tagging_service_account.sql. No credentials are
-- seeded (node-client talks straight to Postgres, never the GraphQL API) and no roles are granted.

INSERT INTO
    service_accounts (name, description)
SELECT
    'node-client',
    'Direct-Postgres @openthrottle/node-client. Owns work-ledger sessions/artifacts written by createCommitLink (commit_links retirement); credential-less, no GraphQL roles.'
WHERE
    NOT EXISTS (
        SELECT 1
        FROM service_accounts
        WHERE
            name = 'node-client'
    );
