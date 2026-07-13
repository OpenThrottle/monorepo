# Work ledger design: sessions + typed artifacts as the source of truth

**Status:** design in progress (audit complete; remaining sections land per-task).
**OT plan:** `6464971b-11f6-4c92-bcb9-7fb8b934e05f` (category `traceability`).
**Pattern:** design doc → grill → merge → separate sliced implementation plan (precedent: [plan-task-tags-rules-design.md](./plan-task-tags-rules-design.md), PR #182).

## Problem statement

OpenThrottle pitches "work as history" ([work-as-history.md](../openthrottle/work-as-history.md)) but implements it inverted: `commit_links` makes git the primary record and OT a foreign-key table pointing into it. The `Plan-Id:`/`Task-Id:` commit trailers are write-only ceremony — nothing in the repo parses them. Linking is 100% manual. A user who skips the ritual — or whose project doesn't use git at all — gets zero traceability, and everything downstream silently evaporates.

The target is an **append-only work ledger**: who did work, when, using which tools, producing _n_ typed outputs. Git demotes from source of truth to adapter #1.

Locked direction (iterated 2026-07-12):

- **WorkSession** (the spine): actor, started/ended, tooling fingerprint, optional plan/task subject. Subjectless sessions are first-class and retroactively attachable — the building block for chats becoming plans + tasks.
- **Artifact**: typed outputs (`git_commit`, `pull_request`, `document`, `deployment`, …) hanging off a session, each with a per-type lifecycle ("landed on main" is a status transition on a `git_commit` artifact, not the linking event) and a verification state (`unverified | verified | orphaned` — claims recorded immediately, verifiers upgrade them to facts).
- **Capture principle**: the tool doing the work writes the ledger. Agents are good at ceremony; humans aren't. A human's task status change is itself a sufficient ledger signal (the minimal non-git path).
- Two-level granularity only (session → artifacts); subjects are plan/task, nothing finer; `plan_output_stream` stays separate and referenced.

---

## 1. Current-state audit

### 1.1 The four jobs of `commit_links`

A `commit_links` row (`databases/migrations/006_create_commit_links_table.sql`: `plan_id`, nullable `task_id`, `repo`, `sha`, `message`, `created_at`; dedupe via `UNIQUE (plan_id, COALESCE(task_id, zero-uuid), repo, sha)`) currently performs four distinct jobs at once:

1. **Evidence** — proof an output exists (the SHA).
2. **Completion event** — "this task's work shipped" (migrations 056–058 used commit links as tasks' only _immune signal_ when backfilling `completed_at`).
3. **Attribution** — implicitly, via the commit's author (never resolved into OT).
4. **Trigger** — `linkCommit` enqueues the refine-tagging job (shipped in PR #183).

All four depend on one manual, git-shaped ritual. The ledger separates them.

### 1.2 Proto-ledger signal inventory

OT already has **five** fragments of a work ledger, each carrying a different subset of who/when/what/how, none unified:

| Signal                                    | Who (actor)                                                      | When                                                                                                                                     | What                                                                                                 | How (tooling)                                                                                 | Write path                                                                                                             |
| ----------------------------------------- | ---------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `commit_links` (006)                      | — (implicit commit author, unresolved)                           | `created_at` = link time, not work time                                                                                                  | git SHA per plan/task                                                                                | —                                                                                             | Manual only: `link_commit` MCP tool, `workflow-link-merge` CLI, raw `linkCommit` mutation (`commit-links.resolver.ts`) |
| `plan_output_stream` (007)                | —                                                                | `created_at`                                                                                                                             | narrative output chunks                                                                              | `iteration` only                                                                              | `appendPlanOutput` mutation (`plan-output-stream.resolver.ts`); publishes `planOutputChunkAdded`                       |
| task/plan `status` + `completed_at` (055) | — (`assignee` is free text)                                      | `completed_at` set in app code (`packages/nestjs-repositories/src/common/completed-at.ts`, called from `tasks.resolver.ts` `updateTask`) | completion; **no history table** — activity infers "task events" from the mutable row's `updated_at` | —                                                                                             | `updateTask`/`updatePlan` mutations                                                                                    |
| `plan_runs` (038, 047, 053)               | `actor_user_id` (nullable; null for service-account/system runs) | `created_at`/`updated_at`                                                                                                                | queued Ralph run per **plan** (not task)                                                             | `run_kind` (spawn\|orchestrator), `execution_backend` (cursor\|claude), `run_config_snapshot` | `PlanEnqueueService` on run enqueue                                                                                    |
| `agent_conversations` + messages (051)    | `user_id` (required)                                             | `created_at`/`updated_at`                                                                                                                | chat threads; optional `plan_id`/`project_id`                                                        | `model_provider`, `model_name`, per-message `tool_metadata`, routing snapshots                | agents chat resolvers                                                                                                  |

Observations:

- `plan_runs` is a proto-WorkSession for one capture path (queued Ralph runs): it already records actor, tooling, and config — but is plan-scoped, Ralph-only, and disconnected from outputs and commits.
- `agent_conversations` is a proto-WorkSession for another path (web chat): required user actor, model fingerprint, optional plan link — the natural substrate for chat→plan promotion (§6, TBD).
- `commit_links` and `plan_output_stream` record _outputs_ with no actor and no session.
- Task status is the only signal a zero-ceremony human reliably produces today, and it isn't event-shaped (mutable row, no history).

### 1.3 Actor infrastructure (exists, underused)

- `users` (026, 031, 033): `id`, `github_username` (unique), `email`, `password_hash`, `disabled_at`. Developer-app login: email+password → JWT `{sub: user.id}` (`auth.resolver.ts`, `local.strategy.ts`).
- `service_accounts` + `service_account_credentials` + `service_account_roles` (044): bearer tokens `ot_sa_<prefix>_<secret>` resolve via prefix lookup + bcrypt compare to a **service_account row** (`service-accounts.service.ts` `verifyBearerToken`; timing-safe dummy compare; stamps `last_used_at`). Seeded accounts: `openthrottle-mcp`, `workflow-ralph` (045), `tagging` (067, in-process identity for `server-llm` tag writes).
- `AuthPrincipal` (`packages/nestjs-auth/src/auth-principal.ts`): discriminated `user` (JWT) | `service_account` (sub = SA UUID). `global-auth.guard.ts` tries service-account bearer first, then JWT.

**Gaps:**

- All MCP traffic authenticates as the single `openthrottle-mcp` service account — per-principal machine identity exists, but per-_session_/per-_human_ attribution through the MCP does not (no `on_behalf_of`).
- `plans.author` / `plans.assignee` / `tasks.assignee` are free-text GitHub usernames with **no FK to `users`**; only the rules engine resolves `plan.author` → `users.id` ad hoc.
- `tasks` has no `author` column at all.

### 1.4 Downstream consumers to re-key

1. **Activity feed** — `activityByDate` / `activityByDateRange` / `lastActivity` (`activity.resolver.ts`, flagged `FIXME: Swap out eventually`): three parallel raw-SQL queries over `commit_links`, `plan_output_stream`, `tasks.updated_at`, merged and sorted in JS. Consumed by MCP `get_activity_by_date` / `get_last_activity` and the dashboard (`DashboardRecentActivity.tsx`). Re-key target: a single query over ledger sessions/artifacts/events — likely _simplifies_ this resolver.
2. **`completed_at` fidelity** — runtime is app code (sound); the historical pain (migrations 056–059 reconstructing times from immune signals) exists because status changes aren't events. Ledger events make future reconstruction unnecessary.
3. **Refine-tagging trigger** — `linkCommit` → `TaggingEnqueueService.enqueueRefine(planId, repo, sha)`, jobId `tag-refine:<planId>:<sha>` (fire-and-forget). Re-key: fires on **git artifact promoted to `landed`** instead.
4. **`daily_stats`** (027, `daily-stats.processor.ts`) — aggregates `plans`/`tasks` by `created_at`/`updated_at`/`completed_at` only; does **not** read `commit_links` at runtime. Unaffected structurally; sessions later enable richer stats (per-actor, per-tool).
5. **`link_commit` MCP tool + `workflow-link-merge` CLI** — remain as sugar: create-or-promote a `git_commit` artifact.

### 1.5 Eventing/enqueue pattern (facts)

There is no domain-event/outbox machinery anywhere in `openthrottle-server` or `nestjs-repositories`. The established pattern is inline BullMQ enqueue from resolvers/services after the write commits, fire-and-forget (errors logged and swallowed), with deterministic jobIds for dedupe (`tag-predict:<type>:<id>`, `tag-refine:<planId>:<sha>`, `plan-rules:evaluate`). Ledger emission should follow this pattern in v1; a transactional outbox is out of scope unless grilling says otherwise.

### 1.6 Reconciliation with plan `03dbeb22` (Commit ↔ task reconciliation)

Plan `03dbeb22-2952-4246-98a3-450766db59cd` (PENDING, 6 tasks) is the git-centric take on the same itch. Task-by-task disposition under the ledger model:

| 03dbeb22 task                                        | Disposition                                                                                                                                                         |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Audit + ADR                                       | **Superseded** by this design doc.                                                                                                                                  |
| 2. Continuous trailer-parsing git ingestion          | **Absorbed** into the git adapter (§5): trailer parse becomes one optional signal the verifier understands, not the front door.                                     |
| 3. File/path-level commit mapping                    | **Deferred backlog**: an enrichment on `git_commit` artifacts (touched paths), orthogonal to the core ledger. Carry into the implementation plan's backlog, not v1. |
| 4. Link commits to the output/run that produced them | **Absorbed wholesale** — this _is_ WorkSession → Artifact.                                                                                                          |
| 5. Rebase/squash drift reconciliation                | **Absorbed** into artifact verification: the `orphaned` state + verifier re-point logic.                                                                            |
| 6. Commits as semantic-search/timeline source        | **Survives as follow-up**: index artifacts (not just commits) into cross-source ranking.                                                                            |

**Recommendation:** cancel `03dbeb22` when the implementation plan is authored (task 8), folding tasks 2/4/5 into the git-adapter slice and recording 3/6 as explicit backlog items in the implementation plan. Two live plans over the same surface invite drift; the ledger plan is the superset.

---

## 2. Actor model

### 2.1 Columns, not polymorphism

Ledger attribution rides on the existing `AuthPrincipal` discriminated union (`user` | `service_account`) and uses **real foreign keys** rather than a `(kind, id)` polymorphic pair — precedent: `plan_runs.actor_user_id` (053):

```sql
actor_user_id            UUID NULL REFERENCES users(id)            ON DELETE SET NULL,
actor_service_account_id UUID NULL REFERENCES service_accounts(id) ON DELETE SET NULL,
on_behalf_of_user_id     UUID NULL REFERENCES users(id)            ON DELETE SET NULL,
CHECK (num_nonnulls(actor_user_id, actor_service_account_id) = 1)
```

- `actor_*` is **who authenticated** — stamped server-side from the request principal (`sub`), never client-supplied.
- `on_behalf_of_user_id` is **who the work is for** — only meaningful when the actor is a service account. It is a _claim_ in v1 (see §2.3), consistent with the ledger's claims-vs-facts stance.

### 2.2 Resolution per write path (verified)

| Write path                             | Principal today                                                                                                                                                        | Ledger stamping                                                                                                                                                                                                                    |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Developer app                          | JWT, `sub` = `users.id` (per-user ✓)                                                                                                                                   | `actor_user_id = sub`; `on_behalf_of` null                                                                                                                                                                                         |
| openthrottle-mcp                       | SA bearer `ot_sa_…` → the single seeded `openthrottle-mcp` account                                                                                                     | `actor_service_account_id` = that SA; `on_behalf_of_user_id` from the session-open claim (§2.3)                                                                                                                                    |
| Ralph workers                          | Token order `OPENTHROTTLE_WORKER_GRAPHQL_AUTH_TOKEN` → `WORKFLOWS` → `MCP` (`agentic-ralph-worker-graphql-auth.ts`); should present the `workflow-ralph` SA credential | `actor_service_account_id` = worker SA; `on_behalf_of_user_id` **inherited from `plan_runs.actor_user_id`** — this one is a _verified_ claim, because the run row was stamped from an authenticated user principal at enqueue time |
| In-process jobs (tagging pattern, 067) | Named SA without credentials                                                                                                                                           | `actor_service_account_id` = job SA; no `on_behalf_of`                                                                                                                                                                             |

### 2.3 The attribution gap and how to close it

**Gap:** every MCP client on every machine authenticates as the _same_ `openthrottle-mcp` service account, so machine-side work is indistinguishable per human. `GITHUB_USER` reaches the server only as a free-text author default (`plan-creation.service.ts`), not as an identity. No user-scoped API-key concept exists.

Ladder, mirroring artifact verification:

1. **v1 — declared claim:** when the MCP opens a session (§4), it resolves a local user hint (`GITHUB_USER` → `users.github_username`, unique index) and sends `on_behalf_of_user_id` as an unverified claim. Cheap, honest, immediately useful.
2. **Cheap hardening (recommended follow-up):** mint per-machine/per-human `service_account_credentials` rows — the credentials table (prefix, label, expiry, revocation) already supports many credentials per account and many accounts; only a minting flow is missing. Attribution granularity becomes per-credential without new auth concepts.
3. **Future — user-scoped machine tokens (PAT-like):** a credential that authenticates _as_ `user` kind from a machine. Makes `on_behalf_of` unnecessary for that path (the actor _is_ the user). New auth surface; out of scope here.

### 2.4 Relationship to free-text `author` / `assignee`

Keep `plans.author`, `plans.assignee`, `tasks.assignee` exactly as they are in v1 — they answer "who is _responsible_," a workflow concern. The ledger answers "who _did_ it," an attribution concern; conflating them is how the current model lost attribution in the first place.

- Sanctioned mapping where text→user resolution is needed: `users.github_username` (unique), as the rules engine already does for `ownerUserId`.
- Backlog (not v1): FK-ify author/assignee onto `users` once ledger adoption proves the mapping's coverage.

## 3. Ledger schema

Three tables: `work_sessions`, `work_session_subjects`, `work_artifacts`. Append-only by convention (service layer permits only `ended_at` closure on sessions and lifecycle/verification promotion on artifacts; no deletes) — no enforcement triggers in v1.

### 3.1 `work_sessions`

```sql
CREATE TABLE work_sessions (
    id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_user_id            UUID REFERENCES users(id),
    actor_service_account_id UUID REFERENCES service_accounts(id),
    on_behalf_of_user_id     UUID REFERENCES users(id),
    on_behalf_of_verified    BOOLEAN NOT NULL DEFAULT FALSE,
    tool_name                TEXT NOT NULL,     -- 'developer-app' | 'openthrottle-mcp' | 'workflow-ralph' | client-declared
    tool_version             TEXT,
    model                    TEXT,              -- e.g. 'claude-fable-5'; NULL for humans
    external_ref             TEXT,              -- BullMQ job id, agent session id, worktree id…
    plan_run_id              UUID REFERENCES plan_runs(id) ON DELETE SET NULL,
    conversation_id          UUID REFERENCES agent_conversations(id) ON DELETE SET NULL,
    summary                  TEXT,              -- set at end_session/promotion; legibility for unpromoted sessions (§6.2)
    started_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ended_at                 TIMESTAMPTZ,
    created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT work_sessions_one_actor CHECK (num_nonnulls(actor_user_id, actor_service_account_id) = 1)
);
```

Decisions:

- **Actor FKs default to `ON DELETE NO ACTION` (restrict), not `SET NULL`** — `SET NULL` would violate the one-actor CHECK, and both `users` and `service_accounts` are soft-delete-only (`disabled_at`) anyway. History must not lose its actor.
- `on_behalf_of_verified` distinguishes the claim tiers from §2.3 (Ralph-run inheritance = `TRUE`; MCP `GITHUB_USER` hint = `FALSE`).
- `plan_run_id` / `conversation_id` tie sessions to the two existing proto-session tables instead of absorbing them: `plan_runs` stays the queue-audit record, `agent_conversations` stays the chat transcript; a `work_session` is the _ledger view_ of either. `plan_output_stream` is reachable via `plan_run_id`→plan + `iteration`; no schema change to it.
- Instant sessions (`started_at = ended_at`) are legal and cheap — needed for the status-change path (§4).

### 3.2 `work_session_subjects`

```sql
CREATE TABLE work_session_subjects (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id  UUID NOT NULL REFERENCES work_sessions(id) ON DELETE CASCADE,
    plan_id     UUID NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
    task_id     UUID REFERENCES tasks(id) ON DELETE CASCADE,
    attached_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX ON work_session_subjects
    (session_id, plan_id, COALESCE(task_id, '00000000-0000-0000-0000-000000000000'::uuid));
```

- Every task belongs to a plan, so `plan_id` is always populated (task-level subject = both set; plan-level = `task_id` NULL). Dedupe mirrors the `commit_links` sentinel pattern.
- Subjectless session = zero rows here. Retroactive attach (incl. chat→plan promotion, §6) is an INSERT — the session row never mutates.

### 3.3 `work_artifacts`

```sql
CREATE TABLE work_artifacts (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id   UUID NOT NULL REFERENCES work_sessions(id) ON DELETE CASCADE,
    type         TEXT NOT NULL,               -- 'git_commit' | 'pull_request' | 'document' | 'deployment' | 'status_change' | …
    external_key TEXT NOT NULL,               -- canonical identity, e.g. 'github:OpenThrottle/monorepo@<sha>'
    payload      JSONB NOT NULL,              -- per-type shape, app-validated (zod), see §5
    lifecycle    TEXT,                        -- per-type vocabulary: git_commit 'created'→'landed'; document 'draft'→'published'; NULL = no lifecycle
    verification TEXT NOT NULL DEFAULT 'unverified',  -- 'unverified' | 'verified' | 'orphaned'
    verified_at  TIMESTAMPTZ,
    source       TEXT NOT NULL,               -- 'agent' | 'human' | 'adapter' | 'server' | 'legacy'
    message      TEXT,
    produced_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT work_artifacts_session_type_key_unique UNIQUE (session_id, type, external_key)
);
CREATE INDEX ON work_artifacts (type, external_key);
CREATE INDEX ON work_artifacts (verification) WHERE verification = 'unverified';
```

Decisions:

- **JSONB payload + canonical `external_key` column**, not per-type columns. The type set is open by design (adapter contract, §5) — columns can't anticipate it. Identity, dedupe, and hot lookups ride the indexed `(type, external_key)`; payload shapes are validated in app code per type (the `tool_metadata` JSONB-with-app-validation precedent from 051).
- **Dedupe is per-session** (`session_id, type, external_key`), not global. Two sessions may legitimately claim the same commit; cross-session grouping happens at query time by `external_key`. The old (plan, task, repo, sha) semantics collapse naturally: one Ralph session carries several task subjects and _one_ landed-commit artifact, where today that's N `commit_links` rows.
- **First-party events are born `verified`**: a `status_change` artifact written by the server witnessing the mutation is a fact, not a claim. `verified` is not adapter-exclusive; adapters _upgrade_ third-party claims (§5).
- **`status_change` is an artifact type**, payload `{entity: 'task'|'plan', id, from, to}` — this keeps the locked two-level model (no third "events" table) while making the zero-ceremony human path (§4) a real ledger row with an actor.

### 3.4 Query shapes the schema must serve

1. "Commits for plan X" — subjects → sessions → artifacts (`type='git_commit'`).
2. "Who did what on date D" — sessions by `started_at` + artifacts by `produced_at` (replaces the activity resolver's three-query merge).
3. "What produced sha Y" — artifacts by `(type, external_key)` → session → subjects + actor.
4. "Unverified claims for the verifier" — partial index on `verification='unverified'`.

### 3.5 Migration of `commit_links`

1. **Backfill**: synthesize one legacy session _per plan_ that has links (actor = a new credential-less `ledger-migration` service account, 067-style; `tool_name='ledger-migration'`; `started_at` = earliest link `created_at`). Subjects = the distinct (plan, task) pairs of its links; artifacts = distinct SHAs as `git_commit`, `source='legacy'`, `lifecycle='landed'`, **`verification='unverified'`** — the git verifier's first run upgrades them honestly rather than the migration asserting facts it didn't check.
2. **Dual-write**: `linkCommit` mutation writes both `commit_links` and a ledger create-or-promote until consumers re-key.
3. **Re-key consumers** (activity, refine-tagging trigger — §1.4), then replace `commit_links` with a compatibility VIEW over `work_artifacts` + subjects; drop the view in a later cleanup migration.

All DDL follows ot-postgres conventions: idempotent (`IF NOT EXISTS`), `COMMENT ON TABLE/COLUMN` for every object.

## 4. Capture points

Principle: **the tool doing the work writes the ledger** — it's the only party holding actor, subject, timestamps, and outputs at the moment they exist. Three first-party paths, ordered by leverage. All machine paths write via GraphQL (the transport boundary stands).

### 4.1 Ralph / orchestrator (`workflow-ralph`, agentic-ralph)

- **Session open** when the worker starts processing a run: `tool_name='workflow-ralph'`, `plan_run_id` set, `external_ref` = BullMQ job id, `model`/backend from the run-config snapshot, `on_behalf_of_user_id` inherited from `plan_runs.actor_user_id` with `on_behalf_of_verified=TRUE` (§2.2).
- **Subjects**: the plan at open; a task subject appended as each task enters IN_PROGRESS.
- **Artifacts**: `git_commit` recorded at commit time (Ralph knows the sha it just created — `lifecycle='created'`, `verification='unverified'`); `pull_request` when it opens one. `status_change` artifacts come for free via §4.3 since Ralph mutates tasks through the same GraphQL mutations.
- **Session close** in the worker's finally-block on any exit (workflow_complete, max_iterations, cancel, crash-rethrow) — do **not** rely on the orchestrator loop, which is exactly the path that already strands plan statuses today.

### 4.2 MCP boundary (openthrottle-mcp)

- **Implicit session**: opened lazily on the first _mutating_ tool call per server process (stdio = one process per client session). `tool_name` derived from the MCP `initialize` `clientInfo.name` (e.g. `claude-code`, `cursor`), falling back to `openthrottle-mcp`; `tool_version` from `clientInfo.version`; `external_ref` = `WORKTREE_ID` + process id; `on_behalf_of_user_id` resolved from `GITHUB_USER` → `users.github_username`, `on_behalf_of_verified=FALSE` (§2.3).
- **New tools**: `record_artifact` (type, external identity, payload, optional subject), `attach_session_subject` (plan/task), `end_session` (optional — abandoned sessions are swept, §4.4). Tool descriptions instruct agents to self-report outputs; agents are the party that reliably performs ceremony.
- **Ambient attribution**: once a session exists, the MCP sends `X-OT-Session-Id` on its GraphQL requests; the server's CLS picks it up so side-effect ledger rows (e.g. a `status_change` from `update_task`) attach to the _agent's_ session instead of spawning an instant one.

### 4.3 Server mutations (the zero-ceremony human path)

- `updateTask`/`updatePlan` status transitions write a `status_change` artifact **in the same transaction** as the row update (alongside `resolveCompletedAtForStatusChange`), attributed to the request principal. No ambient session (no `X-OT-Session-Id`) → an **instant session** (`started_at = ended_at`, `tool_name='developer-app'`). This single hook fixes the audit's two structural holes at once: task events become real events (no more inferring from mutable `updated_at`), and completions finally carry an actor.
- Unlike BullMQ enqueues (fire-and-forget), this is a same-database write: transactional, not best-effort.
- Manual artifact attach on plan/task detail pages creates an artifact (`source='human'`) in an instant session.

### 4.4 Idempotency / dedupe

| Concern                                | Rule                                                                                                                                |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Retried Ralph job (same BullMQ job id) | Create-or-reuse the open session by `plan_run_id`; a retry continues the same ledger session                                        |
| Re-reported artifact                   | `UNIQUE (session_id, type, external_key)` makes `record_artifact` an upsert (payload/lifecycle may promote, never regress)          |
| Reconnecting MCP client                | New process = new session — honest; cross-session grouping is by `external_key`                                                     |
| Abandoned sessions (crash, kill)       | Sweeper job stamps `ended_at` = last artifact `produced_at` (or `started_at`) after a TTL; open-ended sessions never block anything |

### 4.5 GraphQL surface (sketch)

Mutations `startWorkSession`, `recordWorkArtifact`, `attachWorkSessionSubject`, `endWorkSession`; queries follow §3.4 (sessions/artifacts by plan, task, actor, date; unverified-claims feed for adapters). Result/ListResult conventions per openthrottle-stack; details belong to the implementation plan.

## 5. Adapter/verifier contract

An ecosystem plugs into the ledger with exactly two things — and the second is optional:

1. **Artifact type definition** (required): type name, payload schema (zod), `external_key` derivation rule, lifecycle vocabulary + which transitions trigger downstream jobs. Registered in a server-side code registry in v1 (no DB-driven type registration).
2. **Verifier** (optional): a worker that consumes the unverified-claims feed (§3.3 partial index) for its types and returns `{verification, lifecycle?, payloadPatch?}` per artifact — upgrading claims to facts (`verified`), driving lifecycle from external reality, or flagging `orphaned`. Runs on the established BullMQ pattern with deterministic jobIds; keeps a cursor in its own state row.

If the contract is this thin, "project doesn't use git" stops being an edge case: types like `document` or `deployment` can ship with **no verifier at all** — their artifacts remain visible, attributed claims, which is acceptable and honest.

**Lifecycle promotions are the new trigger boundary.** `git_commit → landed` enqueues refine-tagging (re-keying the #182 trigger; jobId stays `tag-refine:<planId>:<sha>`, planId derived from the session's subjects — enqueue once per subject plan). Other types can declare their own trigger transitions later.

### 5.1 Git adapter (reference implementation — absorbs plan 03dbeb22)

Local-first, two modes; webhooks remain a hosted-mode future:

- **Local scan** (default, zero tokens): walk registered checkouts' default branch incrementally from a stored cursor SHA (03dbeb22 task 2, minus the trailer dependency).
- **GitHub poller** (optional, user token): resolves squash merges via PR data (merge_commit_sha, head branch), richer but rate-limited.

Behaviors:

| Behavior           | Detail                                                                                                                                                                                                                                                                      |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Verify existence   | Claimed `git_commit` sha found → `unverified → verified`                                                                                                                                                                                                                    |
| Landed detection   | Sha reachable from default branch → `lifecycle → 'landed'` (fires triggers)                                                                                                                                                                                                 |
| **Squash mapping** | Claimed branch sha ≠ squash sha. Resolve via PR merge*commit_sha (poller) or message/trailer match (scan); **promote the same artifact** — `payload.landed_sha` added, `lifecycle='landed'`. Identity stays stable; a branch sha that landed via squash is \_not* orphaned. |
| Orphan detection   | Sha unreachable and unmapped after a grace window (branch deleted, rebase drift) → `orphaned` (03dbeb22 task 5)                                                                                                                                                             |
| Trailer harvesting | A commit on main with `Plan-Id:`/`Task-Id:` trailers but no ledger claim → adapter creates an adapter-sourced session + artifact (`source='adapter'`). Trailers finally get parsed — as one optional signal, not the front door.                                            |

### 5.2 The non-git path needs nothing

Confirmed against §4.3: a human flipping a task to COMPLETED yields an instant session (who: actor from principal; when: `produced_at`; what: subjects) with a born-verified `status_change` artifact. Zero adapters, zero git, zero ceremony — and it's a _richer_ record than today's `commit_links` row, which has no actor at all.

## 6. Chat → plan promotion (subjectless sessions)

The inversion pays off here: work exists first, planning is attached later. A chat with an agent that produces real outputs is a `work_session` (`conversation_id` set, §3.1) accumulating artifacts with no subject — already fully attributed and timestamped. Promotion turns it into planned work retroactively.

### 6.1 Mechanics

One mutation, `promoteSessionToPlan`, wrapped by both an MCP tool (`promote_session_to_plan`) and a developer-app action. Atomically:

1. Create the plan (+ tasks) from the caller-supplied draft — in v1 the _agent_ drafts the plan from its own conversation (agents are good at this); a server-side LLM auto-draft (plan-creation service exists) is a follow-up.
2. INSERT subject rows onto the session (plan-level, plus task-level where the draft maps artifacts to tasks).
3. Set `agent_conversations.plan_id` when the session has a conversation.

The session row never mutates; artifacts inherit the subject through the session; promotion is pure INSERT + plan creation. The lighter variant — `attach_session_subject` to an _existing_ plan — covers "this chat was actually about plan X" without creating anything.

### 6.2 Metadata for good plans

Add one column to §3.1: `summary TEXT NULL` on `work_sessions`, set at `end_session` or promotion time. Everything else a good plan draft needs already exists on the session (tool fingerprint, artifact list, conversation messages via `conversation_id`). Keep the schema lean; the draft's narrative travels in the promotion input, not the ledger.

### 6.3 Tags/rules interplay

Promotion creates the plan through the standard `createPlan` path, so `tag-predict` enqueues automatically (shipped, #183). Seeding the prediction with session artifacts/summary as extra context is a follow-up, not v1.

### 6.4 Unpromoted sessions

Kept forever — the ledger is append-only and unplanned work is _the point_: today that work is invisible; under the ledger it appears in activity as attributed, unplanned work. A digest surface ("this week's unplanned sessions") becomes the natural promotion funnel — backlog, not v1.
