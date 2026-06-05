# @openthrottle/openthrottle-workflows

GraphQL-first building blocks for OpenThrottle workflows: codegen-backed GraphQL via `**executeWorkflowGraphqlV2**` (wraps `@openthrottle/nodejs-graphql` `**executeGraphqlV2**` with workflow env and URL options), env helpers, Ralph flow-context tuning, discriminated `**WorkflowStepResult**` types, Ralph-oriented blueprints, and a **GraphQL-backed Ralph orchestrator** (`createWorkflowRalphOrchestrator`). The primary end-user entrypoint for interactive runs is still `**workflow-ralph` in `tools/workflows`; this package holds the typed contract, documents, and orchestration you can call from tests, workers, or other hosts without duplicating query shapes.

> **Which path runs when?** This package is GraphQL-first building blocks; the **active** server
> orchestrator is `@openthrottle/openthrottle-agentic-ralph` (this one is the older sibling, a
> consolidation candidate in Phase 2). For the single canonical decision table (Local CLI vs Plans
> queue spawn vs Plans queue orchestrator) see
> [tools/workflows/README.md → Which path runs when](../../tools/workflows/README.md#which-path-runs-when-canonical-decision-table),
> the full map in
> [docs/workflows/ralph-execution-paths-and-package-layering.md](../../docs/workflows/ralph-execution-paths-and-package-layering.md),
> and the [target architecture](../../tools/workflows/README.md#target-architecture-phase-2).

## Main exports

Import from the package root; public API is re-exported from `src/index.ts` (Ralph contract, GraphQL client, parity notes).

- **GraphQL:** `executeWorkflowGraphqlV2`, `buildWorkflowExecuteGraphqlV2Options`, `resolveWorkflowGraphqlConfigFromEnv` / token and URL override helpers (runtime in `src/ralph/workflow-graphql.ts`). On failure, `**executeGraphqlV2`** throws `Error` (HTTP status and first message in the string, or `GraphQL errors: …` for top-level GraphQL errors); use try/catch when you need to branch. **Documents only* in `src/ralph/graphql/*.graphql`.
- **Contract:** `RalphFlowContext`, `WorkflowOrchestrator`, `WorkflowStepResult` variants, `WorkflowError` (see `src/ralph/contract/`).
- **Ralph orchestrator:** `createWorkflowRalphOrchestrator` in `src/ralph/ralph-orchestrator.ts` implements `WorkflowOrchestrator<WorkflowRalphContext>`: it calls codegen queries/mutations only (no ad-hoc HTTP), runs the same logical steps as `tools/workflows/src/bin/ralph.ts`, and requires an injected `**WorkflowRalphIterationRunner`** for layer-2 execution (subprocess, Cursor, etc.). Unit tests use a mocked `**executeGraphqlV2\*\*`; see `src/ralph/ralph-orchestrator.test.ts`.
- **Blueprints / parity:** step mapping and `main()` alignment notes live in `src/ralph/openthrottle-ralph-parity.ts` and JSDoc on the contract modules (compare `tools/workflows/src/bin/ralph.ts`).

### Auth and GraphQL URL (orchestrator + `executeWorkflowGraphqlV2`)

- **Bearer token:** `resolveWorkflowAuthTokenFromEnv()` reads, in order, `**OPENTHROTTLE_WORKFLOWS_AUTH_TOKEN`**, then `**MCP_DEVELOPER_AUTH_TOKEN\*\*`(same token source as the local openthrottle-mcp client). Pass`token`into`buildWorkflowExecuteGraphqlV2Options`/`resolveWorkflowGraphqlConfigFromEnv`, or inject a test double for `executeGraphqlV2`.
- **Endpoint:** `resolveWorkflowGraphqlUrlOverrideFromEnv()` reads `**OPENTHROTTLE_WORKFLOWS_GRAPHQL_URL`** (optional full URL, e.g. `http://localhost:6021/graphql`). When unset, `**API_URL_INTERNAL`**is resolved via`@openthrottle/nodejs-graphql` `\*\*getGraphQLUrl()\*\*` (must be set for the default URL to work).
- **Preflight:** the orchestrator’s first step is the `**getServerHealth`** query (public on typical servers); transport failures still surface as thrown errors from `**executeGraphqlV2\*\*`.

### Relationship to `workflow-ralph`

- `**pnpm exec workflow-ralph`** (see `tools/workflows`) is the CLI humans and nested jobs use: it parses argv/env, builds `**RalphFlowContext**`, runs `**runIteration\*\*`/ Cursor, and may evolve alongside`ralph.ts`.
- `**createWorkflowRalphOrchestrator**` _is the package-level orchestration loop: same GraphQL operations and exit reasons, but **iteration execution is always injected** so the package stays free of Cursor or subprocess details. Use the orchestrator when embedding Ralph in another process; use the CLI for local agent runs._

### Embedded Ralph: streaming agent output (injected runner)

You can **stream** stdout/stderr for logs, OpenThrottle `append_plan_output`, WebSockets, or other side effects **without** changing the orchestrator contract:

- `**WorkflowRalphIterationRunner.run*`\* must still return a `**Promise<string>**` that resolves to the **full** combined agent output for that iteration (same shape as the CLI). The orchestrator only parses control markers (`<ralph:task-complete>`, `<promise>COMPLETE</promise>`, etc.) **after** the full string is available — it does not interpret partial chunks for task completion.
- **Tier 1 (no package API change):** Implement the injected runner by calling `**runIterationAsync`** from `@tools/workflows/src/bin/run-iteration` (source: `[tools/workflows/src/bin/run-iteration.ts](../../tools/workflows/src/bin/run-iteration.ts)`; also re-exported from `[ralph.ts](../../tools/workflows/src/bin/ralph.ts)` for the CLI). Pass `**RunIterationConfig**`with optional`**onChunk**`to receive each`CursorAgentChunk` while the subprocess runs; **return\*\* the same string promise that `runIterationAsync` resolves with so embedding stays aligned with `workflow-ralph`. Alternatively use **`createCursorWorkflowRalphIterationRunner`** from `@tools/workflows` (see `[tools/workflows/src/utils/cursor-workflow-ralph-iteration-runner.ts](../../tools/workflows/src/utils/cursor-workflow-ralph-iteration-runner.ts)`): it maps orchestrator `iteration.run` params onto `runIterationAsync` and accepts optional `onChunk` / `appendPlanOutput` chunk hooks without duplicating field wiring.
- **Non-goal:** Streaming partial text into GraphQL or task completion — the GraphQL layer and completion parsing stay **buffer-at-end** on the full iteration string.

For CLI behavior, nesting, and runtime tuning, see `[tools/workflows` README](../../tools/workflows/README.md) (Workflow Ralph section) and [`docs/workflows/ralph-config-migration.md`](../../docs/workflows/ralph-config-migration.md) (`.workflow-ralph.json` precedence; GraphQL URL/auth env-only).

## Extending

- **New OpenThrottle operations:** add documents under `src/ralph/graphql/*.graphql`, run `pnpm nx run @openthrottle/openthrottle-workflows:codegen-graphql`, then call `**executeWorkflowGraphqlV2`\* from thin helpers in `src/ralph/`
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

> [!Tip]
> This package is **private** to the workspace and is not published to a public registry.
