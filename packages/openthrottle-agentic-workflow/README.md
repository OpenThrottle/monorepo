# @openthrottle/openthrottle-agentic-workflow

**Transport-free shared contracts** for OpenThrottle agentic workflows. This package is the
**dependency sink**: it defines the orchestrator/config/result shapes and run-log event constants
that every downstream layer points at, and it points nowhere itself — **no plan/task ids, no Nest,
no GraphQL, no Postgres**. This is where the [target-architecture](../../tools/workflows/README.md#target-architecture-phase-2)
Jest-style hook contract (`WorkflowExecutionHooks`) lives.

## Where this fits (canonical map)

This is the contracts layer of the Ralph stack. To see **which path runs when** (Local CLI vs Plans
queue spawn vs Plans queue orchestrator), read the single canonical decision table:

- **Canonical decision table:** [tools/workflows/README.md → Which path runs when](../../tools/workflows/README.md#which-path-runs-when-canonical-decision-table)
- **Full map + package layering:** [docs/workflows/ralph-execution-paths-and-package-layering.md](../../docs/workflows/ralph-execution-paths-and-package-layering.md)
- **Target architecture (Phase 2):** [tools/workflows/README.md → Target architecture](../../tools/workflows/README.md#target-architecture-phase-2)

Dependency direction: `openthrottle-agentic-ralph` (GraphQL orchestrator) and
`nestjs-agentic-workflow` (Nest DI wiring) depend on **this** package; this package depends on no
other workspace package.

## Main exports

Re-exported from `src/index.ts`:

- **Contracts:** `WorkflowConfig`, `WorkflowOrchestrator`, `WorkflowRunResult`, `WorkflowFlowContext`, `WorkflowExecutionHooks`, `WorkflowRunCorrelation`, `WorkflowError`, `WorkflowStepSuccess`, `WorkflowStepFailure`.
- **Run-log event constants:** `AGENTIC_WORKFLOW_RUN_LOG_EVENT`, `AGENTIC_WORKFLOW_METRICS_EVENT` — structured log event names for joining workflow runs with queue metrics.

`WorkflowExecutionHooks` is the transport-free hook contract; downstream layers (GraphQL + Nest +
BullMQ child jobs) wire the actual `beforeAll` / `beforeEach` / `afterEach` / `afterAll` execution.
Keep new hook/phase fields here so the contract stays portable.

## Configuration

**`lifecycleHooksChildJobs`** (disable hook child jobs when `false`) is read from merged **`.workflow-ralph.json` + env** (`OPENTHROTTLE_LIFECYCLE_HOOKS_CHILD_JOBS`) via `@tools/workflows` — see `src/lifecycle.ts` and `docs/workflows/ralph-config-migration.md`.

## Installation

**In this monorepo:** add `"@openthrottle/openthrottle-agentic-workflow": "workspace:*"` to the
consuming package's `package.json`, then run `pnpm install` from the repository root.

**pnpm:**

```bash
pnpm add @openthrottle/openthrottle-agentic-workflow
```

This package is **private** to the workspace and is not published to the public registry.
