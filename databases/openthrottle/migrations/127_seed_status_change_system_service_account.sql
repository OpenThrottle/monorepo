-- Bootstrap the 'status-change-system' service account: the identity background writers use
-- as actorSub when they route a plan/task status transition through
-- WorkLedgerCaptureService.recordStatusChange with no request principal to attribute to.
--
-- WHY THIS EXISTS. recordStatusChange calls resolveActorColumns, which throws
-- BadRequestException on an unresolved principal (actorSub/actorKind both undefined) --
-- INSIDE the caller's transaction. Background writers (the stale sweeper, plans.processor)
-- run on BullMQ workers with no request principal, so routing them through capture as-is
-- would roll back their row updates: the sweeper would stop resetting stranded plans, an
-- availability regression traded for an observability fix. Seeding a service account gives
-- those callers a real actorSub/actorKind (service_account) to pass instead.
--
-- Following the precedent of 045 (bootstrap), 067 (tagging), 073 (node-client) and 122
-- (work-ledger-harvest): a distinct account per writer, so "who recorded this" is answerable
-- from the row rather than inferred.
--
-- This account is for *runtime* background writers only -- the historical backfill migration
-- already has its own account ('ledger-migration') and this one must not be used for that.
--
-- Idempotent, mirroring 122. No credentials are seeded (background writers run in-process; no
-- bearer token needed) and no roles are granted (they never call the GraphQL API).

INSERT INTO
    service_accounts (name, description)
SELECT 'status-change-system', 'Server-initiated plan/task status transitions with no request principal (e.g. the stale sweeper, plans.processor)'
WHERE
    NOT EXISTS (
        SELECT 1
        FROM service_accounts
        WHERE
            name = 'status-change-system'
    );
