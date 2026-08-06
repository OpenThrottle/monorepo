# OT MCP verification — environment and fixtures

> **Registering MCP servers?** The canonical guide is **[docs/openthrottle/mcp-registration.md](../../../docs/openthrottle/mcp-registration.md)** — tiers, config locations, the `.cursor/mcp.json` template, editor parity, and user-provided servers. This page covers the **environment, fixtures, and smoke checks** for verifying `openthrottle-mcp` against a local server; it does not re-document registration.

Use this when exercising **@openthrottle/openthrottle-mcp** against a local **openthrottle-server** (GraphQL only; no direct Postgres from the MCP).

## Minimal stack (aligned with native checkout)

Verified daily path for **Postgres, Redis, migrations, API, and optional developer UI** is documented in **[run-openthrottle-server-developer.md](../../../docs/openthrottle/run-openthrottle-server-developer.md)**. Summary:

1. **`pnpm install`** at the monorepo root.
2. **Env files:** root `.env`, `applications/openthrottle-server/.env`, and (for the UI) `applications/openthrottle-developer/.env` — copy from each `.env.default`.
3. **`pnpm run database:start`** — Postgres (**6010**) and Redis (**6011**) via root `docker-compose.yml`.
4. **`pnpm run database:migrate`** — required before the API can use OT tables.
5. **Service account tokens:** **`pnpm run database:bootstrap-service-accounts`** — mints `ot_sa_…` values for `OPENTHROTTLE_MCP_AUTH_TOKEN` and `OPENTHROTTLE_WORKER_GRAPHQL_AUTH_TOKEN`. Copy into server `.env` and Cursor MCP `env`. See [AUTH.md](./AUTH.md).
6. **GraphQL codegen (developer app)** — run **`pnpm nx run openthrottle-developer:codegen-graphql`** if generated artifacts are missing after clone or schema changes.
7. **API:** **`pnpm nx run openthrottle-server:dev`** — GraphQL at **`http://localhost:6021/graphql`**, health at **`http://localhost:6021/health`** (default **PORT** **6021**).
8. **Developer UI (optional for MCP):** **`pnpm nx run openthrottle-developer:dev`** — typically **`http://localhost:6020`** for manual smoke checks alongside the API.

**MCP verification needs:** steps **1–5** and **7** at minimum (bootstrap step **5** is required when auth is enabled). The developer app (**8**) is not required for MCP tools (`health`, `create_plan`, …) but matches the full stack exercised when validating locally.

## Runtime dependencies

| Dependency                        | Role                                                             | Typical local value                                                                                                                                                                                                                                                           |
| --------------------------------- | ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **openthrottle-server**           | GraphQL (`getServerHealth`, plans, tasks, …)                     | `http://localhost:6021` — see `applications/openthrottle-server/.env.default` (`PORT`)                                                                                                                                                                                        |
| **Postgres**                      | Server reads/writes OpenThrottle data                            | From server `.env`: often `localhost:6010`                                                                                                                                                                                                                                    |
| **Redis**                         | Server queues / health                                           | From server `.env`: often `localhost:6011`                                                                                                                                                                                                                                    |
| **`API_URL_INTERNAL`**            | Base URL for `@openthrottle/nodejs-graphql` (appends `/graphql`) | Must match server, e.g. `http://localhost:6021`                                                                                                                                                                                                                               |
| **`OPENTHROTTLE_MCP_AUTH_TOKEN`** | Bearer token for authenticated tools                             | Service account `ot_sa_<prefix>_<secret>` from bootstrap or admin GraphQL; see [AUTH.md](./AUTH.md)                                                                                                                                                                           |
| **Embeddings (server)**           | `semantic_search` / ingest embed on **openthrottle-server**      | **`OPENAI_API_KEY`** or **`OLLAMA_BASE_URL`** (+ optional **`OLLAMA_EMBEDDING_MODEL`**) in **`applications/openthrottle-server/.env`** — not required by `scripts/run-openthrottle-mcp.sh`. Ollama-only: [run-locally-oss.md](../../../docs/openthrottle/run-locally-oss.md). |
| **`WORKTREE_ID`**                 | Optional; set by `run-openthrottle-mcp.sh` for MCP server naming | From git worktree basename                                                                                                                                                                                                                                                    |

Cursor MCP config lives in `.cursor/mcp.json` under **`openthrottle-mcp`** — keep **`API_URL` / `API_URL_INTERNAL`** aligned with the running server port.

