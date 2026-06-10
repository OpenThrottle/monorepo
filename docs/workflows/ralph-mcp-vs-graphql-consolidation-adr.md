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
  `@openthrottle/nodejs-graphql`; documents in `src/__generated__/graphql.ts`
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
   Postgres-direct (returns null when already IN_PROGRESS — a non-match) and GraphQL
   (idempotent success). Consolidating onto GraphQL/MCP _removes_ this divergence, which is a
   correctness win.
5. **Auth token names fragment by context:** worker (`OPENTHROTTLE_WORKER_GRAPHQL_AUTH_TOKEN`)
   → workflows (`OPENTHROTTLE_WORKFLOWS_AUTH_TOKEN`) → MCP (`OPENTHROTTLE_MCP_AUTH_TOKEN`).
   Any shared layer must preserve this resolution chain.

> Note: this plan's task descriptions reference some stale paths — `.cursor/commands/agents/ralph.md`
> no longer exists, and there is no `.workflow-ralph.json.example`. Live agentic guides are under
> `.agents/skills/agents-ralph/SKILL.md` (+ `.opencode/`, `.cursor/skills`, `.claude/skills`
> mirrors); config defaults schema is `tools/workflows/schemas/workflow-ralph.defaults.schema.json`.
> Task 3 addresses these.
