-- Work ledger: the append-only source of truth for "who did what, when, using which tools,
-- producing n typed outputs" — replacing the commit-centric commit_links model. Git demotes
-- to an optional adapter/verifier. See docs/monorepo/work-ledger-design.md (PR #185).
--
-- Three tables:
--   work_sessions          — the spine: actor (user XOR service account), tooling fingerprint,
--                            optional plan/task subject via work_session_subjects. Subjectless
--                            sessions are first-class. Append-only: only ended_at/closed_by close it.
--   work_session_subjects  — session ↔ plan/task (many-to-many); plan-level = task_id NULL.
--   work_artifacts         — typed outputs off a session (git_commit, pull_request, document,
--                            deployment, status_change, …) with per-type lifecycle and
--                            verification (unverified → verified | orphaned).

-- ─────────────────────────────────────────────────────────────────────────────
-- work_sessions
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS work_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_user_id UUID REFERENCES users (id),
    actor_service_account_id UUID REFERENCES service_accounts (id),
    on_behalf_of_user_id UUID REFERENCES users (id),
    on_behalf_of_verified BOOLEAN NOT NULL DEFAULT FALSE,
    tool_name TEXT NOT NULL,
    tool_version TEXT,
    model TEXT,
    external_ref TEXT,
    plan_run_id UUID REFERENCES plan_runs (id) ON DELETE SET NULL,
    conversation_id UUID REFERENCES agent_conversations (id) ON DELETE SET NULL,
    summary TEXT,
    closed_by TEXT,
    started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    ended_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    -- Exactly one actor kind. Actor FKs are deliberately ON DELETE NO ACTION (the default):
    -- users/service_accounts are soft-delete-only (disabled_at), and SET NULL would violate
    -- this CHECK. History must never lose its actor.
    CONSTRAINT chk_work_sessions_one_actor CHECK (num_nonnulls(actor_user_id, actor_service_account_id) = 1),
    CONSTRAINT chk_work_sessions_closed_by CHECK (closed_by IS NULL OR closed_by IN ('explicit', 'sweeper'))
);

CREATE INDEX IF NOT EXISTS idx_work_sessions_actor_user_id ON work_sessions (actor_user_id) WHERE actor_user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_work_sessions_actor_service_account_id ON work_sessions (actor_service_account_id) WHERE actor_service_account_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_work_sessions_on_behalf_of_user_id ON work_sessions (on_behalf_of_user_id) WHERE on_behalf_of_user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_work_sessions_plan_run_id ON work_sessions (plan_run_id) WHERE plan_run_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_work_sessions_conversation_id ON work_sessions (conversation_id) WHERE conversation_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_work_sessions_started_at ON work_sessions (started_at DESC);

-- Cheap sweeper scan (§4.4): find sessions still open past the TTL.
CREATE INDEX IF NOT EXISTS idx_work_sessions_open ON work_sessions (started_at) WHERE ended_at IS NULL;

COMMENT ON TABLE work_sessions IS 'Append-only work-ledger spine: one row per unit of work (Ralph run, MCP session, human mutation) with actor (user XOR service account), tooling fingerprint, and lifecycle timestamps. Subjectless sessions are first-class (attach a plan/task later via work_session_subjects). Only ended_at/closed_by mutate after creation. See docs/monorepo/work-ledger-design.md §3.1.';

COMMENT ON COLUMN work_sessions.id IS 'Surrogate primary key.';

COMMENT ON COLUMN work_sessions.actor_user_id IS 'Who authenticated, when the principal is a human (users.id, JWT sub). Exactly one of actor_user_id / actor_service_account_id is set (chk_work_sessions_one_actor). NO ACTION on delete — users are soft-deleted (disabled_at), history keeps its actor.';

COMMENT ON COLUMN work_sessions.actor_service_account_id IS 'Who authenticated, when the principal is a machine (service_accounts.id). NOT pinned to the seeded openthrottle-mcp account — keeps per-machine credential minting open (design §2.3).';

COMMENT ON COLUMN work_sessions.on_behalf_of_user_id IS 'The human the work is for, when the actor is a service account (e.g. Ralph running a user-enqueued plan). Claim vs fact carried by on_behalf_of_verified.';

