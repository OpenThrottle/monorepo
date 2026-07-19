---
name: ot-create-plan
description: >-
  Create a new plan (and optional initial tasks) in OpenThrottle via
  openthrottle-mcp create_plan and create_task. USE WHEN the user runs
  /ot/create-plan, asks to add a plan to OpenThrottle/OT, or wants a structured plan
  record without starting execution—report created plan and task ids.
disable-model-invocation: true
source: openthrottle
---

Your job is to create a new **plan** in OpenThrottle using the openthrottle-mcp MCP server. Optionally add initial **tasks** to the plan.

## Rules

- **ALWAYS** follow the rules in [openthrottle.mdc](../../rules/commands/openthrottle.mdc)
- **ALWAYS** use **`create_plan`** from the openthrottle-mcp MCP server with required fields: `title`, `author` (GitHub handle), `category`; optional: `description`, `status` (default: `pending`)
- If the user provides initial tasks, use **`create_task`** for each with `planId` (from the created plan) and `title`; optional: `description`, `category`, `status`, `requirements`
- **ALWAYS** report the created plan (id, title, and any created task ids/titles) in a clear, readable format
- **NEVER** start a task or plan unless explicitly told to do so.
