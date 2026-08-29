# `OT_` / `OPENTHROTTLE_` environment variables

Every environment variable in this monorepo that is namespaced `OPENTHROTTLE_*`
or `OT_*`, what reads it, and whether a `.env.default` ships a value for it.

Scope note: names like `OPENTHROTTLE_LEGAL_NOTICE`, `OPENTHROTTLE_GITHUB_URL`,
`OPENTHROTTLE_THEME`, `OPENTHROTTLE_WORKSPACE_MARKER`,
`OPENTHROTTLE_PLUGIN_DIR_REL`, `OPENTHROTTLE_REPO_SKILL_PATHS` and
`OPENTHROTTLE_META_DESCRIPTION` look like env vars but are **exported TypeScript
constants** (mostly in `@openthrottle/react-router-utils` and
`@openthrottle/nestjs-repositories`). They are not read from the environment and
are excluded below. Likewise `*_ENV` suffixed identifiers
(`OPENTHROTTLE_POSTGRES_URL_ENV`, `OPENTHROTTLE_PLANS_SPAWN_DIAGNOSTICS_ENV`) are
constants that _hold_ an env-var name.

There are four `.env.default` files that carry namespaced values:

| File                                                                                                         | Purpose                                                    |
| ------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------- |
| [`.env.default`](../../.env.default)                                                                         | Repo root — local dev for the whole workspace (6xxx ports) |
| [`applications/openthrottle-server/.env.default`](../../applications/openthrottle-server/.env.default)       | Server-only overrides                                      |
| [`applications/openthrottle-developer/.env.default`](../../applications/openthrottle-developer/.env.default) | Developer-app overrides                                    |
| [`applications/openthrottle/.env.default`](../../applications/openthrottle/.env.default)                     | Docker-compose distribution (9xxx ports)                   |

`applications/openthrottle-admin`, `-email`, `-website`, `tools/ollama-proxy` and
the generator templates have `.env.default` files with **no** namespaced vars.

---

## 1. Ports, URLs and app identity

Consumed by docker-compose (which maps them onto the un-namespaced `PORT`,
`APP_URL`, `CORS_ORIGINS`, … that the apps actually read) and by
`.claude/launch.json`.

