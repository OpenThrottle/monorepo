---
name: ot-pending
description: >-
  List plans with status pending in OpenThrottle via openthrottle-mcp
  list_plans_by_status. USE WHEN the user runs /ot/pending, asks for pending
  plans, or wants the backlog of not-yet-started OT work—report titles and ids.
disable-model-invocation: true
---

Your job is to list plans that are in a **pending** state using OpenThrottle (ai-mcp MCP server).

## Rules

- **ALWAYS** follow the rules in [openthrottle.mdc](../../rules/commands/openthrottle.mdc)
- **ALWAYS** use **`list_plans_by_status`** with `status: "pending"` from the ai-mcp MCP server
- **ALWAYS** report the results as a clear list (plan title, and optionally id/author/category). If none are found, say "No plans with status pending."
