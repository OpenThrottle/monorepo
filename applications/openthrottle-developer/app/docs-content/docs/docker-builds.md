---
description: Docker Compose
group: 01. Development
order: 3
title: Docker Builds
---

## 🐳 Docker Builds

This document records the chosen **image build strategy** and **registry** for **openthrottle-server** and **openthrottle-developer**, as part of the plan _Docker build and deploy for OpenThrottle apps on single box_. It should be read together with [run-build-and-docker-current-state.md](./run-build-and-docker-current-state.md).

---

## 1. Build strategy summary

| Decision             | Choice                                                                                                                                                                                                                                                                                                                                                                   |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Build context**    | Monorepo root. Images are built with `docker build -f Dockerfile.<App>.v3 .` (context `.`) so Nx and pnpm can resolve workspace dependencies.                                                                                                                                                                                                                            |
| **Dockerfiles**      | **One canonical Dockerfile per app**, both at the repo root: `Dockerfile.NestJS.v3` (openthrottle-server) and `Dockerfile.ReactRouter.v3` (openthrottle-developer). The old baseline (`Dockerfile.NestJS`, `Dockerfile.ReactRouter`) and `.v2` variants have been **deleted** — v3 is the single source of truth. Both are multi-stage and parameterized via build args. |
| **Stages**           | base → builder (pnpm install) → build (Nx build + `pnpm --filter <app> --prod deploy /app/pruned --legacy`) → production (distroless `nodejs24-debian12:nonroot`, copy the pruned tree only). No manual `rm -rf node_modules/.pnpm` pruning — each app declares its own runtime deps and `pnpm --prod deploy` produces the tree.                                         |
| **Tooling in image** | Node 24, pnpm (version pinned), Nx via `pnpm dlx nx@<version>`. No global Nx install; lockfile and workspace define deps.                                                                                                                                                                                                                                                |
| **Registry**         | **Google Artifact Registry** in region `us-west2`: `us-west2-docker.pkg.dev/<GCP_PROJECT>/openthrottle/<image>:<tag>`. Aligns with existing monorepo pattern (see [Google-Cloud.md](../monorepo/Google-Cloud.md)).                                                                                                                                                       |
| **Image naming**     | `openthrottle-server`, `openthrottle-developer`. Full path: `us-west2-docker.pkg.dev/<GCP_PROJECT>/openthrottle/openthrottle-server` and same for `openthrottle-developer`.                                                                                                                                                                                              |
| **Tagging**          | `latest` (optional), Git SHA (e.g. `sha-abc1234`), and/or app version from `package.json` (e.g. `1.3.0`). CI should set tag from `GITHUB_SHA` or version.                                                                                                                                                                                                                |

---

## 2. Registry: Google Artifact Registry

- **Choice:** **Google Artifact Registry** (not GCR legacy, not Docker Hub for production).
- **Region:** `us-west2` to match existing monorepo usage and optional colocation with the OpenThrottle E2 VM.
- **URL pattern:** `us-west2-docker.pkg.dev/<GCP_PROJECT>/openthrottle/<image>:<tag>`.
- **Auth:** `gcloud auth configure-docker us-west2-docker.pkg.dev` (and in CI, workload identity or service account key with `roles/artifactregistry.writer`).
- **Why:** Same pattern as other containerized apps in the monorepo; keeps images in one place and integrates with GCP IAM and the E2 instance in the same project/region.

---

## 3. Build from monorepo (multi-stage, Nx + pnpm)

- **Context:** Build context is the **monorepo root** so that:
  - `pnpm install --frozen-lockfile` sees the full workspace.
  - `pnpm dlx nx@<version> run <APP_NAME>:build` can resolve and build dependencies (e.g. `@tools/workflows`, openthrottle packages).