| Variable                                                         | Used for                                                                               | Root `.env.default`            | server | developer | `applications/openthrottle`                |
| ---------------------------------------------------------------- | -------------------------------------------------------------------------------------- | ------------------------------ | ------ | --------- | ------------------------------------------ |
| `OPENTHROTTLE_SERVER_PORT`                                       | NestJS API port → compose `PORT`, Dockerfile healthcheck                               | ✅ `6021`                      | —      | —         | ✅ `9021`                                  |
| `OPENTHROTTLE_SERVER_APP_URL`                                    | Public server URL → `APP_URL`                                                          | ✅ `http://localhost:6021`     | —      | —         | ✅ `http://localhost:9021`                 |
| `OPENTHROTTLE_SERVER_APP_NAME`                                   | → `APP_NAME`                                                                           | ✅                             | —      | —         | ✅                                         |
| `OPENTHROTTLE_SERVER_APP_NAME_SHORT`                             | → `APP_NAME_SHORT`                                                                     | ✅ `Server`                    | —      | —         | ✅                                         |
| `OPENTHROTTLE_SERVER_CORS_ORIGINS`                               | → `CORS_ORIGINS`                                                                       | ✅ (5 origins)                 | —      | —         | ✅                                         |
| `OPENTHROTTLE_SERVER_CORS_CREDENTIALS`                           | → `CORS_CREDENTIALS`                                                                   | ✅ `false`                     | —      | —         | ✅ `true`                                  |
| `OPENTHROTTLE_SERVER_BULLMQ_BOARD_ADMIN_USERNAME`                | Bull Board basic auth                                                                  | ❌                             | ❌     | —         | ✅ `admin` (compose falls back to `admin`) |
| `OPENTHROTTLE_SERVER_BULLMQ_BOARD_ADMIN_PASSWORD`                | Bull Board basic auth                                                                  | ❌                             | ❌     | —         | ✅ `openthrottle_password`                 |
| `OPENTHROTTLE_DEVELOPER_PORT`                                    | Developer UI port                                                                      | ✅ `6020`                      | —      | ❌        | ✅ `9020`                                  |
| `OPENTHROTTLE_DEVELOPER_API_URL_INTERNAL`                        | Server URL from inside the container                                                   | ✅ `host.docker.internal:6021` | —      | ❌        | ✅ `http://server:9021`                    |
| `OPENTHROTTLE_DEVELOPER_API_URL_EXTERNAL`                        | Server URL from the browser                                                            | ✅                             | —      | ❌        | ✅ `http://localhost:9021`                 |
| `OPENTHROTTLE_DEVELOPER_APP_NAME`                                | → `APP_NAME`                                                                           | ✅                             | —      | ❌        | ✅                                         |
| `OPENTHROTTLE_DEVELOPER_APP_NAME_SHORT`                          | → `APP_NAME_SHORT`                                                                     | ✅ `Dev`                       | —      | ❌        | ✅                                         |
| `OPENTHROTTLE_DEVELOPER_APP_URL`                                 | Own public URL                                                                         | ✅ `:6020`                     | —      | ❌        | ✅ `:9020`                                 |
| `OPENTHROTTLE_DEVELOPER_APP_URL_ADMIN`                           | Cross-app link                                                                         | ✅ `:6022`                     | —      | ❌        | ✅ `:9022`                                 |
| `OPENTHROTTLE_DEVELOPER_APP_URL_CMS`                             | Cross-app link                                                                         | ✅ `:6023`                     | —      | ❌        | ✅ `:9023`                                 |
| `OPENTHROTTLE_DEVELOPER_APP_URL_DEVELOPER`                       | Cross-app link                                                                         | ✅ `:6020`                     | —      | ❌        | ✅ `:9020`                                 |
| `OPENTHROTTLE_DEVELOPER_APP_URL_EMAIL`                           | Cross-app link                                                                         | ✅ `:6024`                     | —      | ❌        | ✅ `:9024`                                 |
| `OPENTHROTTLE_DEVELOPER_APP_URL_SERVER`                          | Cross-app link                                                                         | ✅ `:6021`                     | —      | ❌        | ✅ `:9021`                                 |
| `OPENTHROTTLE_DEVELOPER_APP_URL_WEBSITE`                         | Cross-app link                                                                         | ✅ `:6025`                     | —      | ❌        | ✅ `:9025`                                 |
| `OPENTHROTTLE_DEVELOPER_JWT_SECRET`                              | Developer-app session signing                                                          | ✅ (shared dev secret)         | —      | ❌        | ✅ (same dev secret)                       |
| `OPENTHROTTLE_MCP_PORT`                                          | OT MCP HTTP port                                                                       | ✅ `6026`                      | —      | —         | ✅ `9026`                                  |
| `OPENTHROTTLE_MCP_UPSTREAM_URL`                                  | MCP → server GraphQL base (compose default `http://server:$SERVER_PORT`)               | ✅ empty                       | —      | —         | ✅ empty                                   |
| `OPENTHROTTLE_API_URL`                                           | `@openthrottle/react-router-profiling` metrics endpoint; falls back to `API_URL`       | ❌                             | ❌     | ❌        | ❌                                         |
| `OPENTHROTTLE_APP_URL`                                           | Stripe checkout redirect base (`@openthrottle/nestjs-stripe`); falls back to `APP_URL` | ❌                             | ❌     | ❌        | ❌                                         |
| `OPENTHROTTLE_SERVER_VERSION` / `OPENTHROTTLE_DEVELOPER_VERSION` | Optional compose **build args** for image tags                                         | ❌                             | ❌     | ❌        | ❌                                         |

> `OPENTHROTTLE_DEVELOPER_VERSION` and `OPENTHROTTLE_SERVER_VERSION` are only
> referenced in `applications/openthrottle/README.md` prose today.

## 2. Data stores

