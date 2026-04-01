# OpenThrottle Docker image build strategy and registry

This document records the chosen **image build strategy** and **registry** for **openthrottle-server** and **openthrottle-developer**, as part of the plan _Docker build and deploy for OpenThrottle apps on single box_. It should be read together with [run-build-and-docker-current-state.md](./run-build-and-docker-current-state.md).

---

## 1. Build strategy summary

| Decision             | Choice                                                                                                                                                                                                             |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Build context**    | Monorepo root. Images are built with `docker build -f applications/<app>/Dockerfile .` so Nx and pnpm can resolve workspace dependencies.                                                                          |
| **Dockerfiles**      | One Dockerfile per app: `applications/openthrottle-server/Dockerfile`, `applications/openthrottle-developer/Dockerfile`. Both are multi-stage and parameterized via build args.                                    |
| **Stages**           | Base → dependencies (pnpm install) → builder (Nx build + pnpm deploy pruned) → production (copy pruned app only, non-root user, `CMD start:docker`).                                                               |
| **Tooling in image** | Node 22, pnpm (version pinned), Nx via `pnpm dlx nx@<version>`. No global Nx install; lockfile and workspace define deps.                                                                                          |
| **Registry**         | **Google Artifact Registry** in region `us-west2`: `us-west2-docker.pkg.dev/<GCP_PROJECT>/openthrottle/<image>:<tag>`. Aligns with existing monorepo pattern (see [Google-Cloud.md](../monorepo/Google-Cloud.md)). |
| **Image naming**     | `openthrottle-server`, `openthrottle-developer`. Full path: `us-west2-docker.pkg.dev/<GCP_PROJECT>/openthrottle/openthrottle-server` and same for `openthrottle-developer`.                                        |
| **Tagging**          | `latest` (optional), Git SHA (e.g. `sha-abc1234`), and/or app version from `package.json` (e.g. `1.3.0`). CI should set tag from `GITHUB_SHA` or version.                                                          |

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
  1. **base** — Node 22 (slim or alpine), pnpm, non-root user, build args (`APP_NAME`, `APP_VERSION`, `NX_VERSION`, `PNPM_VERSION`; `GITHUB_TOKEN` only in dependencies layer if needed for private deps).
  2. **dependencies** — `COPY . .`, `pnpm install --frozen-lockfile` (with cache mount for store).
  3. **builder** — `NODE_ENV=production`, `pnpm dlx nx@${NX_VERSION} run ${APP_NAME}:build`, then `pnpm --filter=${APP_NAME} --prod deploy pruned`. Output is `/app/pruned` with the app and its production node_modules.
  4. **production** — Copy `--from=builder /app/pruned ./`, set ownership to non-root user, `CMD ["pnpm", "start:docker"]`.
- **openthrottle-server:** NestJS; `start:docker` is `node -r dotenv/config ./build/src/main.js` (already in package.json). No extra stage.
- **openthrottle-developer:** React Router; `start:docker` is `react-router-serve ./build/server/index.js` (added in package.json). Same Dockerfile pattern as root `Dockerfile.ReactRouter`.

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

## 5. Dockerfiles added

- **`applications/openthrottle-server/Dockerfile`** — Multi-stage (base → dependencies → builder → production), mirrors the uncommented NestJS pattern from root `Dockerfile.NestJS`, with `APP_NAME=openthrottle-server` and `CMD ["pnpm", "start:docker"]`.
- **`applications/openthrottle-developer/Dockerfile`** — Same pattern as root `Dockerfile.ReactRouter`; `APP_NAME=openthrottle-developer`; requires `start:docker` in `package.json` (see below).

Both are intended to be built from the repo root, e.g.:

```bash
docker build -f applications/openthrottle-server/Dockerfile \
  --build-arg APP_NAME=openthrottle-server \
  --build-arg APP_VERSION=1.3.0 \
  --build-arg NX_VERSION=22.5.4 \
  -t openthrottle-server:local .
```

### 5.1. Root Dockerfile.NestJS.v3 and Nx docker-build (openthrottle-server)

The **root** `Dockerfile.NestJS.v3` is the Nx Docker plugin–friendly path for building openthrottle-server from the monorepo root. It is wired via an Nx target so the build context is always the repo root.

- **Nx target (recommended):** From repo root run
  `nx run openthrottle-server:docker-build`
  This runs `docker build` with `-f Dockerfile.NestJS.v3`, `--target production`, and build context `.`. The target sets default env: `APP_VERSION=1.3.0`, `NX_VERSION=22.5.4`. Set `GITHUB_TOKEN` and `NX_KEY` in your environment for private deps and Nx cache (optional for local builds without cache).
