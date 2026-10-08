-- Backfill the plan completions the work ledger never recorded, and mark the status_change
-- artifacts that outlived their plan (OT plan 40695707, task 1dcc5c73).
--
-- THE GAP
--
-- Until #561, several writers flipped plans.status without writing a status_change artifact:
-- the Developer app's Mark Complete (setPlanStatus), TasksService.completeParentPlanIfTasksDone
-- (the auto-complete that fires when a plan's last task completes), cancelRun, the stale sweeper
-- and plans.processor. Plan status_change capture began on 2026-07-13, so every completion before
-- that has no artifact at all, and many after it are missing too. #561 routed every writer
-- through one instrumented chokepoint. The production gate (task 6ad9937f, 2026-10-08) found
-- ZERO disagreements created after the deploy, so this set is final and backfilling it does not
-- bake in a still-broken baseline.
--
-- THE RULE, in one sentence: every COMPLETED plan whose latest recorded plan transition is not
-- ->COMPLETED (including a plan with no recorded transition at all) gets one ->COMPLETED,
-- produced at plans.completed_at.
--
-- This is deliberately "latest is not ->COMPLETED" and not "has no ->COMPLETED anywhere". The
-- second wording misses a plan that was completed (captured), re-opened (captured), then
-- completed again silently. That plan has a ->COMPLETED somewhere, but its live status still
-- disagrees with its last record. Exactly one such plan exists (f65a110b, re-completed
-- 2026-09-10).
--
-- WHY THE TIMESTAMP IS EXACT, NOT APPROXIMATED. plans.completed_at is the transition instant,
-- not mutable metadata (daily-stats.processor, migration 056). No COMPLETED plan has a null
-- completed_at. Every candidate with partial history has completed_at strictly later than its
-- last recorded transition, so the backfilled row becomes the latest record and the plan comes
-- back into agreement. The final guard in step 3 enforces that rather than assuming it.
--
-- WHAT THE ROWS CLAIM, AND WHAT THEY DO NOT. Contrast migration 069, which stamped
-- verified + landed on 1017 claims it had never checked (demoted again by 120). Here:
--   source        = 'legacy'      reconstructed after the fact, not witnessed
--   verification  = 'unverified'  nothing observed the transition
--   payload.from  = null          NOT inferred from the last recorded `to`: an untracked
--                                 intermediate transition would make that a fabrication
--   actor         = ledger-migration service account (seeded by 069). Who clicked Mark
--                                 Complete is unknowable, so no human is named. This is not
--                                 status-change-system (127), which is the actor for runtime
--                                 background writers.
-- One legacy session per plan, closed at completed_at, with a plan-level subject. That is the
-- shape the agreement report (databases/reports/work-ledger-status-agreement.sql) and the
-- timeline join on.
--
-- NOT BACKFILLED. Non-COMPLETED plans with no recorded transition have no timestamp to
-- reconstruct one from, so the gap stays, honestly. 50 as of 2026-10-08: 34 PENDING, 8 BACKLOG,
-- 5 CANCELED, 3 BLOCKED.
--
-- THE ORPHANS. Step 4 sets verification = 'orphaned' on status_change artifacts whose session
-- has no subject rows. deletePlan is a hard delete; the FK cascade removes
-- work_session_subjects, but the artifact hangs off the session and survives. None of them
-- names a live plan or task, so there is nothing they could ever be re-attached to. They are
-- deliberately NOT deleted: they are the only surviving evidence that the deleted plan or task
-- ever moved, and a ledger should outlive what it describes. Nothing marks them at delete time
-- (deletion semantics are a separate plan), so this set regrows whenever a plan is deleted.
--
-- MEASURED against the OpenThrottle live database on 2026-10-08, the day this was written.
-- These are moving numbers: the rule is fixed, and the rows are recomputed when the migration
-- runs.
--   completed plans                                          939
--   backfilled ->COMPLETED rows                              899
--     no recorded plan transition at all                     619  (completed 2026-01-31 .. 2026-08-28)
--     partial history, ->COMPLETED never captured            279  (completed 2026-07-14 .. 2026-09-23)
--     re-opened, then re-completed silently                    1
--   orphaned status_change artifacts marked                   18  (0 name a live plan or task)
--   plan disagreements in the agreement report, before     285  (278 COMPLETED/IN_PROGRESS,
--                                                                 5 QUEUED/IN_PROGRESS,
--                                                                 2 COMPLETED/PENDING)
--   plan disagreements expected after                          5  (the QUEUED/IN_PROGRESS ones:
--                                                                 live QUEUED with no timestamp
--                                                                 to reconstruct, not in scope)
--
-- On a fresh database (no plans) every step matches nothing.
--
-- IDEMPOTENT. Steps 1-2 are keyed on work_sessions.external_ref. Step 3 needs the plan's latest
-- record to be something other than ->COMPLETED, which its own insert makes false, and it also
-- checks the external_key. Step 4 skips rows already orphaned. A re-run is a no-op. The runner
-- wraps this file in one transaction, so it carries no BEGIN/COMMIT of its own.

DROP TABLE IF EXISTS tmp_129_legacy_completions;

-- The candidate set, computed once so every step sees the same plans. A plan's history is its
-- plan-level status_change artifacts, attributed by payload id. Joining on session_id alone
-- would pick up the other subjects of a shared session; see the agreement report's header.
CREATE TEMP TABLE tmp_129_legacy_completions AS
WITH plan_latest AS (
    SELECT DISTINCT ON (wss.plan_id)
        wss.plan_id,
        wa.payload ->> 'to' AS last_recorded_to,
        wa.produced_at AS last_recorded_at
    FROM work_session_subjects wss
        JOIN work_artifacts wa ON wa.session_id = wss.session_id
    WHERE
        wss.task_id IS NULL
        AND wa.type = 'status_change'
        AND wa.payload ->> 'entity' = 'plan'
        AND wa.payload ->> 'id' = wss.plan_id::text
    ORDER BY wss.plan_id, wa.produced_at DESC
)
SELECT
    p.id AS plan_id,
    p.completed_at,
    'ledger-migration:status-change-backfill:' || p.id AS session_external_ref,
    'status_change:plan:' || p.id || ':COMPLETED:legacy-' || floor(extract(EPOCH FROM p.completed_at) * 1000)::bigint
        AS artifact_external_key
FROM plans p
    LEFT JOIN plan_latest pl ON pl.plan_id = p.id
WHERE
    p.status = 'COMPLETED'
    AND p.completed_at IS NOT NULL
    AND (pl.plan_id IS NULL OR pl.last_recorded_to IS DISTINCT FROM 'COMPLETED')
    -- Only reconstruct a completion that would become the plan's latest record. A completed_at
    -- at or before the last recorded transition would be causally inconsistent: write nothing
    -- rather than a row that contradicts the history around it. None matched on 2026-10-08.
    AND (pl.plan_id IS NULL OR p.completed_at > pl.last_recorded_at);

-- 1. One legacy session per plan, closed at the completion instant.
INSERT INTO work_sessions (
    actor_service_account_id,
    closed_by,
    ended_at,
    external_ref,
    on_behalf_of_verified,
    started_at,
    summary,
    tool_name
)
SELECT
    (SELECT id FROM service_accounts WHERE name = 'ledger-migration'),
    'explicit',
    c.completed_at,
    c.session_external_ref,
    FALSE,
    c.completed_at,
    'Reconstructed plan completion from plans.completed_at (migration 129).',
    'ledger-migration'
FROM tmp_129_legacy_completions c
WHERE NOT EXISTS (
    SELECT 1 FROM work_sessions ws WHERE ws.external_ref = c.session_external_ref
);

-- 2. Each legacy session's plan-level subject.
INSERT INTO work_session_subjects (attached_at, plan_id, session_id, task_id)
SELECT
    c.completed_at,
    c.plan_id,
    ws.id,
    NULL
FROM tmp_129_legacy_completions c
    JOIN work_sessions ws ON ws.external_ref = c.session_external_ref
WHERE NOT EXISTS (
    SELECT 1
    FROM work_session_subjects s
    WHERE s.session_id = ws.id AND s.plan_id = c.plan_id AND s.task_id IS NULL
);

-- 3. The reconstructed ->COMPLETED, from unknown.
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
    c.artifact_external_key,
    NULL,
    NULL,
    jsonb_build_object('entity', 'plan', 'from', NULL, 'id', c.plan_id::text, 'to', 'COMPLETED'),
    c.completed_at,
    ws.id,
    'legacy',
    'status_change',
    'unverified'
FROM tmp_129_legacy_completions c
    JOIN work_sessions ws ON ws.external_ref = c.session_external_ref
WHERE NOT EXISTS (
    SELECT 1
    FROM work_artifacts a
    WHERE a.session_id = ws.id AND a.type = 'status_change' AND a.external_key = c.artifact_external_key
);

-- 4. Mark the orphans. Do not delete them.
UPDATE work_artifacts wa
SET verification = 'orphaned'
WHERE
    wa.type = 'status_change'
    AND wa.verification <> 'orphaned'
    AND NOT EXISTS (SELECT 1 FROM work_session_subjects s WHERE s.session_id = wa.session_id);

DROP TABLE tmp_129_legacy_completions;
