# @openthrottle/openthrottle-agentic-workflow — agent notes

Transport-free shared contracts for agentic workflows — the **dependency sink** of the Ralph stack.
Defines orchestrator/config/result shapes (`WorkflowConfig`, `WorkflowOrchestrator`,
`WorkflowRunResult`, `WorkflowExecutionHooks`) and the `WORKFLOW_EVENT` run-log constants.

**Consumed by:** `openthrottle-server`, `@openthrottle/openthrottle-workflows`,
`@openthrottle/openthrottle-agentic-ralph`, `@openthrottle/nestjs-agentic-workflow`.

## Layout

- `src/types/` — the contracts (`config.ts`, `lifecycle.ts`, `metrics.ts`, barrel `index.ts`).
- `src/utils/` — small pure helpers (e.g. `isLifecycleHooksChildJobsEnabled`, metrics formatting).
- `src/config/` — config constants.

## Invariants & gotchas

- Built package (real `build`/`build-package` targets, `exports` → `dist/`) — see
  [../AGENTS.md](../AGENTS.md).
- `dependencies`, `devDependencies`, and `peerDependencies` are all **empty by design**. This
  package points nowhere: no Nest, no GraphQL, no Postgres, no plan/task ids, no other workspace
  package. Adding any dependency here inverts the layering — put transport-specific code in
  `openthrottle-agentic-ralph` (GraphQL) or `nestjs-agentic-workflow` (Nest DI) instead.
- New hook/phase fields belong on `WorkflowExecutionHooks` **here**, so the Jest-style hook
  contract stays portable across the GraphQL/Nest/BullMQ layers that wire actual execution.

## Pointers

- [README.md](./README.md) — export list, dependency direction, `lifecycleHooksChildJobs` config.
- [tools/workflows/README.md](../../tools/workflows/README.md) — canonical "which path runs when"
  decision table for the Ralph stack.
