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

## 3. Ledger schema (TBD — task `26be5118`)

## 4. Capture points (TBD — task `ee54a136`)

## 5. Adapter/verifier contract (TBD — task `6b3958cc`)

## 6. Chat → plan promotion (TBD — task `6af9fb8d`)
