# Docker dev workflow and host execution bridge — design

This document is the design for OT plan **`ba18d88d-0a65-47c5-8b90-adc83d3f4ca7`** (Docker dev workflow: compose profiles, hot reload, and host execution bridge). It is the companion to [docker-image-build-strategy.md](./docker-image-build-strategy.md) (image builds, registry) and extends [compose-topology-phase-1.md](./compose-topology-phase-1.md) (which deferred the developer app, workers, and the host path model — this doc picks those up).

Two audiences, two modes:

- **Contributors** need a fast edit-rebuild loop: server + developer running **from source** with hot reload, debuggers attachable, no distroless rebuild per change.
- **Consumers** install OpenThrottle from **published images** with one command, and use it to execute work against checkouts on their **own machine** (projects are scoped to on-disk checkouts; the developer app opens an IDE over a `WorkspaceLocalRepository`). The bridge from container to host checkout is the product-critical piece.

The verified production path (`docker compose up --build` → server `/health` 200, developer `/` 200) must keep working unchanged.

---

## 1. Decision summary

| Question                             | Decision                                                                                                                                                                     |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Profiles vs `docker-compose.dev.yml` | **Compose profiles** in the root `docker-compose.yml` (`--profile dev`), not a separate override file. See §2.                                                               |
| Dev image shape                      | New **`development` stage** in both canonical Dockerfiles: builder-based (shell, full workspace), `CMD pnpm nx run ${APP_NAME}:dev`. `production` stays the default target.  |
| Source sync                          | **`develop.watch`** (`docker compose watch`) with `sync` for source dirs and `rebuild` on lockfile/workspace manifest changes — not raw bind mounts of the repo. See §4.     |
| Roles of the two compose files       | Root compose = contributor modes (prod parity + dev profile, builds from source). `applications/openthrottle/docker-compose.yml` = consumer mode (published images only).    |
| Service-to-service networking        | Compose service names on the default network (`postgres:5432`, `redis:6379`, `http://server:<port>`). `host.docker.internal` only for genuine container→host traffic. §5.    |
| Browser-facing URLs                  | Stay `http://localhost:<published port>` — published ports remain the host/browser contract.                                                                                 |
| Host execution bridge                | **Bind mount + path mapping**: `OPENTHROTTLE_WORKSPACES_DIR` → `/workspaces` plus a host→container path-prefix translation on `WorkspaceLocalRepository.filesystemPath`. §6. |
| Bridge runtime                       | Requires a shell+git capable image. Consumer default ships the bridge against the **debian (shell) target**; distroless remains for bridge-less deployments. §6.4.           |
| Host-side helper / docker socket     | **Out of scope.** No host daemon, no `docker.sock` mount. Revisit only if mount+mapping proves insufficient. §6.5.                                                           |
| Git auth                             | Read-only mounts of `~/.gitconfig` + `~/.ssh/known_hosts`, SSH agent socket or HTTPS token env. §6.3.                                                                        |

---

## 2. Profiles vs a `docker-compose.dev.yml` override file

**Recommendation: compose profiles in the single root `docker-compose.yml`.**

The override-file pattern (`docker compose -f docker-compose.yml -f docker-compose.dev.yml up`) was rejected because:

