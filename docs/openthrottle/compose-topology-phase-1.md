# Compose topology options — phase 1

This doc records candidate `docker-compose.yml` shapes for running OpenThrottle locally alongside Cursor on the **host**, what is in scope for **phase 1**, what is explicitly **deferred**, and the published ports + env vars an on-host **mcp-developer** needs to talk to a containerized API.

It supports OT plan **`677b6849-1912-4fa8-a5f6-d8233f2cdf97`** (Docker Compose local OpenThrottle: host integration, paths, and feasibility). Read with [run-openthrottle-server-developer.md](./run-openthrottle-server-developer.md), [run-locally-oss.md](./run-locally-oss.md), and [`tools/workflows/README.md`](../../tools/workflows/README.md) (multi-workspace plans, worktrees).

---

## 1. Phase-1 scope

**Goal:** A minimal compose stack that lets a developer run OT services in containers while doing daily work on the **host** (Cursor + native checkout + agents).

**In scope (phase 1):**

- **Postgres** (with pgvector) as a compose service — already present.
- **Redis** as a compose service — already present.
- **openthrottle-server** (NestJS API + GraphQL + BullMQ Board + WebSocket) — published on the host so `mcp-developer` running inside Cursor can reach it.
- **Migrations** applied via either:
  - host `pnpm run database:migrate` against the published Postgres port, or
  - one-shot container that runs the same script on the compose network.

**Deferred (phase 1 non-goals):**

- **BullMQ plans worker spawning agents** (Ralph, cursor-agent, claude-code) inside a container. The host-vs-container path model is still open (see `tools/workflows/README.md` § Worktree + BullMQ workflow and Multi-workspace plans). Phase 1 keeps the worker on the **host** when agent jobs are needed.
- **openthrottle-developer** (React Router SSR/HMR) inside compose for daily dev. The image build exists today, but local SSR/HMR is meaningfully better on the host. Phase 1 only documents the env contract for an on-host developer app pointing at a containerized API.
- **Ollama / embeddings** as a compose service. Phase 1 reaches **host Ollama** (or a remote API) over `host.docker.internal`; sidecar Ollama is a phase-2 decision (latency, model storage, GPU on macOS).
- **Caddy / TLS termination** in front of the stack. Phase 1 publishes plain HTTP on `localhost:<port>`.
- **WORKTREE_TARGETS** mode. Phase 1 assumes spawn / orchestrator paths only and does not bind-mount worktree roots. See plan `677b6849-…` task `0bf058d6-…` (path model spike) for the design before enabling.

---

## 2. Topology A — minimal backend (recommended for phase 1)

> **Postgres + Redis + openthrottle-server.** Worker, developer app, agents, and Ollama all stay on the host.

```mermaid
flowchart LR
  subgraph Host
    Cursor["Cursor IDE\n+ mcp-developer"]
    Dev["openthrottle-developer (Vite SSR)"]
    Workflows["pnpm exec workflow-ralph\n(plans worker / CLI)"]
    Agents["cursor-agent / claude-code\n(spawned by workflows)"]
  end

  subgraph Compose["Docker Compose (network: ot)"]
    PG[("openthrottle-postgres\n:5432 → host :6010")]
    R[("openthrottle-redis\n:6379 → host :6011")]
    S["openthrottle-server\n:6021 → host :6021\n/graphql, /health, /queues, /socket.io"]
  end

  Cursor -->|HTTP /graphql| S
  Dev -->|HTTP /graphql + WS| S
  Workflows -->|Postgres TCP| PG
  Workflows -.optional GraphQL.-> S
  Agents -->|read/write FS| Host
  S --> PG
  S --> R
```

**Services:**

| Service                 | Image / build                                         | Container port | Host port | Notes                                                                                                        |
| ----------------------- | ----------------------------------------------------- | -------------- | --------- | ------------------------------------------------------------------------------------------------------------ |
| `openthrottle-postgres` | build `Dockerfile.Postgres` (pgvector on Postgres 17) | `5432`         | `6010`    | Named volume `postgres_data`. `shm_size: 128mb` (pgvector).                                                  |
| `openthrottle-redis`    | `redis:${REDIS_VERSION}-alpine`                       | `6379`         | `6011`    | No persistent volume needed for queues in dev.                                                               |
| `openthrottle-server`   | build `Dockerfile.NestJS`                             | `6021`         | `6021`    | Healthcheck `GET /health`. Inside compose, talks to `openthrottle-postgres:5432`, `openthrottle-redis:6379`. |

**Already implemented:** Topology A is essentially a strict subset of root [`docker-compose.yml`](../../docker-compose.yml) — start it with:

```bash
docker compose up -d openthrottle-postgres openthrottle-redis openthrottle-server
# (omit `openthrottle-developer` for phase 1)
```

**Why this shape:**

- **Single concern per container.** No agent CLIs, no host filesystem assumptions, no GPU.
- **Host MCP / agents work today.** `mcp-developer` and `workflow-ralph` already point at `localhost:6021` / `localhost:6010` / `localhost:6011`.
- **Trivial rollback.** Same compose file the repo uses for `pnpm run database:start`; just start more services.

---

