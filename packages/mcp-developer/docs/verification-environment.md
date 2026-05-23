# OT MCP verification — environment and fixtures

Use this when exercising **@openthrottle/mcp-developer** against a local **openthrottle-server** (GraphQL only; no direct Postgres from the MCP).

## Minimal stack (aligned with native checkout)

Verified daily path for **Postgres, Redis, migrations, API, and optional developer UI** is documented in **[run-openthrottle-server-developer.md](../../../docs/openthrottle/run-openthrottle-server-developer.md)**. Summary:

1. **`pnpm install`** at the monorepo root.
2. **Env files:** root `.env`, `applications/openthrottle-server/.env`, and (for the UI) `applications/openthrottle-developer/.env` — copy from each `.env.default`.
3. **`pnpm run database:start`** — Postgres (**6010**) and Redis (**6011**) via root `docker-compose.yml`.
4. **`pnpm run database:migrate`** — required before the API can use OT tables.
5. **Service account tokens (when `APP_ENABLE_AUTHENTICATION=true`):** **`pnpm run database:bootstrap-service-accounts`** — mints `ot_sa_…` values for `MCP_DEVELOPER_AUTH_TOKEN` and `OPENTHROTTLE_WORKER_GRAPHQL_AUTH_TOKEN`. Copy into server `.env` and Cursor MCP `env`. See [AUTH.md](./AUTH.md).
6. **GraphQL codegen (developer app)** — run **`pnpm nx run openthrottle-developer:codegen-graphql`** if generated artifacts are missing after clone or schema changes.
7. **API:** **`pnpm nx run openthrottle-server:dev`** — GraphQL at **`http://localhost:6021/graphql`**, health at **`http://localhost:6021/health`** (default **PORT** **6021**).
8. **Developer UI (optional for MCP):** **`pnpm nx run openthrottle-developer:dev`** — typically **`http://localhost:6020`** for manual smoke checks alongside the API.

**MCP verification needs:** steps **1–5** and **7** at minimum (bootstrap step **5** is required when auth is enabled). The developer app (**8**) is not required for MCP tools (`health`, `create_plan`, …) but matches the full stack exercised when validating locally.

## Runtime dependencies

| Dependency                      | Role                                                             | Typical local value                                                                                                                                                                                                                                                        |
| ------------------------------- | ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **openthrottle-server**         | GraphQL (`getServerHealth`, plans, tasks, …)                     | `http://localhost:6021` — see `applications/openthrottle-server/.env.default` (`PORT`)                                                                                                                                                                                     |
| **Postgres**                    | Server reads/writes OpenThrottle data                            | From server `.env`: often `localhost:6010`                                                                                                                                                                                                                                 |
| **Redis**                       | Server queues / health                                           | From server `.env`: often `localhost:6011`                                                                                                                                                                                                                                 |
| **`API_URL_INTERNAL`**          | Base URL for `@openthrottle/nodejs-graphql` (appends `/graphql`) | Must match server, e.g. `http://localhost:6021`                                                                                                                                                                                                                            |
| **`APP_ENABLE_AUTHENTICATION`** | Server guard behavior (in server `.env`)                         | Default **`true`** in `.env.default`; MCP smoke should use auth on + service account token                                                                                                                                                                                 |
| **`MCP_DEVELOPER_AUTH_TOKEN`**  | Bearer token for authenticated tools                             | Service account `ot_sa_<prefix>_<secret>` from bootstrap or admin GraphQL; see [AUTH.md](./AUTH.md)                                                                                                                                                                        |
| **Embeddings (server)**         | `semantic_search` / ingest embed on **openthrottle-server**      | **`OPENAI_API_KEY`** or **`OLLAMA_BASE_URL`** (+ optional **`OLLAMA_EMBEDDING_MODEL`**) in **`applications/openthrottle-server/.env`** — not required by `scripts/run-mcp-developer.sh`. Ollama-only: [run-locally-oss.md](../../../docs/openthrottle/run-locally-oss.md). |
| **`WORKTREE_ID`**               | Optional; set by `run-mcp-developer.sh` for MCP server naming    | From git worktree basename                                                                                                                                                                                                                                                 |

Cursor MCP config lives in `.cursor/mcp.json` under **`mcp-developer`** — keep **`API_URL` / `API_URL_INTERNAL`** aligned with the running server port.

**Committed template:** [`.cursor/mcp.json.example`](../../../.cursor/mcp.json.example) shows the minimal **`mcp-developer`** entry (API base URL + **`MCP_DEVELOPER_AUTH_TOKEN`** placeholder). Copy or merge into `.cursor/mcp.json` (project workspace) or `~/.cursor/mcp.json` (secondary workspace); replace the token with output from **`pnpm run database:bootstrap-service-accounts`**. Do not commit real tokens. Token setup: [AUTH.md](./AUTH.md).

