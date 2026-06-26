# ADR: Ralph workflow + agentic guides — MCP vs duplicated GraphQL

- **Status:** Draft (investigation) — OT plan `e5e9f88e-9ca5-4b3d-ab75-91d537f20205`
- **Author:** visormatt (via agentic-ralph loop)
- **Related:** plan `a1c55a0a-735c-4f60-965a-7f122acbdc8f` (GraphQL-only transport boundary),
  [graphql-only-transport-boundary.md](./graphql-only-transport-boundary.md),
  [ralph-design.md](./ralph-design.md),
  [ralph-execution-paths-and-package-layering.md](./ralph-execution-paths-and-package-layering.md)

## Problem

Ralph plan/task I/O (`getPlan`, `getTasksByPlanId`, `updateTask`, `updatePlan`,
`appendPlanOutput`, `linkCommit`, …) is implemented in **three** workflow code surfaces in
addition to the **MCP** server, each carrying its own GraphQL `TypedDocumentNode` call sites
(and, in the CLI lineage, a Postgres-direct fallback). The MCP server already wraps the same
GraphQL operations behind tool handlers. The question: can the workflow surfaces consolidate
onto the MCP layer (or a shared client) instead of maintaining parallel call sites — without
breaking BullMQ workers, nested spawn, or Cursor/agent sessions?

This ADR is the deliverable: an architecture decision with an effort estimate.

---

## Task 1 — Inventory of duplicated OT plan/task I/O

Four surfaces perform OpenThrottle plan/task I/O. All four ultimately speak **GraphQL** to
`openthrottle-server`; only the `@tools/workflows` CLI lineage retains a **Postgres-direct**
fallback (behind `WORKFLOW_RALPH_TRANSPORT=postgres-direct`).

### Surface A — `@tools/workflows` CLI (dual transport)

Façade `tools/workflows/src/utils/openthrottle-ralph.ts` selects a transport at runtime via
`resolveWorkflowRalphTransport()`; default **GraphQL**, opt-in **Postgres-direct** rollback.

- GraphQL layer: `tools/workflows/src/utils/openthrottle-ralph-graphql.ts` — uses
  `executeWorkflowGraphqlV2` + codegen documents re-exported from
  `@openthrottle/openthrottle-agentic-ralph`.
- Postgres layer: `tools/workflows/src/utils/openthrottle-ralph-postgres.ts` — raw `pg.Client`
  against `plans` / `tasks` / `plan_output_stream` / `commit_links`.
- Auth (GraphQL): `OPENTHROTTLE_WORKFLOWS_AUTH_TOKEN` → `OPENTHROTTLE_MCP_AUTH_TOKEN`.
  Postgres: `POSTGRES_URL` / `POSTGRES_*`.
- Serves: **local CLI spawn** and **nested spawn**. Startup uses a Postgres/health
  reachability check (`ensureDatabaseReachableOrExit`).

### Surface B — `@openthrottle/openthrottle-agentic-ralph` (GraphQL-only, canonical documents)

Owns the canonical Ralph GraphQL documents and the executor used by the orchestrator and
Cursor agent runner.

- Documents: `packages/openthrottle-agentic-ralph/src/graphql/ralph/{queries,mutations,fragments}.graphql`.
- Transport: `packages/openthrottle-agentic-ralph/src/utils/graphql.ts` —
  `executeWorkflowGraphqlV2()` wrapping `executeGraphqlV2` from `@openthrottle/nodejs-graphql`.
- Auth: `OPENTHROTTLE_WORKFLOWS_AUTH_TOKEN` → `OPENTHROTTLE_MCP_AUTH_TOKEN`; URL
  `OPENTHROTTLE_WORKFLOWS_GRAPHQL_URL` → `API_URL_INTERNAL` + `/graphql`.
- DI contract: `src/contract/ralph-orchestrator-deps.ts` (`WorkflowExecuteGraphqlV2`).
- Serves: **in-process BullMQ orchestrator** and **Cursor agent runner**.

### Surface C — `@openthrottle/openthrottle-workflows` (GraphQL-only, parity map)

- Parity map (authoritative cross-reference): `packages/openthrottle-workflows/src/workflows/ralph/openthrottle-ralph-parity.ts`.
- GraphQL wrapper `…/ralph/workflow-graphql.ts` (re-uses agentic-ralph documents).
- Context builders `…/ralph/ralph-plan-run-context.ts`.
- Serves: in-process Ralph in the BullMQ orchestrator + Developer UI preview.

### Surface D — `@openthrottle/openthrottle-mcp` (GraphQL-only, tool handlers)

23 plan/task tool handlers, each GraphQL-backed:

