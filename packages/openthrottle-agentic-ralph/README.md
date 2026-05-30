# @openthrottle/openthrottle-agentic-ralph

**GraphQL-backed Ralph orchestrator.** This is the **active** orchestrator the server uses for the
**Plans queue — orchestrator** surface (in-process in the `openthrottle-server` worker, no nested
`workflow-ralph` child). It runs the same logical loop as the Local CLI (`tools/workflows/src/bin/ralph.ts`
`main()`) — task selection, `<ralph:task-complete>` / `<promise>COMPLETE</promise>` parsing, PENDING
reset on max iterations — but uses **GraphQL** (`executeGraphqlV2` typed documents) for all plan/task
transport instead of direct Postgres, and an **injected** iteration runner for layer-2 execution.

## Where this fits (canonical map)

This is the GraphQL-first orchestrator layer of the Ralph stack and the basis for the
[target architecture](../../tools/workflows/README.md#target-architecture-phase-2). To see **which
path runs when** (Local CLI vs Plans queue spawn vs Plans queue orchestrator):

- **Canonical decision table:** [tools/workflows/README.md → Which path runs when](../../tools/workflows/README.md#which-path-runs-when-canonical-decision-table)
- **Full map + package layering:** [docs/workflows/ralph-execution-paths-and-package-layering.md](../../docs/workflows/ralph-execution-paths-and-package-layering.md)
- **Target architecture (Phase 2):** [tools/workflows/README.md → Target architecture](../../tools/workflows/README.md#target-architecture-phase-2)

This surface is reached via the GraphQL mutation **`enqueuePlanRalphOrchestrator`** (BullMQ job
`Agentic Ralph`). The canonical spawn mutation is **`enqueuePlanRun`** (alias `workflowPlanRun`,
deprecated); see the resolver in `applications/openthrottle-server/src/graphql/plans/plans.resolver.ts`.

## Main exports

- **`createWorkflowRalphOrchestrator(deps)`** — implements `WorkflowOrchestrator`. Requires
  `WorkflowRalphOrchestratorDeps`: a bound **`executeGraphqlV2`** (typed documents only) and an
  injected **`iterationRunner`** (e.g. `createCursorWorkflowRalphIterationRunner` from
  `@tools/workflows`). The orchestrator never spawns the CLI, opens a Postgres connection, or runs
  the worktree workflow.
- **Contract + config + utils:** Ralph context builders, codegen GraphQL documents, agent-output
  parsing, and the `WorkflowRalphOrchestratorDeps` contract (`src/contract`, `src/config`, `src/utils`).

The **single health-check exception**: the orchestrator's first GraphQL call is a `getServerHealth`
read-before-write preflight; everything else is plan/task fetch, status updates, and plan-output
streaming over GraphQL.

## Dependency direction

Depends on **`@openthrottle/openthrottle-agentic-workflow`** (transport-free contracts) and
**`@openthrottle/nodejs-graphql`** (`executeGraphqlV2`). Nest DI wiring + tokens live in
**`@openthrottle/nestjs-agentic-workflow`** (`AGENTIC_WORKFLOW_RALPH_ORCHESTRATOR_DEPS`).

## Installation

**In this monorepo:** add `"@openthrottle/openthrottle-agentic-ralph": "workspace:*"` to the
consuming package's `package.json`, then run `pnpm install` from the repository root.

**pnpm:**

```bash
pnpm add @openthrottle/openthrottle-agentic-ralph
```

This package is **private** to the workspace and is not published to the public registry.
