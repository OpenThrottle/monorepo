# Authentication (GraphQL)

Tools that call authenticated GraphQL (e.g. notes, plans, tasks) need a token. The MCP server resolves it at runtime and passes it to `executeGraphqlWithAuth` as the `Authorization: Bearer <token>` header.

## Token source

- **Per-request (embedded in openthrottle-server):** `withMcpDeveloperAuthToken` / `withMcpDeveloperAuthTokenAsync` from `@openthrottle/mcp-developer/auth` (re-exported by `@openthrottle/nestjs-mcp-developer`) so concurrent GraphQL requests do not share a global token.
- **Primary (stdio MCP / CLI):** environment variable **`MCP_DEVELOPER_AUTH_TOKEN`**

Resolution order: per-request store → `MCP_DEVELOPER_AUTH_TOKEN`. If none is set or the value is empty, any tool that needs auth will throw a clear error asking you to set the env var.

## How to set the token

1. **Obtain a token** from openthrottle-server (e.g. sign in via GraphQL `login` mutation or use a service JWT).
2. **Export in the process** that runs the MCP server:

   ```bash
   export MCP_DEVELOPER_AUTH_TOKEN="your-jwt-or-api-token"
   ```

3. **In Cursor MCP config:** set the env for the mcp-developer server so it receives the variable when Cursor starts the process.

## Implementation

- **Resolver:** `getAuthToken()` in `src/auth/get-auth-token.ts`. Used by tool handlers (e.g. notes) before calling `executeGraphqlWithAuth(token, document, variables)`.
- **No hardcoded tokens:** all auth is via per-request store or env. Replace any leftover placeholders with `getAuthToken()`.