- Plans: `src/tools/plans.ts` — create/get/update/delete/list_by_status.
- Tasks: `src/tools/tasks.ts` — create/create_batch/get/get_by_plan/get_remaining/list_by_category/reorder/update/delete.
- Output: `src/tools/output.ts` — append/get.
- Commit: `src/tools/commit.ts` — link_commit.
- Transport: `executeGraphqlWithAuth(getAuthToken(), document, vars)` from
  `@openthrottle/nodejs-graphql`; documents in `src/__generated__/graphql.js`
  (codegen from `src/graphql/*.graphql`, schema = root `schema.gql`).
- Auth: `src/auth/get-auth-token.ts` — request-scoped `AsyncLocalStorage` token **or**
  `OPENTHROTTLE_MCP_AUTH_TOKEN` env.
- **Handlers are pure functions, exported as a library** via the `./nest-tool-handlers`
  subpath (`src/nest-tool-handlers.ts`) — **no coupling to MCP server runtime/transport**.
  Only requirement: an auth token resolvable at call time.

### Operation × surface matrix

| Operation                    | A: tools/workflows | B: agentic-ralph              | C: workflows | D: MCP                            |
| ---------------------------- | ------------------ | ----------------------------- | ------------ | --------------------------------- |
| getPlan                      | ✅ GQL + PG        | ✅ `GetPlanDocument`          | ✅           | ✅ `get_plan`                     |
| getTask                      | ✅ GQL + PG        | ✅ `GetTaskDocument`          | ✅           | ✅ `get_task`                     |
| getTasksByPlanId             | ✅ GQL + PG        | ✅ `GetTasksByPlanIdDocument` | ✅           | ✅ `get_tasks_by_plan_id`         |
| getRemainingTasks            | —                  | ✅ document                   | —            | ✅ `get_remaining_tasks_for_plan` |
| listPlansByStatus            | ✅ GQL + PG        | ✅ document                   | ✅           | ✅ `list_plans_by_status`         |
| listProjects / ensureProject | ✅ GQL + PG        | ✅ documents                  | ✅           | (project tools elsewhere)         |
| updatePlan(status/projectId) | ✅ GQL + PG        | ✅ `UpdatePlanDocument`       | ✅           | ✅ `update_plan`                  |
| updateTask(status)           | ✅ GQL + PG        | ✅ `UpdateTaskDocument`       | ✅           | ✅ `update_task`                  |
| appendPlanOutput             | ✅ GQL + PG        | ✅ `AppendPlanOutputDocument` | ✅           | ✅ `append_plan_output`           |
| getPlanOutput                | —                  | (document exists)             | —            | ✅ `get_plan_output`              |
| reorderPlanTasks             | —                  | —                             | —            | ✅ `reorder_plan_tasks`           |
| create_task(s)               | —                  | (documents exist)             | —            | ✅ `create_task`/`create_tasks`   |
| linkCommit                   | ✅ GQL + PG        | ✅ `LinkCommitDocument`       | ✅           | ✅ `link_commit`                  |
| serverHealth (preflight)     | ✅ GQL + PG TCP    | ✅ `GetServerHealthDocument`  | —            | —                                 |

### Key observations

1. **GraphQL is already the de-facto single transport.** Only Surface A keeps a Postgres-direct
   path, and only behind an opt-in env flag; `graphql-only-transport-boundary.md` already
   targets its removal (Phase 2). `serverHealth` is the one sanctioned read-before-write
   exception.
2. **Documents are duplicated, not the transport.** Surfaces B and C share documents
   (C re-exports B). Surface A re-uses B's documents for its GraphQL path. **MCP (D) maintains
   an independent codegen set** from its own `src/graphql/*.graphql`.
3. **MCP handlers are already library-shaped.** Pure functions, no transport/session coupling,
   exported via `./nest-tool-handlers`, auth via AsyncLocalStorage-or-env. This makes
   "import MCP handlers as a library" mechanically plausible.
4. **The real divergence to watch:** `updatePlanStatus → IN_PROGRESS` semantics differ between
   Postgres-direct (returns null when already IN*PROGRESS — a non-match) and GraphQL
   (idempotent success). Consolidating onto GraphQL/MCP \_removes* this divergence, which is a
   correctness win.
5. **Auth token names fragment by context:** worker (`OPENTHROTTLE_WORKER_GRAPHQL_AUTH_TOKEN`)
   → workflows (`OPENTHROTTLE_WORKFLOWS_AUTH_TOKEN`) → MCP (`OPENTHROTTLE_MCP_AUTH_TOKEN`).
   Any shared layer must preserve this resolution chain.

