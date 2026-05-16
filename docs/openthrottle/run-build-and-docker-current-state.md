# OpenThrottle server and developer — current run/build and container usage

This document captures how **openthrottle-server** and **openthrottle-developer** are built and run today, and where Docker or container usage already exists. It supports the plan: _Docker build and deploy for OpenThrottle apps on single box_.

For **running the full stack with Docker Compose** (Postgres, Redis, server, developer), use `applications/openthrottle/docker-compose.yml` from the monorepo root and see **applications/openthrottle/README.md** § Docker Compose and **docs/openthrottle/docker-image-build-strategy.md** § Docker Compose.

---

## 1. openthrottle-server

### 1.1 Overview

- **Type:** NestJS application (REST + GraphQL).
- **Location:** `applications/openthrottle-server/`.
- **Node:** `>=22` (from `package.json` engines).

### 1.2 Build

- **Tooling:** Nx + Nest CLI.
- **Commands (from monorepo root):**
  - Build: `pnpm nx build openthrottle-server`
    Runs: `nest build --path {projectRoot}/tsconfig.app.json`.
  - Depends on: `^build` and `^build-package` (built dependencies).
- **Output:** `applications/openthrottle-server/build/` (from `tsconfig.app.json` `outDir: "./build"`). Entry: `build/src/main.js`.

### 1.3 Run

- **Development (watch):**
  `pnpm nx dev openthrottle-server`
  Runs: `nest start --path {projectRoot}/tsconfig.app.json --watch`. Depends on `^dev`.
- **Production (one-shot):**
  `pnpm nx start openthrottle-server`
  Runs: `nest start --path {projectRoot}/tsconfig.app.json`.
- **Docker-style run (built artifact + env file):**
  `node -r dotenv/config ./build/src/main.js`
  Script in package.json: `"start:docker": "node -r dotenv/config ./build/src/main.js"`. Assumes `.env` (or env vars) and pre-built `build/`.

### 1.4 Port and env

- **Port:** From `ConfigService`: `config.get<string>('PORT', '3000')`. Default **3000**. In `applications/openthrottle-server/.env.default`: **6021** (`PORT="6021"`).
- **Env file:** `applications/openthrottle-server/.env` (and `.env.default` as template). `ConfigModule` uses `envFilePath: ['.env']`.

### 1.5 Environment variables (relevant to run/build and deploy)

