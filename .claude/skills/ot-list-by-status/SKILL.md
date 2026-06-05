---
name: ot-list-by-status
description: Instructions
disable-model-invocation: true
---

# Instructions

Your job is to list plans in OpenThrottle filtered by **status** using the ai-mcp MCP server.

## Rules

- **ALWAYS** follow the rules in [openthrottle.mdc](../../rules/commands/openthrottle.mdc)
- **ALWAYS** use **`list_plans_by_status`** from the ai-mcp MCP server with the requested `status` (e.g. `PENDING`, `IN_PROGRESS`, `COMPLETED`, `BLOCKED`, `SKIPPED`)
- If the user did not specify a status, default to **`PENDING`** or ask which status they want
- **ALWAYS** report the results as a clear list (plan title, and optionally id/author/category). If none are found, say "No plans with status {status}."