## Quick prerequisite check

From the monorepo root (optional env override `API_URL_INTERNAL`):

```bash
API_URL_INTERNAL=http://localhost:6021 ./scripts/verify-openthrottle-mcp-env.sh
```

This probes **`GET /health`** on the API base and reports missing `.env` keys / unset auth token. When **`MCP_DEVELOPER_AUTH_TOKEN`** is set, it also POSTs an authenticated **`listSources`** GraphQL query to confirm **`APP_ENABLE_AUTHENTICATION=true`** accepts the `ot_sa_…` bearer (401/403 fails the script).

## Secondary workspace (another repo open in Cursor)

Use OpenThrottle MCP while your **active Cursor workspace** is a different checkout (for example any other repo on your machine—not the OpenThrottle monorepo root).

| Requirement                                                                     | Why                                                                                                                                                                                                                                                                                                                                                                                                                   |
| ------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **User-level MCP config** (`~/.cursor/mcp.json`) or equivalent global MCP entry | Project-level `.cursor/mcp.json` inside OpenThrottle is not loaded when that folder is not the workspace root.                                                                                                                                                                                                                                                                                                        |
| **Absolute path to the launcher**                                               | Configuring `bash` with `./scripts/run-mcp-developer.sh` resolves relative to the **open workspace**. Outside the OpenThrottle repo that path does not exist and the MCP fails to start. Prefer **`bash` + absolute path** to `scripts/run-mcp-developer.sh` inside your OpenThrottle clone: `<path-to-openthrottle-repo>/scripts/run-mcp-developer.sh` (replace with your real checkout path; avoid relying on cwd). |
| **Same env as local OT**                                                        | Set `API_URL` / **`API_URL_INTERNAL`** to the running openthrottle-server (e.g. `http://localhost:6021`) and **`MCP_DEVELOPER_AUTH_TOKEN`** for authenticated tools. These are independent of which folder is open in Cursor.                                                                                                                                                                                         |
| **OpenThrottle repo still on disk**                                             | The launcher `cd`s to the monorepo root and starts Node from **that** checkout. It does not require root `.env` **`OPENAI_API_KEY`**; configure embeddings on the server `.env` (Ollama or OpenAI).                                                                                                                                                                                                                   |

**Validated behavior:** `create_plan`, `create_task`, and other GraphQL-backed tools do **not** use the Cursor workspace path; they call openthrottle-server over HTTP. Storing **absolute workspace or repository roots in OpenThrottle** (future app/user config) would mainly improve linking work across repos and semantic context—not a prerequisite for MCP CRUD from a secondary workspace.

### Failure modes (secondary workspace or any host)

| Symptom                                                           | Likely cause                                                                                                                                                                                           |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `semantic_search` fails or returns no results                     | Server missing **`OPENAI_API_KEY`** and **`OLLAMA_BASE_URL`**, or Ollama model dimension mismatch — see [run-locally-oss.md](../../../docs/openthrottle/run-locally-oss.md) and `databases/README.md`. |
| MCP fails to start / “no such file” for the shell script          | Relative launcher path while workspace is not the OpenThrottle repo; switch to an absolute path.                                                                                                       |
| `health` fails or connection errors                               | Server down, wrong port, or **`API_URL_INTERNAL`** does not match openthrottle-server `PORT`.                                                                                                          |
| Authenticated tools error (“set MCP_DEVELOPER_AUTH_TOKEN” or 401) | Token unset, revoked, wrong format, or wrong server; human JWT may have expired — prefer `ot_sa_…`; see [AUTH.md](./AUTH.md).                                                                          |
| 403 on authenticated tools                                        | Service account lacks role/permission (e.g. `plans:read`); check `service_account_roles` / migration 045.                                                                                              |

### Smoke checklist (re-validate after doc or config changes)

These checks do **not** depend on which folder is the Cursor workspace root; they only need the API running and correct URLs/tokens.

1. **Env script from any cwd:** the launcher’s monorepo is fixed inside `verify-openthrottle-mcp-env.sh`, so you can run it from `/tmp` or another repo by invoking it with an absolute path, for example  
   `API_URL_INTERNAL=http://localhost:6021 /path/to/openthrottle/scripts/verify-openthrottle-mcp-env.sh`  
   A zero exit and `OK: GET …/health` confirms **`GET /health`** matches **`API_URL_INTERNAL`**. Shell sessions without **`MCP_DEVELOPER_AUTH_TOKEN`** still show the script’s WARN for auth; **Cursor** normally supplies the token via **`env`** in **`~/.cursor/mcp.json`** for **`mcp-developer`**.
