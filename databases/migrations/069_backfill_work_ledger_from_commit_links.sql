-- Backfill the work ledger (migration 068) from the historical commit_links table, so the ledger
-- reflects pre-ledger commit history. Additive and idempotent: creates only new work_sessions /
-- work_session_subjects / work_artifacts rows, keyed for safe re-runs; does NOT modify or drop
-- commit_links (readers/writers migrate separately in the slice-7 cutover).
--
-- Grain: one synthesized "legacy" work_session per distinct (plan_id, task_id) in commit_links —
-- finer than the design doc's plan-level session, deliberately, to PRESERVE the commit→task mapping
-- that the read surfaces (linked-artifacts panel, activity feed) depend on. Each session's actor is a
-- credential-less 'ledger-migration' service account (067-style). Its git_commit artifacts are
-- lifecycle='landed' (a commit_link is a post-merge link), source='legacy', and verification=
-- 'unverified' — the migration asserts no fact it did not check; the git verifier confirms existence
-- (it also sweeps landed+unverified rows). external_ref encodes the (plan, task) key for idempotency.

-- 1. Credential-less service account that owns the backfilled sessions (mirrors 067).
INSERT INTO service_accounts (name, description)
SELECT
    'ledger-migration',
    'System identity for the one-time work-ledger backfill from commit_links (migration 069). Credential-less; owns source=legacy artifacts.'
WHERE
    NOT EXISTS (SELECT 1 FROM service_accounts WHERE name = 'ledger-migration');

-- 2. One legacy session per distinct (plan_id, task_id), started at the earliest linked commit.
INSERT INTO work_sessions (
    actor_service_account_id,
    closed_by,
    ended_at,
    external_ref,
    on_behalf_of_verified,
    started_at,
    tool_name
)
SELECT
    (SELECT id FROM service_accounts WHERE name = 'ledger-migration'),
    'explicit',
    grp.first_link_at,
    'ledger-migration:' || grp.plan_id || ':' || COALESCE(grp.task_id::text, 'plan'),
    FALSE,
    grp.first_link_at,
    'ledger-migration'
FROM (
    SELECT
        cl.plan_id,
        cl.task_id,
        MIN(cl.created_at) AS first_link_at
    FROM commit_links cl
    -- Skip links whose plan/task no longer exists (the ledger's FKs require valid rows; the
    -- historical commit_links import did not enforce them). Those links stay only in commit_links.
    WHERE EXISTS (SELECT 1 FROM plans p WHERE p.id = cl.plan_id)
      AND (cl.task_id IS NULL OR EXISTS (SELECT 1 FROM tasks t WHERE t.id = cl.task_id))
    GROUP BY cl.plan_id, cl.task_id
) grp
WHERE NOT EXISTS (
    SELECT 1 FROM work_sessions ws
    WHERE ws.external_ref = 'ledger-migration:' || grp.plan_id || ':' || COALESCE(grp.task_id::text, 'plan')
);

-- 3. Each legacy session's subject (its exact plan + task).
INSERT INTO work_session_subjects (plan_id, session_id, task_id)
SELECT
    grp.plan_id,
    ws.id,
    grp.task_id
FROM (
    SELECT DISTINCT cl.plan_id, cl.task_id
    FROM commit_links cl
    WHERE EXISTS (SELECT 1 FROM plans p WHERE p.id = cl.plan_id)
      AND (cl.task_id IS NULL OR EXISTS (SELECT 1 FROM tasks t WHERE t.id = cl.task_id))
) grp
JOIN work_sessions ws
    ON ws.external_ref = 'ledger-migration:' || grp.plan_id || ':' || COALESCE(grp.task_id::text, 'plan')
WHERE NOT EXISTS (
    SELECT 1 FROM work_session_subjects s WHERE s.session_id = ws.id
);

-- 4. One git_commit artifact per commit_link, in its (plan, task) legacy session.
INSERT INTO work_artifacts (
    external_key,
    lifecycle,
    message,
    payload,
    produced_at,
    session_id,
    source,
    type,
    verification
)
SELECT
    'github:' || cl.repo || '@' || cl.sha,
    'landed',
    cl.message,
    jsonb_build_object('repo', cl.repo, 'sha', cl.sha),
    cl.created_at,
    ws.id,
    'legacy',
    'git_commit',
    'unverified'
FROM commit_links cl
JOIN work_sessions ws
    ON ws.external_ref = 'ledger-migration:' || cl.plan_id || ':' || COALESCE(cl.task_id::text, 'plan')
WHERE NOT EXISTS (
    SELECT 1 FROM work_artifacts a
    WHERE a.session_id = ws.id
      AND a.type = 'git_commit'
      AND a.external_key = 'github:' || cl.repo || '@' || cl.sha
);
-- Note: the JOIN to the legacy session already excludes orphaned links (no session was created for
-- a plan/task that no longer exists), so this step inherits the same validity filter as steps 2–3.
