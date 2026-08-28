# GraphQL-only transport boundary (and the single health-check exception)

> **Every** workflow request goes through GraphQL (`executeGraphqlV2` / `executeWorkflowGraphqlV2`)
> with **exactly one documented exception**: a health check used as a read-before-write preflight.
> Builds on the canonical decision table in
> [`tools/workflows/README.md`](../../tools/workflows/README.md#which-path-runs-when-canonical-decision-table).

## The rule (one sentence)

All OpenThrottle plan/task I/O performed by Ralph and the workflow layer **must** be a GraphQL
operation issued through `executeGraphqlV2` (low-level, `@openthrottle/nodejs-graphql`) or its
workflow wrapper `executeWorkflowGraphqlV2` (`@openthrottle/openthrottle-agentic-ralph`), using a
**codegen `TypedDocumentNode`** — never ad-hoc HTTP and never a direct `pg.Client`. The **only**
exception is the `serverHealth` read-before-write preflight described below.

This holds on all three surfaces — the orchestrator (#3), the local CLI (#1) and spawn (#2). The
CLI/spawn lineage reaches it through a transport selector rather than by having its Postgres code
deleted; see [Transport selection](#transport-selection-and-the-postgres-direct-rollback).

## Why GraphQL-only

- **One transport, one auth model.** GraphQL requests carry a bearer token
  (`OPENTHROTTLE_WORKFLOWS_AUTH_TOKEN` → `OPENTHROTTLE_MCP_AUTH_TOKEN`, or worker-injected
  `AGENTIC_WORKFLOW_WORKER_GRAPHQL_AUTH`). No second credential path (Postgres URL/`POSTGRES_*`) to
  secure, rotate, or leak into spawned child env.
- **Multi-project / cross-org.** A single OpenThrottle install must run workflows across many repos
  (work + personal). GraphQL is the network boundary that lets the server enforce identity and
  project scoping; direct Postgres access bypasses that boundary.
- **Schema-checked, versioned contract.** Codegen documents are validated against the server schema;
  the `.entity` deprecate-don't-break policy keeps them backward compatible. `pg` queries embed SQL
  and column names with no such guarantee.
- **Observability + DI.** GraphQL calls flow through the same executor that can be wrapped for
  logging, retries, and per-hook BullMQ child jobs. `pg.Client` calls are opaque.

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
core Ralph loop.**

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

> The codegen documents cover the whole GraphQL-only loop. A new plan/task concern needs a new
> document here, not a new transport.

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

## Transport selection and the `postgres-direct` rollback

The CLI/spawn lineage keeps a **Postgres-direct implementation behind a switch** rather than having
deleted it. Both implementations exist side by side and the caller picks one:

| file                                              | role                                                                            |
| ------------------------------------------------- | ------------------------------------------------------------------------------- |
| `tools/workflows/src/utils/workflow-transport.ts` | `resolveWorkflowRalphTransportFromEnv` — reads `WORKFLOW_RALPH_TRANSPORT`       |
| `tools/workflows/src/utils/openthrottle-ralph.ts` | the public client; dispatches each call to one of the two implementations below |
| `.../openthrottle-ralph-graphql.ts`               | `*Graphql` functions over codegen documents — **the default**                   |
| `.../openthrottle-ralph-postgres.ts`              | `*Postgres` functions over `pg.Client` — **rollback only**                      |

- **Default is `graphql`.** Anything other than `postgres-direct` / `postgres` resolves to `graphql`,
  so the GraphQL path is what runs unless someone deliberately opts out.
- **`WORKFLOW_RALPH_TRANSPORT=postgres-direct` is an operational escape hatch**, not a supported mode.
  It exists so a broken GraphQL deploy cannot block a run. Anything relying on it — multi-project
  scoping, server-side auth, schema-checked documents — is bypassed while it is set, so treat a run
  under it as unscoped and unaudited, and unset it as soon as the server is healthy.
- **New code must not add a Postgres path.** Add the codegen document and call it through
  `executeWorkflowGraphqlV2`. The paired `*Postgres` implementation is legacy surface area kept alive
  only for the rollback switch; growing it re-opens the second credential path this rule exists to
  close.

`pg` therefore still appears in `tools/workflows/package.json`, and in `src/doc-ingestion/*` — the
docs-ingestion pipeline is not plan/task I/O and is out of this rule's scope.

## Checks that keep the rule true

- No package in `packages/openthrottle-*workflow*` / `packages/openthrottle-agentic-*` imports `pg`.
  (`@tools/workflows` is the one exception, and only in the two files named above plus doc-ingestion.)
- Every plan/task read/write traces to a generated `*Document` called via `executeGraphqlV2` /
  `executeWorkflowGraphqlV2` — or, under the rollback flag only, to its paired `*Postgres` twin.
- The only liveness probe in the workflow paths is `GetServerHealthDocument`.
- Child-spawn env carries GraphQL auth (`OPENTHROTTLE_WORKFLOWS_*`); `POSTGRES_*` reaches a child only
  when the rollback flag is deliberately set.

## Cross-links

- Canonical decision table + Target architecture:
  [`tools/workflows/README.md`](../../tools/workflows/README.md#target-architecture-phase-2) and
  [`getServerHealth` vs workflow GraphQL transport errors](../../tools/workflows/README.md#getserverhealth-vs-workflow-graphql-transport-errors-ralph-startup).
- Health resolver: `applications/openthrottle-server/src/graphql/health/health.resolver.ts`
  (`@Public()`), object: `server-health.object.ts`.
- Codegen documents: `packages/openthrottle-agentic-ralph/src/graphql/ralph/*.graphql` →
  `src/__generated__/graphql.js`.
- Rollback flag: [`tools/workflows/AGENTS.md`](../../tools/workflows/AGENTS.md) § environment.
