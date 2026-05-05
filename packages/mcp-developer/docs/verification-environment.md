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

## Secondary workspace (another repo open in Cursor)

Use OpenThrottle MCP while your **active Cursor workspace** is a different checkout (for example any other repo on your machine—not the OpenThrottle monorepo root).

| Requirement                                                                     | Why                                                                                                                                                                                                                                                                                                                                                                                                                   |
| ------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **User-level MCP config** (`~/.cursor/mcp.json`) or equivalent global MCP entry | Project-level `.cursor/mcp.json` inside OpenThrottle is not loaded when that folder is not the workspace root.                                                                                                                                                                                                                                                                                                        |
| **Absolute path to the launcher**                                               | Configuring `bash` with `./scripts/run-mcp-developer.sh` resolves relative to the **open workspace**. Outside the OpenThrottle repo that path does not exist and the MCP fails to start. Prefer **`bash` + absolute path** to `scripts/run-mcp-developer.sh` inside your OpenThrottle clone: `<path-to-openthrottle-repo>/scripts/run-mcp-developer.sh` (replace with your real checkout path; avoid relying on cwd). |
| **Same env as local OT**                                                        | Set `API_URL` / **`API_URL_INTERNAL`** to the running openthrottle-server (e.g. `http://localhost:6021`) and **`MCP_DEVELOPER_AUTH_TOKEN`** for authenticated tools. These are independent of which folder is open in Cursor.                                                                                                                                                                                         |
| **OpenThrottle repo still on disk**                                             | The launcher `cd`s to the monorepo root and reads **that** tree’s `.env` for `OPENAI_API_KEY` before starting Node.                                                                                                                                                                                                                                                                                                   |

**Validated behavior:** `create_plan`, `create_task`, and other GraphQL-backed tools do **not** use the Cursor workspace path; they call openthrottle-server over HTTP. Storing **absolute workspace or repository roots in OpenThrottle** (future app/user config) would mainly improve linking work across repos and semantic context—not a prerequisite for MCP CRUD from a secondary workspace.

### Failure modes (secondary workspace or any host)

| Symptom                                                           | Likely cause                                                                                     |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| MCP process exits immediately with `OPENAI_API_KEY is not set`    | Monorepo root `.env` missing `OPENAI_API_KEY` (launcher requirement).                            |
| MCP fails to start / “no such file” for the shell script          | Relative launcher path while workspace is not the OpenThrottle repo; switch to an absolute path. |
| `health` fails or connection errors                               | Server down, wrong port, or **`API_URL_INTERNAL`** does not match openthrottle-server `PORT`.    |
| Authenticated tools error (“set MCP_DEVELOPER_AUTH_TOKEN” or 401) | Token unset, expired, or wrong server; see [AUTH.md](./AUTH.md).                                 |

## Build and run the MCP locally

```bash
pnpm nx run @openthrottle/mcp-developer:build
API_URL_INTERNAL=http://localhost:6021 MCP_DEVELOPER_AUTH_TOKEN="<token>" pnpm nx run @openthrottle/mcp-developer:serve
```

Or the Cursor launcher (loads `.env` for OpenAI), **from the monorepo root**:

```bash
./scripts/run-mcp-developer.sh
```

## Data fixtures for manual / agent runs

- **Plans and tasks** live in Postgres; there is no checked-in JSON snapshot required for verification. Use an existing scratch plan or create one via MCP (`create_plan` / `create_task`).
- **Smoke baseline:** call tool **`health`** (no auth) — confirms GraphQL `getServerHealth` and connectivity.
- **Authenticated path:** call **`list_sources`** or **`list_plans_by_status`** with **`MCP_DEVELOPER_AUTH_TOKEN`** set.

## Ports reference

See [docs/monorepo/local-services-and-ports.md](../../../docs/monorepo/local-services-and-ports.md) for the canonical port map (server **6021**, Postgres **6010**, etc.).
