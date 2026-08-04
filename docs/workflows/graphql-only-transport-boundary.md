# GraphQL-only transport boundary (and the single health-check exception)

> **Status:** Target-architecture contract for Phase 2 of plan
> `a1c55a0a-735c-4f60-965a-7f122acbdc8f`, task `f4bf218a-eaec-4073-8c4d-c3d4ccec09a7`.
> Specifies that **every** workflow request goes through GraphQL
> (`executeGraphqlV2` / `executeWorkflowGraphqlV2`) with **exactly one documented exception**: a
> health check used as a read-before-write preflight. Builds on the canonical decision table in
> [`tools/workflows/README.md`](../../tools/workflows/README.md).

## The rule (one sentence)

All OpenThrottle plan/task I/O performed by Ralph and the workflow layer **must** be a GraphQL
operation issued through `executeGraphqlV2` (low-level, `@openthrottle/nodejs-graphql`) or its
workflow wrapper `executeWorkflowGraphqlV2` (`@openthrottle/openthrottle-agentic-ralph`), using a
**codegen `TypedDocumentNode`** — never ad-hoc HTTP and never a direct `pg.Client`. The **only**
exception is the `serverHealth` read-before-write preflight described below.

This is already true for **Surface #3 (orchestrator)** today; this doc makes it the contract that
**Surfaces #1 (Local CLI)** and **#2 (spawn)** must converge to as `@tools/workflows` is folded under
the Nest/GraphQL abstraction.

## Why GraphQL-only

- **One transport, one auth model.** GraphQL requests carry a bearer token
  (`OPENTHROTTLE_WORKFLOWS_AUTH_TOKEN` → `OPENTHROTTLE_MCP_AUTH_TOKEN`, or worker-injected
  `AGENTIC_WORKFLOW_WORKER_GRAPHQL_AUTH`). No second credential path (Postgres URL/`POSTGRES_*`) to
  secure, rotate, or leak into spawned child env.
- **Multi-project / cross-org.** A single OpenThrottle install must run workflows across many repos
  (work + personal). GraphQL is the network boundary that lets the server enforce identity and
  project scoping; direct Postgres access bypasses that boundary (see plan task `2bdf0145`).
- **Schema-checked, versioned contract.** Codegen documents are validated against the server schema;
  the `.entity` deprecate-don't-break policy keeps them backward compatible. `pg` queries embed SQL
  and column names with no such guarantee.
- **Observability + DI.** GraphQL calls flow through the same executor that can be wrapped for
  logging, retries, and per-hook BullMQ child jobs (task `c8896177`). `pg.Client` calls are opaque.

## The contract surface

| Layer                                      | Symbol                                                                        | Role                                                                                                  |
| ------------------------------------------ | ----------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `@openthrottle/nodejs-graphql`             | `executeGraphqlV2(document, variables, options)`                              | Low-level typed HTTP client. The **only** place an HTTP POST to `/graphql` is allowed.                |
| `@openthrottle/openthrottle-agentic-ralph` | `executeWorkflowGraphqlV2(document, variables)`                               | Workflow wrapper: resolves auth/URL from env (`buildWorkflowExecuteGraphqlV2Options`) then delegates. |
| `@openthrottle/openthrottle-agentic-ralph` | `WorkflowExecuteGraphqlV2` (contract type in `ralph-orchestrator-deps.ts`)    | Injectable executor the orchestrator calls. "Must not perform ad-hoc HTTP; only codegen documents."   |
| `@openthrottle/nestjs-agentic-workflow`    | `AGENTIC_WORKFLOW_EXECUTE_GRAPHQL_V2`, `AGENTIC_WORKFLOW_WORKER_GRAPHQL_AUTH` | Nest DI tokens that provide the executor + worker auth to the orchestrator deps factory.              |

Boundary rule for code: orchestrator/hook/workflow code receives `executeGraphqlV2` as a dependency
and may call it **only** with generated `TypedDocumentNode`s. No package in the GraphQL-first lineage
imports `pg`.

## GraphQL operations Ralph / workflows need

All operations below already exist as codegen documents in
`packages/openthrottle-agentic-ralph/src/graphql/ralph/{queries,mutations,fragments}.graphql` and are
generated into `src/__generated__/graphql.js` as `*Document`. **No new documents are required for the
core Ralph loop**; the gaps are the Postgres-direct paths that must be _re-pointed_ at these existing
documents (next section).

