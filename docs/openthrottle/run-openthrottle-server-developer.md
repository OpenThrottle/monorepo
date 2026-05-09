# Minimal path: openthrottle-server + openthrottle-developer

This document is the **native checkout** quick path: run the NestJS GraphQL API and the React Router developer app against **local Postgres and Redis**, using Nx from the monorepo root. For OSS positioning and optional Ollama/OpenAI embeddings, see [run-locally-oss.md](./run-locally-oss.md). For port reference and Caddy layout, see [local-services-and-ports.md](../monorepo/local-services-and-ports.md).

---

## Prerequisites

- **Node.js** and **pnpm** as required by the repo (see root `package.json` / CI).
- **Docker** for the minimal DB path below (`pnpm run database:start` uses Compose). Alternatively, run Postgres (with pgvector) and Redis yourself and point env vars at them (same ports or adjust).
- Commands assume the **monorepo root** as the current working directory unless noted.

---

## Environment files

| Location                                       | Purpose                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Root** `.env`                                | Copy from [.env.default](../../.env.default). Used by `pnpm run database:*` where scripts pass `--env-file .env`, and by **Docker Compose** for published ports and service env (`POSTGRES_*`, `REDIS_*`, `OPENTHROTTLE_*`).                                                                                                                                                                                                                                                                 |
| **`applications/openthrottle-server/.env`**    | Copy from [`applications/openthrottle-server/.env.default`](../../applications/openthrottle-server/.env.default). Loaded at startup ([`load-env.ts`](../../applications/openthrottle-server/src/load-env.ts)). Must expose **`POSTGRES_*`**, **`REDIS_*`**, **`PORT`**, **`JWT_SECRET`**, **`CORS_ORIGINS`** as needed. For processes **on the host** talking to Compose-published DB/Redis, keep **`POSTGRES_HOST=localhost`**, **`REDIS_HOST=localhost`** (matches server `.env.default`). |
| **`applications/openthrottle-developer/.env`** | Copy from [`applications/openthrottle-developer/.env.default`](../../applications/openthrottle-developer/.env.default). Vite/React Router reads **`PORT`** and **`API_URL_*`** / app URLs; defaults target **`http://localhost:6021`** for the API.                                                                                                                                                                                                                                          |

If root `.env` uses `POSTGRES_HOST=host.docker.internal` (for tools that run _inside_ Docker), override in **`applications/openthrottle-server/.env`** with **`localhost`** when running the server **on the host** against `database:start` ports.

---

## Default ports

| Service                    | Port (template) | Primary env keys                                                                      |
| -------------------------- | --------------- | ------------------------------------------------------------------------------------- |
| **openthrottle-server**    | **6021**        | `PORT`, GraphQL at `/graphql`, BullMQ Board at `/queues`, Socket.IO at `/socket.io`   |
| **openthrottle-developer** | **6020**        | `PORT`; if unset, Vite may fall back to **3000** (see `vite.config.ts`)               |
| **Postgres**               | **6010**        | `POSTGRES_PORT`, `POSTGRES_HOST`, `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD` |
| **Redis**                  | **6011**        | `REDIS_HOST`, `REDIS_PORT`                                                            |

GraphQL URL for tools and MCP: **`http://localhost:6021/graphql`** when using these defaults.

---

## Native checkout workflow (recommended daily dev)

1. **`pnpm install`** at the repo root.
2. **Create env files** (see table above): root `.env`, `applications/openthrottle-server/.env`, `applications/openthrottle-developer/.env`.
3. **Start Postgres + Redis only:**
   **`pnpm run database:start`**
   This runs `docker compose up -d openthrottle-postgres openthrottle-redis` (see root [`package.json`](../../package.json)) using root [`docker-compose.yml`](../../docker-compose.yml). Service names: **`openthrottle-postgres`**, **`openthrottle-redis`**.
4. **Apply migrations:** **`pnpm run database:migrate`** (requires Postgres up). Details: [`databases/README.md`](../../databases/README.md).
5. **GraphQL codegen (developer app):** After schema changes or on a fresh clone if generated artifacts are missing:
   **`pnpm nx run openthrottle-developer:codegen-graphql`**
   The **`dev`** target also depends on codegen/watch pipelines; first successful dev session may take longer while watchers settle.
6. **Terminal A — API:** **`pnpm nx run openthrottle-server:dev`**
   (`nest start … --watch`; see Nx project `openthrottle-server`.)
7. **Terminal B — UI:** **`pnpm nx run openthrottle-developer:dev`**
   (`react-router dev`; pulls codegen dependencies.)

**Smoke checks:** Open **`http://localhost:6021/health`** (or `/graphql`), **`http://localhost:6020`** for the developer UI. For MCP auth and GraphQL tokens, see [`packages/mcp-developer/README.md`](../../packages/mcp-developer/README.md) and [`packages/mcp-developer/docs/verification-environment.md`](../../packages/mcp-developer/docs/verification-environment.md).

---

## Nx targets (summary)

