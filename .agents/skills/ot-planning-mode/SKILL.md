---
name: ot-planning-mode
description: >-
  Turn a rough idea or notes into an OpenThrottle plan plus tasks via
  openthrottle-mcp create_plan and create_task. USE WHEN the user runs
  /ot/planning-mode, has an unstructured PRD or idea, or wants documented plan
  and task ids before Ralph or manual execution—keep output concise.
tags: [openthrottle, planning]
disable-model-invocation: true
---

Your job is to support the **"random idea → documented plan"** workflow using OpenThrottle (openthrottle-mcp MCP server). Turn the user's idea or rough notes into a structured plan with optional tasks.

## Rules

- **ALWAYS** follow the rules in [openthrottle.mdc](../../rules/commands/openthrottle.mdc)
- **ALWAYS** use **`create_plan`** to create a plan from the user's idea: extract or infer `title` (required), `author` (GitHub handle; infer when missing, e.g. from context), `category` (infer when missing from plan content, or when provided confirm it fits or pick a better one), and optional `description` from their message
- If the idea implies concrete steps or work items, use **`create_task`** for each (with the new plan's id), with clear `title` and optional `description`/`requirements`
- Keep the plan and tasks concise; match the user's tone (brief vs detailed)
- **ALWAYS** report the created plan and any tasks (ids, titles) in a clear, readable format so the user can continue (e.g. run Ralph, edit tasks, or list by status)