| Variable                    | Used for                                                                                                                                                                                     | Defaults                                                    |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| `OPENTHROTTLE_POSTGRES_URL` | Primary Postgres DSN. Precedence: `OPENTHROTTLE_POSTGRES_URL` → `POSTGRES_URL` → `POSTGRES_*` pieces. Read by `databases/run-migrations.mjs` and `@openthrottle/openthrottle-agentic-utils`. | ❌ — no `.env.default` ships it; the `POSTGRES_*` pieces do |
| `OT_QUEUE_PREFIX`           | Explicit BullMQ Redis key prefix override (`@openthrottle/nestjs-bullmq`)                                                                                                                    | Commented out in server `.env.default`; code default `bull` |
| `OT_CONTAINER_PREFIX`       | Per-worktree container/queue prefix (`wt-<slug>-`), written by `setup_worktree.ts`; used as the BullMQ prefix when `OT_QUEUE_PREFIX` is unset                                                | ❌ — generated per worktree                                 |

## 3. Auth and bootstrap

| Variable                                 | Used for                                                                                                        | Defaults                                                                                                 |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `OPENTHROTTLE_MCP_AUTH_TOKEN`            | Bearer token the OT MCP server presents to the GraphQL API                                                      | ✅ root `.env.default` (empty), ✅ server `.env.default` (empty), ✅ `applications/openthrottle` (empty) |
| `OPENTHROTTLE_WORKER_GRAPHQL_AUTH_TOKEN` | Token for the agentic-ralph BullMQ worker's GraphQL calls                                                       | ✅ root (empty), ✅ server (empty)                                                                       |
| `OPENTHROTTLE_WORKFLOWS_AUTH_TOKEN`      | Shared fallback token for workflow-ralph GraphQL calls                                                          | ❌                                                                                                       |
| `OPENTHROTTLE_AUTH_TOKEN`                | Generic token accepted by the OT MCP server (documented in `databases/README.md`)                               | ❌                                                                                                       |
| `OPENTHROTTLE_BOOTSTRAP_USER_EMAIL`      | Seeded login user                                                                                               | ✅ root `developer@openthrottle.ai` (code default same)                                                  |
| `OPENTHROTTLE_BOOTSTRAP_USER_PASSWORD`   | Seeded login password                                                                                           | ✅ root `FullThrottle2026!` (code default same)                                                          |
| `OPENTHROTTLE_BOOTSTRAP_USER_GITHUB`     | Seeded user's GitHub handle                                                                                     | ✅ root (empty); code default `openthrottle-developer`                                                   |
| `OPENTHROTTLE_ADMIN_URL`                 | Admin URL passed to `scripts/bootstrap-default-user.ts`; one of six required keys in `.bootstrap-secrets.local` | ❌ (lives in `.bootstrap-secrets.local`)                                                                 |
| `OPENTHROTTLE_DEVELOPER_URL`             | Same, for the developer app                                                                                     | ❌ (same file)                                                                                           |
| `OPENTHROTTLE_GITHUB_USER`               | Forces the author/assignee handle the OT MCP writes; falls back to `GITHUB_USER`                                | ❌                                                                                                       |
| `OPENTHROTTLE_GITHUB_OWNER`              | Default GitHub org for the developer app                                                                        | ✅ developer `.env.default` `visormatt`; code default `openthrottle`                                     |
| `OPENTHROTTLE_GITHUB_REPO`               | Default GitHub repo                                                                                             | ✅ developer `.env.default` `monorepo`; code default `monorepo`                                          |

## 4. OT MCP server

| Variable                             | Used for                                                                  | Defaults                               |
| ------------------------------------ | ------------------------------------------------------------------------- | -------------------------------------- |
| `OT_MCP_HTTP_PORT`                   | HTTP transport port (Dockerfile healthcheck)                              | ❌; code default `6026`                |
| `OT_MCP_HTTP_URL`                    | Endpoint used by `scripts/verify-openthrottle-mcp-env.ts`                 | ❌                                     |
| `OT_MCP_AUTH_TOKEN_ENV_FILE`         | Path to the `.env` file the launcher recorded, re-read for token rotation | ❌ (set by the launcher)               |
| `OT_MCP_TOKEN_REFRESH_MS`            | Throttle for re-reading that file; `0` disables                           | ❌; code default `5000`                |
| `OT_MCP_TOKEN`                       | Token passed through to child agent MCP env                               | ❌                                     |
| `OT_MCP_ALLOW_NO_TOKEN`              | `1` = let the env verifier pass with no token                             | ❌                                     |
| `OT_MCP_SKIP_PREFLIGHT`              | `1` = skip the HTTP preflight on boot                                     | ❌                                     |
| `OT_MCP_RESOLVE_ONLY`                | Non-empty = `run-openthrottle-mcp.ts` resolves the target and exits       | ❌                                     |
| `OT_MCP_TARGET`                      | `worktree` prefers this worktree's server over the main checkout          | ❌                                     |
| `OPENTHROTTLE_MCP_WORKSPACE_PATH`    | Workspace the stdio transport reports (plan↔repo linking)                 | ❌                                     |
| `OPENTHROTTLE_GRAPHQL_URL`           | GraphQL endpoint for `@openthrottle/agentic-hooks`                        | ❌                                     |
| `OPENTHROTTLE_WORKER_GRAPHQL_URL`    | GraphQL endpoint override for the agentic-ralph worker                    | Commented out in server `.env.default` |
| `OPENTHROTTLE_WORKFLOWS_GRAPHQL_URL` | GraphQL endpoint for workflow-ralph                                       | ❌                                     |

