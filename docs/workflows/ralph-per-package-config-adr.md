# ADR: Ralph/workflow per-package config files

**Status:** Accepted — implemented in OpenThrottle plan `a19899d8-e7b8-464b-8a26-9b48a36d2ccc`. Migration: [`ralph-config-migration.md`](./ralph-config-migration.md).

**Context:** Ralph and queue spawn paths read dozens of `WORKFLOW_RALPH_*`, spawn, transport, and diagnostics env vars across `@tools/workflows`, `@openthrottle/ai-mcp`, `@openthrottle/openthrottle-workflows`, `@openthrottle/openthrottle-agentic-ralph`, `@openthrottle/openthrottle-agentic-workflow`, and `openthrottle-server`. `.workflow-ralph.json` already covers CLI run tuning in `tools/workflows/src/utils/ralph-runtime-config.ts`; this ADR extends that pattern consistently and defines shared types, schema, and precedence for the rest of the non-secret tuning surface.

## Decision

### One repo-local defaults file (no package-local configs)

| Artifact             | Location                                                                                                    | Purpose                                                                                                   |
| -------------------- | ----------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| **Defaults file**    | `.workflow-ralph.json` in **process cwd** (repo root for local runs; worktree root for queued nested Ralph) | Non-secret Ralph/workflow tuning shared by CLI, spawn builder, and orchestrator                           |
| **Sample file**      | `.workflow-ralph.json.example` at monorepo root                                                             | Copy-paste template; not read at runtime (see [`ralph-config-migration.md`](./ralph-config-migration.md)) |
| **JSON Schema**      | `tools/workflows/schemas/workflow-ralph.defaults.schema.json`                                               | Validation, IDE completion, CI optional check                                                             |
| **TypeScript types** | `tools/workflows/src/config/workflow-ralph-defaults.types.ts`                                               | Canonical shape; re-exported from `@tools/workflows` for consumers                                        |

**No per-package config files** (`packages/*/ralph.json`, etc.). Nested Ralph always resolves cwd from the job worktree or operator shell; a single file keeps queue and local behavior aligned. Package code imports shared types/constants instead of reading separate paths.

### Precedence (all layers)

For every field that supports file + env + CLI (or programmatic override):

```text
built-in defaults  <  .workflow-ralph.json  <  environment variables  <  CLI flags / enqueue payload / GraphQL tuning
```

- **Built-ins:** constants in `ralph-runtime-config.ts` and `flow-context.ts` (`DEFAULT_RALPH_*`).
- **File:** optional `.workflow-ralph.json` in cwd; missing file → `{}` (ENOENT only; parse/validation errors throw).
- **Env:** same field names as today (`WORKFLOW_RALPH_*`, spawn/diagnostics vars listed below); empty/unset → skip layer.
- **CLI / API:** `parseRalphArgs`, `RalphNestedRunTuningInput`, `RalphPlanRunTuningInput`, Developer UI argv preview — highest priority.

Debug shim follows the same rule: `--debug` / `--verbose` override `WORKFLOW_RALPH_DEBUG` / `RALPH_DEBUG` / `WORKFLOW_RALPH_VERBOSE`, which override file `debug` when the shared loader is wired (today debug is env/CLI only; file field is new).

Help text and READMEs must state: **CLI → env → file → built-ins** (equivalent ordering).

### Config file schema (v1)

Top-level keys mirror existing `.workflow-ralph.json` plus extensions. All keys optional.

