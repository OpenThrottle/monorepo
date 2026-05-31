# @openthrottle/openthrottle-agentic-utils

**Pure, well-named utilities** extracted incrementally from `@tools/workflows` and overlapping helpers in `@openthrottle/ai-mcp`. This package is the shared **runtime helper** layer for Ralph, nested spawns, and agentic CLIs: Postgres URL resolution, monorepo root discovery, workflow transport/config cwd, subprocess PATH, debug env parsing, and wall-clock / child-process metrics.

It is **not** a home for CLI bins, Cortex GraphQL/Postgres CRUD, job-run-hooks runners, or doc-ingestion — those stay in `@tools/workflows` until a later phase.

## Where this fits

- **Contracts (types, orchestrator shapes):** `@openthrottle/openthrottle-agentic-workflow`
- **GraphQL Ralph orchestrator:** `@openthrottle/openthrottle-agentic-ralph`
- **CLI bins and Cortex wiring:** `@tools/workflows`
- **This package:** leaf utilities with minimal dependencies; consumers import functions and re-export shims from workflows/ai-mcp until migration completes.

OpenThrottle plan: `86010c36-a7b6-4b33-805e-6189d6b1d09d` (one function per task, feedback gate between moves).

## Module layout (proposed)

| Module file (proposed)  | Placeholder today | Intended utilities                                                                                                                  |
| ----------------------- | ----------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `src/utils/postgres.ts` | `postgres.ts`     | `getPostgresUrl`, `ensurePostgresReachable`, `sanitizePostgresUrlForLogs`                                                           |
| `src/utils/workflow.ts` | `workflow.ts`     | `getOpenThrottleRoot`, `getWorkflowConfigCwd`, `resolveWorkflowTransport`, `readWorkflowDebugLevelFromEnv`, `parseWorkflowRunnerId` |
| `src/utils/nodejs.ts`   | `nodejs.ts`       | `prependOpenThrottleBinToPath`, `resolveOpenThrottleBinDir`, `pinNxWorkspaceRoot`, subprocess helpers (later)                       |
| `src/utils/metrics.ts`  | `metrics.ts`      | `createWallClockMetrics`, `formatWallClockMetrics`, `createChildProcessMetricsCollector`                                            |

**Barrel:** `src/index.ts` re-exports all public symbols (same pattern as `openthrottle-agentic-workflow`).

### File naming convention

- **Repo rule:** kebab-case file names ([`.cursor/rules/coding/naming-conventions.mdc`](../../.cursor/rules/coding/naming-conventions.mdc)).
- **Current scaffold** uses `utils.<domain>.ts` (dots, not kebab). **Recommendation:** rename to `src/utils/<domain>.ts` (`postgres.ts`, `workflow.ts`, `nodejs.ts`, `metrics.ts`) before the first real move (task 2). Avoid the `utils.` filename prefix; the directory already signals “utilities”.
- **Function names:** prefer clear names over legacy `workflow*` / `ralph*` prefixes in the **public** API where semantics are general (e.g. `sanitizePostgresUrlForLogs` not `sanitizePostgresConnectionForLogs`). Keep **env var names** unchanged for compatibility (`POSTGRES_URL`, `WORKFLOW_RALPH_OT_ROOT`, `OPENTHROTTLE_CORTEX_POSTGRES_URL`, etc.).

## Export map

**Phase 1 (now):** single entrypoint only.

```json
".": { "import": "./dist/src/index.js", "types": "./dist/src/index.d.ts" }
```

**Optional later:** subpath exports for tree-shaking or explicit imports (only if consumers need them):

```json
"./postgres": "./dist/src/utils/postgres.js",
"./workflow": "./dist/src/utils/workflow.js",
"./nodejs": "./dist/src/utils/nodejs.js",
"./metrics": "./dist/src/utils/metrics.js"
```

**Recommendation:** stay barrel-only until a consumer asks for subpaths; wildcard `"./*"` in `package.json` today is generator-default and unused.

## Test layout

- **Runner:** Vitest via `vitest.config.ts` (`@tools/dotfiles` node preset).
- **Location:** colocated `src/**/__tests__/*.test.ts` (e.g. `src/utils/__tests__/postgres.test.ts`), matching `@openthrottle/openthrottle-agentic-workflow` and `@tools/workflows`.
- **Nx:** `pnpm nx run @openthrottle/openthrottle-agentic-utils:test`
- **Policy:** every moved function gets unit tests in this package before the workflows shim is deleted.

## Dependency policy