COMMENT ON COLUMN work_sessions.on_behalf_of_verified IS 'TRUE when on_behalf_of is a verified fact (Ralph inherits it from plan_runs.actor_user_id, itself stamped from an authenticated principal); FALSE for an unverified hint (MCP GITHUB_USER). See design §2.3.';

COMMENT ON COLUMN work_sessions.tool_name IS 'What produced the work: developer-app | openthrottle-mcp | workflow-ralph | MCP clientInfo.name (claude-code, cursor, …).';

COMMENT ON COLUMN work_sessions.tool_version IS 'Tool/client version (e.g. MCP clientInfo.version); nullable.';

COMMENT ON COLUMN work_sessions.model IS 'Model identifier when an agent did the work (e.g. claude-fable-5); NULL for humans.';

COMMENT ON COLUMN work_sessions.external_ref IS 'External correlation id: BullMQ job id, agent session id, WORKTREE_ID + pid, etc.';

COMMENT ON COLUMN work_sessions.plan_run_id IS 'Bridges to the plan_runs queue-audit record when this session is a Ralph run (not absorbed — the ledger is a view of it). SET NULL if the run row is removed.';

COMMENT ON COLUMN work_sessions.conversation_id IS 'Bridges to the agent_conversations transcript when this session is a chat. Substrate for chat→plan promotion (design §6). SET NULL if the conversation is removed.';

COMMENT ON COLUMN work_sessions.summary IS 'Short human-legible summary, set at end_session/promotion; gives unpromoted sessions legibility in activity (design §6.2).';

COMMENT ON COLUMN work_sessions.closed_by IS 'How the session ended: explicit (endWorkSession / instant session) or sweeper (abandoned past the 24h TTL). NULL while still open. A Ralph-reliability signal, not just hygiene (design §4.4).';

COMMENT ON COLUMN work_sessions.started_at IS 'When work began. For instant sessions (human mutations) started_at = ended_at.';

COMMENT ON COLUMN work_sessions.ended_at IS 'When the session closed; NULL while open. Set explicitly or by the sweeper.';

COMMENT ON COLUMN work_sessions.created_at IS 'Row creation timestamp.';

