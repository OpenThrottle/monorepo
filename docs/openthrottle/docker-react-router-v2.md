# Dockerfile.ReactRouter.v2 — optimizations and usage

**Dockerfile.ReactRouter.v2** is the optimization target for React Router apps in the monorepo. It is a copy of Dockerfile.ReactRouter; all size/optimization work is done in the v2 file so the original remains the working baseline.

See [docker-image-build-strategy.md](./docker-image-build-strategy.md) for build strategy. Plan: **Docker image optimizations for NX monorepo** (Cortex).

---

## 1. Stages in Dockerfile.ReactRouter.v2

| Stage                 | FROM                                        | Purpose                                                                                                                     |
| --------------------- | ------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| **base**              | node:22-alpine                              | Node, pnpm, appuser; no app code.                                                                                           |
| **builder**           | base                                        | Dev deps, packages/tools/patches, `pnpm install`, build tooling.                                                            |
| **dependencies**      | builder                                     | Production deps only: `pnpm install --prod`, store prune, remove NestJS/Expo/React Native.                                  |
| **build**             | builder                                     | Full source, pnpm install, `nx run ${APP_NAME}:build`, then `pnpm --filter ${APP_NAME} --prod deploy /app/pruned --legacy`. |
| **production**        | gcr.io/distroless/nodejs22-debian12:nonroot | Copy only `/app/pruned`; no shell, no curl; run as nonroot (65532). Default target.                                         |
| **production-alpine** | base (node:22-alpine)                       | Same pruned copy; optional target if shell/curl needed for local healthchecks or debugging.                                 |

---

## 2. Optimizations applied (same pattern as NestJS.v2)

- **Production stage — runtime node_modules only:** The production stage no longer copies full `/app/node_modules`, `/app/packages`, or `/app/tools` from build. The **build** stage runs `pnpm --filter ${APP_NAME} --prod deploy /app/pruned --legacy` after the Nx build; the **production** stage copies only `COPY --from=build /app/pruned/. /app/`. The pruned directory contains the app (including `build/`) and an isolated `node_modules` with only that app’s production dependencies.

- **Production stage — minimal base (distroless):** The default **production** stage uses `gcr.io/distroless/nodejs22-debian12:nonroot`. For a shell or curl (e.g. local healthchecks), use `--target production-alpine`.

- **Production stage — no full packages or tools:** The production stage does **not** copy `/app/packages` or `/app/tools`; only the pruned app tree is copied.

- **Curl:** Curl is not installed in production by default. For dev/docker-compose healthchecks use wget (Alpine) or build with `--target production-alpine` and optionally add curl there.

- **Start command:** The pruned image has no pnpm. The server is started with `node node_modules/@react-router/serve/bin.js build/server/index.js` (Alpine and distroless).

---

## 3. Baseline and target metrics

- **Baseline (Dockerfile.ReactRouter production):** Same as NestJS baseline — ~6GB with full monorepo node_modules + packages + tools, node:alpine, curl installed. Dockerfile.ReactRouter is unchanged as the working baseline.
- **Target (Dockerfile.ReactRouter.v2 production):** Reduce final image by copying only pruned app + runtime node_modules, using distroless (or Alpine without curl), and excluding packages/tools. Measure in CI or with valid NX_KEY and optional GCS credentials.

---

## 4. How to build

From monorepo root:

```bash
export APP_NAME=openthrottle-developer   # or rocketcms, barguide, mattscholta, etc.
export APP_VERSION=1.0.0
export NX_VERSION=22.5.4
export PNPM_VERSION=9
export GITHUB_TOKEN=${GITHUB_TOKEN:-}
export NX_KEY=${NX_KEY:-}
echo '{}' > /tmp/gcs-empty.json

# Default: distroless production image
docker build -f Dockerfile.ReactRouter.v2 \
  --build-arg APP_NAME="$APP_NAME" \
  --build-arg APP_VERSION="$APP_VERSION" \
  --build-arg NX_VERSION="$NX_VERSION" \
  --build-arg PNPM_VERSION="$PNPM_VERSION" \
  --build-arg GITHUB_TOKEN="$GITHUB_TOKEN" \
  --build-arg NX_KEY="$NX_KEY" \
  --secret id=gcs_credentials,src=/tmp/gcs-empty.json \
  -t my-react-router:v2 .

# Optional: Alpine production (shell, optional curl for healthchecks)
docker build -f Dockerfile.ReactRouter.v2 --target production-alpine \
  --build-arg APP_NAME="$APP_NAME" \
  --build-arg APP_VERSION="$APP_VERSION" \
  --build-arg NX_VERSION="$NX_VERSION" \
  --build-arg PNPM_VERSION="$PNPM_VERSION" \
  --build-arg GITHUB_TOKEN="$GITHUB_TOKEN" \
  --build-arg NX_KEY="$NX_KEY" \
  --secret id=gcs_credentials,src=/tmp/gcs-empty.json \
  -t my-react-router:v2-alpine .
```

---

## 5. Healthchecks

- **Distroless (default):** No curl, no shell. Use external HTTP checks or TCP checks, or use `--target production-alpine`.
- **production-alpine:** Use wget (available in Alpine) or add `RUN apk --update --no-cache add curl` and use curl in your healthcheck.