> Note: this plan's task descriptions reference some stale paths — `.cursor/commands/agents/ralph.md`
> no longer exists, and there is no `.workflow-ralph.json.example`. Live agentic guides are under
> `.agents/skills/agents-ralph/SKILL.md` (+ `.opencode/`, `.cursor/skills`, `.claude/skills`
> mirrors); config defaults schema is `tools/workflows/schemas/workflow-ralph.defaults.schema.json`.
> Task 3 addresses these.

---

## Task 2 — Consolidation options evaluated

Three execution surfaces consume the I/O layer:

- **#1 Local CLI** — `pnpm exec workflow-ralph …` / `link-merge`. Standalone Node process, not
  inside Nest. Auth: `OPENTHROTTLE_WORKFLOWS_AUTH_TOKEN` → `OPENTHROTTLE_MCP_AUTH_TOKEN`.
- **#2 Nested spawn** — a Ralph iteration spawns a child agent/process; same CLI lineage and
  env inheritance as #1.
- **#3 In-process orchestrator** — `AgenticRalphOrchestratorService` inside the
  `openthrottle-server` BullMQ worker (already a Nest process). Auth:
  `OPENTHROTTLE_WORKER_GRAPHQL_AUTH_TOKEN` → workflows → MCP, injected via Nest DI.

### Option A — Extract a shared OT client library (both MCP and workflows import it)

Pull the GraphQL documents + thin operation functions into one new leaf package
(e.g. `@openthrottle/openthrottle-ot-client`) depending only on `@openthrottle/nodejs-graphql`

- `zod` + a generated-document set. MCP tool handlers and all workflow surfaces import it.

* **Auth:** the library takes an injected `executeGraphqlV2`/token resolver, so each surface
  keeps its own resolution chain (worker vs workflows vs MCP). No change to env contract.
* **Latency:** zero added hops — same in-process GraphQL call as today.
* **Error handling:** one place to normalize the `IN_PROGRESS` idempotency divergence and
  error shapes; removes the Postgres branch entirely.
* **BullMQ constraints:** none — it's a leaf lib with no Nest/MCP-SDK deps, safe in workers,
  CLI, and nested spawn alike.
* **Cost driver:** today MCP (Surface D) and agentic-ralph (Surface B) maintain **two
  independent codegen document sets**. Option A unifies them. Risk: MCP and workflows currently
  select slightly different field sets per fragment; the merged documents must be a superset.
* **Effort: M.** Net-new package, move documents, repoint ~4 call sites, reconcile fragments,
  migrate codegen config. No protocol/runtime change.

### Option B — Ralph spawns/connects to `openthrottle-mcp` over the MCP protocol

Workflow surfaces become MCP _clients_, calling `get_plan`/`update_task`/… over stdio.

- **Auth:** must pass `OPENTHROTTLE_MCP_AUTH_TOKEN` into the spawned server's env — collapses
  the worker/workflows token distinction into one MCP token, which **loses** the per-context
  identity separation production relies on.
- **Latency:** adds a process + JSON-RPC round trip per call; for the orchestrator's tight
  status-update loop this is real overhead.
- **Error handling:** errors arrive as MCP tool-result envelopes (text/structured) rather than
  typed GraphQL errors — every caller must re-parse.
- **BullMQ constraints:** spawning/managing a stdio child from inside a worker (and from nested
  spawns) is a new failure surface — lifecycle, zombie processes, back-pressure. Headless/cron
  worker contexts also lack the interactive MCP auth some servers assume.
- **Effort: L**, and it **regresses** auth identity + latency. Only attractive for the _agent_
  (Cursor/Claude) which already speaks MCP — which it already does today.

### Option C — Keep GraphQL-only, dedupe documents via one codegen package

The minimal move: stop maintaining two document sets. Make MCP consume the same generated
documents as agentic-ralph (or vice-versa) from a single codegen source, leaving each surface's
transport/auth untouched.

- **Auth / latency / errors / BullMQ:** unchanged from today — strictly a build-time dedupe.
- **Effort: S.** Point MCP's codegen at the shared `.graphql` sources (or extract a
  `graphql-documents` package), delete the duplicate set, re-run codegen, commit.
- **Limitation:** dedupes _documents_ but not the _operation wrappers_ (each surface keeps its
  own thin functions). Doesn't address the Postgres branch in Surface A.

### Comparison

