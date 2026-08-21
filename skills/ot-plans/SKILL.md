---
name: ot-plans
description: >-
  OpenThrottle plans and tasks via the openthrottle-mcp server. USE WHEN
  creating, reading or updating plans/tasks, searching the plans knowledge base,
  putting Plan-Id/Task-Id in a commit, recording a merged squash on the work
  ledger, or the user mentions OT, a plan or task UUID, or git–OT traceability.
  Plans live in OT only — never fall back to Markdown. To execute a plan see
  ot-claude-loop.
---

# OpenThrottle plans and MCP traceability

## When to read this skill

Use alongside repository rules (`.cursor/rules/commands/openthrottle.mdc`, `.cursor/rules/commands/agents.mdc`) when work touches **plans, tasks, OT knowledge base, or Ralph-injected plan context**.

## OT vs documentation

| Need                                                          | Use                                                                                                     |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Plans, tasks, embeddings, plan output, activity, commit links | **openthrottle-mcp** (`@openthrottle/openthrottle-mcp`), registered in Cursor as **`openthrottle-mcp`** |
| Semantic search over repo **`docs/`**                         | **docs-mcp** (separate server)                                                                          |
| Schema, migrations, DB setup                                  | `databases/README.md`                                                                                   |

Do not answer OT plan content from memory; use MCP tools and answer from retrieved chunks only.

## Fail loudly

- **Creating or updating plans/tasks:** use OT only (`create_plan`, `create_task`, `update_task`, etc.).
- If **openthrottle-mcp is unavailable** or **`create_plan` / `create_task` fails:** report the error clearly to the user.
- **Do not** silently write plans to Markdown under `docs/` or skip plan creation.

## MCP workflow (openthrottle-mcp)

GraphQL-only boundary to **openthrottle-server**. Typical tools:

- **Read / search:** `semantic_search`, `list_plans_by_status`, `list_sources`, `get_document`
- **Plans:** `get_plan`, `create_plan`
- **Tasks:** `get_tasks_by_plan_id`, `get_remaining_tasks_for_plan`, `get_task`, `create_task`, `create_tasks`, `update_task`, `reorder_plan_tasks` — list tools return tasks in `sortOrder ASC`, `createdAt ASC`. `create_task` / `create_tasks` accept optional `sortOrder` (auto-append `MAX + 1000` when omitted; batch appends preserve array order at end of plan). `update_task` accepts optional `sortOrder` for gap-based mid-list inserts. **`reorder_plan_tasks`** bulk-renumbers `1000, 2000, …` in the given task-id order — **prefer this over delete-and-recreate** when fixing Ralph execution order.
- **Activity:** `get_activity_by_date`, `get_last_activity`
- **Output stream (e.g. Ralph):** `append_plan_output`, `get_plan_output`
- **After merge (work ledger):** `attach_session_subject` + `record_artifact` (type `git_commit`) — or the `workflow-link-merge` CLI, which orchestrates them

**Author and assignee** on plans must be the **GitHub username** (not display name). When `GITHUB_USER` is set, the MCP uses it for author/assignee.

## Executing a plan

The per-task discipline — one task `IN_PROGRESS` at a time, work, validate, flip to `COMPLETED`,
commit with `Plan-Id:` / `Task-Id:` — is stated canonically in
[`ot-claude-loop`](../ot-claude-loop/SKILL.md) § The loop. Do not restate it here.

## Common operations

The four thin `/ot/*` slash wrappers (`ot-ask`, `ot-create-plan`, `ot-edit-task`,
`ot-list-by-status`) were retired into this section — each was a restatement of one MCP call. The
conventions they carried are worth keeping:

- **Ask the knowledge base.** Prefer `semantic_search` for semantic questions, `list_sources` to
  enumerate what is indexed, and `get_document` (or `knowledge-base://chunk/{id}`) for full chunk
  content. For "what did I work on yesterday / in the last 7 days", use
  `get_activity_by_date` — `date` (`YYYY-MM-DD`) for one day, `daysBack` (1–365) for a window.
  Answer only from retrieved chunks; if nothing relevant comes back, say so rather than inventing.
