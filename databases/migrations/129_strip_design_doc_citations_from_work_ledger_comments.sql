-- Re-issue the work-ledger table and column comments without their citations of a design doc
-- that no longer exists (OT plan 7a409997).
--
-- 068 (and 113, which superseded 068's closed_by comment) deferred their rationale to
-- docs/monorepo/work-ledger-design.md by section number. That doc was removed in the
-- pre-public markdown cleanup (PR #291), so every one of those citations dangled -- and
-- because they are COMMENT ON text, they dangled in the shipped schema, in front of anyone
-- running \d+ work_sessions, with one naming the missing file by path.
--
-- Applied migrations are checksummed and immutable (databases/README.md, Run-once /
-- idempotent), so 068 and 113 are left as written and this migration re-issues the
-- comments instead, as 113 did before it. Each citation is replaced by the substance it was
-- pointing at where that fits in a clause, since a comment is read in psql where a link is
-- not followable; the longer rationale lives in docs/monorepo/work-ledger-sessions.md.
--
-- The plain "--" comments inside 068 still name the old doc. They never reached the
-- database and cannot change without checksum drift; work-ledger-sessions.md records that
-- exception.
--
-- Idempotent: COMMENT ON overwrites, so re-running sets the same text again.

COMMENT ON TABLE work_sessions IS
    'Append-only work-ledger spine: one row per unit of work (Ralph run, MCP session, human mutation) with actor (user XOR service account), tooling fingerprint, and lifecycle timestamps. Subjectless sessions are first-class (attach a plan/task later via work_session_subjects). Only ended_at/closed_by mutate after creation. Guarantees the ledger is built on: docs/monorepo/work-ledger-sessions.md.';

COMMENT ON COLUMN work_sessions.actor_service_account_id IS
    'Who authenticated, when the principal is a machine (service_accounts.id). NOT pinned to the seeded openthrottle-mcp account — keeps per-machine credential minting open, the deferred path to making on_behalf_of a verified fact for MCP sessions too.';

COMMENT ON COLUMN work_sessions.on_behalf_of_verified IS
    'TRUE when on_behalf_of is a verified fact (Ralph inherits it from plan_runs.actor_user_id, itself stamped from an authenticated principal); FALSE for an unverified hint (MCP GITHUB_USER). Only a value the server stamped from an authenticated user is ever a fact; anything a client declares is a hint.';

COMMENT ON COLUMN work_sessions.conversation_id IS
    'Bridges to the agent_conversations transcript when this session is a chat. Substrate for chat→plan promotion, which attaches a plan to the existing session rather than creating a new one. SET NULL if the conversation is removed.';

COMMENT ON COLUMN work_sessions.summary IS
    'Short human-legible summary, set at end_session/promotion; gives sessions that were never promoted to a plan a readable line in activity views.';

COMMENT ON COLUMN work_sessions.closed_by IS
    'How the session ended: explicit (endWorkSession after real work), instant (instantaneous by nature — a single first-party mutation with no span to record), or sweeper (abandoned past the 24h TTL; an hourly job closes sessions still open 24h after they started). NULL while still open. Rows written before migration 113 record instant sessions as explicit and are deliberately not backfilled. A Ralph-reliability signal, not just hygiene: sweeper means the producer died rather than ran to completion.';

COMMENT ON TABLE work_session_subjects IS
    'Session ↔ plan/task association (many-to-many). Task-level subject sets both plan_id and task_id; plan-level leaves task_id NULL. Subjectless sessions have zero rows here; retroactive attach (incl. chat→plan promotion) is an INSERT — the session never mutates.';

COMMENT ON TABLE work_artifacts IS
    'Typed outputs produced within a work session (git_commit, pull_request, document, deployment, status_change, …). Payload is per-type JSONB validated in app code; identity/dedupe/lookups ride (type, external_key) — idempotent types upsert on it, event types (status_change) append a discriminator so each transition is its own row. verification records the claims-vs-facts state: agent-reported claims start unverified, server-witnessed events are born verified. lifecycle is a per-type vocabulary (e.g. git_commit created→landed).';
