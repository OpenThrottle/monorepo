# Cross-repo usage

Ralph can be run from another repository (e.g. a separate services monorepo) by pointing at this monorepo's workflow binary. Ralph loads plan and tasks from Cortex Postgres and injects them into the prompt; the agent receives Plan-Id (and optional Task-Id) and need not call `get_plan` or `get_tasks_by_plan_id`.

## No ref file

The workflow does **not** write or read any ref file. Invokers must pass `--plan <uuid>` (or `--task <uuid>`). Ralph injects plan and tasks into the prompt from Postgres. Do not create or rely on a `.ralph-<uuid>.ref` file; the agent should use the injected Plan-Id and context only.

## Invoker checklist

When calling Ralph (from this repo or another), do **not** write a ref file. Use only:

- `workflow-ralph --plan <plan-uuid>` (plan-centric), or
- `workflow-ralph --task <task-uuid>` (task-centric; plan is resolved from the task), or
- `workflow-ralph --plan <plan-uuid> --task <task-uuid>` (task-centric with explicit plan).

Ralph injects full plan/task context from Postgres into the prompt; no `@file` or ref path is required.

## Requirements

- **Cortex required:** Set `POSTGRES_URL` or the five `POSTGRES_*` vars (host, port, db, user, password) in the environment when invoking Ralph. Export from this monorepo's `.env` or a shared config. The CLI fails fast at startup if Cortex is missing or unreachable (exit code 1, FATAL message).
- **Foreign cwd (manual CLI, no queue):** When you run `workflow-ralph` from another repo whose `.env` or shell sets a different `POSTGRES_URL`, plan lookup can hit the wrong database and fail with **Plan not found**. Export OpenThrottle's Cortex URL explicitly before invoking Ralph:

  ```bash
  export OPENTHROTTLE_POSTGRES_URL="$(grep '^POSTGRES_URL=' /path/to/openthrottle/.env | cut -d= -f2-)"
  # or: export POSTGRES_URL=... (same OpenThrottle Cortex string)

  cd /path/to/other-repo
  pnpm exec /path/to/openthrottle/node_modules/.bin/workflow-ralph --plan <uuid>
  ```

  `getPostgresConfig()` prefers `OPENTHROTTLE_POSTGRES_URL` over `POSTGRES_URL`. BullMQ spawns inject both vars from the worker automatically; manual runs must set them yourself. Ralph resolves Cortex **before** loading the Nx project graph so a foreign cwd cannot desync plan lookup mid-startup when the correct URL is exported. See [README § Cortex DB identity](../README.md#multi-workspace-plans-workingdirectory) for worker vs nested diagnostics (`WORKFLOW_RALPH_OT_DIAGNOSTICS`, `OPENTHROTTLE_PLANS_SPAWN_DIAGNOSTICS`).

- **Invocation:** Use the workflow binary from the other repo, e.g. `pnpm exec ../../../../monorepo/node_modules/.bin/workflow-ralph --plan <plan-uuid>`.
- **Debug / verbose (manual CLI):** `--debug`, `--debug=verbose`, and `--verbose` are valid on `workflow-ralph` (same as `WORKFLOW_RALPH_DEBUG` / `WORKFLOW_RALPH_VERBOSE`). Shim lines go to stderr with the `[workflow-ralph:debug]` prefix. See [README § Debugging Ralph](../README.md#debugging-ralph-shim-logger).

## Prompt scoping (foreign cwd)

When `workingDirectory` resolves outside the OpenThrottle monorepo, Ralph prepends an explicit **repository-scope layer** to the agent prompt before the injected Cortex context. It tells the agent it is operating in the target repository (not OpenThrottle) and must not reference OpenThrottle-specific paths, commands, rules, generators, or tooling (e.g. `applications/openthrottle-developer`, `tools/workflows`, `@tools/generators`, `/skills`). This prevents OpenThrottle-developer path/command inventory from bleeding into a cross-repo run.

The foreign root is detected via `resolveForeignWorkspaceContext` (which uses `getOpenThrottleRoot`: `WORKFLOW_RALPH_OT_ROOT` → `WORKSPACE_ROOT` → module walk-up → cwd). When a foreign cwd is detected, Ralph also logs a `🧭 Foreign workspace:` line for observability. Runs inside the monorepo are unaffected (no extra layer).

## Manual E2E (foreign cwd)

From another checkout, export OpenThrottle's Cortex URL, invoke this monorepo's binary, and confirm plan load plus debug output:

```bash
export OPENTHROTTLE_POSTGRES_URL="$(grep '^POSTGRES_URL=' /path/to/openthrottle/.env | cut -d= -f2-)"
cd /path/to/other-repo
WORKFLOW_RALPH_OT_DIAGNOSTICS=1 /path/to/openthrottle/node_modules/.bin/workflow-ralph \
  --plan <cortex-plan-uuid> --debug --iterations 1
```

Expect stderr lines prefixed `[workflow-ralph:ot-diagnostics]` (sanitized `postgresIdentity`, `cwd`) and `[workflow-ralph:debug]` before the agent runs; stdout should show the plan row, not `Plan not found`.

Full details and examples: [README § Cross-repo usage](../README.md#cross-repo-usage).
