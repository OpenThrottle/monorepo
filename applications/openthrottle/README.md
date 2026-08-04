<p align="center">
  <img src="https://storage.googleapis.com/monorepo-production-assets/OpenThrottle/branding/icons/red/icon-256.png" alt="OpenThrottle">
</p>

# OpenThrottle | AI

> AI-powered feedback loops that move you 10x to 100x faster, without sacrificing control.

OpenThrottle is context-driven AI for developers: plans, tasks, and knowledge stay in sync with your code. Use the developer app, MCP, and APIs to keep commits, PRs, and docs in one loop-so you ship faster without leaving your flow.

## Run entirely locally on OSS

OpenThrottle can run **entirely locally** with Open Source models and software—no required SaaS or proprietary APIs for core flows.

- **Local / OSS stack:** Postgres (with pgvector), Redis, Node, and the OpenThrottle server, developer app, and MCP (OpenThrottle/openthrottle-mcp) are all OSS and run on your machine or your infra.
- **Embeddings (semantic search, plans knowledge base):** For **local-only** use set **Ollama** (`OLLAMA_BASE_URL`, optional `OLLAMA_EMBEDDING_MODEL`). The MCP and OpenThrottle ingest then use Ollama for embeddings; no API key required. See root `.env.default`, `databases/README.md` (embedding dimension strategy), and `docs/monorepo/Ollama.md`.
- **Optional — OpenAI:** If you prefer cloud embeddings, set `OPENAI_API_KEY` and leave Ollama unset; the stack uses OpenAI (e.g. `text-embedding-3-small`) for embeddings. Not required for local-only.

Details and copy for website or docs: `docs/openthrottle/run-locally-oss.md`.

## Work as history

The work you do in OpenThrottle—plans, tasks, commits, and output—forms a **history of who did what and when**. It complements Git (code history) with plan and task history, and can replace traditional tools like Jira: one place to see what was planned, what was done, and how it links to commits and PRs.

- **Audit trail:** Plans, tasks, commit links, and plan output give you traceability from idea → task → commit → PR.
- **Complements Git:** Git is the history of code; OpenThrottle is the history of work (intent, status, outcomes).
- **Replace Jira:** Plans and tasks live in your own Postgres (OpenThrottle); link commits and PRs; run locally and own your data.

Details and copy for website or docs: `docs/openthrottle/work-as-history.md`.

## Docker Compose

You can run the full OpenThrottle stack (Postgres, Redis, openthrottle-server, openthrottle-developer) with Docker Compose. Images for the server and developer app are **built from the monorepo root** so Nx and pnpm can resolve workspace dependencies.

### Run from monorepo root

**Run Compose from the repo root** so the build context for `openthrottle-server` and `openthrottle-developer` resolves correctly (their Dockerfiles use `context: ../..` relative to the compose file):

```bash
# From monorepo root
docker compose up --build
```

To build images only (e.g. for CI), use the same file from repo root:

```bash
docker compose build
```

### Required `.env`

Compose reads **`applications/openthrottle/.env`** (path is relative to the compose file). Create it from `applications/openthrottle/.env.default` and set at least:

- **Postgres (for server and Postgres service):** `POSTGRES_HOST`, `POSTGRES_PORT`, `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_VERSION`. When running in Compose, the server and developer run inside the same Docker network, so set **`POSTGRES_HOST=openthrottle-postgres`** and **`REDIS_HOST=openthrottle-redis`** (and use `POSTGRES_DB=openthrottle` if you use the default OpenThrottle schema).
- **Redis:** `REDIS_HOST=openthrottle-redis`, `REDIS_PORT=6379`, `REDIS_VERSION` (e.g. `8.8.0`).
- **openthrottle-server:** `JWT_SECRET`, `CORS_ORIGINS` (include the developer app origin, e.g. `http://localhost:5173`). Optional: `PORT` (default in container is 3000), `OPENAI_API_KEY` or Ollama vars for embeddings (see root `.env.default` and `databases/README.md`).
- **openthrottle-developer:** `API_URL` must be the URL the **browser** uses to reach the server (e.g. `http://localhost:3000` when using the default host port). Optional: `API_URL_EXTERNAL`, `PORT` (default 5173 in container).