## 3. Topology B — full backend stack (deferred)

> Adds **openthrottle-developer**, optional **Ollama** sidecar, optional **Caddy** in front. Documented for completeness; **not recommended for phase 1**.

```mermaid
flowchart LR
  subgraph Compose["Docker Compose"]
    PG[("openthrottle-postgres")]
    R[("openthrottle-redis")]
    S["openthrottle-server"]
    D["openthrottle-developer (SSR build)"]
    O["ollama (optional)"]
    C["caddy (optional, TLS)"]
  end

  C --> S
  C --> D
  D --> S
  S --> PG
  S --> R
  S -. embeddings .-> O
```

**Open issues (why this is deferred for phase 1):**

- **Developer SSR/HMR** suffers in compose; image build is for production. Daily dev wants the host Vite.
- **Ollama in compose on macOS** has no Metal acceleration (Linux GPU passthrough only). Bigger models become unusable.
- **Agent CLIs** (`cursor-agent`, `claude-code`, etc.) cannot be installed in a generic worker image without committing to a specific auth model and binary distribution. See task `0bf058d6-…` (path/worker spike).
- **Caddy + TLS** is needed only when fronting the stack with hostnames; localhost dev does not need it.

---

## 4. Published ports (host)

For **phase 1 (Topology A)** the host needs three ports published:

| Port (host) | Service               | Purpose                                               | Env key (root `.env`)      |
| ----------- | --------------------- | ----------------------------------------------------- | -------------------------- |
| `6010`      | openthrottle-postgres | DB (TCP) for migrations, host workers, Ralph CLI      | `POSTGRES_PORT`            |
| `6011`      | openthrottle-redis    | Redis (TCP) for BullMQ from host workers              | `REDIS_PORT`               |
| `6021`      | openthrottle-server   | HTTP — `/graphql`, `/health`, `/queues`, `/socket.io` | `OPENTHROTTLE_SERVER_PORT` |

`mcp-developer` only needs **6021** to be reachable for plan/task tools (REST `/health` plus GraphQL). Postgres and Redis ports are required only for **host-side** workers (e.g. `pnpm exec workflow-ralph`, `pnpm run database:migrate`, `pnpm run database:import`).

---

## 5. Env contract — host MCP / Cursor against containerized API

`mcp-developer` reads **`API_URL_INTERNAL`** to discover the GraphQL endpoint. With Topology A, the host-side env (in `~/.cursor/mcp.json`, shell, or `packages/mcp-developer/.env`) only needs:

```bash
# Host-side mcp-developer: API in a container, MCP on the host
API_URL_INTERNAL="http://localhost:6021"
# Optional bearer token for write tools:
# OPENTHROTTLE_WORKER_GRAPHQL_AUTH_TOKEN="…"
```

If the MCP itself runs **inside** a container (not phase 1), substitute `host.docker.internal` for `localhost` on macOS:

```bash
API_URL_INTERNAL="http://host.docker.internal:6021"
```

For **host workflows** (Ralph CLI, doc ingestion, plan import) the contract is:

```bash
# Host-side workflows talking to compose Postgres + Redis
POSTGRES_HOST="localhost"   # not host.docker.internal — we are on the host
POSTGRES_PORT="6010"
POSTGRES_USER="openthrottle_user"
POSTGRES_PASSWORD="openthrottle_password"
POSTGRES_DB="openthrottle"
POSTGRES_URL="postgresql://openthrottle_user:openthrottle_password@localhost:6010/openthrottle"

REDIS_HOST="localhost"
REDIS_PORT="6011"
```

**Inside compose** (`openthrottle-server` container), the same logical values become service DNS names:

```bash
POSTGRES_HOST="openthrottle-postgres"
POSTGRES_PORT="5432"
REDIS_HOST="openthrottle-redis"
REDIS_PORT="6379"
```

Today the root [`.env.default`](../../.env.default) uses `host.docker.internal` for both `POSTGRES_HOST` and `REDIS_HOST` — that is the **inside-container** value when the API is the only consumer in compose; host-side overrides should be put in **`applications/openthrottle-server/.env`** (already documented in [run-openthrottle-server-developer.md](./run-openthrottle-server-developer.md)).

---

## 6. CORS, GraphQL, WebSocket reachability

When the developer app runs on the **host** at `http://localhost:6020` and the API runs in a **container** published on `localhost:6021`:

- **CORS:** `OPENTHROTTLE_SERVER_CORS_ORIGINS` must include `http://localhost:6020` (already in `.env.default`).
- **GraphQL:** Host browsers / MCP hit `http://localhost:6021/graphql`. No proxy needed.
- **Socket.IO / GraphQL WS:** Same origin — `ws://localhost:6021/socket.io` works because Docker publishes the port to `0.0.0.0`.

No `host.docker.internal` translation is required when both the consumer (Cursor / browser / Ralph CLI) and the consumer's idea of "localhost" are on the host.

---

## 7. Migrations

Two equivalent approaches; phase 1 picks **A** for simplicity:

- **A. Host script against published port (recommended).**
  ```bash
  docker compose up -d openthrottle-postgres openthrottle-redis
  pnpm run database:migrate    # uses host POSTGRES_URL → localhost:6010
  ```
