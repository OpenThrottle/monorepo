# @openthrottle/openthrottle-workflows

GraphQL-first building blocks for OpenThrottle workflows: codegen-backed GraphQL helpers (`createWorkflowGraphqlClient`, `executeWorkflowGraphql`), discriminated step-result types, flow context, and Ralph-oriented blueprints. The shipped end-user CLI remains **`workflow-ralph`** in `tools/workflows`; this package is the typed contract and integration surface for future orchestration without coupling to VS Code or new entrypoints yet.

## Main exports

Import from the package root; public API is re-exported from `src/index.ts` (Ralph contract, GraphQL client, parity notes).

- **GraphQL:** `createWorkflowGraphqlClient`, `executeWorkflowGraphql`, config/env helpers, error mapping, and re-exports from `@openthrottle/nodejs-graphql` (runtime in `src/ralph/workflow-graphql.ts`; **documents only** in `src/ralph/graphql/*.graphql`).
- **Contract:** `RalphFlowContext`, `WorkflowOrchestrator`, `WorkflowStepResult` variants, `WorkflowError` (see `src/ralph/contract/`).
- **Blueprints / parity:** step mapping and `main()` alignment notes live in `src/ralph/cortex-ralph-parity.ts` and JSDoc on the contract modules (compare `tools/workflows/src/bin/ralph.ts`).

## Extending

- **New OpenThrottle operations:** add documents under `src/ralph/graphql/*.graphql`, run `pnpm nx run @openthrottle/openthrottle-workflows:codegen-graphql`, then wrap calls in `executeWorkflowGraphql` or thin helpers in `src/ralph/workflow-graphql.ts` (or sibling modules under `src/ralph/`).
- **New flows:** implement `WorkflowOrchestrator` with step functions that return discriminated `WorkflowStepResult` values; keep transport in the GraphQL layer only.
- **Do not** wire new CLIs or IDE triggers from this package until a dedicated cutover plan; keep parity with `tools/workflows` behavior when changing semantics.

## Build and quality (monorepo)

```bash
pnpm nx run @openthrottle/openthrottle-workflows:codegen-graphql
pnpm nx run @openthrottle/openthrottle-workflows:typecheck
pnpm nx run @openthrottle/openthrottle-workflows:build
pnpm nx run @openthrottle/openthrottle-workflows:test
pnpm nx run @openthrottle/openthrottle-workflows:lint
```

Watch GraphQL codegen: `pnpm nx run @openthrottle/openthrottle-workflows:codegen-graphql-watch`.

## Installation

**In this monorepo:** add `"@openthrottle/openthrottle-workflows": "workspace:*"` to the consuming package’s `package.json`, then run `pnpm install` from the repository root.

This package is **private** to the workspace and is not published to the public registry.