| JSON key                  | Type                                 | Env var(s)                                                      | CLI / API               | Notes                                              |
| ------------------------- | ------------------------------------ | --------------------------------------------------------------- | ----------------------- | -------------------------------------------------- |
| `backend`                 | `"cursor"` \| `"claude"`             | `WORKFLOW_RALPH_BACKEND`                                        | `--backend`             | One backend per plan run                           |
| `prompt`                  | string                               | `WORKFLOW_RALPH_PROMPT`                                         | `--prompt`              | Mutually exclusive with `promptFile` in same layer |
| `promptFile`              | string                               | `WORKFLOW_RALPH_PROMPT_FILE`                                    | `--prompt-file`         | Path relative to cwd or absolute                   |
| `iterations`              | positive int                         | `WORKFLOW_RALPH_ITERATIONS`                                     | `--iterations`          | Task mode still forces effective 1 in CLI          |
| `iterationTimeout`        | positive int (seconds)               | `WORKFLOW_RALPH_ITERATION_TIMEOUT`                              | `--iteration-timeout`   |                                                    |
| `model`                   | string                               | `WORKFLOW_RALPH_MODEL`                                          | `--model`               |                                                    |
| `project`                 | string                               | `WORKFLOW_RALPH_PROJECT`                                        | `--project`             | Nx project name                                    |
| `worktree`                | string                               | `WORKFLOW_RALPH_WORKTREE`                                       | `--worktree`            | Agent CLI worktree name                            |
| `worktreeBase`            | string                               | `WORKFLOW_RALPH_WORKTREE_BASE`                                  | `--worktree-base`       | Cursor-only                                        |
| `skipWorktreeSetup`       | boolean                              | `WORKFLOW_RALPH_SKIP_WORKTREE_SETUP`                            | `--skip-worktree-setup` | Cursor-only; env accepts 1/0/true/false            |
| `debug`                   | `"omit"` \| `"debug"` \| `"verbose"` | `WORKFLOW_RALPH_DEBUG`, `RALPH_DEBUG`, `WORKFLOW_RALPH_VERBOSE` | `--debug`, `--verbose`  | **New in file**; maps to existing shim             |
| `transport`               | `"graphql"` \| `"postgres-direct"`   | `WORKFLOW_RALPH_TRANSPORT`                                      | —                       | Spawn / I/O rollback; no CLI flag today            |
| `spawn`                   | object                               | see nested                                                      | —                       | Worker → nested child only                         |
| `spawn.home`              | string (absolute path)               | `WORKFLOW_RALPH_SPAWN_HOME`                                     | —                       | Sets child `HOME`                                  |
| `spawn.xdgConfigHome`     | string                               | `WORKFLOW_RALPH_SPAWN_XDG_CONFIG_HOME`                          | —                       | Sets child `XDG_CONFIG_HOME`                       |
| `spawn.otRoot`            | string (absolute path)               | `WORKFLOW_RALPH_OT_ROOT`                                        | —                       | OpenThrottle monorepo root for bin resolution      |
| `diagnostics`             | object                               | see nested                                                      | —                       | Opt-in logging only                                |
| `diagnostics.ot`          | boolean                              | `WORKFLOW_RALPH_OT_DIAGNOSTICS`                                 | —                       | Nested Ralph OT identity lines                     |
| `diagnostics.spawn`       | boolean                              | `OPENTHROTTLE_PLANS_SPAWN_DIAGNOSTICS`                          | —                       | Server worker spawn logging                        |
| `lifecycleHooksChildJobs` | boolean                              | `OPENTHROTTLE_LIFECYCLE_HOOKS_CHILD_JOBS`                       | —                       | Default `true`; env `false` disables               |

**Validation rules (unchanged + extended):**

- Root must be a JSON object.
- `prompt` and `promptFile` cannot both be set in file, env, or merged defaults.
- Positive integers for `iterations`, `iterationTimeout`.
- Unknown top-level keys: **reject in strict mode** (loader); schema `additionalProperties: false`.

Example:

```json
{
  "backend": "cursor",
  "iterations": 10,
  "iterationTimeout": 1800,
  "model": "auto",
  "prompt": "/agents/ralph",
  "debug": "omit",
  "transport": "graphql",
  "spawn": {
    "otRoot": "/path/to/openthrottle"
  },
  "diagnostics": {
    "ot": false,
    "spawn": false
  },
  "lifecycleHooksChildJobs": true
}
```

### Stay env-only (never in file)

| Category              | Variables                                                                                                    | Reason                              |
| --------------------- | ------------------------------------------------------------------------------------------------------------ | ----------------------------------- |
| **Postgres / Cortex** | `POSTGRES_URL`, `POSTGRES_*`, `OPENTHROTTLE_POSTGRES_URL`                                                    | Runtime secrets; injected at spawn  |
| **GraphQL auth**      | `OPENTHROTTLE_WORKFLOWS_AUTH_TOKEN`, `OPENTHROTTLE_MCP_AUTH_TOKEN`, `OPENTHROTTLE_WORKER_GRAPHQL_AUTH_TOKEN` | Secrets                             |
| **GraphQL URL**       | `OPENTHROTTLE_WORKFLOWS_GRAPHQL_URL`, `OPENTHROTTLE_WORKER_GRAPHQL_URL`, `API_URL_INTERNAL`                  | Deployment-specific endpoints       |
| **API keys**          | `OPENAI_API_KEY`, Ollama keys/URLs when used for embeddings                                                  | Secrets                             |
| **Identity**          | `GITHUB_USER`                                                                                                | Operator identity; not Ralph tuning |

