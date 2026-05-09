---
name: ot-plans
description: >-
  OpenThrottle (OT) plans and tasks via the mcp-developer MCP server (GraphQL
  to openthrottle-server). USE WHEN creating or updating plans/tasks, plans in
  OT only, failing loudly when MCP is unavailable (no Markdown plan
  fallbacks), Plan-Id and Task-Id in commits, link_commit or
  workflow-link-merge after merge, or the user mentions OpenThrottle, OT,
  Cortex, mcp-developer, plan UUIDs, task UUIDs, /ot commands, semantic search
  over plans, or git–OT traceability. Covers when to use OT vs docs-mcp vs
  databases/README and plan/task lifecycle.
---

# OpenThrottle plans and MCP traceability

## When to read this skill

Use alongside repository rules (`.cursor/rules/commands/openthrottle.mdc`, `.cursor/rules/commands/agents.mdc`) when work touches **plans, tasks, OT knowledge base, or Ralph-injected plan context**.

## OT vs documentation

| Need                                                          | Use                                                                                            |
| ------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Plans, tasks, embeddings, plan output, activity, commit links | **mcp-developer** (`@openthrottle/mcp-developer`), registered in Cursor as **`mcp-developer`** |
| Semantic search over repo **`docs/`**                         | **docs-mcp** (separate server)                                                                 |
| Schema, migrations, DB setup                                  | `databases/README.md`                                                                          |

Do not answer OT plan content from memory; use MCP tools and answer from retrieved chunks only.

## Fail loudly

- **Creating or updating plans/tasks:** use OT only (`create_plan`, `create_task`, `update_task`, etc.).
- If **mcp-developer is unavailable** or **`create_plan` / `create_task` fails:** report the error clearly to the user.
- **Do not** silently write plans to Markdown under `docs/` or skip plan creation.

## MCP workflow (mcp-developer)

GraphQL-only boundary to **openthrottle-server**. Typical tools:

- **Read / search:** `semantic_search`, `list_plans_by_status`, `list_sources`, `get_document`
- **Plans:** `get_plan`, `create_plan`
- **Tasks:** `get_tasks_by_plan_id`, `get_remaining_tasks_for_plan`, `get_task`, `create_task`, `create_tasks`, `update_task`
- **Activity:** `get_activity_by_date`, `get_last_activity`
- **Output stream (e.g. Ralph):** `append_plan_output`, `get_plan_output`
- **After merge:** `link_commit`

**Author and assignee** on plans must be the **GitHub username** (not display name). When `GITHUB_USER` is set, the MCP uses it for author/assignee.

Cursor **`/ot/*`** commands live under `.cursor/commands/ot/`; they instruct use of these tools.

## Commits while working on OT plans/tasks

When you commit work tied to a plan or task:

1. Use **conventional commits** (see **git-commit** skill and `.cursor/rules/commands/github.mdc`).
2. Include traceability in the commit **body or footer**:

   ```text
   Plan-Id: <plan-uuid>
   Task-Id: <task-uuid>
   ```

3. **Do not** call `link_commit` for every task commit. **`link_commit` is for landed work** (see below).

## Post-merge: `link_commit` (squash on main)

- **`link_commit(planId, repo, sha, taskId?, message?)`** associates the **squash commit on main** with the plan (and optionally a task).
- **Preferred workflow:** link **only the squash commit after the PR merges** so `commit_links` reflects what shipped. Avoid linking transient branch commits during Ralph runs if your team follows Option A.
- **Alternative:** `pnpm exec workflow-link-merge --plan <plan-uuid> --sha <squash-sha> --repo <owner/repo>`

`get_activity_by_date` and `get_last_activity` are aligned with **landed** commits when you link this way.

## Cross-links

- **Conventional commits and staging:** `.agents/skills/git-commit/SKILL.md`
- **OT rule (tool list, commands):** `.cursor/rules/commands/openthrottle.mdc`
- **Agent behavior (plans in OT only):** `.cursor/rules/commands/agents.mdc`
- **DB / embeddings / ingest:** `databases/README.md`
- **Repo OT overview:** `AGENTS.md` (OpenThrottle section)
