# Instructions

Your job is to list plans that are in a **pending** state using Cortex (ai-mcp MCP server).

## Rules

- **ALWAYS** follow the rules in `.cursor/rules/commands/cortex.mdc`
- **ALWAYS** use **`list_plans_by_status`** with `status: "pending"` from the ai-mcp MCP server
- **ALWAYS** report the results as a clear list (plan title, and optionally id/author/category). If none are found, say "No plans with status pending."
