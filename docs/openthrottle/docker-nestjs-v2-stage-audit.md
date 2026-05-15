# Dockerfile.NestJS.v2 — stage audit and size baseline

Baseline image-size audit for **Dockerfile.NestJS.v2** (optimization target). The v2 file is a behavioral copy of `Dockerfile.NestJS` at the repo root; optimizations land only in the v2 file so the original stays the working baseline.

See [docker-image-build-strategy.md](./docker-image-build-strategy.md) for build strategy. Cortex plan: **Docker image optimizations for NX monorepo** (Plan-Id: `03259ada-6681-4bb0-bb04-a45d944ab223`).

---

## 1. Stages in Dockerfile.NestJS.v2 (current)

| Stage            | `FROM`                                      | Purpose                                                                                                                                                                                                    |
| ---------------- | ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **base**         | node:22-bookworm-slim                       | Node base (glibc, matches distroless), `ca-certificates`, global `pnpm`, workspace manifest copies, `appuser` for intermediate stages. No application source.                                              |
| **builder**      | base                                        | `python3` / `make` / `g++` for native addons, copies `applications/${APP_NAME}/package.json`, full `packages/` and `tools/`, `pnpm install --frozen-lockfile`.                                             |
| **dependencies** | builder                                     | `NODE_ENV=production`, `pnpm install --frozen-lockfile --prod` with cache mount, `pnpm store prune`, removes Radix/React paths under `node_modules/.pnpm`.                                                 |
| **build**        | builder                                     | `COPY . .`, full `pnpm install`, Nx `run-many` for packages/tools then `nx run ${APP_NAME}:build`, optional GCS credentials for Nx cache, prod `pnpm install`, `pnpm deploy` → `/app/pruned`.              |
| **production**   | gcr.io/distroless/nodejs22-debian12:nonroot | Copy **only** `/app/pruned` from **build** with `--chown=65532:65532` (distroless `nonroot`). No shell, `apk`, or **curl**. `CMD` is argv-only for distroless Node (`-r dotenv/config build/src/main.js`). |

**Why bookworm-slim + distroless:** Distroless Node on Debian is **glibc**. Dependencies built on **Alpine** are **musl**; copying those `node_modules` into distroless would break native addons at runtime. All stages that produce `/app/pruned` therefore run on **bookworm-slim** so the pruned tree is glibc-aligned with `nodejs22-debian12`.

---

## 2. Measurement method

- **Context:** Monorepo root (`.`).
- **Tags:** `nestjs-v2-<stage>:audit` after `docker build -f Dockerfile.NestJS.v2 --target <stage> ...`.
- **Size:** `docker images nestjs-v2-<stage>:audit --format "{{.Size}}"` and `docker inspect <image> --format '{{.Size}}'` (bytes).
- **App:** `APP_NAME=openthrottle-server`.
- **Typical build-args:** `APP_VERSION`, `NX_VERSION` (match root `package.json` / lockfile), `PNPM_VERSION` (align with `packageManager` in root `package.json`, major **10** at time of audit), `GITHUB_TOKEN` (if private packages), `NX_KEY` (required for Nx in **build** stage to succeed with your Nx Cloud setup).
- **Build stage secret:** `--secret id=gcs_credentials,src=<path>` (use a JSON file; may be minimal if GCS remote cache is unused).

**Security:** `ARG`/`ENV` values for `GITHUB_TOKEN` and `NX_KEY` can surface in BuildKit metadata and `docker history`. Prefer secret mounts and minimal exposure for real tokens; rotate any token that was ever passed as a plain build-arg.

---

## 3. Baseline: image size per stage (measured)

Recorded on **2026-05-14** on **Docker Desktop (linux/amd64 or arm64 per daemon)**, `APP_NAME=openthrottle-server`, `APP_VERSION=1.3.0`, `NX_VERSION=22.6.4`, `PNPM_VERSION=10`. Sizes vary by engine architecture and layer cache.

**Note:** Rows below were captured when intermediate stages still tracked an **Alpine**-based builder; **Dockerfile.NestJS.v2** now uses **bookworm-slim** through **build** for glibc alignment with distroless. Re-run §5 after pulls succeed and replace this table with bookworm numbers.

| Stage            | `docker images` size | `docker inspect` size (bytes) | Notes                                                                                                                                                                                                                                              |
| ---------------- | -------------------- | ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **base**         | 193MB                | 193428076                     | (Historical) Node 22 Alpine-era measurement; current **base** is bookworm-slim + `ca-certificates` + pnpm.                                                                                                                                         |
| **builder**      | 1.86GB               | 1855457801                    | Full workspace `pnpm install` after copying `packages/`, `tools/`, and server `package.json`. Dominant cost is `node_modules`.                                                                                                                     |
| **dependencies** | 1.87GB               | 1868100800                    | Prod reinstall + store prune + Radix/React removals; image size remains in the same band as **builder** (thin additional layers on top of builder filesystem).                                                                                     |
| **build**        | _pending_            | —                             | Not completed in this audit run: in-container `pnpm install` after full `COPY . .` pulls many optional platform tarballs; flaky registry (`EAI_AGAIN`) can make the step very slow or fail. Re-run on a stable network or in CI with cache.        |
| **production**   | _pending_            | —                             | Depends on **build**. Current v2 **production** copies only **`/app/pruned`** onto distroless (not full monorepo `node_modules` + `packages` + `tools`). Record `docker images` / `docker inspect` after a successful `--target production` build. |

