---
name: workflow-ralph
description: >-
  OpenThrottle Ralph CLI and queue workflows: pnpm exec workflow-ralph with
  OpenThrottle plan/task UUIDs; injected /agents/ralph prompt layer; spawn worker vs
  in-process orchestrator (enqueuePlanRun vs enqueuePlanRalphOrchestrator);
  BullMQ and worktree docs in tools/workflows; commit cadence and post-merge
  link_commit; WORKFLOW_RALPH_DEBUG and --debug. USE WHEN running Ralph,
  debugging iterations, or the user mentions workflow-ralph, Ralph, plan
  queue, nested workflow-ralph, Cursor backend, workflow-link-merge, or
  tools/workflows README.
source: openthrottle
---

# Workflow Ralph (CLI and queue)

## When to read this skill

Use when work touches **running Ralph**, **queue-triggered plan runs**, or **how Ralph differs from direct OT MCP usage**. Canonical detail lives in **`tools/workflows/README.md`**; this skill is the agent-facing summary and pointer map.

## OpenThrottle is required

Ralph has **no DB-optional mode**. Plan and tasks live in **OpenThrottle (OpenThrottle) Postgres**. The CLI checks DB reachability at startup (`POSTGRES_URL` or `POSTGRES_*`). See **`tools/workflows/README.md`** (Workflow Ralph section) for exit conditions, iteration behavior, and max-iteration caveats.

## CLI usage (UUIDs)

Run from the monorepo root (or a configured workspace directory):

```bash
pnpm exec workflow-ralph --plan <openthrottle-plan-uuid>
pnpm exec workflow-ralph --task <openthrottle-task-uuid>
```

- **`--plan`:** Plan-centric mode; tasks are picked and updated across iterations.
- **`--task`:** Task-centric mode; plan is resolved from the task when `--plan` is omitted.

Full flags and environment defaults: **`pnpm exec workflow-ralph --help`**. Optional repo-local defaults: **`.workflow-ralph.json`** in process cwd (copy from **`.workflow-ralph.json.example`** at repo root). Precedence: **CLI → environment → file → built-ins** (`WORKFLOW_RALPH_CONFIG_PRECEDENCE` in `@tools/workflows`). Migration: **`docs/workflows/ralph-config-migration.md`**.

Common tuning env vars (see `--help` for the full list): `WORKFLOW_RALPH_BACKEND`, `WORKFLOW_RALPH_PROMPT`, `WORKFLOW_RALPH_PROMPT_FILE`, `WORKFLOW_RALPH_ITERATIONS`, `WORKFLOW_RALPH_ITERATION_TIMEOUT`, `WORKFLOW_RALPH_MODEL`, `WORKFLOW_RALPH_PROJECT`. **`RALPH_DEBUG`** is a deprecated alias for **`WORKFLOW_RALPH_DEBUG`** (still supported).

## Injected plan context (Ralph prompt)

When Ralph injects **Plan-Id**, tasks, and **current task** into the prompt, treat that as source of truth for the iteration: **do not** call `get_plan` or `get_tasks_by_plan_id` to re-fetch the same payload unless you have a reason (for example debugging a mismatch).

**Layer-1 prompt profile:** default **`--prompt`** is command-style **`/agents/ralph`** (see `.cursor/skills/agents-ralph/SKILL.md`). Override with **`--prompt-file`** (repeatable; persona + skills) or **`--prompt-stdin`** when needed.

## Task completion signals

Ralph parses agent output for:

- **`<ralph:task-complete>TASK_UUID</ralph:task-complete>`** — marks the task completed in OpenThrottle when emitted for the current task.
- **`<promise>COMPLETE</promise>`** — completion signal; Ralph can align task status when the tag above is omitted (see **`tools/workflows/README.md`**).

On **ERROR** or **INPUT_REQUIRED**, Ralph exits non-zero per parser rules.

## Commit cadence during Ralph runs

After each task or logical chunk: **commit** with conventional messages and **`Plan-Id` / `Task-Id`** footers. **Do not** call **`link_commit`** for those commits. Link **only the squash commit on main after PR merge** — use **`pnpm exec workflow-link-merge`** or OT **`link_commit`** (see **`.agents/skills/ot-plans/SKILL.md`**).

## Spawn vs orchestrator (API queue)

Same OpenThrottle semantics; different host process (see **`tools/workflows/README.md`** section **Worktree + BullMQ workflow**):

| Trigger / path                       | What runs                                                                                                                                |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Local terminal                       | **`pnpm exec workflow-ralph`** — Cursor (or configured backend) per iteration; OpenThrottle via **this process** `POSTGRES_*`            |
| **`enqueuePlanRun`** (default spawn) | Worker runs **nested** `pnpm exec workflow-ralph` (e.g. `runChildJob`), optionally in a **worktree** when configured                     |
| **`enqueuePlanRalphOrchestrator`**   | **No** nested CLI child: **in-process** orchestrator (`createWorkflowRalphOrchestrator` / server integration) with the same logical loop |

Payload tuning (`RalphNestedRunTuningInput`, argv mapping) is documented in **`applications/openthrottle-server/src/queues/plans/plans.types.ts`** and the README.

**Multi-workspace / foreign cwd:** Plans can pass **`workingDirectory`** (absolute path) so the worker spawns Ralph in another checkout; the worker injects **`OPENTHROTTLE_POSTGRES_URL` / `POSTGRES_URL`** so nested Ralph hits the same OpenThrottle DB. See **`tools/workflows/README.md`** (Multi-workspace plans).

## Debugging hangs

Opt-in shim logger: **`WORKFLOW_RALPH_DEBUG=1`**, **`--debug`**, or **`--verbose`** (stderr lines prefixed `[workflow-ralph:debug]`). See **`tools/workflows/README.md`** (Debugging Ralph).

## Related bins

- **`pnpm exec workflow-link-merge --plan <uuid> --sha <squash-sha> --repo <owner/repo>`** — post-merge squash link to OT (pair with **ot-plans** skill).

## Cross-links

- **Canonical:** `tools/workflows/README.md`
- **Config migration:** `docs/workflows/ralph-config-migration.md`
- **Design / runtime config:** `docs/workflows/ralph-design.md`, `docs/workflows/ralph-workflow-runtime-config.md`, `docs/workflows/ralph-per-package-config-adr.md`
- **Process / worktrees:** `docs/process-model.md`, `docs/worktree-registration-and-allocation.md`
- **OT plans, commits, link_commit:** `.agents/skills/ot-plans/SKILL.md`
- **Repo index:** `AGENTS.md` (Workflow CLI section)
- **Investigation (Docker/worker cwd):** OpenThrottle plan `677b6849-1912-4fa8-a5f6-d8233f2cdf97`