| Variable                                                                                                  | Purpose                                                                                                                                                                     |
| --------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `PORT`                                                                                                    | HTTP listen port (default 3000; local template uses **6021** in `applications/openthrottle-server/.env.default`).                                                           |
| `NODE_ENV`                                                                                                | e.g. development, production.                                                                                                                                               |
| `APP_ENV`, `APP_NAME`, `APP_VERSION`, `APP_URL`                                                           | App identity and base URL.                                                                                                                                                  |
| `JWT_SECRET`, `JWT_ISSUER`                                                                                | Auth (JWT).                                                                                                                                                                 |
| `CORS_ORIGINS`, `CORS_CREDENTIALS`, `CORS_ALLOWED_METHODS`                                                | CORS (e.g. developer on **6020**, Vite **5173**).                                                                                                                           |
| `POSTGRES_HOST`, `POSTGRES_PORT`, `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_URL`     | Cortex/Postgres.                                                                                                                                                            |
| `REDIS_HOST`, `REDIS_PORT`                                                                                | BullMQ and GraphQL cache (default Redis 6379).                                                                                                                              |
| `GITHUB_TOKEN`                                                                                            | Optional; for GitHub API (e.g. list PRs).                                                                                                                                   |
| `WORKSPACE_ROOT`                                                                                          | Optional; when API is not started from repo root (e.g. doc-ingestion, plans processor spawn `pnpm run cortex:import-docs` / Ralph from this path).                          |
| `DOC_INGESTION_CRON`, `DOC_INGESTION_DIRECTORIES`, `DOC_INGESTION_SCOPE`                                  | Doc-ingestion queue (see docs/openthrottle/doc-ingestion-job-spec.md).                                                                                                      |
| `DATABASE_BACKUP_CRON`, `DATABASE_BACKUP_TZ`, `DATABASE_BACKUP_ENABLED`, `DATABASE_BACKUP_JOB_TIMEOUT_MS` | Scheduled `pnpm run database:backup` (see docs/openthrottle/database-backup-scheduled-job-spec.md). Requires `pg_dump`, `zip`, and `WORKSPACE_ROOT` when not cwd’d to repo. |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`                                                              | Payments.                                                                                                                                                                   |
| `OPENTHROTTLE_APP_URL` / `APP_URL`                                                                        | Checkout redirect base.                                                                                                                                                     |
| `PROFILE_EXECUTION_OUTPUT_PATH`                                                                           | Optional profiling.                                                                                                                                                         |
| `BULLMQ_BOARD_*`                                                                                          | BullMQ Board UI.                                                                                                                                                            |
| GCP: `GOOGLE_CLOUD_PROJECT_ID`, `GOOGLE_APPLICATION_CREDENTIALS`, etc.                                    | When using GCP (e.g. Cloud SQL, staging).                                                                                                                                   |

---

## 2. openthrottle-developer

### 2.1 Overview

- **Type:** React Router v7 app (Vite, SSR).
- **Location:** `applications/openthrottle-developer/`.
- **Node:** `>=22` (from `package.json` engines).
- **Nx:** `implicitDependencies: ["openthrottle-server"]` (no direct build dep; logical dependency for API).

### 2.2 Build

- **Tooling:** Nx + `@nx/react/router-plugin`. React Router build produces server bundle + client assets.
- **Commands (from monorepo root):**
  - Build: `pnpm nx build openthrottle-developer`
    Plugin target `build` (React Router build).
  - Dev: `pnpm nx dev openthrottle-developer`
    Plugin target `dev`.
  - Start (production): `pnpm nx start openthrottle-developer`
    Plugin target `start`.
- **Output:** React Router typical layout: `build/server/`, `build/client/` under the app directory (see other React Router apps for `react-router-serve`).

### 2.3 Run

- **Development:** `pnpm nx dev openthrottle-developer` (Vite dev server).
- **Production:** Served by React Router server (e.g. `react-router-serve ./build/server/index.js`). **`package.json`** defines `"start:docker": "react-router-serve ./build/server/index.js"` for container images that use the same pattern as other React Router apps in the monorepo.

### 2.4 Port and env

- **Port:** In `applications/openthrottle-developer/.env.default`: **6020** (`PORT="6020"`, `APP_URL="http://localhost:6020"`). Vite uses `process.env.PORT` or defaults to **3000** if unset.
- **API:** Points at openthrottle-server: `API_URL_INTERNAL`, `API_URL_EXTERNAL` (e.g. `http://localhost:6021` in dev). Align **server** `CORS_ORIGINS` with the developer origin (see `applications/openthrottle-server/.env.default`).

### 2.5 Environment variables (relevant to run/build and deploy)

| Variable                                                    | Purpose                                                                             |
| ----------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `PORT`                                                      | Dev/serve port (default **3000** in Vite if unset; **6020** in app `.env.default`). |
| `NODE_ENV`, `APP_ENV`, `APP_NAME`, `APP_VERSION`, `APP_URL` | App identity.                                                                       |
| `API_URL_INTERNAL`, `API_URL_EXTERNAL`                      | Backend GraphQL and WebSocket (openthrottle-server).                                |
| `APP_URL_WEBSITE`                                           | Optional (e.g. 6014).                                                               |
| `REACT_ROUTER_DEV_TOOLS`                                    | Dev tooling.                                                                        |
| `VERCEL`                                                    | Vercel preset in `react-router.config.ts` when deploying to Vercel.                 |

---