Ports exposed on the host are configurable via **`OPENTHROTTLE_SERVER_PORT`** (default 3000) and **`OPENTHROTTLE_DEVELOPER_PORT`** (default 5173). Build args **`OPENTHROTTLE_SERVER_VERSION`**, **`OPENTHROTTLE_DEVELOPER_VERSION`**, and **`NX_VERSION`** are optional (see compose file).

## Applications

- `6011` | OpenThrottle - Redis
- `6010` | OpenThrottle - Postgres

- `6022` | OpenThrottle Admin
- `6023` | OpenThrottle CMS
- `6020` | OpenThrottle Developer
- `6024` | OpenThrottle Email
- `6021` | OpenThrottle Server (API)
- `6025` | OpenThrottle Website

## Installation

- **Prerequisites:** Node.js ≥22, pnpm, and (for full stack) Postgres with pgvector and Redis. The monorepo uses pnpm and Nx; run all commands from the **monorepo root** unless noted.
- **Clone and install:** From the monorepo root run `pnpm install` to install workspace dependencies.
- **Environment:** Copy `applications/openthrottle/.env.default` to `applications/openthrottle/.env` and set Postgres/Redis (and optional JWT, CORS, Ollama/OpenAI) as needed. For Docker Compose, use the same `.env`; see [Required `.env`](#required-env) above.
- **Postgres + Redis:** Either run them via Docker Compose (`docker compose up -d openthrottle-postgres openthrottle-redis` from repo root) or use existing instances and point `.env` at them. OpenThrottle schema and migrations: `databases/README.md`.
- **Optional — embeddings:** For semantic search (plans knowledge base) use Ollama (set `OLLAMA_BASE_URL`) or OpenAI (set `OPENAI_API_KEY`). See root `.env.default` and `docs/openthrottle/run-locally-oss.md`.

## Development

- **Run the full stack locally:** Start Postgres and Redis (e.g. via the compose file or your own). Then from the monorepo root:
  - **Server:** `pnpm nx run openthrottle-server:dev` (or the configured port, e.g. 7021 per `.env.default`).
  - **Developer app:** `pnpm nx run openthrottle-developer:dev` (connects to the server via `API_URL`; default dev port often 5173 or as in `.env`).
  - Ensure `CORS_ORIGINS` on the server includes the developer app origin (e.g. `http://localhost:5173`).
- **Ports and env:** See `applications/openthrottle/.env.default` for `OPENTHROTTLE_SERVER_PORT`, `OPENTHROTTLE_DEVELOPER_PORT`, and Postgres/Redis. For a single entry point (e.g. Caddy), see `docs/monorepo/local-services-and-ports.md`.
- **MCP / OpenThrottle:** The plans knowledge base and MCP (openthrottle-mcp) talk to the same Postgres/OpenThrottle and openthrottle-server GraphQL. Configure the MCP with the server URL and auth; see `packages/openthrottle-mcp/README.md` and `databases/README.md`.
- **Tests and lint:** From repo root use Nx: `pnpm nx run openthrottle:test`, `pnpm nx run openthrottle:lint`, etc. Individual apps: `pnpm nx run openthrottle-server:test`, `pnpm nx run openthrottle-developer:test`, and so on.

## Suggestions

- **Run entirely locally:** Prefer Ollama for embeddings when you don’t want to use OpenAI; see `docs/openthrottle/run-locally-oss.md` and `databases/README.md` (embedding dimension strategy).
- **Docker Compose:** For a single-command stack (Postgres, Redis, server, developer app), run Compose from the monorepo root as in [Run from monorepo root](#run-from-monorepo-root); ensure `.env` is populated per [Required `.env`](#required-env).
- **Ralph / workflows:** Use `pnpm exec workflow-ralph --plan <plan-id>` for agentic execution against plans; see `tools/workflows/README.md` and `AGENTS.md`.
- **Docs:** More copy and architecture: `docs/openthrottle/` (e.g. `run-locally-oss.md`, `work-as-history.md`, `docker-image-build-strategy.md`).
