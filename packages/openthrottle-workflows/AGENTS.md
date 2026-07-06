# @openthrottle/openthrottle-workflows — agent notes

GraphQL-first workflow building blocks for OpenThrottle: a typed GraphQL client
(`executeWorkflowGraphqlV2` wrapping `@openthrottle/nodejs-graphql`), env/token/URL helpers, Ralph
flow-context tuning, discriminated `WorkflowStepResult` types, and Ralph contract types +
blueprints. **Contract and documents only — no CLI and no runnable orchestrator here.**

**Consumed by:** `openthrottle-server` only.

## Where workflow code actually goes

This package is the older sibling in the Ralph stack and a Phase-2 consolidation candidate. Do
**not** start new work here:

- The **runnable orchestrator** (`createWorkflowRalphOrchestrator`) lives in
  `@openthrottle/openthrottle-agentic-ralph` (`src/utils/orchestrator.ts`); it consumes the
  `WorkflowOrchestrator` / `WorkflowRalphIterationRunner` contract types this package defines.
- The **shipped CLI** (`workflow-ralph`) lives in `tools/workflows` — which is itself deprecated
  in favor of the `@openthrottle/*-agentic-*` / `nestjs-worktrees` stack (see
  [../../tools/AGENTS.md](../../tools/AGENTS.md)).
- The single canonical "which path runs when" decision table is
  [tools/workflows/README.md](../../tools/workflows/README.md#which-path-runs-when-canonical-decision-table).

Use this package only to define reusable GraphQL documents and contract types; keep transport in
the GraphQL layer and iteration execution injected.

## Commands

- `pnpm nx run @openthrottle/openthrottle-workflows:codegen-graphql` — **run first on a fresh
  checkout.** `src/__generated__` is committed empty (`.gitkeep` only), so `typecheck` / `test`
  fail at collection until codegen has run at least once.

## Layout

- `src/workflows/ralph/graphql/*.graphql` → `src/__generated__/graphql.ts` — documents; regenerate, never hand-edit.
- `src/workflows/ralph/workflow-graphql.ts` — `executeWorkflowGraphqlV2` + env/URL/token resolvers.
- `src/workflows/ralph/contract/` — `RalphFlowContext`, `WorkflowOrchestrator`, `WorkflowStepResult`, runner types.
- `src/workflows/ralph/openthrottle-ralph-parity.ts` — parity notes against `tools/workflows/src/bin/ralph.ts`.

## Invariants & gotchas

- Built package (real `build` + `build-package` targets shipping `dist/`); one `openthrottle-server`
  consumes it, so keep top-level `exports` → `dist` (see [../AGENTS.md](../AGENTS.md)).
- **Auth token** is resolved from `OPENTHROTTLE_WORKFLOWS_AUTH_TOKEN`, then
  `OPENTHROTTLE_MCP_AUTH_TOKEN` (same source as the local MCP client).
- **GraphQL URL** comes from `OPENTHROTTLE_WORKFLOWS_GRAPHQL_URL`, else `API_URL_INTERNAL` via
  `getGraphQLUrl()` — one of them must be set.
- `executeGraphqlV2` **throws** on failure (HTTP status / first message in the string); wrap in
  try/catch when you need to branch on the error.

## Don't

- Don't add a CLI, IDE trigger, or the orchestrator loop here — new Ralph runtime code goes to
  `@openthrottle/openthrottle-agentic-ralph`.
- Don't hand-edit `src/__generated__/`.

## Pointers

- [README.md](./README.md) — exports, embedded-Ralph streaming (injected runner), extending guide.
- [docs/workflows/ralph-execution-paths-and-package-layering.md](../../docs/workflows/ralph-execution-paths-and-package-layering.md) — full package-layering map.
