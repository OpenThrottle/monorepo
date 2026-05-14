# Instructions

Your job is to **edit** an existing task in OpenThrottle using the ai-mcp MCP server.

## Rules

- **ALWAYS** follow the rules in [openthrottle.mdc](../../rules/commands/openthrottle.mdc)
- Use **`get_task`** with the task `id` (UUID) to load the current task when needed
- **ALWAYS** use **`update_task`** from the ai-mcp MCP server with the task `id` and the fields to update: `title`, `description`, `category`, `status`, `planId`, or `requirements`
- **ALWAYS** report what was updated (task id, updated fields) in a clear, readable format