| Category                                   | Policy                                                                                                          |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------------------- |
| Pure string/env/math helpers               | **Zero** runtime `dependencies`                                                                                 |
| `pg` (reachability check)                  | **`peerDependencies`** + devDependency for tests; mock in unit tests                                            |
| `pidusage` (child metrics)                 | **`peerDependencies`** when `createChildProcessMetricsCollector` lands                                          |
| `@nx/devkit` / `nx` (`pinNxWorkspaceRoot`) | **`peerDependencies`**; optional peer group — consider keeping Nx pinning in workflows if coupling is too heavy |
| `@openthrottle/ai-mcp`                     | **Do not depend** — utilities move **out of** ai-mcp; ai-mcp/workflows re-export shims during migration         |

## Migration rules (per function)

1. Implement + test in `@openthrottle/openthrottle-agentic-utils`.
2. Re-export shim from `@tools/workflows` (or `@openthrottle/ai-mcp`) until all call sites switch.
3. One function (or tight type+function pair) per OpenThrottle task.
4. **Feedback gate** after each task before the next move.

## Overlap resolved (task 2)

- **`getPostgresUrl`** in `src/utils/postgres.ts` is canonical: `OPENTHROTTLE_CORTEX_POSTGRES_URL` → `POSTGRES_URL` → `POSTGRES_*`; **throws** when incomplete (`POSTGRES_URL_MISSING_ERROR`).
- **`@openthrottle/ai-mcp`** re-exports via deprecated `resolveCortexPostgresConnectionStringFromEnv` shim (returns `undefined` on missing env for optional spawn paths); `getPostgresConfig()` delegates to `getPostgresUrl()`.
- **`@tools/workflows`** re-exports `getPostgresUrl` and `OPENTHROTTLE_CORTEX_POSTGRES_URL_ENV` from this package.
- **`@openthrottle/openthrottle-postgres`** duplicate remains; deprecate in a later task.

## Overlap resolved (task 3)

- **`ensurePostgresReachable`** in `src/utils/postgres.ts` is canonical: connect + `SELECT 1`; throws when the connection string is missing or the check fails.
- **`pg`** is a **`peerDependency`** (and devDependency for tests); unit tests mock `pg.Client`.
- **`@tools/workflows`** `ensureCortexReachablePostgres` delegates to `ensurePostgresReachable` and maps Cortex-specific error text; re-export shim on the workflows barrel.

## Overlap resolved (task 5)

- **`getOpenThrottleRoot`** in `src/utils/workflow.ts` is canonical: `WORKFLOW_RALPH_OT_ROOT` → `WORKSPACE_ROOT` (with `pnpm-workspace.yaml`) → module walk-up → `process.cwd()`.
- **`WORKFLOW_RALPH_OT_ROOT_ENV`** exported from this package; env var name unchanged for compatibility.
- **`@openthrottle/ai-mcp`** re-exports via deprecated `resolveOpenThrottleRoot` shim; spawn/bin helpers call `getOpenThrottleRoot` internally.
- **`@tools/workflows`** re-exports `getOpenThrottleRoot` and `WORKFLOW_RALPH_OT_ROOT_ENV` from this package.

## Overlap resolved (task 6)

- **`getWorkflowConfigCwd`** in `src/utils/workflow.ts` is canonical: job `workingDirectory` → `WORKSPACE_ROOT` → `process.cwd()`.
- Used to locate `.workflow-ralph.json` and spawn tuning defaults; distinct from **`getOpenThrottleRoot`** (monorepo root for binary/graph resolution).
- **`@tools/workflows`** re-exports `getWorkflowConfigCwd` from this package; deprecated `resolveWorkflowRalphConfigCwd` shim delegates to it.

## Overlap resolved (task 8)

- **`resolveOpenThrottleBinDir`** and **`prependOpenThrottleBinToPath`** in `src/utils/nodejs.ts` are canonical: resolve `<OT root>/node_modules/.bin` via `getOpenThrottleRoot`, prepend to PATH idempotently.
- **`@openthrottle/ai-mcp`** re-exports via deprecated `resolveWorkflowRalphBinDir` and `applyWorkflowRalphBinPath` shims; `buildWorkflowRalphSpawnEnv` calls `prependOpenThrottleBinToPath` internally.
- **`@tools/workflows`** re-exports `resolveOpenThrottleBinDir` and `prependOpenThrottleBinToPath` from this package.

## Overlap resolved (task 9)

