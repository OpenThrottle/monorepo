# @openthrottle/nestjs-agentic-workflow — agent notes

NestJS DI layer for agentic workflows: registers workflows (Ralph today, siblings later) into an
id-keyed registry and binds worker GraphQL auth + an `executeGraphqlV2` executor under injection
tokens. Part of the replacement for the **deprecated** `@tools/workflows` (see
[tools/AGENTS.md](../../tools/AGENTS.md)); pure DI — no Postgres, no HTTP session, no credentials.

**Consumed by:** `openthrottle-server` only (`src/queues/agentic-ralph/` and
`src/queues/plans/plans-queue.module.ts`).

## Layout

- `src/modules/nestjs-agentic-workflow.module.ts` — `register` / `registerAsync` /
  `registerWorkflow`; the JSDoc on `registerWorkflow` explains the registry/dispatcher design and
  why per-workflow providers stay module-private.
- `src/agentic-workflow-base.ts` — `AgenticWorkflowBase`, `AGENTIC_WORKFLOW_REGISTRY`, registry factory.
- `src/agentic-workflow-ralph-registration.ts` — `AGENTIC_WORKFLOW_RALPH_ID` (`'ralph'`, must match
  `WorkflowContext.kind` in `@openthrottle/openthrottle-agentic-ralph`) + the orchestrator-deps token.
- `src/testing/` — `compileAgenticWorkflowTestingModule` + `GlobalLoggerStubModule`; own
  [README](./src/testing/README.md) with processor-test recipes.

## Invariants & gotchas

- **`registerAsync` does not bind `AGENTIC_WORKFLOW_REGISTRY`** — only `register` and
  `registerWorkflow` do. An app needing async auth/executor **and** a registry must use
  `registerWorkflow`; each workflow entry's `useFactory` may be async and `inject` providers, so
  async wiring composes there.
- Dependency direction is layered: `openthrottle-agentic-workflow` (contracts only) ← this package
  (Nest tokens/modules) ← the app, which supplies real `workerGraphqlAuth` and `executeGraphqlV2`
  (from `@openthrottle/nodejs-graphql`). Workers have no HTTP session — never hard-code
  credentials in this library.
- Per-workflow providers (e.g. `AGENTIC_WORKFLOW_RALPH_ORCHESTRATOR_DEPS`) are intentionally not
  in the module `exports`; consumers inject the registry and resolve by id. Don't widen `exports`.
- `./testing` is a deliberate declared subpath export (not a deep-import violation). In tests,
  use `compileAgenticWorkflowTestingModule` — it prepends `GlobalLoggerStubModule`, without which
  nested imports expecting `LoggerService` fail to resolve.
- Built package (`build` via `@nx/js:tsc`; `exports` require-path → `dist/`) — see
  [../AGENTS.md](../AGENTS.md).

## Pointers

- [README.md](./README.md) — registration recipes, dependency-direction table, and the canonical
  "which path runs when" decision table link (`tools/workflows/README.md`).
