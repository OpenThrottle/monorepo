---
name: ot-list-by-status
description: >-
  List OpenThrottle plans filtered by status via openthrottle-mcp
  list_plans_by_status (pending, in_progress, completed, blocked, etc.). USE
  WHEN the user runs /ot/list-by-status, asks for plans in a given status, wants
  the pending backlog of not-yet-started work, or did not specify status and
  wants pending/in-progress/completed listings.
disable-model-invocation: true
---

Your job is to list plans in OpenThrottle filtered by **status** using the openthrottle-mcp MCP server. The **pending backlog** is just the default of this command (`status: PENDING`).

## Rules

- **ALWAYS** follow the rules in [openthrottle.mdc](https://github.com/openthrottle/monorepo/blob/main/.agents/rules/commands/openthrottle.mdc)
- **ALWAYS** use **`list_plans_by_status`** from the openthrottle-mcp MCP server with the requested `status` (e.g. `PENDING`, `IN_PROGRESS`, `COMPLETED`, `BLOCKED`, `SKIPPED`)
- If the user did not specify a status, default to **`PENDING`** (the backlog) or ask which status they want
- **ALWAYS** report the results as a clear list (plan title, and optionally id/author/category). If none are found, say "No plans with status {status}."