- **Create a plan.** `create_plan` needs `title`; infer `author` (GitHub handle) and `category`
  from context when absent, and confirm a provided `category` actually fits. Use the atomic
  `create_plans` / `create_tasks` for batches. Report the created plan and task ids so the user can
  act on them. **Never start executing a plan or task unless explicitly told to.**
- **Edit a task.** `get_task` to load it when you need current state, `update_task` with the id and
  only the changed fields. Report what changed.
- **List by status.** `list_plans_by_status` with `PENDING`, `IN_PROGRESS`, `COMPLETED`, `BLOCKED`,
  or `SKIPPED`. "The backlog" means `PENDING` — default to it when the user names no status.

## Commits while working on OT plans/tasks

When you commit work tied to a plan or task:

1. Use **conventional commits** (see **github-commit** skill and `.cursor/rules/commands/github.mdc`).
2. Include traceability in the commit **body or footer**:

   ```text
   Plan-Id: <plan-uuid>
   Task-Id: <task-uuid>
   ```

3. **Do not** record a commit artifact for every task commit. **Record only landed work** (see below).

## Post-merge: record the squash commit on the work ledger

The `link_commit` MCP tool and its `commit_links` table are **retired** (work-ledger epic). Record the merged squash commit as a work-ledger `git_commit` artifact instead:

- **MCP:** `attach_session_subject(planId, taskId?)` then `record_artifact(type: "git_commit", payloadJson: {repo, sha}, message?)` under an open session (opened implicitly by the MCP). One artifact per task per **squash commit on main** — not transient branch commits.
- **One-shot CLI (preferred ergonomics):** `pnpm exec workflow-link-merge --plan <plan-uuid> --sha <squash-sha> --repo <owner/repo> [--task <task-uuid>] [--message <msg>]` — orchestrates the same ledger primitives internally.

The artifact is recorded `unverified`; the git verifier promotes it to `landed`/`verified`. `get_activity_by_date` and `get_last_activity` surface the ledger, aligned with **landed** commits.

## Task sortOrder (execution order)

`sortOrder` is the canonical execution and list sequence for tasks within a plan (`UNIQUE (plan_id, sort_order)`). Ralph, prompt injection, and MCP list tools all order by `sortOrder ASC`, `createdAt ASC`.

- **Create:** omit `sortOrder` to append after the plan max; `create_tasks` assigns `MAX+1000`, `MAX+2000`, … in array order.
- **Reorder:** use `reorder_plan_tasks` instead of deleting and recreating tasks when fixing order.
- **Schema detail:** `databases/README.md` § Task sort_order.

## Skill-usage outcome enrichment (automatic)

Outcomes + duration are now captured **automatically, with zero manual steps**. The
`PreToolUse` / `UserPromptExpansion` hook records each start (→ `skill_usage_events`, the
Invocations column) and remembers it in a session-scoped correlation store; the `Stop` hook
(`.claude/hooks/skill-usage-complete.cjs`) then emits one `success` outcome per open start with
`duration_ms = Stop − start` (→ `skill_usage_outcomes`, powering the **Outcomes** + **Avg
duration** columns on `/usage`). You do **not** need to run anything at skill completion.

Missing outcomes remain a valid state: third-party / uninstrumented skills legitimately show `—`.

**Optional precision (opt-in):** to record a specific outcome the automatic path can't infer —
notably `error` (the `Stop` payload carries no error signal) — call the manual helper:

```bash
node .claude/hooks/skill-usage-outcome.cjs \
  --skill ot-plans \
  --outcome error \
  --duration-ms 4200 \
  --session "$CLAUDE_SESSION_ID"
```

`--outcome` is `success` | `abandoned` | `error`. Fail-open throughout: outcome capture never
blocks the skill.

## Cross-links

- **Conventional commits and staging:** `.agents/skills/github-commit/SKILL.md`
- **OT rule (tool list, commands):** `.cursor/rules/commands/openthrottle.mdc`
- **Agent behavior (plans in OT only):** `.cursor/rules/commands/agents.mdc`
- **DB / embeddings / ingest:** `databases/README.md`
- **Repo OT overview:** `AGENTS.md` (OpenThrottle section)
