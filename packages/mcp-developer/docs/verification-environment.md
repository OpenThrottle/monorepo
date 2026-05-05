# OT MCP verification — environment and fixtures

Use this when exercising **@openthrottle/mcp-developer** against a local **openthrottle-server** (GraphQL only; no direct Postgres from the MCP).

## Runtime dependencies

| Dependency                     | Role                                                             | Typical local value                                                                    |
| ------------------------------ | ---------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| **openthrottle-server**        | GraphQL (`getServerHealth`, plans, tasks, …)                     | `http://localhost:6021` — see `applications/openthrottle-server/.env.default` (`PORT`) |
| **Postgres**                   | Server reads/writes OpenThrottle data                            | From server `.env`: often `localhost:6010`                                             |
| **Redis**                      | Server queues / health                                           | From server `.env`: often `localhost:6011`                                             |
| **`API_URL_INTERNAL`**         | Base URL for `@openthrottle/nodejs-graphql` (appends `/graphql`) | Must match server, e.g. `http://localhost:6021`                                        |
| **`MCP_DEVELOPER_AUTH_TOKEN`** | Bearer token for authenticated tools                             | JWT or API token; see [AUTH.md](./AUTH.md)                                             |
| **`OPENAI_API_KEY`**           | Required by `scripts/run-mcp-developer.sh` before it starts Node | Root `.env` line `OPENAI_API_KEY=...`                                                  |
| **`WORKTREE_ID`**              | Optional; set by `run-mcp-developer.sh` for MCP server naming    | From git worktree basename                                                             |

Cursor MCP config lives in `.cursor/mcp.json` under **`mcp-developer`** — keep **`API_URL` / `API_URL_INTERNAL`** aligned with the running server port.

## Quick prerequisite check

From the monorepo root (optional env override `API_URL_INTERNAL`):

```bash
API_URL_INTERNAL=http://localhost:6021 ./scripts/verify-openthrottle-mcp-env.sh
```

This probes **`GET /health`** on the API base and reports missing `.env` keys / unset auth token.

## Build and run the MCP locally

```bash
pnpm nx run @openthrottle/mcp-developer:build
API_URL_INTERNAL=http://localhost:6021 MCP_DEVELOPER_AUTH_TOKEN="<token>" pnpm nx run @openthrottle/mcp-developer:serve
```

Or the Cursor launcher (loads `.env` for OpenAI):

```bash
./scripts/run-mcp-developer.sh
```

## Data fixtures for manual / agent runs

- **Plans and tasks** live in Postgres; there is no checked-in JSON snapshot required for verification. Use an existing scratch plan or create one via MCP (`create_plan` / `create_task`).
- **Smoke baseline:** call tool **`health`** (no auth) — confirms GraphQL `getServerHealth` and connectivity.
- **Authenticated path:** call **`list_sources`** or **`list_plans_by_status`** with **`MCP_DEVELOPER_AUTH_TOKEN`** set.

## Ports reference

See [docs/monorepo/local-services-and-ports.md](../../../docs/monorepo/local-services-and-ports.md) for the canonical port map (server **6021**, Postgres **6010**, etc.).
