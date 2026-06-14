# Dockerfile.ReactRouter.v2 — optimizations and usage

**Dockerfile.ReactRouter.v2** is the optimization target for React Router apps (for example **openthrottle-developer**). **Dockerfile.ReactRouter** stays the working baseline used by root `docker-compose.yml` unless you point the service at the v2 file.

See [docker-image-build-strategy.md](./docker-image-build-strategy.md). Plan: **Docker image optimizations for NX monorepo** (Cortex Plan-Id: `03259ada-6681-4bb0-bb04-a45d944ab223`).

---

## 1. Stages in Dockerfile.ReactRouter.v2

| Stage                 | `FROM`                                        | Purpose                                                                                                                                         |
| --------------------- | --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| **base**              | `node:22-bookworm-slim`                       | glibc Node (matches distroless), `ca-certificates`, global `pnpm`, workspace manifest copies, `appuser`.                                        |
| **builder**           | base                                          | Native build deps (`python3`, `make`, `g++`), app `package.json`, `packages/`, `tools/`, `pnpm install --frozen-lockfile`.                      |
| **dependencies**      | builder                                       | `NODE_ENV=production`, prod install, store prune, optional removals under `node_modules/.pnpm` (same idea as the historical Alpine Dockerfile). |
| **build**             | builder                                       | Full source, install, `pnpm dlx nx run ${APP_NAME}:build`, then `pnpm --filter ${APP_NAME} --prod deploy /app/pruned --legacy`.                 |
| **production-alpine** | base (`bookworm-slim`; name kept for compose) | Copy only `/app/pruned`; shell + non-root `appuser`; start via `node …/react-router/serve/…`. No curl by default.                               |
| **production**        | `gcr.io/distroless/nodejs22-debian12:nonroot` | Copy only `/app/pruned` with `--chown=65532:65532`. Default image target.                                                                       |

**Why bookworm-slim + distroless:** Same rationale as [docker-nestjs-v2-stage-audit.md](./docker-nestjs-v2-stage-audit.md): distroless Node is **glibc**. A pruned tree built on **Alpine (musl)** can break native addons at runtime when copied into distroless.

---

## 2. Optimizations (aligned with Dockerfile.NestJS.v2)

- **Runtime `node_modules`:** Production stages copy only **`pnpm deploy`** output under `/app/pruned`, not the full monorepo `node_modules`, `packages/`, or `tools/`.
- **Minimal default base:** Default **`production`** uses distroless Node 22 (no shell, no curl).
- **Compose-friendly shell image:** **`production-alpine`** is still the stage **name** expected by some overrides, but the image is **Debian bookworm-slim**, not Alpine, so libc matches distroless builds.
- **Start command:** The pruned image has no pnpm; the app runs with `node node_modules/@react-router/serve/bin.js build/server/index.js`.

---

## 3. Baseline and target metrics

| Image                      | Dockerfile               | What “full baseline” carries                                                               | Target (`.v2`)                                                                                                    |
| -------------------------- | ------------------------ | ------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------- |
| **openthrottle-server**    | `Dockerfile.NestJS`      | Full `node_modules` + `packages/` + `tools/` + Alpine + curl (~multi‑GB class in practice) | Pruned tree + distroless; per-stage numbers: [docker-nestjs-v2-stage-audit.md](./docker-nestjs-v2-stage-audit.md) |
| **openthrottle-developer** | `Dockerfile.ReactRouter` | Full `node_modules` from **dependencies** + `packages/` + `tools/` + curl                  | Pruned tree + distroless (or `production-alpine` / bookworm slim for debugging)                                   |

**How to measure:** After each meaningful `.v2` change, from the repo root:

```bash
docker images <tag> --format "{{.Size}}"
docker inspect <tag> --format '{{.Size}}'
```

For **per-stage** sizes on React Router v2, use the same loop pattern as the NestJS audit doc, swapping `-f Dockerfile.ReactRouter.v2` and tags such as `rr-v2-<stage>:audit`, `APP_NAME=openthrottle-developer`, and `NX_VERSION` / `PNPM_VERSION` aligned with root `package.json`.

**Upstream reference (no app layers):** `gcr.io/distroless/nodejs22-debian12:nonroot` is on the order of **~155MB** on a typical host (see NestJS audit); the full app image is that plus the pruned app payload.

---

## 4. Compose ports (avoid collisions)

- **Server:** `docker-compose.yml` sets container **`PORT`** from **`OPENTHROTTLE_SERVER_PORT`** and publishes `'${OPENTHROTTLE_SERVER_PORT}:${OPENTHROTTLE_SERVER_PORT}'`. To run a second server container beside the stack, use a different **`OPENTHROTTLE_SERVER_PORT`** and matching published port (see [docker-nestjs-v2-stage-audit.md](./docker-nestjs-v2-stage-audit.md) §4).
- **Developer (React Router):** The **`openthrottle-developer`** service sets **`PORT`** from **`OPENTHROTTLE_DEVELOPER_PORT`** (see `x-openthrottle-developer` in `docker-compose.yml`) and publishes `'${OPENTHROTTLE_DEVELOPER_PORT}:${OPENTHROTTLE_DEVELOPER_PORT}'`. Use another **`OPENTHROTTLE_DEVELOPER_PORT`** when smoke-testing a one-off container next to an already-running developer app.

---

## 5. How to build

From monorepo root:

```bash
export APP_NAME=openthrottle-developer
export APP_VERSION=1.0.0
export NX_VERSION=22.7.4
export PNPM_VERSION=10
export GITHUB_TOKEN=${GITHUB_TOKEN:-}
export NX_KEY=${NX_KEY:-}
echo '{}' > /tmp/gcs-empty.json

docker build -f Dockerfile.ReactRouter.v2 \
  --build-arg APP_NAME="$APP_NAME" \
  --build-arg APP_VERSION="$APP_VERSION" \
  --build-arg NX_VERSION="$NX_VERSION" \
  --build-arg PNPM_VERSION="$PNPM_VERSION" \
  --build-arg GITHUB_TOKEN="$GITHUB_TOKEN" \
  --build-arg NX_KEY="$NX_KEY" \
  --secret id=gcs_credentials,src=/tmp/gcs-empty.json \
  -t openthrottle-developer:v2 .

docker build -f Dockerfile.ReactRouter.v2 --target production-alpine \
  --build-arg APP_NAME="$APP_NAME" \
  --build-arg APP_VERSION="$APP_VERSION" \
  --build-arg NX_VERSION="$NX_VERSION" \
  --build-arg PNPM_VERSION="$PNPM_VERSION" \
  --build-arg GITHUB_TOKEN="$GITHUB_TOKEN" \
  --build-arg NX_KEY="$NX_KEY" \
  --secret id=gcs_credentials,src=/tmp/gcs-empty.json \
  -t openthrottle-developer:v2-shell .
```

---

## 6. Healthchecks

- **Distroless (default `production`):** No curl or shell. Prefer an external HTTP check, TCP check, or a small **Node** one-liner (see `openthrottle-server` healthcheck in `docker-compose.yml` for the HTTP pattern).
- **`production-alpine` (bookworm slim):** Install curl only if you add a layer for it; otherwise use `wget`/`node` for probes.