- **B. One-shot migrations container.** A future `openthrottle-migrations` service that runs `tsx ./scripts/openthrottle-database-migrations.ts` on the compose network and exits. Useful when contributors do not have Node on the host.

Either way, the container build for `openthrottle-server` does **not** run migrations on boot; that stays explicit.

---

## 8. Worker / agents — the deferred boundary

The plans queue worker (`PlansProcessor`) currently:

- Reads `WORKSPACE_ROOT` or falls back to `process.cwd()` (see `applications/openthrottle-server/src/queues/plans/plans.processor.ts` `getWorkspaceRoot`).
- Spawns `pnpm exec workflow-ralph --plan <id>` with `cwd = job.data.workingDirectory ?? getWorkspaceRoot()`.
- Validates `workingDirectory` is an **absolute path that exists on the worker's filesystem**, optionally constrained by `OPENTHROTTLE_ALLOWED_WORKING_DIRS`.

**Phase-1 implication:** When `openthrottle-server` runs in a container, none of the host paths (`/Users/matt/Development/...`) exist inside the container, so the spawn path will fail at `validateWorkingDirectory`. Three options exist; **picking one is task `0bf058d6-…`, not this task**:

1. **Worker on host (recommended for phase 1):** Run the **API in compose** for everyone, but keep `pnpm nx run openthrottle-server:dev` (or a dedicated worker process) on the **host** when running plan jobs. Trade-off: two server instances; OK for local dev because only the host one consumes the queue.
2. **Bind-mount a fixed workspace root** into the container (e.g. `/workspace`) and require all `workingDirectory` values to live under it. Requires a path-rewrite layer between OT (which stores host absolute paths) and the worker (which sees container paths).
3. **Path-rewrite layer in the worker** that maps host prefixes → container prefixes from a config map. Highest flexibility, highest design surface.

**Recommendation for the phase-1 doc:** ship Topology A with the BullMQ worker disabled in compose and call out option 1 in the README. Implementation lives in the path-model task.

---

## 9. Concrete phase-1 docker-compose shape

This is a strict subset of the existing [`docker-compose.yml`](../../docker-compose.yml). No new file is required; the reduction is just a startup command and an env note.

```yaml
# Conceptual — actual services already exist in root docker-compose.yml.
services:
  openthrottle-postgres:
    build:
      context: ./
      dockerfile: Dockerfile.Postgres
    environment:
      POSTGRES_DB: ${POSTGRES_DB}
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    ports:
      - '${POSTGRES_PORT}:5432' # 6010:5432
    volumes:
      - postgres_data:/var/lib/postgresql/data

  openthrottle-redis:
    image: redis:${REDIS_VERSION}-alpine
    ports:
      - '${REDIS_PORT}:6379' # 6011:6379

  openthrottle-server:
    build:
      context: ./
      dockerfile: Dockerfile.NestJS
    depends_on:
      openthrottle-postgres: { condition: service_healthy }
      openthrottle-redis: { condition: service_healthy }
    environment:
      POSTGRES_HOST: openthrottle-postgres
      POSTGRES_PORT: 5432
      REDIS_HOST: openthrottle-redis
      REDIS_PORT: 6379
      PORT: ${OPENTHROTTLE_SERVER_PORT} # 6021
      JWT_SECRET: ${OPENTHROTTLE_DEVELOPER_JWT_SECRET}
      CORS_ORIGINS: ${OPENTHROTTLE_SERVER_CORS_ORIGINS}
    ports:
      - '${OPENTHROTTLE_SERVER_PORT}:${OPENTHROTTLE_SERVER_PORT}' # 6021:6021

volumes:
  postgres_data:
```

**Start command:**

```bash
docker compose up -d openthrottle-postgres openthrottle-redis openthrottle-server
```

**Smoke checks (host):**

```bash
curl -fsS http://localhost:6021/health | jq .
# pgvector visible:
psql "postgresql://openthrottle_user:openthrottle_password@localhost:6010/openthrottle" -c '\dx' | grep vector
# Redis:
redis-cli -h localhost -p 6011 ping
```

---

## 10. Follow-up tasks (links)

- Path / worker placement spike — OT plan `677b6849-…` task `0bf058d6-d018-4266-a757-6ae93970c45a`.
- Cursor MCP smoke test against containerized API — OT plan `677b6849-…` task `805fd192-458c-4681-b8ce-bdb3aa77c751`.
- Multi-workspace plans (`workingDirectory`) implementation that this design assumes — `tools/workflows/README.md` § Multi-workspace plans.

---

## 11. Summary

- **Phase-1 topology = Topology A** (Postgres + Redis + openthrottle-server in compose; everything else on the host).
- **Three host ports** suffice: `6010` (Postgres), `6011` (Redis), `6021` (server).
- **Host MCP env** needs only `API_URL_INTERNAL=http://localhost:6021`.
- **Worker / agents stay on the host** until the path-model spike chooses bind-mount, rewrite layer, or host-only worker.
- **Developer app, Ollama, Caddy** are explicit phase-1 non-goals; document the contract but do not run them in compose yet.