**Committed template & registration:** the `.cursor/mcp.json` template, config locations, and editor parity are documented in **[mcp-registration.md](../../../docs/openthrottle/mcp-registration.md)**. In short: copy/merge the `openthrottle-mcp` entry into `.cursor/mcp.json` (project) or `~/.cursor/mcp.json` (secondary workspace) and set **`OPENTHROTTLE_MCP_AUTH_TOKEN`** from **`pnpm run database:bootstrap-service-accounts`**. Do not commit real tokens. Token setup: [AUTH.md](./AUTH.md).

## Quick prerequisite check

From the monorepo root (optional env override `API_URL_INTERNAL`):

```bash
API_URL_INTERNAL=http://localhost:6021 ./scripts/verify-openthrottle-mcp-env.sh
```

This probes **`GET /health`** on the API base and reports missing `.env` keys / unset auth token. When **`OPENTHROTTLE_MCP_AUTH_TOKEN`** is set, it also POSTs an authenticated **`listSources`** GraphQL query to confirm accepts the `ot_sa_…` bearer (401/403 fails the script).

## Secondary workspace (another repo open in Cursor)

Use OpenThrottle MCP while your **active Cursor workspace** is a different checkout (for example any other repo on your machine—not the OpenThrottle monorepo root).

| Requirement                                                                     | Why                                                                                                                                                                                                                                                                                                                                                                                                                            |
| ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **User-level MCP config** (`~/.cursor/mcp.json`) or equivalent global MCP entry | Project-level `.cursor/mcp.json` inside OpenThrottle is not loaded when that folder is not the workspace root.                                                                                                                                                                                                                                                                                                                 |
| **Absolute path to the launcher**                                               | Configuring `bash` with `./scripts/run-openthrottle-mcp.sh` resolves relative to the **open workspace**. Outside the OpenThrottle repo that path does not exist and the MCP fails to start. Prefer **`bash` + absolute path** to `scripts/run-openthrottle-mcp.sh` inside your OpenThrottle clone: `<path-to-openthrottle-repo>/scripts/run-openthrottle-mcp.sh` (replace with your real checkout path; avoid relying on cwd). |
| **Same env as local OT**                                                        | Set `API_URL` / **`API_URL_INTERNAL`** to the running openthrottle-server (e.g. `http://localhost:6021`) and **`OPENTHROTTLE_MCP_AUTH_TOKEN`** for authenticated tools. These are independent of which folder is open in Cursor.                                                                                                                                                                                               |
| **OpenThrottle repo still on disk**                                             | The launcher `cd`s to the monorepo root and starts Node from **that** checkout. It does not require root `.env` **`OPENAI_API_KEY`**; configure embeddings on the server `.env` (Ollama or OpenAI).                                                                                                                                                                                                                            |

**Validated behavior:** `create_plan`, `create_task`, and other GraphQL-backed tools do **not** use the Cursor workspace path; they call openthrottle-server over HTTP. Storing **absolute workspace or repository roots in OpenThrottle** (future app/user config) would mainly improve linking work across repos and semantic context—not a prerequisite for MCP CRUD from a secondary workspace.

### Failure modes (secondary workspace or any host)

| Symptom                                                              | Likely cause                                                                                                                                                                                           |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `semantic_search` fails or returns no results                        | Server missing **`OPENAI_API_KEY`** and **`OLLAMA_BASE_URL`**, or Ollama model dimension mismatch — see [run-locally-oss.md](../../../docs/openthrottle/run-locally-oss.md) and `databases/README.md`. |
| MCP fails to start / “no such file” for the shell script             | Relative launcher path while workspace is not the OpenThrottle repo; switch to an absolute path.                                                                                                       |
| `health` fails or connection errors                                  | Server down, wrong port, or **`API_URL_INTERNAL`** does not match openthrottle-server `PORT`.                                                                                                          |
| Authenticated tools error (“set OPENTHROTTLE_MCP_AUTH_TOKEN” or 401) | Token unset, revoked, wrong format, or wrong server; human JWT may have expired — prefer `ot_sa_…`; see [AUTH.md](./AUTH.md).                                                                          |
| 403 on authenticated tools                                           | Service account lacks role/permission (e.g. `plans:read`); check `service_account_roles` / migration 045.                                                                                              |

### Smoke checklist (re-validate after doc or config changes)

These checks do **not** depend on which folder is the Cursor workspace root; they only need the API running and correct URLs/tokens.