| Dimension                      | A: shared client | B: MCP protocol           | C: codegen dedupe |
| ------------------------------ | ---------------- | ------------------------- | ----------------- |
| Removes duplicate documents    | ✅               | n/a (agent already MCP)   | ✅                |
| Removes duplicate op wrappers  | ✅               | partial                   | ❌                |
| Removes Postgres-direct branch | ✅ (natural)     | ✅                        | ❌                |
| Preserves per-context auth     | ✅ (injected)    | ❌ collapses to MCP token | ✅                |
| Added latency                  | none             | per-call RPC + process    | none              |
| BullMQ-safe                    | ✅               | ⚠️ new lifecycle risk     | ✅                |
| Effort                         | M                | L                         | S                 |

**Read:** Option B is the wrong tool for the _workflow_ surfaces (it regresses auth + latency
and adds process-lifecycle risk in workers) — and redundant for the _agent_, which already uses
MCP. Option C is a cheap, safe partial win. Option A is the durable target and subsumes C's
benefit. Recommended sequencing carried into Task 4.

---

## Task 3 — Audit of agentic guides and default prompt files

Files reviewed: `.agents/skills/agents-ralph/SKILL.md` (+ `.opencode/`, `.cursor/skills`,
`.claude/skills` mirrors), `docs/workflows/ralph-design.md`,
`tools/workflows/schemas/workflow-ralph.defaults.schema.json` (the live replacement for the
non-existent `.workflow-ralph.json.example`). `.cursor/commands/agents/ralph.md` no longer
exists; guidance now lives entirely in the `agents-ralph` SKILL.

### Findings

1. **Stale "from Postgres" framing.** `SKILL.md` rule (line 24) says _"Ralph injects the plan and
   task list into the prompt from Postgres … (injected by Ralph from Postgres)"_, and
   `ralph-design.md` says the CLI marks tasks `COMPLETED` _"via Postgres"_ (line 53) and
   reconciles _"via Postgres"_ (line 72). **But the default transport is now GraphQL** — the
   config schema's `transport` enum defaults to `graphql`, with `postgres-direct` an opt-in
   rollback. Postgres is the underlying _database_, not the read/write _transport_ the CLI uses.
   The wording is misleading on every surface.

2. **Read-vs-write MCP asymmetry is real but reads as accidental.** Guides tell the agent to
   **not** call `get_plan`/`get_tasks_by_plan_id` (use the injected context — agent-session MCP
   reads are often unavailable) but **to** call `update_task`/`update_plan`/`append_plan_output`
   via MCP. This split is deliberate (injection is reliable; mutations need a live call) yet is
   never stated as a design rule with its rationale, so it looks like a contradiction.

3. **Two write paths, undocumented.** The agent writes status via **MCP**, while the CLI
   _also_ reconciles status itself — parsing `<ralph:task-complete>TASK_UUID</ralph:task-complete>`
   (plus the `<promise>COMPLETE</promise>` IN_PROGRESS fallback) and writing through its own
   transport (GraphQL by default). Docs describe the CLI path as "via Postgres" (stale) and
   don't explain that both paths hit the same server — so the dual-write model is opaque.

4. **Startup preflight contradicts the boundary doc.** `ralph-design.md` (line 72) documents a
   **direct Postgres TCP** reachability check (`ensureDatabaseReachableOrExit`), explicitly _not_
   the GraphQL `getServerHealth` query — while `graphql-only-transport-boundary.md` names
   `serverHealth` as the _one_ sanctioned exception and flags Postgres-direct paths for removal.
   The two docs disagree on the intended preflight.

5. **Mirror duplication / drift risk.** `.cursor/skills` and `.claude/skills` copies are
   byte-identical to `.agents`; `.opencode` has drifted (~17 lines). The startup echo string
   hard-codes `./.cursor/skills/agents-ralph` even in non-Cursor mirrors. Any wording fix must
   land in all four copies, and there is no sync check guarding drift.

### Proposed unified guidance (for the follow-up implementation plan)

Whether or not the CLI keeps GraphQL or adopts a shared client (Option A/C), the guides should:

