# Authentication (GraphQL)

Tools that call authenticated GraphQL (e.g. notes, plans, tasks) need a token. The MCP server resolves it at runtime and passes it to `executeGraphqlWithAuth` as the `Authorization: Bearer <token>` header.

## Token source

- **Primary:** environment variable **`MCP_DEVELOPER_AUTH_TOKEN`**
- **Override:** optional programmatic override via `setAuthTokenOverride(token)` (e.g. tests or host injection at server init)

Resolution order: override → `MCP_DEVELOPER_AUTH_TOKEN`. If none is set or the value is empty, any tool that needs auth will throw a clear error asking you to set one of the env vars.

## How to set the token

1. **Obtain a token** from openthrottle-server (e.g. sign in via GraphQL `login` mutation or use a service JWT).
2. **Export in the process** that runs the MCP server:

   ```bash
   export MCP_DEVELOPER_AUTH_TOKEN="your-jwt-or-api-token"
   ```

3. **In Cursor MCP config:** set the env for the mcp-developer server so it receives the variable when Cursor starts the process.

## Implementation

- **Resolver:** `getAuthToken()` in `src/auth/get-auth-token.ts`. Used by tool handlers (e.g. notes) before calling `executeGraphqlWithAuth(token, document, variables)`.
- **No hardcoded tokens:** all auth is via env (or override). Replace any leftover placeholders with `getAuthToken()`.
