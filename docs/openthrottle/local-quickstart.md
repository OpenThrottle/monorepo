# OpenThrottle local quickstart

Single path from a fresh clone to a running **openthrottle-server** and a verified **openthrottle-mcp** MCP connection. All commands run from the **monorepo root** unless noted.

**After this:** mental model and agent prompts — [first-time-onboarding.md](./first-time-onboarding.md). Deeper server/UI detail — [run-openthrottle-server-developer.md](./run-openthrottle-server-developer.md). MCP env edge cases — [packages/openthrottle-mcp/docs/verification-environment.md](../../packages/openthrottle-mcp/docs/verification-environment.md).

---

## Prerequisites

- **Node.js** and **pnpm** (see root `package.json` / CI).
- **Docker** for Postgres and Redis (`pnpm run database:start`).
- **Cursor** (or another MCP host) if you want IDE tools — optional for API-only smoke checks.

---

## 1. Install and environment files

```bash
pnpm install
```

Copy defaults into local env files (gitignored):

| File                                                     | Copy from                                                                                                    |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Root `.env`                                              | `[.env.default](../../.env.default)`                                                                         |
| `applications/openthrottle-server/.env`                  | `[applications/openthrottle-server/.env.default](../../applications/openthrottle-server/.env.default)`       |
| `applications/openthrottle-developer/.env` (optional UI) | `[applications/openthrottle-developer/.env.default](../../applications/openthrottle-developer/.env.default)` |

**Host processes + Docker DB:** In `applications/openthrottle-server/.env`, set `POSTGRES_HOST=localhost` and `REDIS_HOST=localhost` when the API runs on your machine and only Postgres/Redis are in Compose. Root `.env.default` uses `host.docker.internal` for tools inside Docker; override on the server `.env` for native dev.

**Auth (default):** MCP and workers need long-lived **service account** tokens (`ot_sa_…`), not human JWTs. See [AUTH.md](../../packages/openthrottle-mcp/docs/AUTH.md).