-- ─────────────────────────────────────────────────────────────────────────────
-- work_session_subjects
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS work_session_subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES work_sessions (id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES plans (id) ON DELETE CASCADE,
    task_id UUID REFERENCES tasks (id) ON DELETE CASCADE,
    attached_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Dedupe with the commit_links sentinel pattern: task-level subject = (plan, task); plan-level = task_id NULL.
CREATE UNIQUE INDEX IF NOT EXISTS uq_work_session_subjects_session_plan_task
    ON work_session_subjects (session_id, plan_id, COALESCE(task_id, '00000000-0000-0000-0000-000000000000'::uuid));

CREATE INDEX IF NOT EXISTS idx_work_session_subjects_session_id ON work_session_subjects (session_id);

CREATE INDEX IF NOT EXISTS idx_work_session_subjects_plan_id ON work_session_subjects (plan_id);

CREATE INDEX IF NOT EXISTS idx_work_session_subjects_task_id ON work_session_subjects (task_id) WHERE task_id IS NOT NULL;

COMMENT ON TABLE work_session_subjects IS 'Session ↔ plan/task association (many-to-many). Task-level subject sets both plan_id and task_id; plan-level leaves task_id NULL. Subjectless sessions have zero rows here; retroactive attach (incl. chat→plan promotion) is an INSERT — the session never mutates. See design §3.2.';

COMMENT ON COLUMN work_session_subjects.id IS 'Surrogate primary key.';

COMMENT ON COLUMN work_session_subjects.session_id IS 'The session being attributed to a subject (work_sessions.id); cascade-deleted with the session.';

COMMENT ON COLUMN work_session_subjects.plan_id IS 'The subject plan (plans.id); always populated (every task belongs to a plan). Cascade-deleted with the plan.';

COMMENT ON COLUMN work_session_subjects.task_id IS 'The subject task (tasks.id) for a task-level subject; NULL for a plan-level subject. Cascade-deleted with the task. The unique index treats NULL as the zero-uuid sentinel so plan-level rows dedupe too.';

COMMENT ON COLUMN work_session_subjects.attached_at IS 'When this subject was attached (creation or retroactive promotion).';

-- ─────────────────────────────────────────────────────────────────────────────
-- work_artifacts
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS work_artifacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES work_sessions (id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    external_key TEXT NOT NULL,
    payload JSONB NOT NULL,
    lifecycle TEXT,
    verification TEXT NOT NULL DEFAULT 'unverified',
    verified_at TIMESTAMP WITH TIME ZONE,
    source TEXT NOT NULL,
    message TEXT,
    produced_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    -- Per-session dedupe. Idempotent types (git_commit, pull_request) upsert on this key; event types
    -- (status_change) carry a transition discriminator in external_key so each is a distinct row (design §3.3, G10).
    CONSTRAINT uq_work_artifacts_session_type_key UNIQUE (session_id, type, external_key),
    CONSTRAINT chk_work_artifacts_verification CHECK (verification IN ('orphaned', 'unverified', 'verified')),
    CONSTRAINT chk_work_artifacts_source CHECK (source IN ('adapter', 'agent', 'human', 'legacy', 'server'))
);

CREATE INDEX IF NOT EXISTS idx_work_artifacts_type_external_key ON work_artifacts (type, external_key);

-- The verifier's work queue (§3.3): unverified claims, oldest first.
CREATE INDEX IF NOT EXISTS idx_work_artifacts_unverified ON work_artifacts (produced_at) WHERE verification = 'unverified';

CREATE INDEX IF NOT EXISTS idx_work_artifacts_session_id ON work_artifacts (session_id);

COMMENT ON TABLE work_artifacts IS 'Typed outputs produced within a work session (git_commit, pull_request, document, deployment, status_change, …). Payload is per-type JSONB validated in app code; identity/dedupe/lookups ride (type, external_key). verification records the claims-vs-facts state; lifecycle is a per-type vocabulary (e.g. git_commit created→landed). See design §3.3.';

COMMENT ON COLUMN work_artifacts.id IS 'Surrogate primary key.';

COMMENT ON COLUMN work_artifacts.session_id IS 'The session that produced this artifact (work_sessions.id); cascade-deleted with the session.';

COMMENT ON COLUMN work_artifacts.type IS 'Artifact type, resolved against the server-side type registry: git_commit | pull_request | document | deployment | status_change | … . Each type declares its payload schema, lifecycle vocabulary, and dedupe identity (idempotent | event).';

COMMENT ON COLUMN work_artifacts.external_key IS 'Per-type identity key. Idempotent types: canonical id (e.g. github:OpenThrottle/monorepo@<sha>). Event types: transition-discriminated (e.g. task:<id>:COMPLETED:<seq>) so repeated events append rather than upsert.';

COMMENT ON COLUMN work_artifacts.payload IS 'Per-type structured payload (JSONB), validated in app code by the type registry (zod). E.g. git_commit {repo, sha, landed_sha?}; status_change {entity, id, from, to}.';

COMMENT ON COLUMN work_artifacts.lifecycle IS 'Per-type lifecycle state; NULL for types without one. E.g. git_commit created→landed (landed fires downstream triggers); document draft→published.';

COMMENT ON COLUMN work_artifacts.verification IS 'Claims-vs-facts state: unverified (a claim), verified (a verifier confirmed it, or a first-party server-witnessed event born verified), orphaned (verifier could not reconcile it, e.g. rebase/branch drift).';

COMMENT ON COLUMN work_artifacts.verified_at IS 'When verification last transitioned to verified; NULL while unverified/orphaned.';

COMMENT ON COLUMN work_artifacts.source IS 'What wrote this artifact: agent (self-reported via MCP), human (manual attach), adapter (a verifier/scanner e.g. git trailer harvest), server (first-party server-witnessed event, e.g. status_change), legacy (commit_links migration backfill).';

COMMENT ON COLUMN work_artifacts.message IS 'Optional human-readable note (e.g. commit message carried from a linked commit).';

COMMENT ON COLUMN work_artifacts.produced_at IS 'When the underlying work was produced (commit time, mutation time). Drives activity ordering; distinct from created_at (row insert time).';

COMMENT ON COLUMN work_artifacts.created_at IS 'Row creation timestamp.';
