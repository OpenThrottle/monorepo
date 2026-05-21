# Authentication (GraphQL)

Tools that call authenticated GraphQL (plans, tasks, notes, semantic search, and similar) send `Authorization: Bearer <token>`. The MCP resolves the token at runtime and passes it to `executeGraphqlWithAuth`.

## Token types

| Token                                     | Format                                 | Who uses it                   | Lifetime                                                                 |
| ----------------------------------------- | -------------------------------------- | ----------------------------- | ------------------------------------------------------------------------ |
| **Service account** (recommended for MCP) | `ot_sa_<prefix>_<secret>`              | Cursor MCP, CI, Ralph workers | Long-lived; rotate by creating a new credential and revoking the old one |
| **Human JWT**                             | Standard JWT from `login` / `register` | Developer UI, admin GraphQL   | ~24h; must re-login or refresh manually                                  |

Use a **service account** token for `MCP_DEVELOPER_AUTH_TOKEN` so automation does not depend on a human session that expires. Human JWTs still work when `APP_ENABLE_AUTHENTICATION=true`, but they are a poor fit for always-on MCP.

## Server: `APP_ENABLE_AUTHENTICATION`

openthrottle-server defaults to **`APP_ENABLE_AUTHENTICATION=true`** in `applications/openthrottle-server/.env.default`.

- **`true`:** `GlobalAuthGuard` validates every non-`@Public()` route. Bearer `ot_sa_…` is checked first; otherwise a human JWT is required. `GqlPermissionsGuard` enforces `@Permissions()` for both principal kinds.
- **`false`:** Auth guards are bypassed (legacy local dev). Do not use in environments where RBAC matters.

MCP and workers should assume **auth enabled** and send a valid service account bearer.

## First-time setup (local)

1. Start Postgres/Redis and run migrations:

   ```bash
   pnpm run database:start
   pnpm run database:migrate
   ```

   Migration `045_seed_service_accounts_bootstrap.sql` creates service accounts `mcp-developer` and `workflow-ralph` with roles `mcp` and `workflow-ralph` (`plans:read`, `plans:write`). It does **not** store secrets.

2. Mint bearer tokens (plaintext shown once):

   ```bash
   pnpm run database:bootstrap-service-accounts
   ```

3. Copy output into env:
   - **`MCP_DEVELOPER_AUTH_TOKEN`** — Cursor MCP, CLI, embedded server tools
   - **`OPENTHROTTLE_WORKER_GRAPHQL_AUTH_TOKEN`** — BullMQ / in-process Ralph orchestrator (optional separate `workflow-ralph` account)

   Also set in `applications/openthrottle-server/.env` if the server or workers read tokens from that file.

4. Restart openthrottle-server and reload the MCP in Cursor after changing tokens.

If the bootstrap script skips an account because an active credential already exists, rotate via [Credential rotation](#credential-rotation) or revoke the old credential in admin GraphQL, then re-run the script.

## Token source (mcp-developer)

- **Per-request (embedded in openthrottle-server):** `withMcpDeveloperAuthToken` / `withMcpDeveloperAuthTokenAsync` from `@openthrottle/mcp-developer/auth` so concurrent GraphQL requests do not share a global token.
- **Primary (stdio MCP / CLI):** environment variable **`MCP_DEVELOPER_AUTH_TOKEN`**

Resolution order: per-request store → `MCP_DEVELOPER_AUTH_TOKEN`. If none is set or the value is empty, authenticated tools throw an error that instructs you to set the env var.

## Cursor MCP config

In `.cursor/mcp.json` (project) or `~/.cursor/mcp.json` (global / secondary workspace), set **`env`** on the `mcp-developer` server:

```json
{
  "mcpServers": {
    "mcp-developer": {
      "command": "bash",
      "args": ["./scripts/run-mcp-developer.sh"],
      "env": {
        "API_URL": "http://localhost:6021",
        "API_URL_INTERNAL": "http://localhost:6021",
        "MCP_DEVELOPER_AUTH_TOKEN": "ot_sa_<prefix>_<secret>"
      }
    }
  }
}
```

Use an **absolute path** to `run-mcp-developer.sh` when the OpenThrottle repo is not the Cursor workspace root (see [verification-environment.md](./verification-environment.md)).

Do not commit real tokens. Prefer user-level MCP `env` or local `.env` files that are gitignored.

## Credential rotation

Rotate without disabling auth:

1. **Create** a new credential (plaintext returned once):
   - **Bootstrap (no active credential):** `pnpm run database:bootstrap-service-accounts`
   - **Admin GraphQL (human JWT + `users:write`):** `createServiceAccountCredential` with `serviceAccountId` for `mcp-developer` (or another account). Requires `users:read` / `users:write` on your human user (assign `admin` after first login if needed).
2. **Update** env everywhere the old token was stored:
   - `MCP_DEVELOPER_AUTH_TOKEN` in Cursor MCP `env`
   - `applications/openthrottle-server/.env` if used there
   - CI secrets or deployment env for workers
3. **Verify** authenticated MCP tools (`list_sources`, `list_plans_by_status`, or `create_plan`) with `APP_ENABLE_AUTHENTICATION=true`.
4. **Revoke** the old credential:
   - Admin GraphQL: `revokeServiceAccountCredential(credentialId: …)`
   - Or revoke via DB/admin UI patterns documented in [openthrottle-server-auth.md](../../../docs/openthrottle/openthrottle-server-auth.md)

Overlap step 2–3 briefly so clients are not left without a valid token. Revoked or wrong tokens yield **401**; missing `plans:*` permission yields **403**.

### Example: admin GraphQL rotation

Sign in as a human admin, then:

```graphql
query {
  serviceAccounts {
    id
    name
  }
}

mutation CreateCred($input: CreateServiceAccountCredentialInput!) {
  createServiceAccountCredential(input: $input) {
    token
    credential {
      id
      prefix
    }
  }
}

mutation Revoke($credentialId: ID!) {
  revokeServiceAccountCredential(credentialId: $credentialId)
}
```

Use the `serviceAccountId` for `mcp-developer` in `CreateServiceAccountCredentialInput`. Store `token` immediately; it cannot be fetched again.

## Workflow worker token

Plans queue / Ralph orchestration can call GraphQL with **`OPENTHROTTLE_WORKER_GRAPHQL_AUTH_TOKEN`** (service account `workflow-ralph`). Mint via the same bootstrap script or admin GraphQL. Prefer this over **`OPENTHROTTLE_WORKER_GRAPHQL_PLACEHOLDER_TOKEN`**, which only bypasses auth when `APP_ENABLE_AUTHENTICATION=false`.

See `applications/openthrottle-server/.env.default` and [databases/README.md](../../../databases/README.md).

## Human JWT (optional for MCP)

For one-off testing you can set `MCP_DEVELOPER_AUTH_TOKEN` to a JWT from:

```graphql
mutation {
  login(input: { email: "you@example.com", password: "…" }) {
    accessToken
  }
}
```

JWTs expire (~24h). Prefer service accounts for MCP.

## Implementation

- **Resolver:** `getAuthToken()` in `src/auth/get-auth-token.ts`. Tool handlers call it before `executeGraphqlWithAuth(token, document, variables)`.
- **No hardcoded tokens:** all auth is via per-request store or env.

## Related docs

- [verification-environment.md](./verification-environment.md) — ports, smoke checklist, secondary workspace
- [openthrottle-server-auth.md](../../../docs/openthrottle/openthrottle-server-auth.md) — guards, RBAC, service account model
- [databases/README.md](../../../databases/README.md) — migrations and bootstrap script
