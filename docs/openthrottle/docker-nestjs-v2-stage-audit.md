# Dockerfile.NestJS.v2 — stage audit and size baseline

Baseline image-size audit for **Dockerfile.NestJS.v2** (optimization target). The v2 file is a copy of Dockerfile.NestJS; all size/optimization work is done in the v2 file so the original remains the working baseline.

See [docker-image-build-strategy.md](./docker-image-build-strategy.md) for build strategy. Plan: **Docker image optimizations for NX monorepo** (Cortex).

---

## 1. Stages in Dockerfile.NestJS.v2

| Stage                 | FROM                                        | Purpose                                                                                                 |
| --------------------- | ------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| **base**              | node:22-alpine                              | Node, pnpm, appuser; no app code.                                                                       |
| **builder**           | base                                        | Dev deps, packages/tools/patches, `pnpm install`, build tooling (apk build-base, python3, make, g++).   |
| **dependencies**      | builder                                     | Production deps only: `pnpm install --prod`, store prune, remove Expo/React.                            |
| **build**             | builder                                     | Full source `COPY . .`, pnpm install, `nx run ${APP_NAME}:build`.                                       |
| **production**        | gcr.io/distroless/nodejs22-debian12:nonroot | Copy only `/app/pruned`; no shell, no curl; run as nonroot (65532). Minimal base for size and security. |
| **production-alpine** | base (node:22-alpine)                       | Same as production copy; optional target if shell/curl needed for local healthchecks or debugging.      |

---

## 2. Measurement method

- **Context:** Monorepo root.
- **Build:** `docker build -f Dockerfile.NestJS.v2 --target <STAGE> -t nestjs-v2-<stage>:audit .` with required build-args.
- **Size:** After each build, `docker images nestjs-v2-<stage>:audit --format "{{.Size}}"` (human-readable). For reproducible numbers we also record the same in MB (approximate) if needed.
- **App:** `APP_NAME=openthrottle-server` (NestJS app used for the audit).
- **Build-args (for builder and later stages):** `APP_NAME`, `APP_VERSION`, `GITHUB_TOKEN`, `NX_VERSION`, `NX_KEY`, `PNPM_VERSION`. For **build** stage, `--secret id=gcs_credentials,src=<file>` is required (empty `{}` file is enough if not using Nx cloud cache).

---

## 3. Baseline: image size per stage

Measured with `APP_NAME=openthrottle-server`, `APP_VERSION=1.3.0`, `NX_VERSION=22.6.4`, `PNPM_VERSION=9`. Date of audit: **2025-03-07**.

| Stage        | Image size (human) | Notes                                                                                                                                                                                                                       |
| ------------ | ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| base         | **190MB**          | Node 22 Alpine + pnpm + appuser.                                                                                                                                                                                            |
| builder      | **4.88GB**         | After pnpm install (full workspace); includes packages, tools, patches, build-base, python3, make, g++.                                                                                                                     |
| dependencies | **4.88GB**         | From builder + `pnpm install --prod`, store prune, remove Expo/React. Same total as builder (adds thin layers).                                                                                                             |
| build        | **N/A**            | Requires successful `nx run openthrottle-server:build`. Audit run failed after build succeeded due to empty `NX_KEY` ("Failed to decode the Nx key"). Re-run with valid `NX_KEY` (and optional GCS credentials) to measure. |
| production   | **N/A**            | Depends on build stage. Measure after build stage succeeds.                                                                                                                                                                 |

**Summary:** Base is small (190MB). Builder and dependencies are ~4.88GB (monorepo node_modules + tooling). Build and production sizes should be measured in CI or with valid NX_KEY/GCS credentials.

---

## 3b. Optimizations applied (v2)

- **Production stage — runtime node_modules only:** The production stage no longer copies `/app/node_modules` from the `dependencies` stage (full monorepo prod deps) or `/app/packages` and `/app/tools` from build. Instead, the **build** stage runs `pnpm --filter ${APP_NAME} --prod deploy /app/pruned --legacy` after the Nx build; the **production** stage copies only `COPY --from=build /app/pruned/. /app/`. The pruned directory contains the app’s files (including `build/`) and an isolated `node_modules` with only that app’s production dependencies (including workspace packages it uses). This reduces final image size by excluding unused monorepo packages and tools from the production image.

