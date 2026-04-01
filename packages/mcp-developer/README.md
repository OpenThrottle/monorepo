# @openthrottle/mcp-developer

Model Context Protocol server for OpenThrottle: plans, tasks, and GraphQL-backed tools (no direct database access). Tools call openthrottle-server over GraphQL only.

For schema, embeddings, and local Postgres setup, see [databases/cortex/README.md](../../../databases/cortex/README.md). Workspace-wide conventions: [AGENTS.md](../../../AGENTS.md).

## Authentication

Authenticated GraphQL calls use a token from the environment. Set **`MCP_DEVELOPER_AUTH_TOKEN`** to your JWT or API token so tools can call `executeGraphqlWithAuth`. See [docs/AUTH.md](docs/AUTH.md) for details and Cursor MCP config.

## Installation

**In this monorepo:** add `"@openthrottle/mcp-developer": "workspace:*"` where needed, or run the MCP from this package after a build. See [AGENTS.md](../../../AGENTS.md) for OpenThrottle MCP usage.

**Build and run (monorepo):**

```bash
pnpm nx run @openthrottle/mcp-developer:build
pnpm nx run @openthrottle/mcp-developer:serve
```

This package is **private** to the workspace and is not published to the public registry.
