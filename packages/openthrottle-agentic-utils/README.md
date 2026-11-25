# @openthrottle/openthrottle-agentic-utils

**Pure, well-named utilities** extracted incrementally from overlapping helpers in `@openthrottle/node-client` and the earlier workflow tooling. This package is the shared **runtime helper** layer for the OT Loop job, nested spawns, and agentic CLIs: Postgres URL resolution, monorepo root discovery, workflow transport/config cwd, subprocess PATH, debug env parsing, and wall-clock / child-process metrics.

It is **not** a home for OpenThrottle GraphQL/Postgres CRUD. It does hold the job-run lifecycle hooks (types, validation, `hook-task-to-job-run-hook`, `executeJobRunHooksPhase`), the plan-run run settings the hooks share (`PlanRunTuningSettings`, `PlanRunRuntimeSeed`, `mergePlanRunTuningWithDriver`, prompt resolution), and one small bin, `workflow-memory-reconcile` (`src/scripts/memory-reconcile.ts`, run it as `pnpm exec workflow-memory-reconcile --index <MEMORY.md>`).

## Where this fits

- **Contracts (workflow config, lifecycle, run-result and system-metrics types):** this package (`src/types/workflow-*.ts`, `src/types/system-metrics.ts`)
- **The plan runner:** `@openthrottle/openthrottle-agentic-loop` (wired in `applications/openthrottle-server/src/queues/ot-loop/`)
- **This package:** leaf utilities with minimal dependencies.

OpenThrottle plan: `86010c36-a7b6-4b33-805e-6189d6b1d09d` (one function per task, feedback gate between moves).

## Module layout (proposed)

