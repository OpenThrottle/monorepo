# Instructions

Your job is to list plans in Cortex filtered by **status** using the ai-mcp MCP server.

## Rules

- **ALWAYS** follow the rules in `.cursor/rules/commands/cortex.mdc`
- **ALWAYS** use **`list_plans_by_status`** from the ai-mcp MCP server with the requested `status` (e.g. `pending`, `in_progress`, `completed`, `blocked`, `skipped`)
- If the user did not specify a status, default to **`pending`** or ask which status they want
- **ALWAYS** report the results as a clear list (plan title, and optionally id/author/category). If none are found, say "No plans with status {status}."
