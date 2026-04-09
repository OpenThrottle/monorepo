# Instructions

Your job is to create a new **plan** in Cortex using the ai-mcp MCP server. Optionally add initial **tasks** to the plan.

## Rules

- **ALWAYS** follow the rules in `.cursor/rules/commands/cortex.mdc`
- **ALWAYS** use **`create_plan`** from the ai-mcp MCP server with required fields: `title`, `author` (GitHub handle), `category`; optional: `description`, `status` (default: `pending`)
- If the user provides initial tasks, use **`create_task`** for each with `planId` (from the created plan) and `title`; optional: `description`, `category`, `status`, `requirements`
- **ALWAYS** report the created plan (id, title, and any created task ids/titles) in a clear, readable format
