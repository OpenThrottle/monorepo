---
name: ot-plans
description: >-
  OpenThrottle (OT) plans and tasks via the openthrottle-mcp MCP server (GraphQL
  to openthrottle-server). USE WHEN creating or updating plans/tasks, plans in
  OT only, failing loudly when MCP is unavailable (no Markdown plan
  fallbacks), Plan-Id and Task-Id in commits, recording a merged squash on the
  work ledger (record_artifact / workflow-link-merge) after merge, or the user mentions OpenThrottle, OT, openthrottle-mcp, plan UUIDs, task UUIDs, /ot commands, semantic search
  over plans, or git–OT traceability. Covers when to use OT vs docs-mcp vs
  databases/README and plan/task lifecycle.
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

The **`/ot/*`** slash skills are authored under `skills/ot-*` and fanned out by skill-sync to `.agents/skills/ot-*` (read natively by Cursor) and `.claude/skills/ot-*` (Claude Code); they instruct use of these tools.

## Commits while working on OT plans/tasks

When you commit work tied to a plan or task:

1. Use **conventional commits** (see **git-commit** skill and `.cursor/rules/commands/github.mdc`).
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

## Cross-links

- **Conventional commits and staging:** `.agents/skills/git-commit/SKILL.md`
- **OT rule (tool list, commands):** `.cursor/rules/commands/openthrottle.mdc`
- **Agent behavior (plans in OT only):** `.cursor/rules/commands/agents.mdc`
- **DB / embeddings / ingest:** `databases/README.md`
- **Repo OT overview:** `AGENTS.md` (OpenThrottle section)
