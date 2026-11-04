-- DEV-ONLY fixture: one plan with a run in every state the plan Details "Runs" card renders, for
-- UI visual passes (light / dark / narrow) on run states. NOT a migration: never place this under
-- databases/migrations/ and never wire it into `database:migrate`, CI or a deploy path.
--
-- Run it against the LOCAL database (the root docker-compose Postgres on 6010):
--
--   docker exec -i openthrottle-postgres-1 psql -v ON_ERROR_STOP=1 \
--     -U openthrottle_user -d openthrottle < databases/seeds/plan-run-states.sql
--
-- or, with a local psql client:
--
--   PGPASSWORD=openthrottle_password psql -v ON_ERROR_STOP=1 -h localhost -p 6010 \
--     -U openthrottle_user -d openthrottle -f databases/seeds/plan-run-states.sql
--
-- Then sign in as developer@openthrottle.ai (FEATURE_CHARLIE_PREVIEW on) and open the
-- "[fixture] run states" plan's Details tab. Remove everything it created with the CLEANUP block
-- at the bottom of this file.
--
-- Idempotent: every row has a FIXED id; the script deletes the fixture plan (plan_runs cascade)
-- and its work session, then re-inserts it, all inside one transaction. Timestamps are
-- now()-relative ON PURPOSE, unlike blog.sql: scheduled runs must sit in the future and the
-- in-progress run needs a fresh heartbeat, so re-run the script before each visual pass.
--
-- Safe against the background jobs of a running server (the user's local DB may be shared):
--   * SCHEDULED rows carry NO bullmq_job_id. The scheduled-run boot reconcile skips such rows; one
--     with a job id would get its "lost" delayed job re-created and actually run this plan.
--   * scheduled_for is in the future, so nothing marks the scheduled rows MISSED.
--   * The IN_PROGRESS row has heartbeat_expected = false and no job, so the stale sweep judges it
--     on the 12h unsupervised cutoff. A SUPERVISED stale-looking row (heartbeat_expected = true,
--     last heartbeat > 120s old) is what drives the UI's `isStale` badge, but the sweep flips it to
--     STALE within minutes AND resets the plan to PENDING. The fixture therefore records the
--     settled STALE state instead; see the optional block at the bottom to force the badge.
--   * Every other run is terminal.
--
-- Run states covered (plan_runs.status is plain TEXT; see migrations 138 and 140):
--   SCHEDULED x2 (+2h, +1 day), IN_PROGRESS, STALE, USAGE_LIMITED + its COMPLETED resume run
--   (resume_of_run_id), MISSED, SUPERSEDED, COMPLETED with a job id + branch + PR, and a
--   CLI/orchestrator COMPLETED run with no job, plus four older COMPLETED runs so history has
--   12 rows and shows its "Show N more" button.

BEGIN;

-- ---------------------------------------------------------------------------
-- Reset: drop the previous fixture (plan_runs cascade from plans; the work
-- session only SET NULLs its plan_run_id, so delete it explicitly first — its
-- artifacts cascade).
-- ---------------------------------------------------------------------------

DELETE FROM work_sessions WHERE id = 'fe000000-0000-4000-8000-00000000a001';
DELETE FROM plans WHERE id = 'fe000000-0000-4000-8000-000000000001';

-- ---------------------------------------------------------------------------
-- The fixture plan
-- ---------------------------------------------------------------------------

INSERT INTO plans (id, author, category, description, status, title)
VALUES (
  'fe000000-0000-4000-8000-000000000001',
  'fixture',
  'fixture',
  'DEV-ONLY fixture from databases/seeds/plan-run-states.sql: one run per state for visual passes on the Runs card. Safe to delete.',
  'PENDING',
  '[fixture] run states'
);

-- ---------------------------------------------------------------------------
-- Runs, one per state. Ids end in the row number used in the comments.
-- ---------------------------------------------------------------------------

INSERT INTO plan_runs (
  id, plan_id, queue_name, bullmq_job_id, run_kind, execution_backend, status,
  created_at, updated_at, run_config_snapshot, last_heartbeat_at, heartbeat_expected,
  branch, model, scheduled_for, usage_limit_resets_at, usage_limit_type, resume_of_run_id
)
VALUES
  -- 01 SCHEDULED, fires in 2 hours (no job id — see the header).
  ('fe000000-0000-4000-8000-000000000101', 'fe000000-0000-4000-8000-000000000001', 'plans',
   NULL, 'orchestrator', 'claude', 'SCHEDULED',
   now() - interval '5 minutes', now() - interval '5 minutes',
   '{"version":1,"target":{"mode":"plan","taskId":""},"ralph":{"executionBackend":"claude","model":"claude-sonnet-5","effort":"high","iterations":10},"workspace":{"workingDirectory":""}}',
   NULL, TRUE, NULL, 'claude-sonnet-5', now() + interval '2 hours', NULL, NULL, NULL),

  -- 02 SCHEDULED, fires in 1 day.
  ('fe000000-0000-4000-8000-000000000102', 'fe000000-0000-4000-8000-000000000001', 'plans',
   NULL, 'orchestrator', 'cursor', 'SCHEDULED',
   now() - interval '10 minutes', now() - interval '10 minutes',
   '{"version":1,"target":{"mode":"plan","taskId":""},"ralph":{"executionBackend":"cursor","model":"claude-opus-4.8","effort":"medium","iterations":10},"workspace":{"workingDirectory":""}}',
   NULL, TRUE, NULL, NULL, now() + interval '1 day', NULL, NULL, NULL),

  -- 03 IN_PROGRESS, unsupervised (heartbeat_expected = false) with a fresh heartbeat.
  ('fe000000-0000-4000-8000-000000000103', 'fe000000-0000-4000-8000-000000000001', 'plans',
   NULL, 'orchestrator', 'claude', 'IN_PROGRESS',
   now() - interval '15 minutes', now() - interval '20 seconds',
   '{"version":1,"target":{"mode":"plan","taskId":""},"ralph":{"executionBackend":"claude","model":"claude-fable-5","effort":"xhigh","iterations":10},"workspace":{"workingDirectory":"/tmp/openthrottle-fixture/run-states"}}',
   now() - interval '20 seconds', FALSE, 'openthrottle/fixture-run-states', 'claude-fable-5',
   NULL, NULL, NULL, NULL),

  -- 04 STALE: the settled form of a stale-looking run (contact lost).
  ('fe000000-0000-4000-8000-000000000104', 'fe000000-0000-4000-8000-000000000001', 'plans',
   'fixture-run-states-104', 'spawn', 'claude', 'STALE',
   now() - interval '3 hours', now() - interval '2 hours 50 minutes',
   '{"version":1,"target":{"mode":"plan","taskId":""},"ralph":{"executionBackend":"claude","model":"claude-sonnet-5","iterations":10},"workspace":{"workingDirectory":""}}',
   now() - interval '2 hours 55 minutes', TRUE, NULL, 'claude-sonnet-5', NULL, NULL, NULL, NULL),

  -- 05 USAGE_LIMITED (its limit has since reset; row 06 resumed it).
  ('fe000000-0000-4000-8000-000000000105', 'fe000000-0000-4000-8000-000000000001', 'plans',
   'fixture-run-states-105', 'spawn', 'claude', 'USAGE_LIMITED',
   now() - interval '1 day', now() - interval '23 hours',
   '{"version":1,"target":{"mode":"plan","taskId":""},"ralph":{"executionBackend":"claude","model":"claude-sonnet-5","effort":"high","iterations":10},"workspace":{"workingDirectory":""}}',
   now() - interval '23 hours', TRUE, 'openthrottle/fixture-run-states', 'claude-sonnet-5',
   NULL, now() - interval '19 hours', 'five_hour', NULL),

  -- 06 COMPLETED resume run of 05 (resume_of_run_id).
  ('fe000000-0000-4000-8000-000000000106', 'fe000000-0000-4000-8000-000000000001', 'plans',
   'fixture-run-states-106', 'spawn', 'claude', 'COMPLETED',
   now() - interval '19 hours', now() - interval '18 hours',
   '{"version":1,"target":{"mode":"plan","taskId":""},"ralph":{"executionBackend":"claude","model":"claude-sonnet-5","effort":"high","iterations":10},"workspace":{"workingDirectory":""}}',
   now() - interval '18 hours', TRUE, 'openthrottle/fixture-run-states', 'claude-sonnet-5',
   NULL, NULL, NULL, 'fe000000-0000-4000-8000-000000000105'),

  -- 07 MISSED: a scheduled run that could not fire within the grace window.
  ('fe000000-0000-4000-8000-000000000107', 'fe000000-0000-4000-8000-000000000001', 'plans',
   NULL, 'orchestrator', 'claude', 'MISSED',
   now() - interval '3 days', now() - interval '2 days',
   '{"version":1,"target":{"mode":"plan","taskId":""},"ralph":{"executionBackend":"claude","model":"claude-sonnet-5","iterations":10},"workspace":{"workingDirectory":""}}',
   NULL, TRUE, NULL, 'claude-sonnet-5', now() - interval '2 days 1 hour', NULL, NULL, NULL),

  -- 08 SUPERSEDED: due while another run of the plan was active.
  ('fe000000-0000-4000-8000-000000000108', 'fe000000-0000-4000-8000-000000000001', 'plans',
   NULL, 'orchestrator', 'claude', 'SUPERSEDED',
   now() - interval '4 days', now() - interval '3 days',
   '{"version":1,"target":{"mode":"plan","taskId":""},"ralph":{"executionBackend":"claude","model":"claude-sonnet-5","iterations":10},"workspace":{"workingDirectory":""}}',
   NULL, TRUE, NULL, 'claude-sonnet-5', now() - interval '3 days', NULL, NULL, NULL),

  -- 09 COMPLETED with a BullMQ job id, branch and (below) a linked PR.
  ('fe000000-0000-4000-8000-000000000109', 'fe000000-0000-4000-8000-000000000001', 'plans',
   'fixture-run-states-109', 'spawn', 'cursor', 'COMPLETED',
   now() - interval '5 days', now() - interval '5 days' + interval '40 minutes',
   '{"version":1,"target":{"mode":"plan","taskId":""},"ralph":{"executionBackend":"cursor","model":"claude-opus-4.8","effort":"medium","iterations":25},"workspace":{"workingDirectory":"/tmp/openthrottle-fixture/run-states-09"}}',
   now() - interval '5 days' + interval '40 minutes', TRUE, 'openthrottle/fixture-run-states-09',
   'claude-opus-4.8', NULL, NULL, NULL, NULL),

  -- 10 COMPLETED CLI/orchestrator run with no job (registered by workflow-ralph).
  ('fe000000-0000-4000-8000-000000000110', 'fe000000-0000-4000-8000-000000000001', 'plans',
   NULL, 'orchestrator', 'claude', 'COMPLETED',
   now() - interval '9 days', now() - interval '9 days' + interval '25 minutes',
   NULL,
   now() - interval '9 days' + interval '25 minutes', FALSE, NULL, NULL, NULL, NULL, NULL, NULL),

  -- 11–14 older COMPLETED runs: they take history past its 10-row page, so "Show N more" renders.
  ('fe000000-0000-4000-8000-000000000111', 'fe000000-0000-4000-8000-000000000001', 'plans',
   NULL, 'orchestrator', 'claude', 'COMPLETED',
   now() - interval '10 days', now() - interval '10 days' + interval '20 minutes',
   NULL, now() - interval '10 days' + interval '20 minutes', FALSE, NULL, 'claude-sonnet-5',
   NULL, NULL, NULL, NULL),
  ('fe000000-0000-4000-8000-000000000112', 'fe000000-0000-4000-8000-000000000001', 'plans',
   NULL, 'orchestrator', 'claude', 'COMPLETED',
   now() - interval '11 days', now() - interval '11 days' + interval '20 minutes',
   NULL, now() - interval '11 days' + interval '20 minutes', FALSE, NULL, 'claude-sonnet-5',
   NULL, NULL, NULL, NULL),
  ('fe000000-0000-4000-8000-000000000113', 'fe000000-0000-4000-8000-000000000001', 'plans',
   NULL, 'orchestrator', 'codex', 'COMPLETED',
   now() - interval '12 days', now() - interval '12 days' + interval '20 minutes',
   NULL, now() - interval '12 days' + interval '20 minutes', FALSE, NULL, NULL,
   NULL, NULL, NULL, NULL),
  ('fe000000-0000-4000-8000-000000000114', 'fe000000-0000-4000-8000-000000000001', 'plans',
   NULL, 'orchestrator', 'claude', 'COMPLETED',
   now() - interval '13 days', now() - interval '13 days' + interval '20 minutes',
   NULL, now() - interval '13 days' + interval '20 minutes', FALSE, NULL, 'claude-opus-4.8',
   NULL, NULL, NULL, NULL);

-- ---------------------------------------------------------------------------
-- PR provenance for run 09: plan_runs → work_sessions.plan_run_id →
-- work_artifacts(type = 'pull_request'). Needs the seeded developer user as the
-- session actor; skipped (no row) when that user does not exist. Marked
-- verified so the work-ledger verifier never calls GitHub for it.
-- ---------------------------------------------------------------------------

INSERT INTO work_sessions (id, actor_user_id, tool_name, plan_run_id, closed_by, started_at, ended_at)
SELECT
  'fe000000-0000-4000-8000-00000000a001',
  users.id,
  'fixture',
  'fe000000-0000-4000-8000-000000000109',
  'explicit',
  now() - interval '5 days',
  now() - interval '5 days' + interval '40 minutes'
FROM users
WHERE users.email = 'developer@openthrottle.ai';

INSERT INTO work_artifacts (session_id, type, external_key, payload, lifecycle, verification, verified_at, source, produced_at)
SELECT
  work_sessions.id,
  'pull_request',
  'OpenThrottle/monorepo#fixture-run-states-09',
  '{"repo":"OpenThrottle/monorepo","number":9999}',
  'open',
  'verified',
  now(),
  'human',
  now() - interval '5 days' + interval '40 minutes'
FROM work_sessions
WHERE work_sessions.id = 'fe000000-0000-4000-8000-00000000a001';

COMMIT;

-- ---------------------------------------------------------------------------
-- CLEANUP — run this block (uncommented) to remove everything above:
-- ---------------------------------------------------------------------------
--
-- BEGIN;
-- DELETE FROM work_sessions WHERE id = 'fe000000-0000-4000-8000-00000000a001';
-- DELETE FROM plans WHERE id = 'fe000000-0000-4000-8000-000000000001';
-- COMMIT;
--
-- ---------------------------------------------------------------------------
-- OPTIONAL — force the isStale badge for a screenshot. Turns run 03 into a
-- supervised run with a 10-minute-old heartbeat. The stale sweep (if a server
-- is running) will settle it to STALE and reset the plan to PENDING within a
-- few minutes; re-run this file afterwards to restore the fixture.
-- ---------------------------------------------------------------------------
--
-- UPDATE plan_runs
--    SET heartbeat_expected = TRUE, last_heartbeat_at = now() - interval '10 minutes'
--  WHERE id = 'fe000000-0000-4000-8000-000000000103';