1. **Env script from any cwd:** the launcher’s monorepo is fixed inside `verify-openthrottle-mcp-env.sh`, so you can run it from `/tmp` or another repo by invoking it with an absolute path, for example
   `API_URL_INTERNAL=http://localhost:6021 /path/to/openthrottle/scripts/verify-openthrottle-mcp-env.sh`
   A zero exit and `OK: GET …/health` confirms **`GET /health`** matches **`API_URL_INTERNAL`**. Shell sessions without **`OPENTHROTTLE_MCP_AUTH_TOKEN`** still show the script’s WARN for auth; **Cursor** normally supplies the token via **`env`** in **`~/.cursor/mcp.json`** for **`openthrottle-mcp`**.
2. **GraphQL parity with MCP `health` tool** (no Bearer token):
   `curl -sf -X POST http://localhost:6021/graphql -H 'Content-Type: application/json' -d '{"query":"query { serverHealth { api database redis websocket } }"}'`
   Adjust the host/port if **`API_URL_INTERNAL`** is not the default. Expect JSON with **`data.serverHealth`**.
3. **In Cursor (secondary workspace):** after **`health`** succeeds in the MCP panel, call an authenticated tool (**`list_sources`**, **`list_plans_by_status`**, or **`create_plan`** / **`create_task`**) with **`OPENTHROTTLE_MCP_AUTH_TOKEN`** set in the global MCP **`env`** block. **Required:** GraphQL base aligned with the server (**`/graphql`** on the same origin as **`API_URL_INTERNAL`**); token format and acquisition: [AUTH.md](./AUTH.md).

### Registration smoke-test (root + secondary workspace)

The consolidated gate for **[mcp-registration.md](../../../docs/openthrottle/mcp-registration.md)**: confirm `openthrottle-mcp` works after any registration or config change. There is **no docs-mcp gate** (docs-mcp is retired).

**A. Monorepo root**

1. Copy `.cursor/mcp.json` → `.cursor/mcp.json`, set `OPENTHROTTLE_MCP_AUTH_TOKEN` (`ot_sa_…` from `pnpm run database:bootstrap-service-accounts`), restart the MCP host (Cursor).
2. Launcher resolves a live server: `OT_MCP_RESOLVE_ONLY=1 bash scripts/run-openthrottle-mcp.sh` → prints `✅ … live server at http://localhost:<port>`.
3. **`health`** → `{api, database, redis, websocket}` all `ok`.
4. **One OT tool** (e.g. `list_sources` or `semantic_search`) succeeds with authenticated data (e.g. `list_sources` returns `plan` / `task` / `documentation` sources).

**B. Secondary workspace** (a different repo open in the host)

1. Register `openthrottle-mcp` in `~/.cursor/mcp.json` with an **absolute path** to `scripts/run-openthrottle-mcp.sh` and the same OT env; restart Cursor.
2. From any cwd, the absolute-path launcher still resolves the live server: `cd /tmp && OT_MCP_RESOLVE_ONLY=1 bash <abs-path>/scripts/run-openthrottle-mcp.sh`.
3. **`health`** passes in the MCP panel; one authenticated OT tool succeeds.

> **Last validated (2026-06-16):** root smoke green — `health` all `ok`, `list_sources` → 520 plans / 3 sources (`documentation`, `plan`, `task`); launcher resolved `http://localhost:6021` at root and from `/tmp`; GraphQL `serverHealth` parity green. The in-IDE Cursor-restart confirmation (especially the secondary-workspace case) is a human step.

### Optional appendix — GitHub MCP