- **Manual build from repo root:**

  ```bash
  export APP_NAME=openthrottle-server
  export APP_VERSION=1.3.0
  export NX_VERSION=22.5.4
  export GITHUB_TOKEN=${GITHUB_TOKEN:-}
  export NX_KEY=${NX_KEY:-}

  docker build -f Dockerfile.NestJS.v3 --target production \
    --build-arg APP_NAME=$APP_NAME \
    --build-arg APP_VERSION=$APP_VERSION \
    --build-arg NX_VERSION=$NX_VERSION \
    --build-arg GITHUB_TOKEN=$GITHUB_TOKEN \
    --build-arg NX_KEY=$NX_KEY \
    -t openthrottle-server:local .
  ```

- **Build-args:** `APP_NAME`, `APP_VERSION`, `GITHUB_TOKEN`, `NX_VERSION`, `NX_KEY`; `PNPM_VERSION` defaults to `9` in the Dockerfile. See root `Dockerfile.NestJS.v3` for all args.
- **Docker Compose:** `applications/openthrottle/docker-compose.yml` uses `dockerfile: Dockerfile.NestJS.v3` with `context: ../..` so the server image is built from the v3 Dockerfile.

---

## 6. openthrottle-developer: `start:docker` script

- **Change:** In `applications/openthrottle-developer/package.json`, add:
  - `"start:docker": "react-router-serve ./build/server/index.js"`
- **Reason:** Matches the standard React Router production entrypoint (`react-router-serve`) so multi-stage images can use `CMD ["pnpm", "start:docker"]`.

---

## 7. CI: build and push

- **Workflow:** `.github/workflows/openthrottle-docker.yml`.
- **Triggers:** Push to `main` and pull requests when paths under `applications/openthrottle-server/`, `applications/openthrottle-developer/`, `packages/openthrottle/`, `databases/cortex/`, `tools/workflows/`, or root `package.json` / `pnpm-lock.yaml` / `nx.json` change.
- **Logic:** Uses Nx affected (`nx show projects --affected`) to build only **openthrottle-server** and/or **openthrottle-developer** when those projects or their dependencies are affected. On **push to main**, images are pushed to Artifact Registry with tag `sha-<GITHUB_SHA>`. On **pull requests**, images are built only (no push) to validate Dockerfiles.
- **Reusable action:** To configure which Nx apps are considered and to read per-app flags without duplicating shell, use the composite action `.github/actions/nx-affected-docker-apps` — see its **README.md** for inputs, outputs, and how to add more `openthrottle-*` (or other) app names.
- **Registry:** Same as §2; GCP credentials and project come from repo vars/secrets (production on `main`, staging otherwise). The workflow runs `gcloud auth configure-docker us-west2-docker.pkg.dev` so `docker push` succeeds.
- **Optional deploy:** To trigger deploy to the E2 (e.g. pull and restart via Docker Compose), add a follow-up job or manual `workflow_dispatch` that SSHs or uses a deploy webhook; not included in the initial workflow.

---

## 8. Docker Compose (local run)

- **Compose file:** `applications/openthrottle/docker-compose.yml` defines Postgres, Redis, openthrottle-server, and openthrottle-developer. Server and developer use `context: ../..` (monorepo root). The server image is built with **Dockerfile.NestJS.v3** (v2 remains available but is not used by compose).
- **Run from repo root** so the build context resolves:
  `docker compose -f applications/openthrottle/docker-compose.yml up --build`
- **Required env:** Put `.env` in `applications/openthrottle/` (see that directory’s **README.md** § Docker Compose). Set `POSTGRES_HOST=openthrottle-postgres` and `REDIS_HOST=openthrottle-redis` for container-to-container access; `API_URL` in the developer app must be the URL the browser uses to reach the server (e.g. `http://localhost:3000`).

### 8.1. Verification (v3 build)

To confirm the openthrottle-server image builds and runs with Dockerfile.NestJS.v3:

1. **Docker Compose (from repo root):**
   `docker compose -f applications/openthrottle/docker-compose.yml up openthrottle-server --build`
   Ensure the build completes without errors. Dockerfile.NestJS.v3 uses `PNPM_VERSION=9` by default; if your `.env` sets `PNPM_VERSION=11`, either remove it or set `PNPM_VERSION=9` for v3 (pnpm@11 does not exist and will cause a build failure).

2. **Nx docker-build (alternative):**
   `nx run openthrottle-server:docker-build`
   builds the server image with the same Dockerfile from the repo root. You can then run compose without `--build` for the server, or use the built image tag as needed.

3. **Full stack (optional):**
   `docker compose -f applications/openthrottle/docker-compose.yml up --build`
   builds and runs openthrottle-server and openthrottle-developer together for full stack verification.

## 9. References

- Current run/build and existing Docker usage: [run-build-and-docker-current-state.md](./run-build-and-docker-current-state.md).
- Root templates: `Dockerfile.NestJS`, `Dockerfile.ReactRouter` (repo root).
- Registry / gcloud: [Google-Cloud.md](../monorepo/Google-Cloud.md).
- Infra (E2, no images yet): `infra/applications/openthrottle/main.tf`.
