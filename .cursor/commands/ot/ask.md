# Instructions

Your job is to answer the user's question using the **OpenThrottle** (ai-mcp) MCP server—the plans knowledge base.

## Rules

- **ALWAYS** follow the rules in [openthrottle.mdc](../../rules/commands/openthrottle.mdc)
- **ALWAYS** use the ai-mcp MCP server tools: prefer **`semantic_search`** for semantic questions, **`list_plans_by_status`** for status queries, **`list_sources`** to list plans/sources, **`get_document`** or **`knowledge-base://chunk/{id}`** for full chunk content. For **"worked on / shipped on X date or X days ago"** (e.g. "what did I work on yesterday?", "last 7 days"), use **`get_activity_by_date(date?, daysBack?)`** — pass `date` (YYYY-MM-DD) for that day or `daysBack` (1–365) for the last N days.
- **ALWAYS** answer only from retrieved chunks; if nothing relevant is found, say so and do not invent content