- **`readWorkflowDebugLevelFromEnv`** in `src/utils/workflow.ts` is canonical: pure env parse for `off` | `debug` | `verbose`; no logger instance.
- **`WORKFLOW_RALPH_DEBUG_ENV`**, **`WORKFLOW_RALPH_DEBUG_LEGACY_ENV`**, **`WORKFLOW_RALPH_VERBOSE_ENV`** — env var **names** unchanged (`WORKFLOW_RALPH_DEBUG`, `RALPH_DEBUG`, `WORKFLOW_RALPH_VERBOSE`).
- **`isWorkflowVerboseEnvTruthy`** — helper for `WORKFLOW_RALPH_VERBOSE` truthiness.
- **`@tools/workflows`** `ralph-debug-logger.ts` re-exports deprecated `readRalphDebugConfigFromEnv`, `RALPH_DEBUG_*` aliases, and `isVerboseTruthy`; global logger stays in workflows.
- **`@tools/workflows`** barrel re-exports the canonical symbols from this package.

## Overlap resolved (task 10)

- **`parseWorkflowRunnerId`**, **`isWorkflowRunnerId`**, **`WORKFLOW_RUNNER_IDS`**, **`DEFAULT_WORKFLOW_RUNNER`**, and **`WORKFLOW_RALPH_BACKEND_ENV`** in `src/utils/workflow.ts` are canonical: normalize `cursor` | `claude` from CLI, env, or `.workflow-ralph.json`; throw on empty or unknown ids.
- **`@tools/workflows`** `ralph-execution-backend.ts` re-exports deprecated `parseRalphExecutionBackendId`, `RALPH_EXECUTION_BACKEND_IDS`, `DEFAULT_RALPH_RUNNER`, and `isRalphExecutionBackendId` shims.
- **`@tools/workflows`** barrel re-exports canonical symbols from this package.

## Overlap resolved (task 11)

- **`createWallClockMetrics`** and **`WallClockMetrics`** in `src/utils/metrics.ts` are canonical: pure wall-clock vs CPU time computation from timestamps and CPU usage deltas; zero runtime dependencies.
- **`interpretation`** enum values: `cpu_bound` | `mixed` | `io_bound` | `idle` (ratio thresholds: ≤1.5, ≤5, >5, zero CPU).
- **`@tools/workflows`** `wall-clock-metrics.ts` re-exports `createWallClockMetrics` and `WallClockMetrics` from this package.
- **`@tools/workflows`** barrel re-exports `createWallClockMetrics` and `WallClockMetrics` from this package.

## Overlap resolved (task 12)

- **`formatWallClockMetrics`** in `src/utils/metrics.ts` is canonical: one-line log summary for {@link WallClockMetrics}; zero runtime dependencies.
- Log line format: `Wall clock: {s}s, CPU: {s}s (user: {s}s, sys: {s}s), ratio: {ratio}x ({interpretation})` — infinity ratio renders as `∞`.
- **`@tools/workflows`** `wall-clock-metrics.ts` re-exports `formatWallClockMetrics` from this package.
- **`@tools/workflows`** barrel re-exports `formatWallClockMetrics` from this package.

## Overlap resolved (task 14)

- **`pinNxWorkspaceRootToOpenThrottle`**, **`NX_WORKSPACE_ROOT_PATH_ENV`**, and **`PinNxWorkspaceRootResult`** in `src/utils/nodejs.ts` are canonical: pin Nx graph resolution to the OpenThrottle root via `getOpenThrottleRoot`, `NX_WORKSPACE_ROOT_PATH`, `NX_DAEMON=false`, and `setWorkspaceRoot`; `restore()` reverts all three.
- **`nx`** is a **`peerDependency`** (and devDependency for tests); couples this package to Nx workspace-root APIs — feedback gate: keep vs move to `@openthrottle/nestjs-worktrees`.
- **`@tools/workflows`** `projects.ts` re-exports the pin helper; **`getNxProjectNames`** still uses `@nx/devkit` `createProjectGraphAsync` in workflows.

## Overlap resolved (task 13)

- **`createChildProcessMetricsCollector`**, **`ChildProcessMetricsCollector`**, and child-process metric types (`ChildProcessSample`, `ChildProcessMetrics`, `ChildProcessMetricsOptions`, `DEFAULT_POLL_INTERVAL_MS`) in `src/utils/metrics.ts` are canonical: polls a child PID via `pidusage` at intervals and aggregates peak/average CPU and RSS.
- **`pidusage`** is a **`peerDependency`** (and devDependency for tests); unit tests mock `pidusage`, integration tests use the real module.
- **`@tools/workflows`** `child-process-metrics.ts` re-exports the collector from this package; **`sampleChildProcess`** remains in workflows until a later task.
- **`@tools/workflows`** `types/child-process-metrics.ts` re-exports types from this package.
- **`@tools/workflows`** barrel re-exports canonical symbols from this package.

## Installation

**In this monorepo:** `"@openthrottle/openthrottle-agentic-utils": "workspace:*"` (already on root `package.json`).

**pnpm:**

```bash
pnpm add @openthrottle/openthrottle-agentic-utils
```

Private workspace package; not published to the public registry.