**Plan-level comparison (both apps):** Baseline **Dockerfile.NestJS** / **Dockerfile.ReactRouter** production images carry full monorepo runtime trees (multi‑GB class in large workspaces). **`.v2`** targets for both services are **pruned deploy + distroless** (plus optional shell stage for React Router). React Router v2 details: [docker-react-router-v2.md](./docker-react-router-v2.md).

**Takeaway:** Through **dependencies**, almost all disk cost is the monorepo `node_modules` tree. **build** adds full source and a second full install plus Nx outputs; **production** copies only **`pnpm deploy` output** under `/app/pruned` on top of a **distroless** runtime (no curl).

### 3.1 Production base change (distroless, 2026-05-14)

| Item                         | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Final `FROM`**             | `gcr.io/distroless/nodejs22-debian12:nonroot`                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| **Build libc**               | `node:22-bookworm-slim` for **base** / **builder** / **dependencies** / **build** so native `.node` binaries match distroless.                                                                                                                                                                                                                                                                                                                                                      |
| **Compatibility**            | `CMD` must be **arguments to `node` only** (image entrypoint is Node). Same logical command as `start:docker`: preload `dotenv/config`, then `build/src/main.js`.                                                                                                                                                                                                                                                                                                                   |
| **Healthchecks**             | Production image has **no** `curl`/`wget`. `Dockerfile.NestJS.v2` defines a **`HEALTHCHECK`** using `/nodejs/bin/node` and `require('http')` against `http://127.0.0.1:$PORT/health`. Root **`docker-compose.yml`** uses the same probe with `/usr/local/bin/node` for the Alpine baseline; for v2 in compose, omit the service `healthcheck` to inherit the Dockerfile probe, or point `CMD` at `/nodejs/bin/node`. **`PORT`** comes from **`OPENTHROTTLE_SERVER_PORT`** (see §4). |
| **Size (record when built)** | **Upstream image only (no app):** `gcr.io/distroless/nodejs22-debian12:nonroot` ≈ **155MB** (`154947096` bytes) on one host (2026-05-14). **Full production** (distroless + `/app/pruned`): run `docker images <tag> --format "{{.Size}}"` after a successful `--target production` build; compare to the previous Alpine-based production tag on the same machine.                                                                                                                 |

Re-run the §5 loop after images pull successfully (Docker Hub / `node:22-bookworm-slim` metadata must complete).

---

## 4. Smoke tests and compose port (avoid collisions)

Root **`docker-compose.yml`** maps the server container listen port from **`PORT`**, which is set from **`OPENTHROTTLE_SERVER_PORT`**, and publishes the same host port (see service `openthrottle-server`: `PORT: ${OPENTHROTTLE_SERVER_PORT}` and ports `'${OPENTHROTTLE_SERVER_PORT}:${OPENTHROTTLE_SERVER_PORT}'`). The healthcheck uses `http://localhost:${OPENTHROTTLE_SERVER_PORT}/health`.

When a server is already bound to the default port, run a one-off test container or a compose override with a different **`OPENTHROTTLE_SERVER_PORT`** and matching published port so the test instance does not collide with the running stack.

The **React Router** developer app uses the same pattern for **`PORT`** from **`OPENTHROTTLE_DEVELOPER_PORT`** and matching published ports on **`openthrottle-developer`**. See [docker-react-router-v2.md](./docker-react-router-v2.md) §4.

---

## 5. How to re-run the audit

From monorepo root:

```bash
echo '{}' > /tmp/gcs-empty.json

export APP_NAME=openthrottle-server
export APP_VERSION=1.3.0
export NX_VERSION=22.6.4
export PNPM_VERSION=10
export GITHUB_TOKEN="${GITHUB_TOKEN:-}"
export NX_KEY="${NX_KEY:-}"

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
    -t "nestjs-v2-${stage}:audit" .
  echo -n "$stage bytes: "
  docker inspect "nestjs-v2-${stage}:audit" --format '{{.Size}}'
  echo -n "$stage human: "
  docker images "nestjs-v2-${stage}:audit" --format "{{.Size}}"
done
```

For an apples-to-apples baseline against the original Dockerfile, swap `-f Dockerfile.NestJS.v2` for `-f Dockerfile.NestJS` and use distinct tags (for example `nestjs-v1-<stage>:audit`).

---

## 6. Planned follow-ups (same plan; not yet in v2)

These map to remaining Cortex tasks: further trim pruned tree, optional **`node:22-bookworm-slim`** final stage if distroless blocks debugging, explicit healthcheck strategy without in-image curl, then repeat the per-stage table after each meaningful `.v2` change.