- **Drift.** The root compose already carries a large shared env contract (`x-common`, `x-developer`, `x-server` fragments). An override file either duplicates those anchors (YAML anchors don't cross files) or mutates services in ways that are invisible when reading one file. Profiles keep one file, one set of anchors, one diff surface.
- **Invocation errors.** `-f` juggling is order-sensitive and easy to get wrong; `--profile dev` is one flag and `COMPOSE_PROFILES=dev` makes it sticky.
- **Our prod path is already verified on the root file.** With `COMPOSE_PROFILES="prod"` defaulted in `.env`, `docker compose up --build` behaves exactly as today.

Shape (root `docker-compose.yml`):

- `postgres`, `redis` — **no profile** (shared by all modes; both prod and dev services depend on them).
- `server`, `developer` — `profiles: [prod]`, enabled by default via `COMPOSE_PROFILES="prod"` in `.env` (from `.env.default`).
- `server-dev`, `developer-dev` — `profiles: [dev]`, `build.target: development`, `restart: 'no'`, `develop.watch`, debug ports.

Profile-less services are _always_ enabled by compose, so the prod services must carry a profile too — otherwise `--profile dev` would start both modes onto the same published ports. The `--profile` flag (or `COMPOSE_PROFILES` in the invoking shell) overrides the `.env` default, which keeps the two modes mutually exclusive; the dev services reuse `${OPENTHROTTLE_SERVER_PORT}` / `${OPENTHROTTLE_DEVELOPER_PORT}` so the browser/MCP contract is identical in both modes.

Commands:

```bash
docker compose up --build                  # production parity (COMPOSE_PROFILES=prod from .env)
docker compose --profile dev watch         # dev mode: build dev images, start, watch + sync
docker compose --profile dev up --build    # dev mode without file watching
```

Migration note: existing `.env` files (gitignored) need the new `COMPOSE_PROFILES="prod"` line from `.env.default`, or `docker compose up` will start only postgres/redis.

## 3. Dockerfile `development` targets

Both `Dockerfile.NestJS` and `Dockerfile.ReactRouter` gain a `development` stage layered on the existing `builder` stage (node:22-bookworm-slim — shell available, full workspace install retained, no pruning, no distroless):

```dockerfile
FROM builder AS development

ENV NODE_ENV="development"
ENV NX_DAEMON="false"

COPY . .

CMD ["sh", "-c", "pnpm nx run ${APP_NAME}:dev"]
```

- `production` remains the **default target**; existing builds and CI are unaffected.
- The dev CMD runs the real Nx dev target: `openthrottle-server:dev` is `nest start --watch`, `openthrottle-developer:dev` is the React Router/Vite dev server. Both watch the filesystem, which is what `develop.watch` `sync` feeds.
- `NX_DAEMON=false` because the Nx daemon and container filesystems don't mix reliably.
- The pnpm store cache mount (`--mount=type=cache,id=pnpm-development`) already used by `builder` keeps dev image rebuilds fast; at runtime a named volume for `/pnpm/store` covers in-container installs after lockfile rebuilds (§4).

## 4. Dev services in compose: watch, sync, debug

`develop.watch` over raw bind mounts of the whole repo, because:

- Bind-mounting the monorepo would shadow the image's Linux `node_modules` with the host's macOS `node_modules` (native addons mismatch) unless we add anonymous-volume hacks per `node_modules` directory — fragile in a workspace with dozens of packages.
- `sync` copies only source changes into the container (fast, one-way), and `rebuild` handles the cases where a sync is not enough.

Per dev service:

```yaml
server-dev:
  build:
    args: { <<: *server }
    context: ./
    dockerfile: Dockerfile.NestJS
    target: development
  profiles: [dev]
  restart: 'no'
  ports:
    - '${OPENTHROTTLE_SERVER_PORT}:${OPENTHROTTLE_SERVER_PORT}'
    - '9229:9229' # Node inspector
  develop:
    watch:
      - action: sync
        path: ./applications
        target: /app/applications
      - action: sync
        path: ./packages
        target: /app/packages
      - action: sync
        path: ./tools
        target: /app/tools
      - action: rebuild
        path: ./package.json
      - action: rebuild
        path: ./pnpm-lock.yaml
      - action: rebuild
        path: ./pnpm-workspace.yaml
  volumes:
    - pnpm_store:/pnpm/store
```

- **Debug ports:** server publishes `9229` (start Nest with `--inspect=0.0.0.0:9229` via the dev target or `NODE_OPTIONS`); the developer app's Vite/HMR traffic rides the already-published app port.
- **`restart: 'no'`** in dev — a crash-looping watcher should fail loudly, not flap.
- **Source-first packages** (the `packages/react-router-*` family with `main: ./src/index.ts`) need no special handling: the consuming app's Vite transpiles them, and `sync` delivers their source edits like any other file.
- **Verification (task 3):** edit a server resolver → Nest watcher recompiles, GraphQL change visible without image rebuild; edit a developer route → HMR/SSR reload in the browser.

## 5. Networking cleanup: compose network, not host round-trips

Today every service-to-service hop leaves the compose network and comes back through `host.docker.internal:<published port>`. That couples containers to Docker Desktop semantics (Linux engines need `extra_hosts: host-gateway`), forces every internal dependency to also be a published host port, and makes the consumer compose fragile on machines where the chosen host ports are taken.

Target state, both compose files:

| Traffic                                     | Address                                                                           |
| ------------------------------------------- | --------------------------------------------------------------------------------- |
| server → postgres                           | `postgres:5432` (service name, container port)                                    |
| server → redis                              | `redis:6379`                                                                      |
| developer (SSR) → server                    | `http://server:${OPENTHROTTLE_SERVER_PORT}` via `API_URL_INTERNAL`                |
| browser → developer                         | `http://localhost:${OPENTHROTTLE_DEVELOPER_PORT}` (published)                     |
| browser → server (GraphQL/WS)               | `http://localhost:${OPENTHROTTLE_SERVER_PORT}` via `API_URL_EXTERNAL` (published) |
| container → host service (e.g. host Ollama) | `host.docker.internal` — the only legitimate use                                  |

The split already exists in the env contract (`API_URL_INTERNAL` = SSR/server-side fetches, `API_URL_EXTERNAL` = what the browser uses); the cleanup is changing **values** in `.env.default` / compose, not application code:

- `POSTGRES_HOST=postgres`, `REDIS_HOST=redis` for containerized server (container port `5432`/`6379`, decoupled from published `POSTGRES_PORT`/`REDIS_PORT`).
- `API_URL_INTERNAL=http://server:6021` for the containerized developer; `API_URL_EXTERNAL=http://localhost:6021` stays.
- Published ports remain exactly as today for host consumers (browser, host `openthrottle-mcp`, host Ralph CLI, `database:migrate`) per [compose-topology-phase-1.md](./compose-topology-phase-1.md) §4–5.

Caveat: host-side runs of the same apps (e.g. `pnpm nx run openthrottle-server:dev`) keep `localhost` values via `applications/*/.env` — the service-name values live only in the compose environment, never in the app-local `.env` files.

## 6. Host execution bridge (the product-critical piece)

### 6.1 Problem

`WorkspaceLocalRepository.filesystemPath` stores **host-absolute paths** (e.g. `/Users/jane/dev/my-app`). Everything that consumes them runs **inside the server process**: `validateWorkingDirectory` (`enqueue-plan-ralph-tuning.ts`) requires the path to be an existing directory on the server's filesystem; the code-search resolver and the IDE engine (`openthrottle-ide`) resolve `repositoryId → filesystemPath` server-side and read the tree; the plans processor spawns `workflow-ralph` with that path as `cwd`. In a container none of those host paths exist, so registration, browsing, and execution all fail at validation.

### 6.2 Design: one workspace mount + path-prefix mapping

**Mount.** The consumer declares one host directory that contains their checkouts:

```bash
# .env
OPENTHROTTLE_WORKSPACES_DIR=/Users/jane/dev     # host side
```

```yaml
# compose (server, and any future worker service)
volumes:
  - '${OPENTHROTTLE_WORKSPACES_DIR}:/workspaces'
environment:
  OPENTHROTTLE_HOST_WORKSPACES_DIR: '${OPENTHROTTLE_WORKSPACES_DIR}'
  OPENTHROTTLE_CONTAINER_WORKSPACES_DIR: '/workspaces'
```

**Mapping.** A small pure utility in the server (used by `validateWorkingDirectory`, the workspace-settings validation, code-search/IDE root resolution, and the plans processor) translates between the two views:

- `toContainerPath(p)`: if `p` starts with `OPENTHROTTLE_HOST_WORKSPACES_DIR`, replace that prefix with `OPENTHROTTLE_CONTAINER_WORKSPACES_DIR`; otherwise return `p` unchanged.
- `toHostPath(p)`: the inverse, for anything we display or hand back to host-side tooling.

Properties that make this safe and incremental:

- **No-op outside Docker.** When the env pair is unset (host-run server, all of today's flows), both functions are identity — zero behavior change.
- **DB stays host-truthful.** `filesystemPath` keeps storing what the user typed (host path). Translation happens at the filesystem boundary, so the same database works whether the server runs on the host or in a container, and host-side workers keep working from the stored value.
- **Containment for free.** In container mode, `OPENTHROTTLE_ALLOWED_WORKING_DIRS` defaults to the container workspaces root, so a path that doesn't map into the mount is rejected by the existing allowlist mechanism rather than a new one.
- One prefix pair is the v1; a multi-entry map (`host1:container1,host2:container2`) is a trivial extension if consumers need checkouts from several roots, and is explicitly deferred.

**Read-write policy.** The mount is **read-write by default** — executing work (agents committing, generators scaffolding) is the product. A documented `:ro` variant of the volume line is the opt-out for browse/search-only setups; the server treats `EROFS`/`EACCES` as a normal failure surfaced to the UI, not a crash.

### 6.3 Git/SSH auth passthrough

Sufficient for clone/fetch/commit from inside the container:

```yaml
volumes:
  - '${HOME}/.gitconfig:/home/appuser/.gitconfig:ro'
  - '${HOME}/.ssh/known_hosts:/home/appuser/.ssh/known_hosts:ro'
  # macOS Docker Desktop SSH agent forwarding:
  - '/run/host-services/ssh-auth.sock:/run/host-services/ssh-auth.sock'
environment:
  SSH_AUTH_SOCK: '/run/host-services/ssh-auth.sock'
  # HTTPS alternative: GITHUB_TOKEN (or GIT_TOKEN) env for token-based remotes
```

- Identity (`user.name`/`user.email`) comes from the mounted `.gitconfig`; commit signing keys are explicitly **not** mounted (signing inside the container is out of scope v1).
- Private keys are never copied into the image or mounted directly; the agent socket (macOS/Windows Docker Desktop) or an HTTPS token covers auth. Linux engines mount `${SSH_AUTH_SOCK}` directly.
- `safe.directory`: the container git sees repos owned by a different uid; the entrypoint sets `git config --global safe.directory '*'` scoped to the container user.

### 6.4 Runtime: the bridge needs a shell and git

The distroless production images have **no shell and no git**, so the bridge cannot run on them. Per-image decision:

- **Server (bridge host):** consumer compose runs the server from the **debian shell-capable target** (the `production-debian` pattern that already exists in `Dockerfile.ReactRouter`; `Dockerfile.NestJS` gains the same stage) with `git` added in that stage only. Distroless remains the default build target for bridge-less/hosted deployments.
- **Developer app:** ALSO mounts the workspace (correction discovered during implementation: the IDE engine — `@openthrottle/openthrottle-ide`, file listing/search/symbols — runs inside the developer app's SSR process via `ide-engine.server.ts`, resolving `filesystemPath` from GraphQL and reading the tree directly). Distroless is still fine for it: the engine needs only Node + the bundled `@vscode/ripgrep` binary, no shell and no git. Git-dependent flows stay in the server.
- **Editor-config apply** (`applyWorkspaceEditorConfiguration`, which writes MCP/skills config into checkouts from `@openthrottle/nestjs-repositories`) is a known v1 gap: it does not yet translate paths. Tracked as follow-up; the IDE/browse/search/execute paths are covered.
- A git **sidecar** container was considered and rejected for v1: it would need the same mount plus an RPC seam between server and sidecar that doesn't exist today. The debian target is one stage in a Dockerfile we already own.

### 6.5 Out of scope (decided)

- **Host-side helper daemon** (a worker process on the host that executes on the container's behalf): highest fidelity (native FS events, host toolchains, no auth passthrough) but it reintroduces a host install step, which defeats "install via Docker". Not in v1; the phase-1 doc's "worker on host" remains a documented manual fallback for contributors.
- **Docker socket mount** (`/var/run/docker.sock`) to spawn sibling agent containers: root-equivalent on the host; rejected.
- **Agent CLI execution inside the container** (claude-code, cursor-agent auth/binaries) stays governed by `tools/workflows` design docs; this bridge only guarantees the filesystem and git layers they need.

### 6.6 End-to-end check (task 4 acceptance)

With `OPENTHROTTLE_WORKSPACES_DIR` pointing at a directory containing a real checkout: register it as a `WorkspaceLocalRepository` through the Dockerized developer app → validation passes (mapped path exists in `/workspaces`), the IDE browses the tree, code-search indexes it, and `git status` runs against it from inside the server container.

## 7. Consumer install path (published images)

`applications/openthrottle/docker-compose.yml` stays the consumer artifact: **images only, never builds**, now updated to the §5 networking and §6 bridge:

- `.env` bootstrap from a committed `.env.default` (the repo convention; `.env.example` is gitignored) with the minimal var set (ports, postgres credentials, `JWT_SECRET`, `OPENTHROTTLE_WORKSPACES_DIR`). No `GITHUB_TOKEN`/`NX_KEY` at runtime — those are build-time-only and consumers don't build.
- **First boot:** the seeded `openthrottle/postgres` image applies `databases/seed.sql` via `docker-entrypoint-initdb.d` on a clean volume (full current schema). A one-shot `migrations` init service then applies incremental migrations and exits; `server` `depends_on` it with `service_completed_successfully`. The migrations image is a tiny standalone runner — `Dockerfile.Migrations` bakes `databases/run-migrations.mjs` (no workspace import, only `pg`) plus `databases/migrations/*.sql`. Idempotent re-runs make upgrades safe.
- **Pinning/upgrade:** image tags from `APP_VERSION` (default `latest`); upgrade = `docker compose pull && docker compose up -d`.
- One documented command from a clean machine: `docker compose up -d` with only the compose file + `.env` present.

## 8. Implementation order (maps to plan tasks)

1. This design (task `5035f0f0`) — reviewed via PR.
2. `development` Dockerfile targets (task `ec93583c`) — §3.
3. Compose dev profile + watch + debug ports (task `7b50e65f`) — §2, §4, §5 networking for the dev services.
4. Host execution bridge (task `d9507f65`) — §6.
5. Consumer install polish (task `c61bdc5f`) — §7.
6. End-to-end verification of all three modes + docs (task `ded37231`) — §9.

## 9. Verification

`scripts/docker-smoke-test.sh [prod|dev|consumer]` orchestrates the smoke matrix (reads ports from the repo-root `.env`; `dev` starts `watch` in the background and tears it down on exit):

| Mode       | Command                                            | Asserts                                                                  |
| ---------- | -------------------------------------------------- | ------------------------------------------------------------------------ |
| `prod`     | `docker compose --profile prod up --build`         | server `/health` 200, developer `/` 200                                  |
| `dev`      | `docker compose --profile dev watch`               | server-dev `/health` 200, developer-dev `/` 200 (then edit → hot reload) |
| `consumer` | `applications/openthrottle` `docker compose up -d` | first-boot migrate/seed, then server `/health` 200, developer `/` 200    |

Verified during implementation (this branch):

- **Dev profile:** server-dev `/health` 200 in-container with watchers live; full dev stack confirmed running by the maintainer. Cold-start fixes (remote-cache off, package `dist` prebuild, `procps`/`git`, healthcheck-gated startup + heap cap) baked into the dev image stages.
- **Consumer migrate/seed:** the migrations image, built from `Dockerfile.Migrations` and run against the live compose Postgres, applied all 52 `databases/migrations/*.sql` idempotently to "Migrations completed."; consumer compose `config` resolves clean.
- **Production parity:** prod and dev compose `config` both resolve clean; the prod-service changes are additive (a `prod` profile label, the identity-by-default bridge env, and the workspace mount). A fresh `up --build` prod smoke is the one item left for a clean environment (it collides with a developer's already-running stack on the shared published ports) — run `scripts/docker-smoke-test.sh prod` on a free machine to confirm.

## 10. Workspace mounting: Model A (validated) and Model C (future)

**Model A — host-mounted workspaces, in-container execution — is the shipped
end-user model.** DX contract:

- The user keeps their projects in (or symlinked under) one parent directory
  and sets `OPENTHROTTLE_WORKSPACES_DIR` to it in `.env`. Compose bind-mounts
  it read-write at `/workspaces`.
- Projects are registered through the UI/GraphQL **by their host path**; the
  DB stays host-truthful and the `toHostPath`/`toContainerPath` prefix mapping
  (§6.2) translates at the filesystem boundary. The user edits on the host
  with their own editor while OT reads, searches, executes — and any worktrees
  OT creates under the mount persist on the host.

Validated end-to-end on the dev profile (plan `c4830d82`, docker-fidelity
task): fresh `server-dev` image boot (worktree override → host Postgres/Redis;
per-checkout BullMQ prefix live in-container); a sample host project mounted
and **registered by host path from inside the container** (mapping validation
passed); `enqueuePlanRun` with a host `workingDirectory` accepted; the
**in-container** plans worker consumed the job, ran the full
status/metrics/plan_runs bookkeeping, and reached agent iteration 1. The run
stops there when no agent CLI is present in the image — agent CLI binaries +
credentials inside the container are governed by `tools/workflows` design docs
and are explicitly out of this bridge's scope (§6.5); provide them (or run a
host-side worker for the same prefix) to complete agent execution in-container.

**Model C — running the user's IDE inside the container — is the north-star
direction and explicitly out of scope here.** Nothing in Model A blocks it:
the mount and path mapping are the same substrate.
