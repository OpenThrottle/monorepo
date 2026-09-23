-- Work-ledger status agreement report.
--
-- WHAT THIS MEASURES. The work ledger records a `status_change` artifact (work_artifacts,
-- type='status_change', payload {entity, id, from, to}) every time an instrumented writer
-- moves a plan or task through its status lifecycle. The invariant under test: a plan's (or
-- task's) *latest recorded* status_change.to should agree with its live `status` column. It
-- does not, at scale, because several writers changed status without going through the
-- instrumented capture path (WorkLedgerCaptureService.recordStatusChange in
-- applications/openthrottle-server/src/graphql/plans/plan-status.service.ts). A runtime
-- error-log marker (WORK_LEDGER_CAPTURE_FAILED, same file) covers the runtime half of this for
-- now; a scheduled job/metric on top of this query is a deliberately separate, deferred plan
-- -- do not wire this into a cron, a BullMQ processor, or a metric.
--
-- HOW TO RUN. Plain read-only report, no side effects, nothing persistent created -- this is
-- why it lives under databases/reports/ rather than databases/migrations/ and carries no
-- migration number.
--
--   docker exec -i openthrottle-postgres-1 psql -U openthrottle_user -d openthrottle \
--     -f databases/reports/work-ledger-status-agreement.sql
--
-- or, against a non-Docker Postgres, plain:
--
--   psql "$POSTGRES_URL" -f databases/reports/work-ledger-status-agreement.sql
--
-- SCHEMA NOTES (cost real time to work out -- recorded here so the next person doesn't repeat
-- the work):
--   * plans.status / tasks.status is the plan_task_status enum; comparing it to
--     payload->>'to' (text) needs an explicit ::text cast on the enum side.
--   * The artifact table is work_artifacts (not work_session_artifacts).
--   * The subject join is work_session_subjects.session_id = work_artifacts.session_id --
--     the column is session_id, not work_session_id.
--   * work_session_subjects rows are per (session_id, plan_id, task_id): plan-level rows have
--     task_id IS NULL; task-level rows have it set. A single session commonly attaches to one
--     plan AND many of its tasks (e.g. a whole Ralph run), so joining on session_id alone
--     would pull artifacts for *other* subjects of the same session into a given plan/task's
--     history. payload->>'id' carries the actual plan/task id the artifact is about, so the
--     join additionally requires payload->>'id' = the subject's plan_id/task_id to attribute
--     each artifact to the right row.
--   * Artifact type is 'status_change'; the transition is in payload->>'from' /
--     payload->>'to'. History is ordered by produced_at (not created_at).
--
-- BASELINES (evidence the defect is live, and whether it is still growing):
--
--                        | 2026-09-09 | 2026-09-17 | 2026-09-23 (this run)
--   ---------------------+------------+------------+-----------------------
--   plans with history    |        275 |        335 |        321
--   plans agree           |         33 |         56 |         39
--   plans disagree        |        242 |        279 |        282
--   tasks with history    |       1980 |       2250 |       2261
--   tasks agree           |       1980 |       2185 |       2261
--   tasks disagree        |          0 |         65 |          0
--
-- Plan disagreement shape, 2026-09-17: 272 COMPLETED/IN_PROGRESS, 6 QUEUED/IN_PROGRESS,
-- 1 COMPLETED/PENDING. This run reproduces the same *shape* (see section 2 below: 275/5/2 in
-- the same three buckets) -- that shape match, not an exact figure match, is the real check
-- that this query is asking the right question; six days of additional writes explain the
-- moved totals. The plan-side disagreement count went 242 -> 279 -> 282: still growing as of
-- this run. After the writer-side fix for the plan path deploys, this count is expected to
-- **stop growing**; a plans-disagree figure that keeps climbing on a later run means a plan
-- write path was still missed.
--
-- TASK SIDE -- THE 65 "DISAGREEMENTS" OF 2026-09-17 WERE A BUG IN THE QUERY, NOT IN THE CODE.
-- This run measures 0 task disagreements against 65 on 2026-09-17 (63 COMPLETED/IN_PROGRESS,
-- 1 SKIPPED/IN_PROGRESS, 1 COMPLETED/PENDING). That drop is not six days of repair work: the
-- earlier figure was produced by joining artifacts to subjects on session_id ALONE. One
-- session routinely attaches to a plan AND many of its tasks, so every task in a run
-- inherited its siblings' status_change artifacts, and "the latest transition recorded for
-- task N" was usually the ->IN_PROGRESS of task N+1. Measured side by side on 2026-09-23:
--
--   join                                              with history   agree   disagree
--   session_id only (the old baseline's)                      2261    2188         73
--   session_id AND payload->>'id' = task_id (this one)        2261    2261          0
--
-- and for all 73 rows the naive join picked, payload->>'entity' is 'task' while payload->>'id'
-- names a DIFFERENT task. The detail that looked most incriminating -- "all 63 sit on
-- orchestrated plans, every one with a plan_runs row" -- was the signature of the bug in the
-- metric, not of a bug in the code: multi-task sessions are exactly what orchestrated runs
-- produce. There is no third silent task write path; the hypothesis that a re-run re-opened
-- and silently re-completed tasks is withdrawn.
--
-- What remains true, and is NOT measured here: the two known bulk task writers
-- (updateMatchingTasksAndEmitStatusChanged, and the stale sweeper's task reset) are still
-- uninstrumented. That is unobserved INCOMPLETENESS -- a missing row -- which end-state
-- agreement cannot see by construction. Section 7 is the probe for it.
--
-- THE HONEST CAVEAT. This metric measures END-STATE agreement, not transition completeness.
-- It compares only the *latest* recorded status_change to the *current* live status. It is
-- blind to a silent (uninstrumented) write that a later, correctly-instrumented write papered
-- over -- exactly the task-side pattern above. A clean (zero-disagreement) result is therefore
-- NECESSARY but not SUFFICIENT evidence that every writer is instrumented; only a disagreement
-- count that stays at zero across repeated runs, combined with no new WORK_LEDGER_CAPTURE_FAILED
-- log lines, is reassuring.
\echo '=== 1. Plans: agreement summary ==='

WITH plan_latest AS (
    SELECT DISTINCT ON (wss.plan_id)
        wss.plan_id AS id,
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
),
plan_compare AS (
    SELECT
        p.id,
        p.status::text AS live_status,
        pl.last_recorded_to,
        pl.last_recorded_at,
        (p.status::text = pl.last_recorded_to) AS agrees
    FROM plans p
        JOIN plan_latest pl ON pl.id = p.id
)
SELECT
    count(*) AS with_history,
    count(*) FILTER (WHERE agrees) AS agree,
    count(*) FILTER (WHERE NOT agrees) AS disagree
FROM plan_compare;

\echo '=== 2. Plans: disagreement breakdown by (live status, last recorded to) ==='

WITH plan_latest AS (
    SELECT DISTINCT ON (wss.plan_id)
        wss.plan_id AS id,
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
),
plan_compare AS (
    SELECT
        p.id,
        p.status::text AS live_status,
        pl.last_recorded_to,
        pl.last_recorded_at,
        (p.status::text = pl.last_recorded_to) AS agrees
    FROM plans p
        JOIN plan_latest pl ON pl.id = p.id
)
SELECT
    live_status,
    last_recorded_to,
    count(*) AS disagreements
FROM plan_compare
WHERE
    NOT agrees
GROUP BY
    live_status, last_recorded_to
ORDER BY disagreements DESC;

\echo '=== 3. Plans: disagreements bucketed by week (of last recorded status_change) ==='

WITH plan_latest AS (
    SELECT DISTINCT ON (wss.plan_id)
        wss.plan_id AS id,
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
),
plan_compare AS (
    SELECT
        p.id,
        p.status::text AS live_status,
        pl.last_recorded_to,
        pl.last_recorded_at,
        (p.status::text = pl.last_recorded_to) AS agrees
    FROM plans p
        JOIN plan_latest pl ON pl.id = p.id
)
SELECT
    date_trunc('week', last_recorded_at)::date AS week_of_last_record,
    count(*) AS disagreements
FROM plan_compare
WHERE
    NOT agrees
GROUP BY
    week_of_last_record
ORDER BY week_of_last_record;

\echo '=== 4. Tasks: agreement summary ==='

WITH task_latest AS (
    SELECT DISTINCT ON (wss.task_id)
        wss.task_id AS id,
        wa.payload ->> 'to' AS last_recorded_to,
        wa.produced_at AS last_recorded_at
    FROM work_session_subjects wss
        JOIN work_artifacts wa ON wa.session_id = wss.session_id
    WHERE
        wss.task_id IS NOT NULL
        AND wa.type = 'status_change'
        AND wa.payload ->> 'entity' = 'task'
        AND wa.payload ->> 'id' = wss.task_id::text
    ORDER BY wss.task_id, wa.produced_at DESC
),
task_compare AS (
    SELECT
        t.id,
        t.status::text AS live_status,
        tl.last_recorded_to,
        tl.last_recorded_at,
        (t.status::text = tl.last_recorded_to) AS agrees
    FROM tasks t
        JOIN task_latest tl ON tl.id = t.id
)
SELECT
    count(*) AS with_history,
    count(*) FILTER (WHERE agrees) AS agree,
    count(*) FILTER (WHERE NOT agrees) AS disagree
FROM task_compare;

\echo '=== 5. Tasks: disagreement breakdown by (live status, last recorded to) ==='

WITH task_latest AS (
    SELECT DISTINCT ON (wss.task_id)
        wss.task_id AS id,
        wa.payload ->> 'to' AS last_recorded_to,
        wa.produced_at AS last_recorded_at
    FROM work_session_subjects wss
        JOIN work_artifacts wa ON wa.session_id = wss.session_id
    WHERE
        wss.task_id IS NOT NULL
        AND wa.type = 'status_change'
        AND wa.payload ->> 'entity' = 'task'
        AND wa.payload ->> 'id' = wss.task_id::text
    ORDER BY wss.task_id, wa.produced_at DESC
),
task_compare AS (
    SELECT
        t.id,
        t.status::text AS live_status,
        tl.last_recorded_to,
        tl.last_recorded_at,
        (t.status::text = tl.last_recorded_to) AS agrees
    FROM tasks t
        JOIN task_latest tl ON tl.id = t.id
)
SELECT
    live_status,
    last_recorded_to,
    count(*) AS disagreements
FROM task_compare
WHERE
    NOT agrees
GROUP BY
    live_status, last_recorded_to
ORDER BY disagreements DESC;

\echo '=== 6. Tasks: disagreements bucketed by week (of last recorded status_change) ==='

WITH task_latest AS (
    SELECT DISTINCT ON (wss.task_id)
        wss.task_id AS id,
        wa.payload ->> 'to' AS last_recorded_to,
        wa.produced_at AS last_recorded_at
    FROM work_session_subjects wss
        JOIN work_artifacts wa ON wa.session_id = wss.session_id
    WHERE
        wss.task_id IS NOT NULL
        AND wa.type = 'status_change'
        AND wa.payload ->> 'entity' = 'task'
        AND wa.payload ->> 'id' = wss.task_id::text
    ORDER BY wss.task_id, wa.produced_at DESC
),
task_compare AS (
    SELECT
        t.id,
        t.status::text AS live_status,
        tl.last_recorded_to,
        tl.last_recorded_at,
        (t.status::text = tl.last_recorded_to) AS agrees
    FROM tasks t
        JOIN task_latest tl ON tl.id = t.id
)
SELECT
    date_trunc('week', last_recorded_at)::date AS week_of_last_record,
    count(*) AS disagreements
FROM task_compare
WHERE
    NOT agrees
GROUP BY
    week_of_last_record
ORDER BY week_of_last_record;

\echo '=== 7. Tasks: re-opened in recorded history (a ->COMPLETED later followed by a ->IN_PROGRESS) ==='
\echo '--- 7 as of 2026-09-23, correctly scoped. A re-opened task is LEGITIMATE, not anomalous, and'
\echo '--- each of these has since been recorded back into agreement. The section earns its place by'
\echo '--- showing that sections 4-6 read only the newest record: history a clean total cannot see.'

WITH task_events AS (
    SELECT
        wss.task_id AS id,
        wa.payload ->> 'to' AS to_status,
        wa.produced_at
    FROM work_session_subjects wss
        JOIN work_artifacts wa ON wa.session_id = wss.session_id
    WHERE
        wss.task_id IS NOT NULL
        AND wa.type = 'status_change'
        AND wa.payload ->> 'entity' = 'task'
        AND wa.payload ->> 'id' = wss.task_id::text
),
ranked AS (
    SELECT
        id,
        to_status,
        produced_at,
        lag(to_status) OVER (
            PARTITION BY id
            ORDER BY produced_at
        ) AS prev_status
    FROM task_events
)
SELECT count(DISTINCT id) AS tasks_with_completed_then_in_progress_in_history
FROM ranked
WHERE
    prev_status = 'COMPLETED'
    AND to_status = 'IN_PROGRESS';
