---
name: ot-create-plan
description: >-
  Create a plan (and optional initial tasks) in OpenThrottle via openthrottle-mcp
  create_plan / create_plans / create_task / create_tasks. USE WHEN the user runs
  /ot/create-plan, asks to add a plan to OpenThrottle/OT, or wants a rough idea or
  notes turned into a structured plan + tasks record without starting
  execution—report created plan and task ids.
disable-model-invocation: true
---

Your job is to create a new **plan** in OpenThrottle using the openthrottle-mcp MCP server, and optionally add initial **tasks**. This covers both a fully structured plan and the **"rough idea/notes → documented plan"** workflow — infer what the user leaves implicit.

## Rules

- **ALWAYS** follow the rules in [openthrottle.mdc](https://github.com/openthrottle/monorepo/blob/main/.agents/rules/commands/openthrottle.mdc)
- **ALWAYS** use **`create_plan`** with required `title`; `author` (GitHub handle — infer from context when missing) and `category` (infer from plan content when missing, or confirm/adjust when provided so it fits); optional `description`, `status` (default: `pending`). To create several plans at once, use the atomic **`create_plans`**.
- If the user provides — or the idea implies — concrete steps or work items, add tasks: **`create_task`** for a single task, or the atomic **`create_tasks(planId, tasks[])`** for several in one call (preferred for multiple; commits or rolls back together, preserves array order). Each task takes `title`; optional `description`, `category`, `status`, `requirements`.
- Keep the plan and tasks concise; match the user's tone (brief vs detailed).
- **ALWAYS** report the created plan (id, title) and any created task ids/titles in a clear, readable format so the user can continue (e.g. run Ralph, edit tasks, or list by status).
- **NEVER** start a task or plan unless explicitly told to do so.
