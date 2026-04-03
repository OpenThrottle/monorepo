# @openthrottle/openthrottle-workflows

GraphQL-first building blocks for OpenThrottle workflows: codegen-backed GraphQL via **`executeWorkflowGraphqlV2`** (wraps `@openthrottle/nodejs-graphql` **`executeGraphqlV2`** with workflow env and URL options), env helpers, Ralph flow-context tuning, discriminated **`WorkflowStepResult`** types, and Ralph-oriented blueprints. The shipped end-user CLI remains **`workflow-ralph`** in `tools/workflows`; this package is the typed contract and integration surface for future orchestration without coupling to VS Code or new entrypoints yet.

## Main exports

Import from the package root; public API is re-exported from `src/index.ts` (Ralph contract, GraphQL client, parity notes).

- **GraphQL:** `executeWorkflowGraphqlV2`, `buildWorkflowExecuteGraphqlV2Options`, `resolveWorkflowGraphqlConfigFromEnv` / token and URL override helpers (runtime in `src/ralph/workflow-graphql.ts`). On failure, **`executeGraphqlV2`** throws `Error` (HTTP status and first message in the string, or `GraphQL errors: …` for top-level GraphQL errors); use try/catch when you need to branch. **Documents only** in `src/ralph/graphql/*.graphql`.
- **Contract:** `RalphFlowContext`, `WorkflowOrchestrator`, `WorkflowStepResult` variants, `WorkflowError` (see `src/ralph/contract/`).
- **Blueprints / parity:** step mapping and `main()` alignment notes live in `src/ralph/openthrottle-ralph-parity.ts` and JSDoc on the contract modules (compare `tools/workflows/src/bin/ralph.ts`).

## Extending

- **New OpenThrottle operations:** add documents under `src/ralph/graphql/*.graphql`, run `pnpm nx run @openthrottle/openthrottle-workflows:codegen-graphql`, then call **`executeWorkflowGraphqlV2`** from thin helpers in `src/ralph/` (or add helpers next to `queries.ts` / `mutations.ts`).
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