## 5. Agent CLI drivers

Binary overrides — each names the executable for one driver; unset means "resolve
from `PATH`". None have `.env.default` entries.

| Variable                        | Driver              |
| ------------------------------- | ------------------- |
| `OPENTHROTTLE_CLAUDE_BIN`       | `claude`            |
| `OPENTHROTTLE_CODEX_BIN`        | `codex`             |
| `OPENTHROTTLE_CURSOR_AGENT_BIN` | `cursor-agent`      |
| `OPENTHROTTLE_GEMINI_BIN`       | `gemini`            |
| `OPENTHROTTLE_GROK_BIN`         | `grok`              |
| `OPENTHROTTLE_OPENCODE_BIN`     | `opencode`          |
| `OPENTHROTTLE_ANTIGRAVITY_BIN`  | `agy` (antigravity) |

| Variable                         | Used for                                          | Defaults                         |
| -------------------------------- | ------------------------------------------------- | -------------------------------- |
| `OPENTHROTTLE_CLAUDE_CONFIG_DIR` | `CLAUDE_CONFIG_DIR` handed to spawned Claude runs | ❌                               |
| `OT_AGENT_CLI_INSTALL_ENABLED`   | Gates server-side install/update of agent CLIs    | ✅ server `.env.default` `false` |
| `OPENTHROTTLE_AGENT_DEV_CWD`     | Dev-only cwd override for chat streams            | ❌                               |

### Agent run bounds (all read in `cursor-agent/teardown.ts`, none in `.env.default`)

| Variable                                  | Used for                                     | Code default                |
| ----------------------------------------- | -------------------------------------------- | --------------------------- |
| `OPENTHROTTLE_AGENT_IDLE_TIMEOUT_MS`      | Per-agent no-output timeout                  | `120000`                    |
| `OPENTHROTTLE_AGENT_WALLCLOCK_TIMEOUT_MS` | Per-agent wall-clock cap                     | `900000`                    |
| `OPENTHROTTLE_AGENT_KILL_GRACE_MS`        | SIGTERM → SIGKILL grace                      | `5000`                      |
| `OPENTHROTTLE_AGENT_SESSION_TIMEOUT_MS`   | Timeout for minting a CLI session            | `30000`                     |
| `OPENTHROTTLE_CHAT_IDLE_TIMEOUT_MS`       | Chat-stream orchestrator backstop            | agent idle + `30000` margin |
| `OPENTHROTTLE_RALPH_MAX_TOTAL_MS`         | Cumulative wall-clock budget for a Ralph run | unset → derived ceiling     |

## 6. Plans, runs and workspaces