- **Stages:**
  1. **base** — `node:22-bookworm-slim` (glibc, so native addons match the distroless runtime), pnpm pinned via `PNPM_VERSION`, non-root identity, build args (`APP_NAME`, `APP_VERSION`, `NX_VERSION`, `PNPM_VERSION`, `GITHUB_TOKEN`, `NX_KEY`).
  2. **builder** — `python3 make g++`, copy app `package.json` + `packages/` + `tools/`, `pnpm install --frozen-lockfile`.
  3. **build** — `NODE_ENV=production`, `COPY . .`, `pnpm install --frozen-lockfile`, `pnpm dlx nx@${NX_VERSION} run ${APP_NAME}:build` (server also runs the package/tool builds), then `pnpm --filter "${APP_NAME}" --prod deploy /app/pruned --legacy`. Output is `/app/pruned` with the app, its `build/`, and a production `node_modules`.
  4. **production** — `gcr.io/distroless/nodejs24-debian12:nonroot`, `COPY --from=build /app/pruned/. /app/`. Distroless has no shell/curl: the server ships an in-image `HEALTHCHECK` using `/nodejs/bin/node` against `/health`; the entrypoint is Node and `CMD` is argv only.
- **openthrottle-server:** NestJS; production `CMD ["-r", "dotenv/config", "build/src/main.js"]`.
- **openthrottle-developer:** React Router; production `CMD ["node_modules/@react-router/serve/bin.js", "build/server/index.js"]`.
- **Pruning caveat:** `pnpm --prod deploy --legacy` in this non-injected workspace copies the whole-workspace **production** store rather than a strict per-app closure, so each image is larger than its true footprint (the foreign stack is present but unused). The blunt `rm -rf .pnpm` hacks that used to mask this are removed; the precise fix (injected strict deploy) is tracked in plan `cd59757e-23db-4cd1-ad66-a89c49c66376`.

---

## 4. Image naming and tagging

- **Names:** `openthrottle-server`, `openthrottle-developer`.
- **Tags:**
  - **CI (recommended):** `sha-${GITHUB_SHA}` or short SHA for traceability.
  - **Version (optional):** From `applications/<app>/package.json` `version` (e.g. `1.3.0`).
  - **Latest (optional):** `latest` for “current” if desired; prefer immutable tags in production.
- **Example:**
  `us-west2-docker.pkg.dev/my-gcp-project/openthrottle/openthrottle-server:sha-abc1234`

---

## 5. Canonical Dockerfiles (both at repo root)

- **`Dockerfile.NestJS.v3`** — openthrottle-server. Multi-stage (base → builder → build → distroless production), `APP_NAME=openthrottle-server`, in-image `/health` probe, `CMD ["-r", "dotenv/config", "build/src/main.js"]`.
- **`Dockerfile.ReactRouter.v3`** — openthrottle-developer. Same stage shape; distroless production plus an optional `production-debian` target (debian-slim + shell for curl healthchecks). `CMD ["node_modules/@react-router/serve/bin.js", "build/server/index.js"]`.

Both Dockerfiles also expose a **`development` target** (based on the `builder` stage: node:22-bookworm-slim with a shell, full workspace install, no pruning/distroless) whose `CMD` runs the app's Nx dev target (`pnpm nx run ${APP_NAME}:dev`, `NX_DAEMON=false`). It exists for the compose `dev` profile / `docker compose watch` hot-reload workflow and is never published; `production` (the last stage) remains the default target. See [docker-dev-workflow-and-host-bridge.md](./docker-dev-workflow-and-host-bridge.md).

The old `Dockerfile.NestJS`, `Dockerfile.ReactRouter`, and both `.v2` variants have been deleted.

### 5.1. Nx `docker-build` targets

Both apps expose an Nx `docker-build` target that wraps `docker build` with the correct flags and `cwd` = repo root, so the build context is always the monorepo root:

```bash
pnpm nx run openthrottle-server:docker-build       # -> Dockerfile.NestJS.v3,    -t openthrottle-server:local
pnpm nx run openthrottle-developer:docker-build    # -> Dockerfile.ReactRouter.v3, -t openthrottle-developer:local
```

Each target sets default env (`APP_VERSION`, `NX_VERSION=22.7.4`, `PNPM_VERSION=11.6.0`) and passes `--target production`. Set `GITHUB_TOKEN` and `NX_KEY` in your environment for private deps and the Nx remote cache (both optional for a local build).