**Embeddings:** Configure `OPENAI_API_KEY` or `OLLAMA_BASE_URL` on `applications/openthrottle-server/.env` (not required in root `.env` for the MCP launcher). [`scripts/run-openthrottle-mcp.sh`](../../scripts/run-openthrottle-mcp.sh) starts the MCP without a root OpenAI key. Ollama-only path: [run-locally-oss.md § Cursor MCP launcher](./run-locally-oss.md#cursor-mcp-launcher-scriptsrun-openthrottle-mcpsh).

---

## 2. Database: start and migrate

```bash
pnpm run database:start
pnpm run database:migrate
```

- `database:start` — brings up the `postgres` (port **6010**) and `redis` (port **6011**) Compose services via root `docker-compose.yml`.
- `database:migrate` — applies the OpenThrottle schema (includes service-account seed migration **045**; no secrets yet).

Stop the stack when finished: `pnpm run database:stop`.

Schema and imports: `[databases/README.md](../../databases/README.md)`.

---

## 3. Bootstrap service account tokens

With Postgres up and migrations applied:

```bash
pnpm run database:bootstrap-service-accounts
```

On a **fresh database** the script mints one bearer token per service account and prints each **once**. The relevant output looks like this (TypeORM may also log `query: …` lines — ignore those):

```text
=== openthrottle-mcp ===
OPENTHROTTLE_MCP_AUTH_TOKEN=ot_sa_<generated>      # ← copy this line

=== workflow-ralph ===
OPENTHROTTLE_WORKER_GRAPHQL_AUTH_TOKEN=ot_sa_<generated>

Add the lines above to:
  - applications/openthrottle-server/.env
  - Cursor ~/.cursor/mcp.json env for openthrottle-mcp (OPENTHROTTLE_MCP_AUTH_TOKEN only)
Tokens are shown once; store them securely and rotate via admin GraphQL when needed.
```

`ot_sa_<generated>` stands in for the real token the script prints — **never commit the real value**.

1. Copy the `OPENTHROTTLE_MCP_AUTH_TOKEN=ot_sa_…` line into:

- `applications/openthrottle-server/.env` — replace the existing `OPENTHROTTLE_MCP_AUTH_TOKEN=` value.
- Cursor MCP `env` for `openthrottle-mcp` (see step 5).

2. Optionally copy the `OPENTHROTTLE_WORKER_GRAPHQL_AUTH_TOKEN=` line for BullMQ / Ralph workers.

**Re-running** when tokens already exist prints a skip notice instead of new tokens (it does **not** reprint the existing token):

```text
Skip openthrottle-mcp: 1 active credential(s) already exist.
  Revoke old credentials via admin GraphQL, then re-run this script to mint a new token.
No new credentials minted. Set OPENTHROTTLE_MCP_AUTH_TOKEN / OPENTHROTTLE_WORKER_GRAPHQL_AUTH_TOKEN from existing tokens.
```

To rotate (revoke the old credential, then mint a fresh token), see [AUTH.md § Credential rotation](../../packages/openthrottle-mcp/docs/AUTH.md#credential-rotation). Do not commit real tokens.

---

## 4. Start openthrottle-server

In a dedicated terminal:

```bash
pnpm nx run openthrottle-server:start
```

**Defaults:**

- GraphQL at `http://localhost:6021/graphql`
- Health at `http://localhost:6021/health`

**Optional developer UI** (separate terminal):

```bash
pnpm nx run openthrottle-developer:dev
```

Open `http://localhost:6020`. MCP verification does not require the UI.

---

## 5. Configure and verify MCP

### Cursor MCP config

Register `openthrottle-mcp` by copying the committed template — don't hand-write the block:

1. Copy [`.cursor/mcp.json`](../../.cursor/mcp.json) → `.cursor/mcp.json` (this repo as workspace), or merge its `openthrottle-mcp` entry into `~/.cursor/mcp.json` (secondary workspace).
2. Set the `env` keys that matter for local dev: `OPENTHROTTLE_MCP_AUTH_TOKEN` (the `ot_sa_…` from step 3) and — if your editor doesn't populate them from `.env` — `API_URL` / `API_URL_INTERNAL` pointed at the running server (default `http://localhost:6021`; keep them aligned with server `PORT`).

The full block, launcher behavior, and editor parity live in [mcp-registration.md § Template structure](./mcp-registration.md#template-structure) — the SSOT for the entry.

When OpenThrottle is **not** the Cursor workspace root, use an **absolute path** to `scripts/run-openthrottle-mcp.sh` in the `args` array. See [verification-environment.md § Secondary workspace](../../packages/openthrottle-mcp/docs/verification-environment.md#secondary-workspace-another-repo-open-in-cursor).

Restart Cursor after changing MCP config.

### Automated env check (from monorepo root)

```bash
export OPENTHROTTLE_MCP_AUTH_TOKEN="ot_sa_<prefix>_<secret>"
API_URL_INTERNAL=http://localhost:6021 ./scripts/verify-openthrottle-mcp-env.sh
```

Expect `OK: GET …/health`, `OK: embedding provider configured` (or a WARN with link to run-locally-oss), and with the token set `OK: authenticated GraphQL listSources`.

### In Cursor

1. Confirm `openthrottle-mcp` is connected.
2. Call tool `health` (no auth) — `serverHealth` from GraphQL.
3. Call `list_sources` or `list_plans_by_status` — confirms `OPENTHROTTLE_MCP_AUTH_TOKEN` and RBAC with auth enabled.

---

## Default ports (reference)

| Service                       | Port     |
| ----------------------------- | -------- |
| openthrottle-server (GraphQL) | **6021** |
| openthrottle-developer (Vite) | **6020** |
| Postgres                      | **6010** |
| Redis                         | **6011** |

Full map: [local-services-and-ports.md](../monorepo/local-services-and-ports.md).

---

## Troubleshooting

| Symptom                            | What to check                                                                                           |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `database:migrate` fails           | Postgres up? `pnpm run database:start`                                                                  |
| Bootstrap: missing service account | Run migrate first (migration **045**)                                                                   |
| `/health` unreachable              | Server running? `PORT` matches `API_URL_INTERNAL`                                                       |
| `semantic_search` empty or errors  | Set `OLLAMA_BASE_URL` or `OPENAI_API_KEY` on server `.env` — [run-locally-oss.md](./run-locally-oss.md) |
| Authenticated tools 401/403        | Token in MCP `env` and server `.env`; see [AUTH.md](../../packages/openthrottle-mcp/docs/AUTH.md)       |
| MCP script not found in Cursor     | Use absolute path to `run-openthrottle-mcp.sh`                                                          |

---

## Related documentation

| Topic                                | Location                                                                                        |
| ------------------------------------ | ----------------------------------------------------------------------------------------------- |
| First agent workflow after MCP works | [first-time-onboarding.md](./first-time-onboarding.md)                                          |
| Server + developer daily dev         | [run-openthrottle-server-developer.md](./run-openthrottle-server-developer.md)                  |
| MCP verification detail              | [verification-environment.md](../../packages/openthrottle-mcp/docs/verification-environment.md) |
| Auth and tokens                      | [AUTH.md](../../packages/openthrottle-mcp/docs/AUTH.md)                                         |
| DB schema, embeddings, imports       | [databases/README.md](../../databases/README.md)                                                |
| OSS / Ollama                         | [run-locally-oss.md](./run-locally-oss.md)                                                      |
