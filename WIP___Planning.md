# Planning

Plans or tasks can be run with any given `persona`

- however, we should be able to also categorize work programatically as well
- using the workspace / repository as boundaries
- we can also use the `projects` in openthrottle and apply personas like labels
  - Our configuration will need to changes a bit
  - Would be great to `suggest` personas in various UI

```ts
// === openthrottle-mcp ===
// OPENTHROTTLE_MCP_AUTH_TOKEN=ot_sa_FxmNyWpC4HL6_G6herJC9mlWWqLl57QZLAowhCqhfjLFb
//
//
// === workflow-ralph ===
// OPENTHROTTLE_WORKER_GRAPHQL_AUTH_TOKEN=***REMOVED***
//
// Add the lines above to:
//   - applications/openthrottle-server/.env
//   - Cursor ~/.cursor/mcp.json env for openthrottle-mcp (OPENTHROTTLE_MCP_AUTH_TOKEN only)
// Tokens are shown once; store them securely and rotate via admin GraphQL when needed.
```