- **Manual build from repo root** (server shown; developer is identical with `-f Dockerfile.ReactRouter.v3` and `APP_NAME=openthrottle-developer`):

  ```bash
  docker build -f Dockerfile.NestJS.v3 --target production \
    --build-arg APP_NAME=openthrottle-server \
    --build-arg APP_VERSION=1.3.0 \
    --build-arg NX_VERSION=22.7.4 \
    --build-arg PNPM_VERSION=11.6.0 \
    --build-arg GITHUB_TOKEN=${GITHUB_TOKEN:-} \
    --build-arg NX_KEY=${NX_KEY:-} \
    -t openthrottle-server:local .
  ```

- **Build-args:** `APP_NAME`, `APP_VERSION`, `GITHUB_TOKEN`, `NX_VERSION`, `NX_KEY`, **`PNPM_VERSION`** (no usable default — must be passed; use the root `packageManager` pin, currently `11.6.0`).
- **Docker Compose:** the repo-root `docker-compose.yml` builds the server with `dockerfile: Dockerfile.NestJS.v3` and the developer with `dockerfile: Dockerfile.ReactRouter.v3` (`context: ./`).

---

## 6. Production entrypoints (`start:docker`)

Both apps define a `start:docker` script used outside the distroless images (the distroless `production` stage runs Node directly via the Dockerfile `CMD`):

- **openthrottle-server:** `node -r dotenv/config ./build/src/main.js`
- **openthrottle-developer:** `react-router-serve ./build/server/index.js`

---

## 7. CI: build and push

- **Workflow:** `.github/workflows/openthrottle-docker.yml`.
- **Triggers:** Push to `main` and pull requests when paths under `applications/openthrottle-server/`, `applications/openthrottle-developer/`, `packages/openthrottle/`, `databases/`, `tools/workflows/`, or root `package.json` / `pnpm-lock.yaml` / `nx.json` change.
- **Logic:** Uses Nx affected (`nx show projects --affected`) to build only **openthrottle-server** and/or **openthrottle-developer** when those projects or their dependencies are affected. On **push to main**, images are pushed to Artifact Registry with tag `sha-<GITHUB_SHA>`. On **pull requests**, images are built only (no push) to validate Dockerfiles.
- **Reusable action:** To configure which Nx apps are considered and to read per-app flags without duplicating shell, use the composite action `.github/actions/nx-affected-docker-apps` — see its **README.md** for inputs, outputs, and how to add more `openthrottle-*` (or other) app names.
- **Registry:** Same as §2; GCP credentials and project come from repo vars/secrets (production on `main`, staging otherwise). The workflow runs `gcloud auth configure-docker us-west2-docker.pkg.dev` so `docker push` succeeds.
- **Optional deploy:** To trigger deploy to the E2 (e.g. pull and restart via Docker Compose), add a follow-up job or manual `workflow_dispatch` that SSHs or uses a deploy webhook; not included in the initial workflow.

---

## 8. Docker Compose (local run)

- **Compose file:** the repo-root **`docker-compose.yml`** defines `openthrottle-postgres`, `openthrottle-redis`, `openthrottle-server` (built from `Dockerfile.NestJS.v3`), and `openthrottle-developer` (built from `Dockerfile.ReactRouter.v3`), all with `context: ./`.
- **Run from repo root:**
  `docker compose up --build`
- **Dev / consumer workflows:** the root compose also carries a `dev` profile (`docker compose --profile dev watch` — hot reload from source) and `applications/openthrottle/docker-compose.yml` is the published-image consumer install. Both, plus the containerized host-execution bridge, are designed in **[docker-dev-workflow-and-host-bridge.md](./docker-dev-workflow-and-host-bridge.md)**; smoke them with `scripts/docker-smoke-test.sh [prod|dev|consumer]`.
- **Required env:** populate the repo-root `.env`. For container-to-container access set `POSTGRES_HOST=openthrottle-postgres` and `REDIS_HOST=openthrottle-redis`; the server also needs `POSTGRES_PORT`/`REDIS_PORT`, `OPENTHROTTLE_SERVER_PORT`, `CORS_ORIGINS`/`CORS_CREDENTIALS`, `JWT_SECRET`; the developer needs `API_URL_INTERNAL`/`API_URL_EXTERNAL` (the URL the browser uses to reach the server, e.g. `http://localhost:3000`), the `APP_URL*` family, and `OPENTHROTTLE_DEVELOPER_PORT`.

