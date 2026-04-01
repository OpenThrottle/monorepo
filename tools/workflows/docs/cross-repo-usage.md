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

- **Cortex required:** Set `CORTEX_POSTGRES_URL` or the five `CORTEX_POSTGRES_*` vars (host, port, db, user, password) in the environment when invoking Ralph. Export from this monorepo's `.env` or a shared config. The CLI fails fast at startup if Cortex is missing or unreachable (exit code 1, FATAL message).
- **Invocation:** Use the workflow binary from the other repo, e.g. `pnpm exec ../../../../monorepo/node_modules/.bin/workflow-ralph --plan <plan-uuid>`.

Full details and examples: [README § Cross-repo usage](../README.md#cross-repo-usage).