- Replace "injected by Ralph from Postgres" → **"injected by Ralph from OpenThrottle"** (drop the
  transport claim; the agent doesn't need to know it). Same fix in `ralph-design.md` lines 53/72:
  "marks … `COMPLETED` in OpenThrottle" rather than "via Postgres".
- Add an explicit **"reads come from the injected block; writes go through MCP"** rule with the
  one-line rationale (injection is reliable in-session; mutations require a live call), so the
  asymmetry is documented intent, not contradiction.
- Document the **dual-write reconciliation**: agent emits the `<ralph:task-complete>` tag _and_
  best-effort MCP `update_task`; the CLI reconciles via its configured transport. State that both
  reach the same OpenThrottle server.
- Reconcile the **preflight**: align `ralph-design.md` with `graphql-only-transport-boundary.md`
  (move to `getServerHealth`, or document the Postgres TCP check as a transitional exception with
  a removal pointer).
- **Single-source the SKILL** and generate mirrors (or add a CI drift check) so `.agents` /
  `.opencode` / `.cursor` / `.claude` cannot diverge; fix the hard-coded `.cursor` echo path.

> These are documentation edits scoped to a **follow-up implementation plan**, not this
> investigation. They are listed as Task 4 next-actions.

---

## Task 4 — Decision, blockers, and phased path

### Decision

**Do not adopt the MCP protocol for the workflow surfaces (Option B).** It regresses
per-context auth identity (collapses worker/workflows/MCP tokens into one), adds per-call
JSON-RPC + process latency in the orchestrator's hot loop, and introduces child-process
lifecycle risk inside BullMQ workers and headless cron — for zero benefit, since the _agent_
(Cursor/Claude) already speaks MCP and the _workflow_ code already speaks GraphQL in-process.

**Adopt the shared GraphQL client library (Option A) as the target, reached via the cheap
codegen dedupe (Option C) first.** This keeps the GraphQL-only transport boundary intact,
removes the duplicated documents and operation wrappers, and naturally eliminates the
Postgres-direct branch and its `IN_PROGRESS` semantic divergence.

### Effort & risk

| Phase | Scope                                                                                                      | Effort | Breaking-change risk                                                             |
| ----- | ---------------------------------------------------------------------------------------------------------- | ------ | -------------------------------------------------------------------------------- |
| 0     | Doc/guide reconciliation (Task 3 fixes)                                                                    | S      | None — wording only                                                              |
| 1     | Codegen dedupe: single document source for B/C/D (Option C)                                                | S–M    | Low — documents must be a superset; codegen output diffed in CI                  |
| 2     | Extract `@openthrottle/ot-client` leaf lib (Nest-free); repoint B, C, MCP, and CLI GraphQL path (Option A) | M      | Low–Med — call-site churn; injected `executeGraphqlV2` preserves auth            |
| 3     | Delete Surface A Postgres-direct path + Postgres TCP preflight; finish GraphQL-only boundary               | M      | Med — removes the `postgres-direct` rollback; needs the boundary plan's sign-off |

### Alignment with plan `a1c55a0a-…` (GraphQL-only transport boundary)

Fully aligned and additive. That plan already targets removing Surface A's Postgres path; this
ADR's Phases 1–2 remove the _reason_ the duplication exists (separate document sets + wrappers),
and Phase 3 is the boundary plan's existing Phase 2. The `serverHealth` exception is preserved.

### Blockers / open questions

1. **Fragment superset reconciliation.** MCP and agentic-ralph fragments select slightly
   different field sets; merging documents (Phase 1) requires auditing every fragment so no
   consumer loses a field. Mechanical but must be exhaustive — gate with codegen diff in CI.
2. **MCP's own codegen pipeline.** MCP also generates Zod validation schemas
   (`typescript-validation-schema`) alongside TypedDocumentNodes; a shared document package must
   keep feeding MCP's Zod generation, or MCP keeps its codegen config pointed at the shared
   `.graphql` sources.
3. **Auth injection contract.** The shared lib must accept an injected executor/token resolver
   (not read env itself) so worker (`OPENTHROTTLE_WORKER_GRAPHQL_AUTH_TOKEN`), workflows
   (`OPENTHROTTLE_WORKFLOWS_AUTH_TOKEN`), and MCP (`OPENTHROTTLE_MCP_AUTH_TOKEN`) resolution all
   stay where they are.
4. **`postgres-direct` deprecation policy.** Phase 3 removes the documented rollback escape
   hatch; needs explicit sign-off (and a deprecation window) on the boundary plan.

### Test-coverage gaps to close before Phase 2/3

- No cross-transport parity test asserting GraphQL and (legacy) Postgres `updatePlanStatus`
  produce equivalent observable state for the `IN_PROGRESS` idempotency case.
- No CI guard that the four agentic-guide mirrors stay in sync.
- Codegen-drift checks exist per-package (`verify-graphql-codegen`); a shared document package
  needs its own drift gate wired into `check:local`.

### Recommended next actions

1. Land the Task 3 doc/guide reconciliation (Phase 0) — cheap, immediately reduces confusion.
2. Open a follow-up implementation plan for Phases 1–3 (codegen dedupe → shared `ot-client`
   leaf → Postgres-direct removal), explicitly linked to plan `a1c55a0a-…`.
3. Add the missing CI guards (mirror-sync check, shared-document drift gate) as part of Phase 1.
