-- Bootstrap the 'work-ledger-harvest' service account: the identity the trailer
-- harvest writes adopted commits as (OT plan 75e8cd5c, task f2f9755e).
--
-- Following the precedent of 045 (bootstrap), 067 (tagging) and 073
-- (node-client): a distinct account per writer, so "who recorded this" is
-- answerable from the row rather than inferred. Harvested artifacts are
-- source='adapter' — a scanner adopting history after the fact, not an agent
-- reporting its own work — and that source is on the trigger-suppression list,
-- so a sweep that adopts hundreds of old commits does not fire refine-tagging
-- for each one.
--
-- Idempotent, mirroring 067. No credentials are seeded (the sweep runs
-- in-process; no bearer token needed) and no roles are granted (it never calls
-- the GraphQL API).

INSERT INTO
    service_accounts (name, description)
SELECT 'work-ledger-harvest', 'Work-ledger trailer harvest — adopts Plan-Id: commits from a repo default branch as source=adapter git_commit artifacts'
WHERE
    NOT EXISTS (
        SELECT 1
        FROM service_accounts
        WHERE
            name = 'work-ledger-harvest'
    );
