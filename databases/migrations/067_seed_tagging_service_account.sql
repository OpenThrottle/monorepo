-- Bootstrap the 'tagging' service account: the identity the predict/refine
-- tagging jobs write plan/task tags as. Writes by this account derive
-- source='server-llm' on the provenance ladder (TAGGING_SERVICE_ACCOUNT_NAME
-- in @openthrottle/nestjs-repositories). Its skill-tag vocabulary is the
-- committed default via the tags-service fallback (service accounts with zero
-- user_skill_tags rows resolve against DEFAULT_TAG_VOCABULARY_SEED — the
-- account is not a users row, so it cannot own user_skill_tags rows).
-- Idempotent, mirroring 045_seed_service_accounts_bootstrap.sql. No
-- credentials are seeded (the jobs run in-process; no bearer token needed) and
-- no roles are granted (it never calls the GraphQL API).

INSERT INTO
    service_accounts (name, description)
SELECT 'tagging', 'Tagging jobs (predict on create, refine on link_commit) — plan/task tag writes classified server-llm'
WHERE
    NOT EXISTS (
        SELECT 1
        FROM service_accounts
        WHERE
            name = 'tagging'
    );