## 3. Existing Docker and container usage

### 3.1 Dockerfiles in the monorepo

- **Root**
  - **`Dockerfile.NestJS`** — Commented-out; multi-stage (base → dependencies → builder → production), pnpm, Nx; expects `APP_NAME`, `APP_VERSION`, `GITHUB_TOKEN`, `NX_VERSION`; production `CMD ["pnpm", "start:docker"]`. Could be adapted for openthrottle-server.
  - **`Dockerfile.ReactRouter`** — Multi-stage (base → dependencies → builder → production), pnpm, Nx; `RUN pnpm dlx nx@${NX_VERSION} run ${APP_NAME}:build` then `pnpm --filter=${APP_NAME} --prod deploy pruned`; `CMD ["pnpm", "start:docker"]`. Suited for React Router apps; **openthrottle-developer** defines `start:docker` in `applications/openthrottle-developer/package.json`.
  - **`Dockerfile.Cortex`**, **`Dockerfile.PostgreSQL`** — Other uses (Cortex/Postgres).
- **applications/openthrottle/**
  - **`Dockerfile.Postgres`** — Postgres image with pgvector; used by local docker-compose for the OpenThrottle Postgres service only (no server/developer images).

### 3.2 Docker Compose

- **`applications/openthrottle/docker-compose.yml`** — Defines **openthrottle-postgres** (build from `Dockerfile.Postgres`) and **openthrottle-redis** (official Redis image). Used for local Cortex/Redis. **No** openthrottle-server or openthrottle-developer services.
- Root `docker-compose*.yml` — Other apps/databases; no OpenThrottle server/developer.

### 3.3 Summary

- **openthrottle-server:** Dedicated Dockerfile at `Dockerfile.NestJS` (multi-stage, build from monorepo root). Run in container uses `start:docker` (node + dotenv). See [docker-image-build-strategy.md](./docker-image-build-strategy.md).
- **openthrottle-developer:** Dedicated Dockerfile at `Dockerfile.ReactRouter` (same pattern as root `Dockerfile.ReactRouter`). App has `start:docker` script: `react-router-serve ./build/server/index.js`. See [docker-image-build-strategy.md](./docker-image-build-strategy.md).

---

## 4. Infra (Terraform) — current state

- **Module:** `infra/applications/openthrottle/`.
- **Resources:** Cloud SQL Postgres, Memorystore Redis, reserved IP for Redis, and **Compute Engine E2** (`module "openthrottle_compute_e2"` from `infra/modules/gcp_compute_e2`).
- **E2 instance:** Boot disk + attached SSD; **no** startup script, **no** Docker or app deployment in Terraform. The box is provisioned but not yet wired to run openthrottle-server or openthrottle-developer.

---

## 5. Monorepo scripts (root) relevant to OpenThrottle

- **Cortex/import (used by server at runtime):**
  `cortex:import`, `cortex:import-docs`, `cortex:migrate`, `cortex:backup`, `cortex:reset` — see root `package.json`. The server can spawn `pnpm run cortex:import-docs` (and similar) when `WORKSPACE_ROOT` is set; container/deploy design should account for this if doc-ingestion or Ralph need the monorepo context.
- **Sync (subtree push):**
  `sync:openthrottle:server`, `sync:openthrottle:developer` — push app subtrees to separate repos; not used for Docker build.

---

## 6. References

- Server: `applications/openthrottle-server/package.json`, `src/main.ts`, `.env.default`, `README.md`.
- Developer: `applications/openthrottle-developer/package.json`, `react-router.config.ts`, `.env.default`, `README.md`.
- Nx: `nx.json` (`@nx/react/router-plugin` for build/dev/start).
- Doc ingestion: `docs/openthrottle/doc-ingestion-job-spec.md`.
- Infra: `infra/applications/openthrottle/main.tf`, `variables.tf`, `outputs.tf`; `infra/modules/gcp_compute_e2/main.tf`.