| Concern (Ralph step)                          | GraphQL operation                                          | Generated document                          | Used by orchestrator today                  | Codegen status      |
| --------------------------------------------- | ---------------------------------------------------------- | ------------------------------------------- | ------------------------------------------- | ------------------- |
| Health preflight (the exception)              | `query serverHealth`                                       | `GetServerHealthDocument`                   | yes (`orchestrator.ts` bootstrap)           | **exists**          |
| Resolve plan id from a task (task-centric)    | `query task`                                               | `GetTaskDocument`                           | yes (target.resolve)                        | **exists**          |
| Load plan                                     | `query plan`                                               | `GetPlanDocument`                           | yes (state.load)                            | **exists**          |
| Load tasks for plan                           | `query tasksByPlanId`                                      | `GetTasksByPlanIdDocument`                  | yes (state.load, per-iteration task select) | **exists**          |
| Remaining-tasks filter (optional helper)      | `query remainingTasksByPlanId`                             | `GetRemainingTasksByPlanIdDocument`         | no (orchestrator filters client-side)       | **exists**          |
| Promote plan → IN_PROGRESS / COMPLETED        | `mutation updatePlan`                                      | `UpdatePlanDocument`                        | yes                                         | **exists**          |
| Task status IN_PROGRESS / COMPLETED / PENDING | `mutation updateTask`                                      | `UpdateTaskDocument`                        | yes                                         | **exists**          |
| Plan output streaming                         | `mutation appendPlanOutput`                                | `AppendPlanOutputDocument`                  | available (server streams via this)         | **exists**          |
| Commit link (post-merge)                      | `mutation linkCommit`                                      | `LinkCommitDocument`                        | n/a to loop (post-merge tooling)            | **exists**          |
| Plan summary / task summary updates           | `mutation updatePlan` / `updateTask`                       | `UpdatePlanDocument` / `UpdateTaskDocument` | n/a to loop                                 | **exists**          |
| Enqueue plan run (trigger)                    | `mutation enqueuePlanRun` / `enqueuePlanRalphOrchestrator` | server-side schema                          | server resolvers                            | **exists** (server) |

> **Finding:** the codegen documents are complete for the GraphQL-only loop. Phase 2 work is _not_
> "add documents" — it is "delete the `pg` lineage and call the documents that already exist."

## The single health-check exception

`serverHealth` is the **one** operation allowed to act as a **read-before-write preflight** — i.e. a
read issued before the first real mutation purely to surface connectivity problems early. It is still
a GraphQL query (it does **not** bypass the GraphQL transport); the "exception" is to the otherwise
strict "don't read just to check liveness, just do the write" posture.

- **What it is.** `query serverHealth { serverHealth { api database redis websocket } }` →
  `GetServerHealthDocument`. Resolver: `applications/openthrottle-server/src/graphql/health/health.resolver.ts`,
  annotated `@Public()`, so **no bearer token** is required.
- **How it runs.** The orchestrator calls `await executeWorkflowGraphqlV2(GetServerHealthDocument, {})` once
  at bootstrap, before any plan/task fetch or mutation (`orchestrator.ts`, `// healthcheck`).
- **Why it is allowed to "bypass."** It is a **read-only, `@Public()`, idempotent preflight**. It
  performs no writes, leaks no plan/task data, needs no auth, and exists only to fail fast with a
  clear signal (`database: unreachable` while the HTTP stack is otherwise fine) before the run does
  real work. Everything else must be a normal authenticated GraphQL operation.
- **What it is NOT.** It is not a Postgres TCP check and not a substitute for handling thrown
  transport errors. A failed POST (wrong URL, TLS, proxy) never returns health fields; those remain
  ordinary `executeGraphqlV2` errors. `serverHealth.database` reflects the **server's** OpenThrottle
  connectivity, which can differ from a client's.

There is **no other** sanctioned bypass. Any future "is the service up?" need must reuse
`serverHealth`, not introduce a second non-GraphQL probe.

## Postgres-direct access paths to migrate (or flag) to GraphQL

