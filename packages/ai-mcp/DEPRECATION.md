# Deprecation: direct Cortex Postgres in ai-mcp

**@openthrottle/ai-mcp** connects to the Cortex Postgres database directly (TypeORM DataSource + raw SQL / cortex-client). That path is **deprecated** in favor of **@openthrottle/openthrottle-mcp**, which uses **GraphQL only** (no direct Postgres).

## Why migrate

- **Single API surface:** All Cortex access goes through openthrottle-server GraphQL. No need to expose Postgres connection details to MCP clients.
- **Auth and consistency:** openthrottle-mcp uses `AUTH_TOKEN` (or `OPENTHROTTLE_MCP_AUTH_TOKEN`) for authenticated GraphQL; no `POSTGRES_*` in the MCP environment.
- **Parity:** openthrottle-mcp implements the same tools (notes, plans, tasks, commit links, activity, output stream, semantic search, health) via GraphQL.

## Migration steps

1. **Use openthrottle-mcp in Cursor:** Configure the **openthrottle-mcp** MCP server instead of (or in addition to) ai-mcp. See [README](../openthrottle-mcp/README.md) and [AUTH](../openthrottle-mcp/docs/AUTH.md).
2. **Environment:** Set `AUTH_TOKEN` (or `OPENTHROTTLE_MCP_AUTH_TOKEN`) for openthrottle-mcp. You can remove `POSTGRES_URL` / `POSTGRES_*` from the MCP run environment once you no longer use ai-mcp.
3. **Tool names:** Tool names and arguments are the same (e.g. `list_plans_by_status`, `semantic_search`, `create_plan`). Cortex rules and `/cortex/*` commands apply to whichever MCP server provides these tools (ai-mcp or openthrottle-mcp).

## Timeline

- ai-mcp remains available and supported for transition. No removal date is set; direct Postgres code may be retired in a later change once all consumers have migrated to openthrottle-mcp or GraphQL.