GitHub MCP is **not** a registration gate (it's a user-provided Tier 2 server — see [mcp-registration.md § User-provided servers](../../../docs/openthrottle/mcp-registration.md#user-provided-servers)). To smoke it optionally: export `GITHUB_TOKEN` (PAT with `repo`, optionally `read:org`), register the `github` entry from `.mcp.json`, restart the host, and call a read-only tool (e.g. list your repos or get an issue). Failure here does not block OT registration.

### Agent conversation read tools smoke (human JWT)

These three read-only tools query persisted **web chat** threads (`agent_conversation_*`). They require a **human JWT** in **`OPENTHROTTLE_MCP_AUTH_TOKEN`** — service account tokens (`ot_sa_…`) are rejected with **403 Human authentication required**. See [agent-conversation-read-tools-contract.md](./agent-conversation-read-tools-contract.md) and [AUTH.md](./AUTH.md) § Human JWT.

1. **Token:** Set a valid human JWT (not `ot_sa_…`) in Cursor MCP **`env`** or shell **`OPENTHROTTLE_MCP_AUTH_TOKEN`**.
2. **Fixture:** Persist at least one chat turn via the developer UI with **`persist: true`**, or call GraphQL **`agentsRunChatTurn`** with **`persist: true`**.
3. **`agent_conversation_list`** — response **`structuredContent.conversations`** includes the conversation id; default pagination is limit **20**, status **`active`**.
4. **`agent_conversation_get`** with **`id`** — same conversation row as step 3.
5. **`agent_conversation_get_messages`** with **`conversationId`** — user and assistant rows; assistant rows include **`routingConfidence`**, **`routingModel`**, **`routingReason`**, **`routingTier`**, **`toolMetadataJson`** when present.
6. **Boundary:** Tool descriptions warn that these are web chat threads only — use **`get_plan_output`** for Ralph/plan iteration logs.

**Negative check:** With an **`ot_sa_…`** token, expect **403** on all three tools (confirms user-scoped human auth).

### Containerized API — MCP on the host (Docker Compose)

When **openthrottle-server** runs in Docker and publishes **`OPENTHROTTLE_SERVER_PORT`** to the host, **Cursor and openthrottle-mcp on the host** should target **`http://localhost:<port>/graphql`** (same host/port as **`GET /health`**). **`host.docker.internal`** is for processes **inside** a container to reach the host (or host-published ports); it is **not** the right URL for host-side MCP talking **into** a container that listens on `localhost:<published-port>`.

**Validated:** With Postgres and Redis reachable from the API container (for example **`POSTGRES_HOST=host.docker.internal`** / **`REDIS_HOST=host.docker.internal`** when compose publishes **6010**/**6011** on the host), **`curl`** from macOS to **`http://localhost:<published-port>/graphql`** successfully exercised **`createPlan`** and **`createTask`** against the containerized API (investigation plan **`677b6849-1912-4fa8-a5f6-d8233f2cdf97`**, smoke task).

**Note:** A bare **`docker run`** of **`openthrottle-server:latest`** must include required env not baked into the image (for example **`BULLMQ_BOARD_ADMIN_USERNAME`** / **`BULLMQ_BOARD_ADMIN_PASSWORD`**); root **`docker-compose.yml`** supplies these via the **`openthrottle-server`** environment anchor.

**Backlog (not blocking MCP):** storing **per-workspace or absolute repo roots** inside OpenThrottle for linking or semantic context remains a product/backlog item—the MCP uses HTTP to the server only. **Compose, bind mounts, worker paths, and Ollama reachability from containers** are tracked under investigation plan **`677b6849-1912-4fa8-a5f6-d8233f2cdf97`**.

## Build and run the MCP locally

```bash
pnpm nx run @openthrottle/openthrottle-mcp:build
API_URL_INTERNAL=http://localhost:6021 OPENTHROTTLE_MCP_AUTH_TOKEN="<token>" pnpm nx run @openthrottle/openthrottle-mcp:serve
```

Or the Cursor launcher (**from the monorepo root**; no root **`OPENAI_API_KEY`** required — embeddings are server-side):

```bash
./scripts/run-openthrottle-mcp.sh
```

**Ollama-only:** set **`OLLAMA_BASE_URL`** (and optional **`OLLAMA_EMBEDDING_MODEL`**) in **`applications/openthrottle-server/.env`**, run Ollama, then use the launcher as above. See [run-locally-oss.md § Cursor MCP launcher](../../../docs/openthrottle/run-locally-oss.md#cursor-mcp-launcher-scriptsrun-openthrottle-mcpsh).

## Data fixtures for manual / agent runs

- **Plans and tasks** live in Postgres; there is no checked-in JSON snapshot required for verification. Use an existing scratch plan or create one via MCP (`create_plan` / `create_task`).
- **Smoke baseline:** call tool **`health`** (no auth) — confirms GraphQL `getServerHealth` and connectivity.
- **Authenticated path (auth enabled):** with server and a bootstrap or rotated **`OPENTHROTTLE_MCP_AUTH_TOKEN`** (`ot_sa_…`), call **`list_sources`** or **`list_plans_by_status`**. Confirms RBAC + service account strategy, not only connectivity.

## Ports reference

See [docs/monorepo/local-services-and-ports.md](../../../docs/monorepo/local-services-and-ports.md) for the canonical port map (server **6021**, Postgres **6010**, etc.).
