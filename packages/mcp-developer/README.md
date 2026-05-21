# @openthrottle/mcp-developer

Model Context Protocol server for OpenThrottle: plans, tasks, and GraphQL-backed tools (no direct database access). Tools call openthrottle-server over GraphQL only.

For schema, embeddings, and local Postgres setup, see [databases/README.md](../../../databases/README.md). Workspace-wide conventions: [AGENTS.md](../../AGENTS.md).

## Authentication

Authenticated GraphQL calls use a bearer token from the environment. Set **`MCP_DEVELOPER_AUTH_TOKEN`** to a service account token (`ot_sa_<prefix>_<secret>`) minted via `pnpm run database:bootstrap-service-accounts` or admin GraphQL — not a short-lived human JWT. See [docs/AUTH.md](docs/AUTH.md) for setup, rotation, and Cursor MCP config. For local verification (services, env vars, smoke checklist), see [docs/verification-environment.md](docs/verification-environment.md).

## Installation

**In this monorepo:** add `"@openthrottle/mcp-developer": "workspace:*"` where needed, or run the MCP from this package after a build. See [AGENTS.md](../../AGENTS.md) for OpenThrottle MCP usage.

**Build and run (monorepo):**

```bash
pnpm nx run @openthrottle/mcp-developer:build
pnpm nx run @openthrottle/mcp-developer:serve
```

This package is **private** to the workspace and is not published to the public registry.