| Variable                                  | Used for                                                                                                                                                     | Defaults                                                                                                   |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------- |
| `OPENTHROTTLE_WORKSPACES_DIR`             | Host directory bind-mounted to `/workspaces`                                                                                                                 | ✅ root (empty), ✅ `applications/openthrottle` `/tmp/workspaces`; compose falls back to `/tmp/workspaces` |
| `OPENTHROTTLE_HOST_WORKSPACES_DIR`        | Host-side path handed into the container so it can translate paths                                                                                           | ❌ — derived in compose from `OPENTHROTTLE_WORKSPACES_DIR`                                                 |
| `OPENTHROTTLE_CONTAINER_WORKSPACES_DIR`   | Container-side counterpart                                                                                                                                   | ❌ — hard-set to `/workspaces` in compose                                                                  |
| `OPENTHROTTLE_WORKSPACE_ROOTS`            | Comma-separated allowlist for repo discovery / directory browsing. **Empty by default = discovery disabled.**                                                | ❌ (deliberately opt-in)                                                                                   |
| `OPENTHROTTLE_ALLOWED_WORKING_DIRS`       | Allowlist of directory prefixes a plan run may use as cwd                                                                                                    | ❌                                                                                                         |
| `OPENTHROTTLE_CHECKOUT_ROOT`              | Where `git clone` from the UI writes; cloning is refused when unset                                                                                          | Commented out in root `.env.default` (`~/OpenThrottle/repositories`)                                       |
| `OPENTHROTTLE_NATIVE_PICKER`              | Force the native OS folder dialog on/off; unset = auto-detect                                                                                                | ❌                                                                                                         |
| `OPENTHROTTLE_DEFAULT_RUN_KIND`           | Historical `spawn` rollback knob — **removed**, referenced only in a code comment                                                                            | ❌                                                                                                         |
| `OPENTHROTTLE_PLANS_SPAWN_DIAGNOSTICS`    | Server worker spawn diagnostics                                                                                                                              | ✅ server `.env.default` `"1"`; commented out at root                                                      |
| `OPENTHROTTLE_LIFECYCLE_HOOKS_CHILD_JOBS` | Enables lifecycle-hook child jobs                                                                                                                            | Commented out in root `.env.default`                                                                       |
| `OPENTHROTTLE_HOOK_PLUGIN_ENABLED`        | Injects the OT hook plugin into child agents                                                                                                                 | ❌; code default **on** (only explicit falsy disables)                                                     |
| `OPENTHROTTLE_HOOK_PLUGIN_DIR`            | Override for the plugin payload dir                                                                                                                          | ❌; defaults to `<ot-root>/plugin`                                                                         |
| `OPENTHROTTLE_PERSONAL_SKILLS_ENABLED`    | Injects personal skills into foreign workspaces                                                                                                              | ❌; code default **off** (opt-in)                                                                          |
| `OPENTHROTTLE_PERSONAL_SKILLS_DIR`        | Personal skills directory override                                                                                                                           | ❌                                                                                                         |
| `OPENTHROTTLE_FOREIGN_SKILL_LEDGER_DIR`   | Where the foreign-skill-injection ledger is written                                                                                                          | ❌                                                                                                         |
| `OT_RUN_OUTCOME`                          | **Not an env var** — a sentinel line (`OT_RUN_OUTCOME: completed\|no_op`) an agent prints in its output so the scheduled-jobs processor can classify the run | n/a                                                                                                        |
| `OT_SCHEDULED_JOBS_OWNER`                 | Owner attributed to scheduled agent jobs; else inferred from the checkout                                                                                    | ❌                                                                                                         |
| `OT_BACKUP_OWNER`                         | Owner attributed to database-backup jobs; else inferred from the checkout                                                                                    | ❌                                                                                                         |

## 7. Worktrees

Driven by `skills/ot-worktree/scripts/*` and `scripts/setup_worktree.ts`.

