---
argument-hint: <planId1> <planId2> … <planIdN>
arguments:
  planIds: string
description: >-
  EXPERIMENTAL, unproven — at concurrency K=1 this is ot-claude-loop in a for
  loop, and it has never been run. Prefer /ot-claude-loop for one plan. USE WHEN
  the user explicitly runs /ot-workflow-orchestration with several plan ids.
disable-model-invocation: true
name: ot-workflow-orchestration
---

> [!WARNING]
>
> **Experimental — not a proven path.** This skill has **zero recorded invocations**, and v1 runs at
> concurrency **K=1**: each plan is executed strictly one after another, so it is
> [`ot-claude-loop`](../ot-claude-loop/SKILL.md) in a `for` loop with none of the fan-out its name
> implies. Real concurrency waits on OT plan `69f47e25`. For a single plan, reach for
> `/ot-claude-loop` — 74 invocations behind it. Use this only when you explicitly want several plans
> driven back-to-back unattended, and expect to debug the runner.

This skill drives **N OpenThrottle plans to completion as a fleet**. It is the sanctioned entrypoint that **authorizes the `Workflow` tool** (multi-agent orchestration opt-in): when the user invokes `/ot-workflow-orchestration <planId…>`, you call `Workflow` with the checked-in runner below.

## How it maps to ot-claude-loop / agents-ralph

A `Workflow` subagent **cannot invoke the built-in `/loop`** — so this skill does not shell out to `/ot-claude-loop`. Instead the runner **re-implements the ralph per-task discipline directly inside each subagent's prompt**: one fresh `agent()` per TASK (a context reset per task, exactly what `/loop` gives), all sharing ONE worktree per plan, then a finalize agent opens the PR.

The per-task prompt in the runner is a deliberate self-contained port: a `Workflow` subagent gets a prompt string, not the skill catalog, so it cannot follow a link. [`ot-claude-loop`](../ot-claude-loop/SKILL.md) § The loop is the canonical statement of that discipline — when it changes, update the runner's prompt to match.

## Invocation

The runner is a **checked-in companion asset**: [`runner.workflow.js`](./runner.workflow.js) in this skill directory. Invoke it by `scriptPath` (absolute path), passing the plan ids as `args`:

```
Workflow({
  scriptPath: '/Users/matt/Development/openthrottle/skills/ot-workflow-orchestration/runner.workflow.js',
  args: ['<planId1>', '<planId2>', '…'],
})
```

`args` accepts a JS array of uuids, a whitespace/comma-separated string (`'uuid1 uuid2, uuid3'`), or an object `{ planIds, ...knobOverrides }`. Non-uuids are ignored with a warning; ids are deduped, order preserved.

Read `skills/<name>/runner.workflow.js` (the SSOT path), **not** `.agents/skills/<canonical>/…` — the fan-out symlinks are gitignored and absent in CI.

### Knobs (defaults)

Override via the object form of `args` (e.g. `args: { planIds: [...], concurrency: 1, perPlanBudget: 450000 }`):

| Knob              | Default         | Meaning                                                                                                                                                                          |
| ----------------- | --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `concurrency` (K) | `1`             | Primary throttle. **v1 is sequential.** K>1 is UNSAFE until the v2 infra-isolation plan lands (shared Postgres/Redis + Nx cache + one OT MCP → cache poisoning / DB corruption). |
| `baseRef`         | `origin/main`   | Ref each per-plan worktree branches from.                                                                                                                                        |
| `implementModel`  | `sonnet`        | Model for all three phase agents (bulk work, cheap per the CLAUDE.md model table). Escalating to opus/fable is a manual override.                                                |
| `perPlanBudget`   | `450000`        | Budget gate. Measured ≈350–420k tokens / ~20–25 min per plan.                                                                                                                    |
| `teardownAfterPr` | `true`          | Remove each worktree once its PR is confirmed real and the branch is pushed/clean. The **branch is always kept**.                                                                |
| `keepBranch`      | `true` (always) | The open PR + the user's verification checkout depend on the branch.                                                                                                             |

## Preconditions

- **OT MCP healthy** — `health()` returns `api/database/redis/websocket = ok`. If OT MCP is unavailable, **fail loudly**; never fall back to Markdown plan files.
- **Docker DB up** — `pnpm run database:start` (Postgres + Redis).
- **Clean base checkout** at `/Users/matt/Development/openthrottle-worktrees/base` and the worktrees dir `/Users/matt/Development/openthrottle-worktrees/` exists.

## What each plan run does

Per plan, in three phases (progress groups reused across plans):

1. **Setup** — create worktree+branch `ot/<slug>` off `baseRef` (idempotent reuse on a recovery re-run), derive the slug from the plan title, run `codegen-graphql` when a fresh worktree lacks `__generated__`/`schema.gql`, set the plan `IN_PROGRESS`, and pull `PENDING`/`QUEUED` tasks in canonical order (`sortOrder ASC, createdAt ASC`), excluding `None` placeholders (resuming any `IN_PROGRESS` task first).
2. **Implement** — one fresh `agent()` per task, serial within the plan: OT tools + `IN_PROGRESS` → tight-scoped work following repo conventions → **sequential** `--skip-nx-cache` validation (never parallel nx) → per-task conventional commit with `Plan-Id:`/`Task-Id:` footers → `COMPLETED` + `append_plan_output` note → `create_tasks` when work reveals more.
3. **Finalize** — mark the plan `COMPLETED` only when every task reached `COMPLETED` (no server-side downward reconcile → otherwise stranded), push the branch, open a **NORMAL** (ready, not draft) PR idempotently (reuse an existing open PR), and optionally tear down the worktree (branch kept, worktree-scoped process kills only — never a bare `pkill`).

## Resumability

Runs are **long** (multi-hour, multi-million-token). To resume a partial fleet after a pause/kill/edit, relaunch with the same args and the prior run id:

```
Workflow({
  scriptPath: '/Users/matt/Development/openthrottle/skills/ot-workflow-orchestration/runner.workflow.js',
  args: ['<same planIds, same order>'],
  resumeFromRunId: '<wf_… from the earlier run>',
})
```

The longest unchanged prefix of `agent()` calls returns cached results instantly; only new/edited calls re-run. Same script + same args → full cache hit.

## Reporting

The runner returns a synthesis object: `{ plans, summary, skippedForBudget, report }`. `summary` is one row per plan — `{ planId, slug, status, prUrl, done, failed }` — where `status` is `done` / `partial` / `failed` / `skipped-budget`. Relay the table (plan → status → PR URL) to the user; the per-plan PR links are the deliverable.

## Rules

- **NORMAL PRs, no auto-merge.** Never merge; never push to `main`; never `--no-verify`.
- **OT-only** for plans/tasks — if the openthrottle-mcp MCP is down, fail loudly (no Markdown fallback).
- **Author/assignee** fields expect the **GitHub username**, not a display name.
- One plan or task failing must **not** abort the fleet — it is isolated as `failed`/`partial` and the batch continues.
- Follow [openthrottle.mdc](../../.agents/rules/commands/openthrottle.mdc) and [github.mdc](../../.agents/rules/commands/github.mdc).