- **Production stage — minimal base (distroless):** The default **production** stage now uses `gcr.io/distroless/nodejs22-debian12:nonroot` instead of `base` (node:22-alpine). Benefits: smaller final image (distroless has no shell, apk, or curl), fewer attack surfaces, and Node 22 on Debian 12. Compatibility: no shell — you cannot `docker run -it ... sh` to debug; use `--target production-alpine` for a node:alpine-based image with optional curl/shell for local healthchecks or debugging. The distroless image runs as uid 65532 (nonroot); files are copied with `--chown=65532:65532`.

- **Production stage — no full packages or tools:** The production stage does **not** copy `/app/packages` or `/app/tools` from the build stage. It copies only `COPY --from=build /app/pruned/. /app/`. The pruned directory is produced by `pnpm --filter ${APP_NAME} --prod deploy /app/pruned --legacy` and contains only the app and its runtime dependency tree (including any workspace packages the app actually depends on). Full monorepo `packages/` and `tools/` trees are excluded from the production image to keep size and attack surface minimal.

---

## 4. How to re-run the audit

From monorepo root:

```bash
# Required build-args for stages that need them
export APP_NAME=openthrottle-server
export APP_VERSION=1.3.0
export NX_VERSION=22.6.4
export PNPM_VERSION=9
export GITHUB_TOKEN=${GITHUB_TOKEN:-}   # optional if no private deps
export NX_KEY=${NX_KEY:-}               # optional for build stage

# Optional: empty GCS credentials so build stage mount succeeds; NX_KEY required for nx to exit 0
echo '{}' > /tmp/gcs-empty.json

# Build each target and print size
for stage in base builder dependencies build production; do
  docker build -f Dockerfile.NestJS.v2 \
    --build-arg APP_NAME="$APP_NAME" \
    --build-arg APP_VERSION="$APP_VERSION" \
    --build-arg NX_VERSION="$NX_VERSION" \
    --build-arg PNPM_VERSION="$PNPM_VERSION" \
    --build-arg GITHUB_TOKEN="$GITHUB_TOKEN" \
    --build-arg NX_KEY="$NX_KEY" \
    --target "$stage" \
    --secret id=gcs_credentials,src=/tmp/gcs-empty.json \
    -t "nestjs-v2-${stage}:audit" . 2>&1 | tail -5
  echo -n "$stage: "
  docker images "nestjs-v2-${stage}:audit" --format "{{.Size}}"
done
```

---

## 5. Baseline and target metrics

- **Baseline (original Dockerfile.NestJS production):** ~6GB (full monorepo node_modules + packages + tools in final image; node:alpine base; curl installed). This is the working baseline kept unchanged.
- **Target (Dockerfile.NestJS.v2 production):** Reduce final image by (1) copying only runtime node_modules (pruned deploy), (2) using minimal base (distroless or Alpine without curl), (3) excluding full `/app/packages` and `/app/tools` from production. Exact size to be measured in CI or with valid `NX_KEY` + GCS credentials (see §3 and §4).
- **Measurement:** Re-run the script in §4 with a successful build stage to record production stage size for v2; compare to a build of `Dockerfile.NestJS` (same build-args) for baseline.

---

## 6. Minimal production base (distroless vs Alpine)

| Base                     | Image                                             | Relative size | Shell | curl                            | Use case                                                 |
| ------------------------ | ------------------------------------------------- | ------------- | ----- | ------------------------------- | -------------------------------------------------------- |
| **Distroless** (default) | gcr.io/distroless/nodejs22-debian12:nonroot       | Smaller       | No    | No                              | Production; minimal footprint and attack surface.        |
| **Alpine**               | node:22-alpine (via `--target production-alpine`) | Larger        | Yes   | Optional (add RUN apk add curl) | Local healthchecks, debugging with `docker exec ... sh`. |

To build the Alpine variant: `docker build -f Dockerfile.NestJS.v2 --target production-alpine ...`

---

## 7. Curl and healthchecks

- **Default production (distroless):** No curl, no shell. Do not use `HEALTHCHECK` that runs curl inside the container. Use external checks (e.g. Docker TCP health check, or orchestrator HTTP probe from outside) or deploy the Alpine target if you need an in-container HTTP check.
- **production-alpine:** Curl is **not** installed by default. For dev/docker-compose healthchecks you can either:
  - Use **wget** (available in Alpine by default). Example: `test: ['CMD-SHELL', 'wget -q --spider http://localhost:${PORT}/health || exit 1']` — see `applications/openthrottle/docker-compose.yml` for openthrottle-server.
  - Or uncomment `RUN apk --update --no-cache add curl` in the Dockerfile and use `--target production-alpine` when you need curl (e.g. for a template that requires curl).
- This keeps the production image smaller and limits curl to optional dev/docker-compose use only.