| Project                    | Targets                                                                            | Notes                                                                                     |
| -------------------------- | ---------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| **openthrottle-server**    | `dev`, `start`, `build`, `test`, `lint`                                            | `dev` is watch mode; `build` runs `nest build`. Optional: `start:docker`, `docker-build`. |
| **openthrottle-developer** | `dev`, `start`, `build`, `codegen-graphql`, `codegen-react-router`, `test`, `lint` | `start` serves production build; requires `build` first.                                  |

---

## Known gaps and optional pieces

- **Codegen:** GraphQL documents in the developer app expect codegen output; run **`codegen-graphql`** if types/hooks are missing after clone or API schema changes.
- **Redis:** Server and BullMQ features expect **`REDIS_HOST`** (see health and queues code paths). Without Redis, some features fail or degrade.
- **Embeddings / semantic search:** Not required to boot the server UI; set **`OPENAI_API_KEY`** and/or **`OLLAMA_*`** per [`databases/README.md`](../../databases/README.md) (embedding dimensions and Ollama caveats apply).
- **Stripe / GitHub / GCP:** Optional for core local dashboard flows; leave defaults empty unless testing those integrations.
- **Full Docker Compose stack:** Root [`docker-compose.yml`](../../docker-compose.yml) can also run **`openthrottle-server`** and **`openthrottle-developer`** as built images with published ports (`OPENTHROTTLE_SERVER_PORT`, `OPENTHROTTLE_DEVELOPER_PORT`). Env inside Compose typically uses **service DNS names** (`openthrottle-postgres`, `openthrottle-redis`) or **`host.docker.internal`** for host processes—see [`applications/openthrottle/README.md`](../../applications/openthrottle/README.md) and root `.env.default`.

---

## Multi-workspace plans

Plans can target arbitrary local project directories instead of the monorepo root. This is useful when you want Ralph to work against a different checkout (e.g. `~/Development/openthrottle`).

### Quick start

1. Open the **Developer app** and navigate to a plan's detail page.
2. Expand the **Workflow configuration** card.
3. In the **Workspace directory** fieldset, enter the absolute path to the target project folder. Leave empty for the default monorepo root.
4. Click **Run** (enqueue). The server validates the path exists and is a directory before accepting the job.

The workspace path is passed through the BullMQ job payload and used as the `cwd` when spawning `workflow-ralph`. The worker falls back to `WORKSPACE_ROOT` / `process.cwd()` when no custom path is set.

### Path restrictions

By default, any existing directory on the local filesystem is accepted (local-only trust boundary). To restrict paths to specific prefixes, set the environment variable on `openthrottle-server`:

```bash
# In applications/openthrottle-server/.env
OPENTHROTTLE_ALLOWED_WORKING_DIRS=/Users/matt/Development,/opt/projects
```

When set, `workingDirectory` must start with one of the comma-separated prefixes. Paths outside the allowlist are rejected at enqueue time with a clear error in the Developer app.

### Recent paths

The Developer app stores up to 10 recently used workspace paths in `localStorage`. A clock icon next to the path input opens a popover with the MRU list for quick selection.

### Limitations

- **Local-only:** The path is resolved on the machine running `openthrottle-server`. Containerized deployments need bind mounts or volume mapping to expose host directories (tracked under plan `677b6849-1912-4fa8-a5f6-d8233f2cdf97`).
- **Spawn path only (no worktrees):** When `WORKTREE_TARGETS` is configured, the worktree workflow manages its own cwd; `workingDirectory` applies to the legacy spawn path (`processInProcessCwd`) and the orchestrator path.
- **Cortex required:** Plans and tasks still live in the Cortex database regardless of which directory the agent operates in.

For implementation details, validation rules, and GraphQL examples, see [Multi-workspace plans (`workingDirectory`)](../../tools/workflows/README.md#multi-workspace-plans-workingdirectory) in the workflows README.

---

## Docker Compose stack vs native host processes

| Topic                          | Native (this doc)                                                     | Full Compose (`docker compose up`)                                                                  |
| ------------------------------ | --------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| **Server / developer**         | `pnpm nx run …:dev` on the host                                       | Containers **`openthrottle-server`**, **`openthrottle-developer`** with image builds from repo root |
| **DB / Redis**                 | **`pnpm run database:start`** (Compose **only** for Postgres + Redis) | Same Compose file; often all services together                                                      |
| **POSTGRES_HOST / REDIS_HOST** | **`localhost`** when apps run on host                                 | **`openthrottle-postgres`** / **`openthrottle-redis`** or bridge networking docs in app README      |

**Open questions** for a containerized “everything in Compose” workflow—bind mounts for Ralph/repo paths (including multi-workspace `workingDirectory` paths), Redis hostname from workers, Ollama reachability from containers vs host, developer SSR/HMR—are tracked in Cortex plan **`677b6849-1912-4fa8-a5f6-d8233f2cdf97`** (investigation). Prefer the **native host + DB-in-Docker** split above until that plan closes gaps. The **phase-1 compose topology** (API + Postgres + Redis only, with explicit non-goals and host MCP env contract) is documented in [compose-topology-phase-1.md](./compose-topology-phase-1.md).