| Variable                                    | Used for                                                                                        | Defaults                                            |
| ------------------------------------------- | ----------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| `OPENTHROTTLE_WORKTREE_ROOT`                | The one way to place worktrees — used verbatim                                                  | ✅ root `.env.default` `~/.openthrottle/worktrees/` |
| `OT_WORKTREE_ROOT`                          | Legacy/alias name still referenced by migrations `097`/`108`/`109` and forwarded to `create.sh` | ❌                                                  |
| `OPENTHROTTLE_WORKTREE_ROOT_FILE`           | User-global file holding the root                                                               | ❌; default `~/.openthrottle/worktree-root`         |
| `OPENTHROTTLE_WORKTREE_BRANCH_PREFIX`       | Branch prefix for new worktrees                                                                 | ❌; script default `openthrottle/`                  |
| `OPENTHROTTLE_SOURCE_REPO`                  | Source repo path, exported by `provision.sh`                                                    | ❌ (derived)                                        |
| `OPENTHROTTLE_WORKTREE_PATH`                | Worktree path, exported by `provision.sh`; also read by `teardown_worktree.ts`                  | ❌; falls back to `process.cwd()`                   |
| `OPENTHROTTLE_WORKTREE_NAME`                | Worktree basename, exported by `provision.sh`                                                   | ❌ (derived)                                        |
| `OPENTHROTTLE_WORKTREE_SETUP`               | `0` skips provisioning (also honours `CLAUDE_WORKTREE_SETUP`)                                   | ❌; default `1`                                     |
| `OPENTHROTTLE_WORKTREE_PROVISION`           | Path to the provision hook                                                                      | ❌; default `.worktree/provision.sh`                |
| `OPENTHROTTLE_WORKTREE_TEARDOWN`            | Path to the teardown hook                                                                       | ❌; default `.worktree/teardown.sh`                 |
| `OPENTHROTTLE_WORKTREE_PROVISIONED_MARKERS` | Space-separated files that mark a worktree as provisioned                                       | ❌; default `.env`                                  |
| `OPENTHROTTLE_WORKTREE_SCRIPT_DIR`          | Script-local variable inside `create.sh`, not user-facing                                       | n/a                                                 |
| `OT_PORT_BASE`                              | Base port allocated per worktree (cached in the worktree)                                       | ❌ (allocated)                                      |
| `OT_PORT_DEVELOPER`                         | Override for the developer port                                                                 | ❌; `base`                                          |
| `OT_PORT_SERVER`                            | Override                                                                                        | ❌; `base + 1`                                      |
| `OT_PORT_ADMIN`                             | Override                                                                                        | ❌; `base + 2`                                      |
| `OT_PORT_CMS`                               | Override                                                                                        | ❌; `base + 3`                                      |
| `OT_PORT_EMAIL`                             | Override                                                                                        | ❌; `base + 4`                                      |
| `OT_PORT_WEBSITE`                           | Override                                                                                        | ❌; `base + 5`                                      |
| `OT_PORT_MCP`                               | Override                                                                                        | ❌; `base + 6`                                      |

## 8. Logging

| Variable                      | Used for                                                                                                     | Defaults                                                                                          |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------- |
| `OT_SERVER_DEV_JSONL_LOGGING` | Registers `@openthrottle/nestjs-logging` for dev end-to-end checks                                           | ✅ server `.env.default` `"true"`; code default off                                               |
| `OT_SERVER_DEV_JSONL_LOG_DIR` | Directory for those JSONL files                                                                              | Commented out in server `.env.default`; default `.openthrottle/server-logs` under `process.cwd()` |
| `OT_BULLMQ_RUN_OUTPUT_DIR`    | Run-output directory for the log-tail API — **design doc explicitly calls this name stale**; not implemented | ❌                                                                                                |

`@openthrottle/nestjs-logging` documents a further set of knobs in its README.
They are **package-level config a consuming app must wire through
`ConfigService`** — no app in this repo reads them today, and none appear in any
`.env.default`:

- `OT_LOG_DIRECTORY` — directory for `*.jsonl` files (required by the module options)
- `OT_LOG_WS_ENABLED` — `true` enables the logging Socket.IO namespace
- `OT_LOG_WS_NAMESPACE` — namespace path override (default `/ot-logging`)
- `OT_LOG_WS_MAX_PENDING` — per-socket pending buffer before oldest lines drop
- `OT_LOG_WS_TOKEN` — suggested handshake-auth secret for production
- `OT_LOG_MAX_REPLAY_LINES` — cap for `logs.history` / `logs.tail` / `logs.replay`
- `OT_LOG_MAX_REPLAY_BYTES` — approximate max bytes read per tail/replay window

## 9. Release / publishing scripts

Read only by `scripts/gcs-docker-upload.ts`. None are in a `.env.default`.

| Variable                          | Used for                                           |
| --------------------------------- | -------------------------------------------------- |
| `OPENTHROTTLE_CONFIRM_PRODUCTION` | Must be `yes` to target the production GCP project |
| `OPENTHROTTLE_DRY_RUN`            | `1` prints the actions instead of running them     |
| `OPENTHROTTLE_REGISTRY_PREFIX`    | Container registry prefix override                 |

---

## Defaults checklist — at a glance

