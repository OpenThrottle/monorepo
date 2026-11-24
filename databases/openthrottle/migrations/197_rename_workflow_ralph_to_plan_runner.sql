-- Rename the workflow-ralph service account and RBAC role to plan-runner (OT plan 624a1036, decision Q10).
--
-- Migration 045 seeded a `workflow-ralph` role and a `workflow-ralph` service account for the plans queue
-- worker's GraphQL identity. The Ralph runner is retired, so both are renamed in place: the ids, role
-- permissions and the service-account-to-role link survive, and only the names and descriptions change.
-- Credentials are keyed by service account id, so existing tokens keep working; re-run
-- `pnpm run database:bootstrap-service-accounts` to write the token under the new `plan-runner` key.
--
-- A fresh database seeds `workflow-ralph` in 045 and renames it here. If a `plan-runner` row already
-- exists (a re-run, or a hand-made one) the old row is left alone rather than colliding.
--
-- Idempotent: the renames only fire while the old name exists and the new one does not.

UPDATE roles
SET name = 'plan-runner',
    description = 'OpenThrottle plan-run worker GraphQL identity (plans queue)'
WHERE name = 'workflow-ralph'
  AND NOT EXISTS (SELECT 1 FROM roles WHERE name = 'plan-runner');

UPDATE service_accounts
SET name = 'plan-runner',
    description = 'Plans queue plan-run worker: GraphQL for OT Loop orchestration and task updates'
WHERE name = 'workflow-ralph'
  AND NOT EXISTS (SELECT 1 FROM service_accounts WHERE name = 'plan-runner');

COMMENT ON TABLE service_accounts IS 'Named service identities for system-to-system auth (MCP, CI, and the plan-run worker).';

COMMENT ON COLUMN work_sessions.tool_name IS 'What produced the work: developer-app | openthrottle-mcp | plan-runner | MCP clientInfo.name (claude-code, cursor, …). Rows written before migration 197 name the plan-run worker workflow-ralph.';

COMMENT ON TABLE work_sessions IS 'Append-only work-ledger spine: one row per unit of work (plan run, MCP session, human mutation) with actor (user XOR service account), tooling fingerprint, and lifecycle timestamps. Subjectless sessions are first-class (attach a plan/task later via work_session_subjects). Only ended_at/closed_by mutate after creation. Guarantees the ledger is built on: docs/monorepo/work-ledger-sessions.md.';

COMMENT ON COLUMN work_sessions.on_behalf_of_user_id IS 'The human the work is for, when the actor is a service account (e.g. the plan-run worker running a user-enqueued plan). Claim vs fact carried by on_behalf_of_verified.';

COMMENT ON COLUMN work_sessions.on_behalf_of_verified IS 'TRUE when on_behalf_of is a verified fact (a plan run inherits it from plan_runs.actor_user_id, itself stamped from an authenticated principal); FALSE for an unverified hint (MCP GITHUB_USER). Only a value the server stamped from an authenticated user is ever a fact; anything a client declares is a hint.';

COMMENT ON COLUMN work_sessions.plan_run_id IS 'Bridges to the plan_runs queue-audit record when this session is a plan run (not absorbed — the ledger is a view of it). SET NULL if the run row is removed.';

COMMENT ON COLUMN work_sessions.closed_by IS 'How the session ended: explicit (endWorkSession after real work), instant (instantaneous by nature — a single first-party mutation with no span to record), or sweeper (abandoned past the 24h TTL; an hourly job closes sessions still open 24h after they started). NULL while still open. Rows written before migration 113 record instant sessions as explicit and are deliberately not backfilled. A run-reliability signal, not just hygiene: sweeper means the producer died rather than ran to completion.';

COMMENT ON TABLE plan_output_stream IS 'Ordered append-only log chunks per plan for agent iteration output stored in the database.';

COMMENT ON TABLE agent_conversations IS 'User-scoped persisted agent/web chat threads for OpenThrottle. Archive-only lifecycle in v1 (status active|archived). Not used for plan_output_stream logs.';
