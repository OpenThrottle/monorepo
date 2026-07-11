# Ralph/workflow config migration

**Status:** Implemented (OpenThrottle plan `a19899d8-e7b8-464b-8a26-9b48a36d2ccc`).

This guide explains how to move from scattered `WORKFLOW_RALPH_*` environment variables to optional repo-local **`.workflow-ralph.json`**, without breaking existing setups.

## Precedence (all surfaces)

Same order everywhere (CLI, queue spawn, orchestrator tuning merge):

```text
CLI flags / GraphQL enqueue tuning  →  environment variables  →  .workflow-ralph.json  →  built-in defaults
```

Human-readable constant: **`WORKFLOW_RALPH_CONFIG_PRECEDENCE`** in `@tools/workflows` (`CLI flags → environment variables → .workflow-ralph.json → built-in defaults`).

## Quick start

1. Copy the sample at repo root:

   ```bash
   cp .workflow-ralph.json.example .workflow-ralph.json
   ```

2. Edit only the keys you want as team or machine defaults (omit the rest).
3. Keep **secrets in env** — Postgres URLs, GraphQL auth tokens, API keys stay in `.env` / deployment config only.
4. Override per run with env or CLI as before (`pnpm exec workflow-ralph --help`).

**Where the file is read:** process **cwd** — monorepo root for local runs; **worktree root** for nested queue Ralph when `WORKTREE_TARGETS` is set.

## What moved to the config file

Non-secret tuning that previously required env sprawl:

| Area            | File keys                                                                                               | Env vars (still work as overrides)                                                            |
| --------------- | ------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Run tuning      | `backend`, `prompt`, `promptFile`, `iterations`, `iterationTimeout`, `model`, `project`, worktree flags | `WORKFLOW_RALPH_*` (see `--help`)                                                             |
| Debug shim      | `debug`: `omit` \| `debug` \| `verbose`                                                                 | `WORKFLOW_RALPH_DEBUG`, `WORKFLOW_RALPH_VERBOSE`                                              |
| Transport       | `transport`: `graphql` \| `postgres-direct`                                                             | `WORKFLOW_RALPH_TRANSPORT`                                                                    |
| Nested spawn    | `spawn.home`, `spawn.xdgConfigHome`, `spawn.otRoot`                                                     | `WORKFLOW_RALPH_SPAWN_HOME`, `WORKFLOW_RALPH_SPAWN_XDG_CONFIG_HOME`, `WORKFLOW_RALPH_OT_ROOT` |
| Diagnostics     | `diagnostics.ot`, `diagnostics.spawn`                                                                   | `WORKFLOW_RALPH_OT_DIAGNOSTICS`, `OPENTHROTTLE_PLANS_SPAWN_DIAGNOSTICS`                       |
| Lifecycle hooks | `lifecycleHooksChildJobs`                                                                               | `OPENTHROTTLE_LIFECYCLE_HOOKS_CHILD_JOBS=false` to disable                                    |

Schema and IDE validation: `tools/workflows/schemas/workflow-ralph.defaults.schema.json`.

Shared loader: `loadWorkflowRalphConfig(cwd, env?)` in `@tools/workflows` (`tools/workflows/src/config/load-workflow-ralph-config.ts`).

## What stays env-only

Do **not** add these to `.workflow-ralph.json`:

- **Postgres / OpenThrottle:** `POSTGRES_URL`, `POSTGRES_*`, `OPENTHROTTLE_POSTGRES_URL`
- **GraphQL auth / URL:** `OPENTHROTTLE_WORKFLOWS_AUTH_TOKEN`, `OPENTHROTTLE_MCP_AUTH_TOKEN`, worker GraphQL tokens, `OPENTHROTTLE_WORKFLOWS_GRAPHQL_URL`, `API_URL_INTERNAL`
- **API keys:** `OPENAI_API_KEY`, Ollama secrets when used
- **CI / deployment:** `OPENTHROTTLE_DEFAULT_RUN_KIND`, `WORKTREE_TARGETS`, `WORKSPACE_ROOT`, `NODE_ENV`

Full classification: [ralph-per-package-config-adr.md](./ralph-per-package-config-adr.md).

## Deprecated aliases (still supported)

| Legacy                              | Preferred              | Notes                                                                                                  |
| ----------------------------------- | ---------------------- | ------------------------------------------------------------------------------------------------------ |
| `RALPH_DEBUG`                       | `WORKFLOW_RALPH_DEBUG` | Alias retained; no removal date. New docs and `.env.default` comments use `WORKFLOW_RALPH_DEBUG` only. |
| `WORKFLOW_RALPH_TRANSPORT=postgres` | `postgres-direct`      | Env and file accept `postgres` as alias; canonical value is `postgres-direct`.                         |

All existing env vars **continue to work** and override file defaults when set.

## Package behavior

| Package                                                     | Config source                                                   |
| ----------------------------------------------------------- | --------------------------------------------------------------- |
| `@tools/workflows` (`workflow-ralph`, parsers, nested argv) | `loadWorkflowRalphConfig` + CLI                                 |
| `@openthrottle/ai-mcp` (`buildWorkflowRalphSpawnEnv`)       | Pre-merged defaults passed in; env on worker still wins         |
| `@openthrottle/openthrottle-agentic-ralph`                  | Enqueue/GraphQL tuning > env > file (GraphQL URL/auth env-only) |
| `@openthrottle/openthrottle-agentic-workflow`               | `lifecycleHooksChildJobs` from merged config                    |
| `openthrottle-server` (queue spawn)                         | `buildNestedWorkflowRalphSpawnEnv` merges file + worker env     |
| `openthrottle-developer`                                    | UI documents precedence; enqueue payload is highest layer       |

## Migration checklist

- [ ] Optional: add `.workflow-ralph.json` from `.workflow-ralph.json.example` for shared team defaults (safe to commit if paths are portable or omitted).
- [ ] Leave machine-specific spawn paths in env or use absolute paths only you need locally.
- [ ] Replace `RALPH_DEBUG` with `WORKFLOW_RALPH_DEBUG` in new shell profiles / compose files when convenient.
- [ ] Keep `.env` for secrets; use file for iterations, backend, debug level, transport rollback, etc.
- [ ] Queue runs: place `.workflow-ralph.json` in worktree root if workers use `WORKTREE_TARGETS`.

## References

- ADR: [ralph-per-package-config-adr.md](./ralph-per-package-config-adr.md)
- Runtime mental model: [ralph-workflow-runtime-config.md](./ralph-workflow-runtime-config.md)
- CLI: `pnpm exec workflow-ralph --help`
- Canonical README: [tools/workflows/README.md](../../tools/workflows/README.md)
