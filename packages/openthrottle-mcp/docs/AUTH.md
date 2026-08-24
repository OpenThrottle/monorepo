# Authentication (GraphQL)

Tools that call authenticated GraphQL (plans, tasks, notes, semantic search, and similar) send `Authorization: Bearer <token>`. The MCP resolves the token at runtime and passes it to `executeGraphqlWithAuth`.

## Token types

| Token                                     | Format                                 | Who uses it                   | Lifetime                                                                 |
| ----------------------------------------- | -------------------------------------- | ----------------------------- | ------------------------------------------------------------------------ |
| **Service account** (recommended for MCP) | `ot_sa_<prefix>_<secret>`              | Cursor MCP, CI, Ralph workers | Long-lived; rotate by creating a new credential and revoking the old one |
| **Human JWT**                             | Standard JWT from `login` / `register` | Developer UI, admin GraphQL   | ~24h; must re-login or refresh manually                                  |

Use a **service account** token for `OPENTHROTTLE_MCP_AUTH_TOKEN` so automation does not depend on a human session that expires. Human JWTs still work, but they are a poor fit for always-on MCP.

## First-time setup (local)

1. Start Postgres/Redis and run migrations:

```bash
 pnpm run database:start
 pnpm run database:migrate
```

Migration `045_seed_service_accounts_bootstrap.sql` creates service accounts `openthrottle-mcp` and `workflow-ralph` with roles `mcp` and `workflow-ralph` (`plans:read`, `plans:write`). It does **not** store secrets. 2. Mint bearer tokens (plaintext shown once):

```bash
 pnpm run database:bootstrap-service-accounts
```

3. Copy output into env:

- `**OPENTHROTTLE_MCP_AUTH_TOKEN**` — Cursor MCP, CLI, embedded server tools
- `**OPENTHROTTLE_WORKER_GRAPHQL_AUTH_TOKEN**` — BullMQ / in-process Ralph orchestrator (optional separate `workflow-ralph` account)
  Also set in `applications/openthrottle-server/.env` if the server or workers read tokens from that file.

4. Restart openthrottle-server and reload the MCP in Cursor after changing tokens.

Every minted/rotated line is also written to the git-ignored `.bootstrap-secrets.local` at the repo root (mode `0600`) so you can recover it without scrolling back through setup output. `./scripts/setup.sh` ends by running `pnpm check:bootstrap-secrets`, which fails loudly if any of the six required keys is missing.

## Recovering a missing token in `.bootstrap-secrets.local`

`.bootstrap-secrets.local` must always hold all six keys: `OPENTHROTTLE_ADMIN_URL`, `OPENTHROTTLE_BOOTSTRAP_USER_EMAIL`, `OPENTHROTTLE_BOOTSTRAP_USER_PASSWORD`, `OPENTHROTTLE_DEVELOPER_URL`, `OPENTHROTTLE_MCP_AUTH_TOKEN`, `OPENTHROTTLE_WORKER_GRAPHQL_AUTH_TOKEN`. A token line only appears when its credential is **freshly minted, rotated, or provisioned from the environment** — the stored value is a bcrypt hash, so a plaintext token can **never** be re-derived from the database once minted.

`pnpm database:bootstrap-service-accounts` now **self-heals**: if a service account already has an active credential but its key is absent from the file, it revokes the stale credential(s), mints a fresh token, and writes it (restricted to the `openthrottle-mcp` / `workflow-ralph` bootstrap accounts). So the normal recovery is simply:

```bash
pnpm database:bootstrap-service-accounts   # auto-rotates the missing key
pnpm check:bootstrap-secrets               # confirms all six keys present
```