These are the remaining non-GraphQL paths. Each is a Phase 2 migration item with a 1:1 GraphQL
replacement that already exists. Until migrated, they are **flagged**: they violate the GraphQL-only
rule and live only in the `@tools/workflows` (Surfaces #1/#2) lineage.

### `tools/workflows/src/utils/openthrottle-ralph.ts` (`pg.Client`)

| Postgres-direct function                                          | Replace with GraphQL document                                          | Notes                                                             |
| ----------------------------------------------------------------- | ---------------------------------------------------------------------- | ----------------------------------------------------------------- |
| `ensureDatabaseReachableOrExit` / `ensureOpenThrottleReachable`   | `GetServerHealthDocument` (the exception)                              | TCP `SELECT 1` → `serverHealth` preflight. Delete `pg` connect.   |
| `getPlanById`                                                     | `GetPlanDocument`                                                      | Same `Plan` fragment fields.                                      |
| `getTaskById`                                                     | `GetTaskDocument`                                                      |                                                                   |
| `getTasksByPlanId`                                                | `GetTasksByPlanIdDocument`                                             |                                                                   |
| `listPlansByStatus`                                               | `ListPlansByStatusDocument`                                            | Document exists in queries.                                       |
| `promotePlanToInProgressIfNeeded`                                 | `UpdatePlanDocument` (`status: IN_PROGRESS`)                           | Orchestrator already implements this via GraphQL.                 |
| `updatePlanStatus`                                                | `UpdatePlanDocument`                                                   |                                                                   |
| `updateTaskStatus`                                                | `UpdateTaskDocument`                                                   |                                                                   |
| `appendPlanOutput`                                                | `AppendPlanOutputDocument`                                             |                                                                   |
| `insertCommitLink`                                                | `LinkCommitDocument`                                                   | Already GraphQL via `workflow-link-merge`; CLI insert is the dup. |
| `listProjects` / `ensureProjectForNxName` / `updatePlanProjectId` | `GetProjectsDocument` / `CreateProjectDocument` / `UpdatePlanDocument` | Project autocompletion (multi-project, task `2bdf0145`).          |

### `tools/workflows/src/utils/child-job.ts`

| Postgres-direct path                                              | Replace with                                                           | Notes                                                              |
| ----------------------------------------------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `getPostgresConfig()` plan lookup + `ensureOpenThrottleReachable` | `GetPlanDocument` + `GetServerHealthDocument`                          | Pre-spawn validation should be a GraphQL read, not a `pg` connect. |
| `buildWorkflowRalphSpawnEnv` injecting `POSTGRES_*` into child    | inject `OPENTHROTTLE_WORKFLOWS_*` (GraphQL URL + token) into child env | Eliminates the second credential path entirely.                    |

### `tools/workflows/src/bin/ralph.ts`

| Postgres-direct path                                                        | Replace with                                                     | Notes                                                               |
| --------------------------------------------------------------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------- |
| `getOpenThrottleConfigOrExit()` + `ensureDatabaseReachableOrExit()` startup | `executeWorkflowGraphqlV2(GetServerHealthDocument, …)` preflight | Same parity the orchestrator already has; removes startup `pg` use. |

> **Net of the migration:** delete the `pg` dependency from the workflow lineage. After it, the
> `serverHealth` preflight is the _only_ read-before-write call, and it is itself a GraphQL query —
> satisfying "GraphQL-only except one health check."

## Acceptance checks for "GraphQL-only" (per migration stage)

- No package in `packages/openthrottle-*workflow*` / `packages/openthrottle-agentic-*` imports `pg`.
- `@tools/workflows` no longer imports `getPostgresConfig` / constructs `pg.Client` (or is removed).
- Every plan/task read/write traces to a generated `*Document` called via `executeGraphqlV2` /
  `executeWorkflowGraphqlV2`.
- The only liveness probe in the codebase's workflow paths is `GetServerHealthDocument`.
- Child-spawn env carries GraphQL auth (`OPENTHROTTLE_WORKFLOWS_*`), not `POSTGRES_*`.

## Cross-links

- Canonical decision table + Target architecture:
  [`tools/workflows/README.md`](../../tools/workflows/README.md#target-architecture-phase-2) and
  [`getServerHealth` vs workflow GraphQL transport errors](../../tools/workflows/README.md#getserverhealth-vs-workflow-graphql-transport-errors-ralph-startup).
- Health resolver: `applications/openthrottle-server/src/graphql/health/health.resolver.ts`
  (`@Public()`), object: `server-health.object.ts`.
- Codegen documents: `packages/openthrottle-agentic-ralph/src/graphql/ralph/*.graphql` →
  `src/__generated__/graphql.js`.
- Parent plan: `a1c55a0a-735c-4f60-965a-7f122acbdc8f`; this task: `f4bf218a-eaec-4073-8c4d-c3d4ccec09a7`.
- Migration spin-out: task `978a661f` (creates the `@tools/workflows` → `nestjs-agentic-workflow`
  cutover plan); multi-project design: task `2bdf0145`.
