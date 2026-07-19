---
name: ot-edit-task
description: >-
  Edit an existing OpenThrottle task via openthrottle-mcp get_task and
  update_task (title, description, status, category, requirements, planId). USE
  WHEN the user runs /ot/edit-task, names a task UUID, or wants to change task
  status or fields in OT—report what was updated.
disable-model-invocation: true
---

Your job is to **edit** an existing task in OpenThrottle using the openthrottle-mcp MCP server.

## Rules

- **ALWAYS** follow the rules in [openthrottle.mdc](../../rules/commands/openthrottle.mdc)
- Use **`get_task`** with the task `id` (UUID) to load the current task when needed
- **ALWAYS** use **`update_task`** from the openthrottle-mcp MCP server with the task `id` and the fields to update: `title`, `description`, `category`, `status`, `planId`, or `requirements`
- **ALWAYS** report what was updated (task id, updated fields) in a clear, readable format