Any previously-distributed copy of the rotated token stops working — update `OPENTHROTTLE_MCP_AUTH_TOKEN` in `applications/openthrottle-server/.env` and Cursor MCP `env`, then reload the MCP. To rotate by hand instead, revoke the active credential in admin GraphQL (see [Credential rotation](#credential-rotation)), delete the stale line, and re-run the bootstrap script.

**Nuke gotcha:** `pnpm database:stop` / `docker compose down` (no `-v`) leave the named Postgres volume — and thus the existing service-account credentials — intact, so the next bootstrap sees an active credential and takes the rotate path instead of a clean first mint. For a truly fresh mint you must remove the volume with `docker compose down -v` (this destroys the local database — see [databases/README.md](../../../databases/README.md)).

## Token source (openthrottle-mcp)

- **Per-request (embedded in openthrottle-server):** `withMcpDeveloperAuthToken` / `withMcpDeveloperAuthTokenAsync` from `@openthrottle/openthrottle-mcp/auth` so concurrent GraphQL requests do not share a global token.
- **Primary (stdio MCP / CLI):** environment variable `**OPENTHROTTLE_MCP_AUTH_TOKEN`\*\*

Resolution order: per-request store → `OPENTHROTTLE_MCP_AUTH_TOKEN`. If none is set or the value is empty, authenticated tools throw an error that instructs you to set the env var.

The stdio launcher (`scripts/run-openthrottle-mcp.sh`) resolves the token before `exec`: it treats an unexpanded `${…}` placeholder or empty value as unset, then self-loads from this worktree's `.env` and finally the root checkout's `.env`. It records the file it loaded from in `OT_MCP_AUTH_TOKEN_ENV_FILE` so the running process can re-read it (see [Mid-session rotation](#mid-session-rotation)).

## Recovery runbook — stale MCP (authenticated tools 401, `health` OK)

**The trap.** `openthrottle-mcp` is a long-lived stdio child of the MCP client. If its bearer token is missing/invalid/revoked, the client still connects and lists tools, and `health` (unauthenticated) stays green — but **every authenticated tool call 401s** for the rest of the session. It looks connected; it is dead.

**Symptom.** `create_plan`, `list_plans_by_status`, `list_sources`, `semantic_search`, etc. fail with an auth/401 error while `health` returns `ok`.

**Diagnose (in-band, fastest).** Call the **`auth_status`** MCP tool. It runs one authenticated probe and answers unambiguously:

- `AUTHENTICATED` → the token is fine; the failure is elsewhere.
- `STALE / UNAUTHENTICATED` → the token is missing/revoked/wrong-server/under-permissioned. Recover below.
- `INCONCLUSIVE` → transient/network/5xx; check the server is up (`health`) and retry before touching the token.

**Diagnose (shell).** From the repo root: `scripts/verify-openthrottle-mcp-env.sh`. It reports server reachability and, when `OPENTHROTTLE_MCP_AUTH_TOKEN` is set, whether the server accepts it. Both `auth_status` and this script **decide on the response body** — the server answers auth failures with **HTTP 200 + an `errors` array** (`"path":["listSources"]`), so status code alone (and a naive `grep listSources`) false-passes.

**Fix.**

1. Provision/verify a token: `pnpm run database:bootstrap-service-accounts` (see [First-time setup](#first-time-setup-local) / [Credential rotation](#credential-rotation)).
2. Set it in the root `.env`: `OPENTHROTTLE_MCP_AUTH_TOKEN=ot_sa_<prefix>_<secret>`.
3. Recover the running process:
   - **Rotated in `.env`** — no action needed: the process re-reads `.env` and picks up the new token within ~5s (see [Mid-session rotation](#mid-session-rotation)).
   - **Revoked** — reconnect the MCP: `/mcp reconnect`, or restart the client.
   - **Reconnect control unavailable** (as on 2026-08-05) — last resort: run the stdio-fallback launcher directly, `bash scripts/run-openthrottle-mcp.sh`, and drive it over stdio.

**Launch-time guarantee.** The launcher runs an **auth preflight** before `exec`: if the token is unset or the server rejects it, it prints a loud banner and `exit 1`, so the client surfaces "failed to start" instead of silently connecting broken. Opt out with `OT_MCP_SKIP_PREFLIGHT=1` (e.g. deployments where the server injects the token per request). Revoked/wrong tokens yield **401**; missing `plans:*` permission yields **403**.

### Mid-session rotation

The preflight only runs at launch. A token **rotated in `.env`** after boot is picked up **without a relaunch**: `getAuthToken()` re-reads the file recorded in `OT_MCP_AUTH_TOKEN_ENV_FILE`, throttled to `OT_MCP_TOKEN_REFRESH_MS` (default 5000ms; `0` disables). It never clobbers a valid token with a missing/empty file value. This does **not** cover a token **revoked** with no `.env` change — that needs a fresh token and a reconnect (above). Design rationale: [mid-session-token-staleness.md](./mid-session-token-staleness.md).

## Cursor MCP config

Register `openthrottle-mcp` by copying the committed template — [`.cursor/mcp.json`](../../../.cursor/mcp.json) → `.cursor/mcp.json` (project) or merged into `~/.cursor/mcp.json` (global / secondary workspace) — rather than pasting the block here. The only **auth-relevant** key is `env.OPENTHROTTLE_MCP_AUTH_TOKEN` (an `ot_sa_…` service-account token); for the full entry shape and launcher behavior see [mcp-registration.md § Template structure](../../../docs/openthrottle/mcp-registration.md#template-structure), the SSOT for the block.

Use an **absolute path** to `run-openthrottle-mcp.sh` when the OpenThrottle repo is not the Cursor workspace root (see [verification-environment.md](./verification-environment.md)).

Do not commit real tokens. Prefer user-level MCP `env` or local `.env` files that are gitignored.

## Credential rotation

Rotate without disabling auth:

1. **Create** a new credential (plaintext returned once):

- **Bootstrap (no active credential):** `pnpm run database:bootstrap-service-accounts`
- **Admin GraphQL (human JWT + `users:write`):** `createServiceAccountCredential` with `serviceAccountId` for `openthrottle-mcp` (or another account). Requires `users:read` / `users:write` on your human user (assign `admin` after first login if needed).

2. **Update** env everywhere the old token was stored:

- `OPENTHROTTLE_MCP_AUTH_TOKEN` in Cursor MCP `env`
- `applications/openthrottle-server/.env` if used there
- CI secrets or deployment env for workers

3. **Verify** authenticated MCP tools (`list_sources`, `list_plans_by_status`, or `create_plan`)

4. **Revoke** the old credential:

- Admin GraphQL: `revokeServiceAccountCredential(credentialId: …)`
- Or revoke via DB/admin UI patterns documented in [openthrottle-server-auth.md](../../../docs/openthrottle/openthrottle-server-auth.md)

Overlap step 2–3 briefly so clients are not left without a valid token. Revoked or wrong tokens yield **401**; missing `plans:`\* permission yields **403**.

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

Use the `serviceAccountId` for `openthrottle-mcp` in `CreateServiceAccountCredentialInput`. Store `token` immediately; it cannot be fetched again.

## Workflow worker token

Plans queue / Ralph orchestration can call GraphQL with `**OPENTHROTTLE_WORKER_GRAPHQL_AUTH_TOKEN**` (service account `workflow-ralph`). Mint via the same bootstrap script or admin GraphQL.

See `applications/openthrottle-server/.env.default` and [databases/README.md](../../../databases/README.md).

## Human JWT (optional for MCP)

For one-off testing you can set `OPENTHROTTLE_MCP_AUTH_TOKEN` to a JWT from:

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