### 8.1. Verification

1. **Server image (Nx target):** `pnpm nx run openthrottle-server:docker-build` — builds `openthrottle-server:local` from `Dockerfile.NestJS.v3`. Pass `PNPM_VERSION` via the target (defaulted to `11.6.0`).
2. **Developer image (Nx target):** `pnpm nx run openthrottle-developer:docker-build` — builds `openthrottle-developer:local` from `Dockerfile.ReactRouter.v3`.
3. **Full stack:** from the repo root, `docker compose up --build` brings up postgres + redis + server + developer. Expect the server `/health` to return `200 {"api":"ok","database":"ok","redis":"ok","websocket":"ok"}` and the developer to serve `/`.

> The production trees were independently proven complete via `pnpm --filter <app> --prod deploy /tmp/pruned-<app> --legacy` + boot test (server `/health`=200; developer serves via `react-router-serve`) — see plan `b5a36ccf-f4a6-4cd9-bbd3-6e2b41fa6923` Task `79d837be`.

### 8.2. Local push to Artifact Registry (same names as CI)

Pushing images built on a developer machine must use the **same registry prefix and image names** as CI (`.github/workflows/openthrottle-docker.yml` and `.github/actions/docker-build-push`) so staging or automation can pull the same refs.

| Item                             | Value                                                                                                                                                                                                                                                                                                                            |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Artifact Registry region**     | `us-west2` (`ARTIFACT_REGISTRY_REGION` in the workflow). This is the region where the Docker repository lives; it is **not** necessarily the same as other GCP resource regions you use elsewhere.                                                                                                                               |
| **Registry / repository prefix** | `us-west2-docker.pkg.dev/<GCP_PROJECT>/openthrottle` (no trailing slash). `<GCP_PROJECT>` is `vars.GOOGLE_PROJECT_ID_STAGING` for non-`main` workflows and `vars.GOOGLE_PROJECT_ID_PRODUCTION` when the workflow targets production on `main`. Staging is typically `openthrottle-staging` (see `infra/environments/README.md`). |
| **Image names**                  | `openthrottle-server` and `openthrottle-developer` — same as the Nx app names and the `INPUT_APP` input to `docker-build-push`. Full references: `us-west2-docker.pkg.dev/<GCP_PROJECT>/openthrottle/openthrottle-server:<tag>` and `.../openthrottle-developer:<tag>`.                                                          |
| **CI tag format**                | `sha-<GITHUB_SHA>` (full Git SHA from GitHub, prefixed with `sha-`).                                                                                                                                                                                                                                                             |

**Local machine: authenticate before `docker push`**

1. Sign in: `gcloud auth login`, or `gcloud auth activate-service-account --key-file=...` for automation.
2. Select project: `gcloud config set project <GCP_PROJECT>` (match the project whose Artifact Registry you are pushing to).
3. IAM: the principal needs **`roles/artifactregistry.writer`** (or a role that includes Artifact Registry write) on that project.
4. Configure Docker for the registry host: `gcloud auth configure-docker us-west2-docker.pkg.dev`

**Distinction:** Artifact Registry hosts container images at `*.pkg.dev` and is used with `docker push`. **Nx remote cache** uses **GCS buckets** (for example `openthrottle-staging-nx-cache`) and `gsutil`; do not confuse the two.

## 9. References

- Current run/build and existing Docker usage: [run-build-and-docker-current-state.md](./run-build-and-docker-current-state.md).
- Canonical Dockerfiles: `Dockerfile.NestJS.v3`, `Dockerfile.ReactRouter.v3` (repo root).
- Strict per-app deploy follow-up: plan `cd59757e-23db-4cd1-ad66-a89c49c66376`.
- Registry / gcloud: [Google-Cloud.md](../monorepo/Google-Cloud.md).
- Infra (E2, no images yet): `infra/applications/openthrottle/main.tf`.