| Module file (proposed)           | Placeholder today | Intended utilities                                                                                                                                                                                                      |
| -------------------------------- | ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/utils/postgres.ts`          | `postgres.ts`     | `getPostgresUrl`, `ensurePostgresReachable`, `sanitizePostgresUrlForLogs`                                                                                                                                               |
| `src/utils/workflow.ts`          | `workflow.ts`     | `getOpenThrottleRoot`, `getWorkflowConfigCwd`, `resolveWorkflowTransport`, `readWorkflowDebugLevelFromEnv`, `parseWorkflowRunnerId`                                                                                     |
| `src/utils/nodejs.ts`            | `nodejs.ts`       | `prependOpenThrottleBinToPath`, `resolveOpenThrottleBinDir`, `pinNxWorkspaceRoot`, subprocess helpers (later)                                                                                                           |
| `src/utils/metrics.ts`           | `metrics.ts`      | `WallClockMetrics`, `ChildProcessMetrics` (types only)                                                                                                                                                                  |
| `src/utils/model-discovery-*.ts` | shipped           | `discoverModels`, `resolveHosts`/`resolvePorts`, `probeEndpoint`/`probeAll`/`fingerprintProvider`, `dedupeEndpoints`, `createLimiter` — pure local LLM model-server discovery (types in `src/types/model-discovery.ts`) |

**Barrel:** `src/index.ts` re-exports all public symbols (one barrel for the whole package).

### Local model discovery (`src/utils/model-discovery-*.ts`)

Pure, framework-agnostic detection of **locally-running** OpenAI-compatible model
servers (Ollama-primary; also vLLM, llama.cpp, SGLang, LM Studio) via
`GET /v1/models`. Native `fetch`, no new dependencies, no `process.env` reads —
callers pass an env-like object to `resolveHosts`/`resolvePorts`. It probes
_running_ servers; it does **not** scan model files on disk or introspect which
cloud models an agent CLI is configured to use.

- **Host resolution:** `LLM_HOSTS` override (else `localhost` + `host.docker.internal`),
  merged with hosts parsed from `OLLAMA_BASE_URL` / `OLLAMA_URL` / `LM_STUDIO_URL`.
  A pluggable `HostSource` seam (`ResolveHostsOptions.extraSources`) is left for a
  future Tailscale source — **zero Tailscale code ships today**.
- **Port resolution:** default `8000-8020` + `1234` (LM Studio) + `11434`/`11435`
  (Ollama); `LLM_PORTS` override; provider-URL ports merged in.
- **Probe/fingerprint:** native `fetch` + `AbortController` (probe 3000ms /
  fingerprint 1500ms), bounded concurrency (default 50). Best-effort fingerprint:
  Ollama (`/api/tags`), LM Studio (`/api/v1/models`); `provider: null` otherwise
  (generic OpenAI-compatible — no "everything is vllm").
- **Dedup:** one machine reachable via multiple IPs collapses by `(port, sorted
model ids)` with host preference `localhost > 127.0.0.1 > host.docker.internal >
others`; results stably sorted by `(host, port)`. The caller stamps `scannedAt`.

For a cached, ConfigService-wired NestJS service over this core see
`@openthrottle/nestjs-model-discovery`. **Out of scope:** the odysseus "Cookbook"
hardware-fit / model-download feature, availability history, and any Developer/Admin
UI (can consume `discoverLocalModels` later).

### File naming convention

- **Repo rule:** kebab-case file names ([`docs/monorepo/code-style.md`](../../docs/monorepo/code-style.md#naming-conventions)).
- **Current scaffold** uses `utils.<domain>.ts` (dots, not kebab). **Recommendation:** rename to `src/utils/<domain>.ts` (`postgres.ts`, `workflow.ts`, `nodejs.ts`, `metrics.ts`) before the first real move (task 2). Avoid the `utils.` filename prefix; the directory already signals “utilities”.
- **Function names:** prefer clear names over legacy `workflow*` prefixes in the **public** API where semantics are general (e.g. `sanitizePostgresUrlForLogs` not `sanitizePostgresConnectionForLogs`). Keep **env var names** unchanged for compatibility (`POSTGRES_URL`, `OPENTHROTTLE_PLAN_RUN_OT_ROOT`, `OPENTHROTTLE_POSTGRES_URL`, etc.).

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
- **Location:** colocated `src/**/__tests__/*.test.ts` (e.g. `src/utils/__tests__/postgres.test.ts`).
- **Nx:** `pnpm nx run @openthrottle/openthrottle-agentic-utils:test`
- **Policy:** every function in this package has unit tests.

## Dependency policy

| Category                                   | Policy                                                                                                          |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------------------- |
| Pure string/env/math helpers               | **Zero** runtime `dependencies`                                                                                 |
| `pg` (reachability check)                  | **`peerDependencies`** + devDependency for tests; mock in unit tests                                            |
| `@nx/devkit` / `nx` (`pinNxWorkspaceRoot`) | **`peerDependencies`**; optional peer group — consider keeping Nx pinning in workflows if coupling is too heavy |

## Overlap resolved (task 2)

- **`getPostgresUrl`** in `src/utils/postgres.ts` is canonical: `OPENTHROTTLE_POSTGRES_URL` → `POSTGRES_URL` → `POSTGRES_*`; **throws** when incomplete (`POSTGRES_URL_MISSING_ERROR`).
- **`@openthrottle/openthrottle-postgres`** duplicate remains; deprecate in a later task.

## Overlap resolved (task 3)

- **`ensurePostgresReachable`** in `src/utils/postgres.ts` is canonical: connect + `SELECT 1`; throws when the connection string is missing or the check fails.
- **`pg`** is a **`peerDependency`** (and devDependency for tests); unit tests mock `pg.Client`.
- Consumers that need OpenThrottle-specific error text wrap `ensurePostgresReachable` themselves.

## Overlap resolved (task 5)

- **`getOpenThrottleRoot`** in `src/utils/workflow.ts` is canonical: `OPENTHROTTLE_PLAN_RUN_OT_ROOT` → `WORKSPACE_ROOT` (with `.openthrottle.mjs`) → module walk-up → `process.cwd()`.
- **`PLAN_RUN_OT_ROOT_ENV`** exported from this package; env var name unchanged for compatibility.

## Overlap resolved (task 6)

- **`getWorkflowConfigCwd`** in `src/utils/workflow.ts` is canonical: job `workingDirectory` → `WORKSPACE_ROOT` → `process.cwd()`.
- Used to locate `.openthrottle/ot-loop.json` and the plan-run defaults; distinct from **`getOpenThrottleRoot`** (monorepo root for binary/graph resolution).

## Overlap resolved (task 8)

- **`resolveOpenThrottleBinDir`** and **`prependOpenThrottleBinToPath`** in `src/utils/nodejs.ts` are canonical: resolve `<OT root>/node_modules/.bin` via `getOpenThrottleRoot`, prepend to PATH idempotently.

## Overlap resolved (task 9)

- **`readWorkflowDebugLevelFromEnv`** in `src/utils/workflow.ts` is canonical: pure env parse for `off` | `debug` | `verbose`; no logger instance.
- **`PLAN_RUN_DEBUG_ENV`**, **`PLAN_RUN_VERBOSE_ENV`** — env var names are `OPENTHROTTLE_PLAN_RUN_DEBUG` and `OPENTHROTTLE_PLAN_RUN_VERBOSE`.
- **`isWorkflowVerboseEnvTruthy`** — helper for `OPENTHROTTLE_PLAN_RUN_VERBOSE` truthiness.

## Overlap resolved (task 10)

- **`parseWorkflowRunnerId`**, **`isWorkflowRunnerId`**, and the runner-id helpers in `src/utils/workflow.ts` are canonical: normalize a driver id from env or the plan-run config; throw on empty or unknown ids.

## Overlap resolved (task 14)

- **`pinNxWorkspaceRootToOpenThrottle`**, **`NX_WORKSPACE_ROOT_PATH_ENV`**, and **`PinNxWorkspaceRootResult`** in `src/utils/nodejs.ts` are canonical: pin Nx graph resolution to the OpenThrottle root via `getOpenThrottleRoot`, `NX_WORKSPACE_ROOT_PATH`, `NX_DAEMON=false`, and `setWorkspaceRoot`; `restore()` reverts all three.
- **`nx`** is a **`peerDependency`** (and devDependency for tests); couples this package to Nx workspace-root APIs — feedback gate: keep vs move to `@openthrottle/nestjs-worktrees`.

## Installation

**In this monorepo:** `"@openthrottle/openthrottle-agentic-utils": "workspace:^"` (already on root `package.json`).

**pnpm:**

```bash
pnpm add @openthrottle/openthrottle-agentic-utils
```

Private workspace package; not published to the public registry.