2. **GraphQL parity with MCP `health` tool** (no Bearer token):  
   `curl -sf -X POST http://localhost:6021/graphql -H 'Content-Type: application/json' -d '{"query":"query { serverHealth { api database redis websocket } }"}'`  
   Adjust the host/port if **`API_URL_INTERNAL`** is not the default. Expect JSON with **`data.serverHealth`**.
3. **In Cursor (secondary workspace):** after **`health`** succeeds in the MCP panel, call an authenticated tool (**`list_sources`**, **`list_plans_by_status`**, or **`create_plan`** / **`create_task`**) with **`MCP_DEVELOPER_AUTH_TOKEN`** set in the global MCP **`env`** block. **Required:** GraphQL base aligned with the server (**`/graphql`** on the same origin as **`API_URL_INTERNAL`**); token format and acquisition: [AUTH.md](./AUTH.md).

### Containerized API — MCP on the host (Docker Compose)

When **openthrottle-server** runs in Docker and publishes **`OPENTHROTTLE_SERVER_PORT`** to the host (see [compose-topology-phase-1.md](../../../docs/openthrottle/compose-topology-phase-1.md)), **Cursor and mcp-developer on the host** should target **`http://localhost:<port>/graphql`** (same host/port as **`GET /health`**). **`host.docker.internal`** is for processes **inside** a container to reach the host (or host-published ports); it is **not** the right URL for host-side MCP talking **into** a container that listens on `localhost:<published-port>`.

**Validated:** With Postgres and Redis reachable from the API container (for example **`POSTGRES_HOST=host.docker.internal`** / **`REDIS_HOST=host.docker.internal`** when compose publishes **6010**/**6011** on the host), **`curl`** from macOS to **`http://localhost:<published-port>/graphql`** successfully exercised **`createPlan`** and **`createTask`** against the containerized API (investigation plan **`677b6849-1912-4fa8-a5f6-d8233f2cdf97`**, smoke task).

**Note:** A bare **`docker run`** of **`openthrottle-server:latest`** must include required env not baked into the image (for example **`BULLMQ_BOARD_ADMIN_USERNAME`** / **`BULLMQ_BOARD_ADMIN_PASSWORD`**); root **`docker-compose.yml`** supplies these via the **`openthrottle-server`** environment anchor.

**Backlog (not blocking MCP):** storing **per-workspace or absolute repo roots** inside OpenThrottle for linking or semantic context remains a product/backlog item—the MCP uses HTTP to the server only. **Compose, bind mounts, worker paths, and Ollama reachability from containers** are tracked under investigation plan **`677b6849-1912-4fa8-a5f6-d8233f2cdf97`**.

## Build and run the MCP locally

```bash
pnpm nx run @openthrottle/mcp-developer:build
API_URL_INTERNAL=http://localhost:6021 MCP_DEVELOPER_AUTH_TOKEN="<token>" pnpm nx run @openthrottle/mcp-developer:serve
```

Or the Cursor launcher (**from the monorepo root**; no root **`OPENAI_API_KEY`** required — embeddings are server-side):

```bash
./scripts/run-mcp-developer.sh
```

**Ollama-only:** set **`OLLAMA_BASE_URL`** (and optional **`OLLAMA_EMBEDDING_MODEL`**) in **`applications/openthrottle-server/.env`**, run Ollama, then use the launcher as above. See [run-locally-oss.md § Cursor MCP launcher](../../../docs/openthrottle/run-locally-oss.md#cursor-mcp-launcher-scriptsrun-mcp-developersh).

## Data fixtures for manual / agent runs

- **Plans and tasks** live in Postgres; there is no checked-in JSON snapshot required for verification. Use an existing scratch plan or create one via MCP (`create_plan` / `create_task`).
- **Smoke baseline:** call tool **`health`** (no auth) — confirms GraphQL `getServerHealth` and connectivity.
- **Authenticated path (auth enabled):** with **`APP_ENABLE_AUTHENTICATION=true`** on the server and a bootstrap or rotated **`MCP_DEVELOPER_AUTH_TOKEN`** (`ot_sa_…`), call **`list_sources`** or **`list_plans_by_status`**. Confirms RBAC + service account strategy, not only connectivity.

## Ports reference

See [docs/monorepo/local-services-and-ports.md](../../../docs/monorepo/local-services-and-ports.md) for the canonical port map (server **6021**, Postgres **6010**, etc.).