### CI / deployment-only (unchanged; not in file)

| Variable                        | Purpose                                                      |
| ------------------------------- | ------------------------------------------------------------ |
| `OPENTHROTTLE_DEFAULT_RUN_KIND` | Server default spawn vs orchestrator (`spawn` rollback)      |
| `WORKTREE_TARGETS`              | Physical worktree pool for queue workers                     |
| `WORKSPACE_ROOT`                | Server/worker cwd fallback                                   |
| `NODE_ENV`                      | Runtime mode                                                 |
| `NX_WORKSPACE_ROOT_PATH`        | Set transiently by Nx project graph helper (not user config) |

### Shared loader (implementation follow-up)

Extract **`loadWorkflowRalphConfig(cwd, env?)`** (name TBD) into `@tools/workflows`:

1. Read `.workflow-ralph.json` from `cwd` (ENOENT → `{}`).
2. Merge with `readWorkflowRalphEnv()` + new readers for spawn/diagnostics/lifecycle/transport/debug file fields.
3. Return typed **`WorkflowRalphResolvedDefaults`** (file + env merged; no CLI).
4. Existing **`mergeRalphRuntimeSeed`** becomes a thin wrapper over the run-tuning slice; **`buildWorkflowRalphSpawnEnv`** reads spawn/diagnostics/transport from merged config when env omits them.

**Dependency rule:** `@openthrottle/ai-mcp` keeps spawn env builders but accepts optional pre-merged defaults from `@tools/workflows` to avoid a circular dependency. Server and agentic packages import from `@tools/workflows` or re-exported types only.

Unit tests: precedence per field, ENOENT, invalid JSON, mutual exclusion, env-only secrets never read from file.

### Deprecations

| Legacy                     | Preferred              | Timeline                                                                     |
| -------------------------- | ---------------------- | ---------------------------------------------------------------------------- |
| `RALPH_DEBUG`              | `WORKFLOW_RALPH_DEBUG` | Alias retained; document as deprecated in README and `.env.default` comments |
| `postgres` transport alias | `postgres-direct`      | Accept both in env/file; document `postgres-direct` as canonical             |

### Alignment by package

| Package                                       | File fields consumed                                                                 | Env-only                                                           |
| --------------------------------------------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------ |
| `@tools/workflows`                            | All run tuning + debug + transport                                                   | Postgres for direct CLI DB check                                   |
| `@openthrottle/ai-mcp`                        | `spawn.*`, `transport`                                                               | Postgres URLs, GraphQL auth when building spawn env                |
| `@openthrottle/openthrottle-workflows`        | Run tuning via orchestrator context (same precedence when loader feeds GraphQL path) | GraphQL URL/auth                                                   |
| `@openthrottle/openthrottle-agentic-ralph`    | Same as workflows contract                                                           | GraphQL URL/auth                                                   |
| `@openthrottle/openthrottle-agentic-workflow` | `lifecycleHooksChildJobs`                                                            | —                                                                  |
| `openthrottle-server`                         | `diagnostics.spawn`, spawn overrides when building child env                         | Worker tokens, `WORKTREE_TARGETS`, `OPENTHROTTLE_DEFAULT_RUN_KIND` |
| `openthrottle-developer`                      | Documents precedence; UI sends GraphQL tuning (CLI-equivalent layer)                 | Browser auth                                                       |

## Consequences

- Operators can commit safe defaults in `.workflow-ralph.json` and override per machine via env or one-off CLI flags.
- Queue nested runs inherit worktree-local file + worker env without duplicating vars in compose files.
- Secrets never land in repo config; CI flags stay deployment-scoped.
- Single schema reduces drift between CLI help, GraphQL inputs, and spawn builders.

## References

- Existing runtime note: [`ralph-workflow-runtime-config.md`](./ralph-workflow-runtime-config.md)
- Implementation: `tools/workflows/src/utils/ralph-runtime-config.ts`
- Schema: `tools/workflows/schemas/workflow-ralph.defaults.schema.json`
- Types: `tools/workflows/src/config/workflow-ralph-defaults.types.ts`
- Plan: OpenThrottle `a19899d8-e7b8-464b-8a26-9b48a36d2ccc`