**Shipped in the root `.env.default`** (28 active): `OPENTHROTTLE_BOOTSTRAP_USER_EMAIL`,
`OPENTHROTTLE_BOOTSTRAP_USER_GITHUB`, `OPENTHROTTLE_BOOTSTRAP_USER_PASSWORD`,
`OPENTHROTTLE_MCP_AUTH_TOKEN`, `OPENTHROTTLE_WORKER_GRAPHQL_AUTH_TOKEN`,
`OPENTHROTTLE_WORKTREE_ROOT`, `OPENTHROTTLE_DEVELOPER_API_URL_EXTERNAL`,
`OPENTHROTTLE_DEVELOPER_API_URL_INTERNAL`, `OPENTHROTTLE_DEVELOPER_APP_NAME`,
`OPENTHROTTLE_DEVELOPER_APP_NAME_SHORT`, `OPENTHROTTLE_DEVELOPER_APP_URL`,
`OPENTHROTTLE_DEVELOPER_APP_URL_{ADMIN,CMS,DEVELOPER,EMAIL,SERVER,WEBSITE}`,
`OPENTHROTTLE_DEVELOPER_JWT_SECRET`, `OPENTHROTTLE_DEVELOPER_PORT`,
`OPENTHROTTLE_SERVER_APP_NAME`, `OPENTHROTTLE_SERVER_APP_NAME_SHORT`,
`OPENTHROTTLE_SERVER_APP_URL`, `OPENTHROTTLE_SERVER_CORS_CREDENTIALS`,
`OPENTHROTTLE_SERVER_CORS_ORIGINS`, `OPENTHROTTLE_SERVER_PORT`,
`OPENTHROTTLE_MCP_PORT`, `OPENTHROTTLE_MCP_UPSTREAM_URL`,
`OPENTHROTTLE_WORKSPACES_DIR`.
Commented out (documented but inactive): `OPENTHROTTLE_CHECKOUT_ROOT`,
`OPENTHROTTLE_PLANS_SPAWN_DIAGNOSTICS`, `OPENTHROTTLE_LIFECYCLE_HOOKS_CHILD_JOBS`.

**Shipped in `applications/openthrottle-server/.env.default`** (5 active):
`OPENTHROTTLE_MCP_AUTH_TOKEN`, `OPENTHROTTLE_WORKER_GRAPHQL_AUTH_TOKEN`,
`OT_AGENT_CLI_INSTALL_ENABLED`, `OPENTHROTTLE_PLANS_SPAWN_DIAGNOSTICS`,
`OT_SERVER_DEV_JSONL_LOGGING`.
Commented out: `OPENTHROTTLE_WORKER_GRAPHQL_URL`, `OT_SERVER_DEV_JSONL_LOG_DIR`,
`OT_QUEUE_PREFIX`.

**Shipped in `applications/openthrottle-developer/.env.default`** (2):
`OPENTHROTTLE_GITHUB_OWNER`, `OPENTHROTTLE_GITHUB_REPO`.

**Shipped in `applications/openthrottle/.env.default`** (25): the same
port/URL/identity set as the root file but on 9xxx ports, plus
`OPENTHROTTLE_SERVER_BULLMQ_BOARD_ADMIN_USERNAME` /
`OPENTHROTTLE_SERVER_BULLMQ_BOARD_ADMIN_PASSWORD` and
`OPENTHROTTLE_WORKSPACES_DIR=/tmp/workspaces`.

**No `.env.default` anywhere** — every variable in sections 4–9 not listed above.
Most are optional overrides with sane code defaults; the ones worth calling out
because they are _required_ for the feature to work at all:

- `OPENTHROTTLE_WORKSPACE_ROOTS` — repo discovery returns empty until set
- `OPENTHROTTLE_CHECKOUT_ROOT` — cloning from the UI is refused until set
- `OPENTHROTTLE_POSTGRES_URL` — unless the `POSTGRES_*` pieces are supplied
- `OPENTHROTTLE_ADMIN_URL` / `OPENTHROTTLE_DEVELOPER_URL` — required keys in
  `.bootstrap-secrets.local`, never in a `.env.default`
- `OT_LOG_DIRECTORY` — required by `@openthrottle/nestjs-logging` if that module
  is ever wired into an app
