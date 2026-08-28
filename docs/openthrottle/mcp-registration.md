# MCP server registration for OpenThrottle

Canonical, single-source-of-truth (SSOT) guide for registering Model Context Protocol (MCP) servers when working in the OpenThrottle monorepo. It explains which servers OpenThrottle ships, which are user-provided, where each editor reads its config, and how to register and smoke-test `openthrottle-mcp` at the monorepo root and from a secondary workspace.

This doc **consolidates** registration guidance that previously lived (partly) across [first-time-onboarding.md](./first-time-onboarding.md) (tier table, when-to-use) and [local-quickstart.md](./local-quickstart.md), and it absorbed the worktree-aware launcher and identity story outright. Those docs now point here for the registration story and keep only their own concerns (onboarding flow, fresh-clone bootstrap). Where this guide and those overlap, **this file wins**.

> **Scope:** registration and configuration only. For tokens and rotation see [AUTH.md](../../packages/openthrottle-mcp/docs/AUTH.md); for env alignment and smoke fixtures see [verification-environment.md](../../packages/openthrottle-mcp/docs/verification-environment.md); for per-worktree port blocks see [worktree-port-allocation.md](../monorepo/worktree-port-allocation.md).

## Contents

- [Current state](#current-state) — what is actually committed today
- [MCP tiers](#mcp-tiers) — required OT-native vs user-provided/optional
- [Config locations](#config-locations) — project vs user-level, per editor
- [Template structure](#template-structure) — shared server set and the launcher
- [HTTP transport (Docker-native)](#http-transport-docker-native) — the `mcp` container / `openthrottle-mcp-docker`
- [Editor parity](#editor-parity) — Cursor / VS Code / Claude Code / OpenCode
- [User-provided servers](#user-provided-servers) — github, shadcn, nx-mcp, maestro, fetch
- [Secondary workspace](#secondary-workspace) — using OT MCP from another repo
- [Worktrees](#worktrees) — worktree-aware identity and live-server resolution
- [Smoke-test checklist](#smoke-test-checklist) — registration gates

## Current state

Inventory of MCP config **as actually committed**. This is the ground truth the rest of this guide builds on.

| Config source             | Scope               | Servers present                                                                       | Notes                                                                                     |
| ------------------------- | ------------------- | ------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `.cursor/mcp.json`        | Project (committed) | `fetch`, `github`, `maestro`, `openthrottle-mcp`, `openthrottle-mcp-docker`, `shadcn` | Cursor `mcpServers` map. Same server set as Claude Code.                                  |
| `~/.cursor/mcp.json`      | User-level          | developer's choice                                                                    | Canonical home for the **secondary-workspace** setup (absolute paths to the OT checkout). |
| `.mcp.json` (Claude Code) | Project (committed) | `fetch`, `github`, `maestro`, `openthrottle-mcp`, `openthrottle-mcp-docker`, `shadcn` | Claude Code `mcpServers` map. Shared definitions with Cursor.                             |
| `.vscode/mcp.json`        | Project (committed) | same six under `servers`                                                              | VS Code schema (`servers` + `type: stdio` / `http`).                                      |
| `opencode.json`           | Project (committed) | same six under `mcp`, plus `nx-mcp`                                                   | OpenCode schema (`type: local` / `remote`).                                               |

**Shared working set (all editors):** `github`, `fetch`, `maestro`, `openthrottle-mcp`, `openthrottle-mcp-docker`, `shadcn`.

### `docs-mcp` is retired

`docs-mcp` is **not** an active server and must not be documented as one:

- No launcher — `scripts/run-docs-mcp.sh` was removed (PR #6); it does not exist on disk.
- No package — there is no `docs-mcp` package under `packages/`.
- No committed config references it as active (`.cursor/mcp.json`, `.mcp.json`, `.vscode/mcp.json`, `opencode.json` are all docs-mcp-free).
- It may still linger in a developer's user-level `~/.cursor/mcp.json`; remove it there. Historical/seed data (e.g. `databases/seed.sql`) is left intact.

Its former role — semantic search over ingested `docs/` — is now served by `openthrottle-mcp` (`semantic_search`, `list_sources`, `get_document`).

See [Worktrees](#worktrees) for worktree identity and [verification-environment.md](../../packages/openthrottle-mcp/docs/verification-environment.md) for env alignment.

## MCP tiers

OpenThrottle distinguishes two tiers of MCP server. **Only one is OT-native and required**; everything else is useful but optional for OT plans/tasks.

### Tier 1 — Required, OT-native

| Server                      | Why                                                                                                                                                                                                                                                   | Registration                                                                                    |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| **openthrottle-mcp**        | The single OT-native server. Plans, tasks, notes, commit links, activity, plan output stream, semantic search over the OT knowledge base (plans + tasks + ingested `docs/`), and `health`. Plans/tasks live in OT **only** — never as Markdown files. | `bash scripts/run-openthrottle-mcp.sh` — see [Template structure](#template-structure).         |
| **openthrottle-mcp-docker** | Same tools over **streamable HTTP** when the `mcp` container is running (no host Node / stdio child).                                                                                                                                                 | `{ "url": "http://localhost:6026/mcp" }` — see [HTTP transport](#http-transport-docker-native). |

Register **one** of these for day-to-day OT work (stdio launcher _or_ Docker HTTP). Both appear in committed configs so you can switch without re-authoring entries. Prefer the stdio launcher for hybrid host-server setups; prefer Docker HTTP for a fully-Dockerized install.

This is the only OT-native surface this repo expects you to register to work with OpenThrottle. It absorbed the former `docs-mcp` documentation-search role (see [Current state](#current-state)).

### Tier 2 — User-provided / optional

These are general-purpose servers useful in this repo. They are **not** OT-native and **not** required for OT plans/tasks. They ship in the committed editor configs; you still authenticate them yourself (tokens, CLIs on `PATH`).

| Server      | Purpose                                  | Appears in                                      |
| ----------- | ---------------------------------------- | ----------------------------------------------- |
| **github**  | GitHub PRs, issues, code search          | all committed MCP configs                       |
| **shadcn**  | shadcn/ui component registry             | all committed MCP configs                       |
| **maestro** | Maestro E2E driving of the developer app | all committed MCP configs                       |
| **fetch**   | Generic URL fetch                        | all committed MCP configs                       |
| **nx-mcp**  | Nx workspace graph, generators, docs     | `opencode.json` only (OpenCode-native addition) |

Detail and registration for these: [User-provided servers](#user-provided-servers).

> **Not active OT-native servers:** `docs-mcp` (retired — see [Current state](#current-state)) and `git` (not present in any committed config). Do not register either as an OT-native server.

## Config locations

MCP config is read per **workspace** and (for Cursor) optionally per **user**. Where you put the `openthrottle-mcp` entry depends on whether the OpenThrottle monorepo is your open workspace.

| Location             | Scope                 | When to use                                                                                                                                                                                             |
| -------------------- | --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `.cursor/mcp.json`   | Project (this repo)   | The monorepo is your open Cursor workspace. Committed; Cursor loads it automatically.                                                                                                                   |
| `~/.cursor/mcp.json` | User-level (Cursor)   | **Secondary workspace** — a _different_ repo is open in Cursor but you still want OT tools. Canonical home; use **absolute paths** to the OT checkout. See [Secondary workspace](#secondary-workspace). |
| `.mcp.json`          | Project (Claude Code) | Claude Code in the monorepo. Committed; same six-server set as Cursor.                                                                                                                                  |
| `.vscode/mcp.json`   | Project (VS Code)     | VS Code MCP. Committed; same six servers under the `servers` key.                                                                                                                                       |
| `opencode.json`      | Project (OpenCode)    | OpenCode editor. Committed; same six under `mcp`, plus `nx-mcp`.                                                                                                                                        |

**Project vs user-level (Cursor):** a project-level `.cursor/mcp.json` is only loaded when that folder is the workspace root. When OpenThrottle is _not_ the open workspace, the project file is ignored — use `~/.cursor/mcp.json` instead. If both define `openthrottle-mcp`, see [Cursor merge behavior](#user-provided-servers).

## Template structure

The committed Cursor / Claude configs are [`.cursor/mcp.json`](../../.cursor/mcp.json) and [`.mcp.json`](../../.mcp.json) — the same six-server `mcpServers` map. VS Code and OpenCode adapt the same definitions to their schemas (see [Editor parity](#editor-parity)).

> **Don't re-inline the blocks.** This guide and every other doc link to the committed JSON files instead of pasting the full map, so the registration shape lives in the config files and cannot drift. Open those files to read or copy the contents.

**Launcher invocation (`openthrottle-mcp`):**

- The launcher is self-contained: [`scripts/run-openthrottle-mcp.sh`](../../scripts/run-openthrottle-mcp.sh) **resolves a live server URL at launch** (probing `/health`, preferring the stable main-checkout server) and **self-loads** `OPENTHROTTLE_MCP_AUTH_TOKEN` **from** `.env` (this worktree's, then the root checkout's) when the launching environment doesn't already provide it. You do **not** need to export `API_URL` / `API_URL_INTERNAL` yourself.
- **Claude Code (`.mcp.json`) carries no env block** on `openthrottle-mcp`: the launcher derives `API_URL` / `API_URL_INTERNAL` and self-loads the token, so a block would only risk passing an unexpanded `${OPENTHROTTLE_MCP_AUTH_TOKEN}` placeholder as an empty bearer (the silent-401 trap) and tripping the client's "Failed to replace env in config" warning — mirroring the `github` entry. `.cursor/mcp.json` keeps a block for editors that expand `${…}`; both paths work because the launcher self-loads from `.env` regardless. Keep any URLs aligned with the server `PORT` (default `6021`).
- **Auth:** `OPENTHROTTLE_MCP_AUTH_TOKEN` is an `ot_sa_…` service-account token. Mint it with `pnpm run database:bootstrap-service-accounts` and put it in the repo `.env` (root and/or `applications/openthrottle-server/.env`); for Cursor you may also set it in the MCP `env` block. Never commit a real token — see [AUTH.md](../../packages/openthrottle-mcp/docs/AUTH.md).
- **Embeddings** are configured on the server (`OPENAI_API_KEY` or `OLLAMA_*` in `applications/openthrottle-server/.env`), **not** in this launcher.
- **Worktree-aware:** the launcher sets `WORKTREE_ID` per worktree so each advertises a distinct server name, and resolves the live server URL at launch rather than trusting a per-worktree `.env` port — full detail under [Worktrees](#worktrees).

**Docker HTTP (`openthrottle-mcp-docker`):** committed as `http://localhost:6026/mcp` (root `.env.default` `OPENTHROTTLE_MCP_PORT`). In a worktree use the block's `base+6`; for the consumer-install stack under `applications/openthrottle/` the default is `9026` — update the `url` to match. See [HTTP transport](#http-transport-docker-native).

Do **not** add `docs-mcp` (retired) or `git` (not committed) as active entries.

## HTTP transport (Docker-native)

The stdio launcher needs host Node + a built `dist/`. A **fully-Dockerized** install (Docker only) instead runs the `mcp` service from [`docker-compose.yml`](../../docker-compose.yml) — a long-running **streamable-HTTP** MCP server — and registers it by **URL** (the committed `openthrottle-mcp-docker` entry):

```json
{
  "mcpServers": {
    "openthrottle-mcp-docker": {
      "url": "http://localhost:6026/mcp"
    }
  }
}
```

- **Bring it up:** `docker compose --profile prod up mcp` (or `--profile dev up mcp-dev` for hot reload). It `depends_on` migrations + a healthy server.
- **Provision the token first:** `docker compose run --rm bootstrap` upserts the `ot_sa_` credential matching `OPENTHROTTLE_MCP_AUTH_TOKEN`. If the token is missing/invalid the `mcp` container **fails loudly at startup** (it won't silently serve 401s) — see [bootstrap docs](../../databases/README.md#bootstrapping-a-fully-dockerized-install).
- **Auth (both identities, per request):** the container holds the `ot_sa_` token for machine tools; a client that sends `Authorization: Bearer <human JWT>` gets that user's identity — required by the `agent_conversation_*` tools (they reject `ot_sa_`). One server, switched per request.
- **Port:** `${OPENTHROTTLE_MCP_PORT}` (default `6026` at the monorepo root). In a **worktree** it is the block's `base+6` (e.g. `7126`) — `setup_worktree.sh` rewrites it, so use the port printed by `pnpm run worktree:new`. Consumer-install (`applications/openthrottle/`) defaults to `9026`. Update the `url` to match.
- **Hybrid** (server on the host via Nx, infra in Docker): either keep using the **stdio launcher** (`openthrottle-mcp`) — zero-config, it probes the host `/health` — or run the `mcp` container with `OPENTHROTTLE_MCP_UPSTREAM_URL=http://host.docker.internal:${OPENTHROTTLE_SERVER_PORT}` in `.env` so it targets the host server.
- **Reconnect** the MCP in your client after changing the URL/token (the HTTP server picks up a new env token only on container restart).

## Editor parity

Each editor reads its own MCP config file; schemas differ, but the **server set is the same**.

| Editor          | Config file        | Schema key   | Committed servers                                                                     | openthrottle-mcp? |
| --------------- | ------------------ | ------------ | ------------------------------------------------------------------------------------- | ----------------- |
| **Cursor**      | `.cursor/mcp.json` | `mcpServers` | `fetch`, `github`, `maestro`, `openthrottle-mcp`, `openthrottle-mcp-docker`, `shadcn` | Yes               |
| **Claude Code** | `.mcp.json`        | `mcpServers` | same six                                                                              | Yes               |
| **VS Code**     | `.vscode/mcp.json` | `servers`    | same six (`type: stdio` / `http`)                                                     | Yes               |
| **OpenCode**    | `opencode.json`    | `mcp`        | same six (`type: local` / `remote`) plus `nx-mcp`                                     | Yes               |

**Why schemas differ, not the set:** Cursor and Claude Code share the `mcpServers` shape; VS Code requires `servers` + explicit `type`; OpenCode requires `type: local|remote` and packs command+args into one array. The one invariant: the six named servers above are present wherever OT plans/tasks (and the shared tooling set) are needed.

## User-provided servers

These are Tier 2 servers — useful in this repo but **not** OT-native and **not** required for OT plans/tasks. They ship in the committed configs; authenticate them yourself. Definitions below match [`.mcp.json`](../../.mcp.json) / [`.cursor/mcp.json`](../../.cursor/mcp.json).

### GitHub MCP

```json
"github": {
  "command": "bash",
  "args": ["./scripts/run-github-mcp.sh"]
}
```

- **Token:** [`scripts/run-github-mcp.sh`](../../scripts/run-github-mcp.sh) self-loads `GITHUB_TOKEN` from the repo `.env` (then the main checkout's `.env`) when the launching shell did not export it. Prefer that over an `env` block with `${GITHUB_TOKEN}` — unexpanded placeholders are what trigger client "Failed to replace env in config" warnings.
- **Scopes:** a classic PAT with `repo` (read/write to PRs, issues, contents) covers normal use; add `read:org` for org-scoped queries and `workflow` only if you drive Actions. Fine-grained tokens work if granted the equivalent repo permissions.
- **Optional:** GitHub MCP is **not** a plan gate. It is covered as an optional appendix in the [smoke-test checklist](#smoke-test-checklist), not a required registration step.

### shadcn, nx-mcp, maestro, fetch

| Server      | Config (as committed)                                          | Notes                                                                                                |
| ----------- | -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| **shadcn**  | `npx shadcn@latest mcp`                                        | shadcn/ui component registry browsing/adding. No token.                                              |
| **nx-mcp**  | `opencode.json`: `npx nx mcp` (`type: local`, `enabled: true`) | Nx workspace graph, generators, docs, task running. No token. OpenCode only.                         |
| **maestro** | `maestro mcp`                                                  | Maestro E2E driving of the developer app. Requires the Maestro CLI on `PATH` + a running app/device. |
| **fetch**   | `uvx mcp-server-fetch`                                         | Generic URL fetch. Requires `uvx` (uv) on `PATH`. No token.                                          |

### Cursor merge behavior (project + user config)

When you run Cursor inside OpenThrottle, **both** `~/.cursor/mcp.json` (user-level) and `.cursor/mcp.json` (project) apply; Cursor unions their `mcpServers` by key. Practical rules:

- **Distinct keys union.** Put project servers in `.cursor/mcp.json` and extra personal servers in `~/.cursor/mcp.json`; you get both.
- **Same key → project wins.** If both files define `openthrottle-mcp`, the project-level entry takes precedence for this workspace. Keep the OT-native entry in one place (the project file when the monorepo is open; `~/.cursor/mcp.json` for a [secondary workspace](#secondary-workspace)) to avoid a stale duplicate shadowing the live one.
- **Restart Cursor** after editing either file.

## Secondary workspace

Use `openthrottle-mcp` while your **active Cursor workspace is a different repo** (not the OpenThrottle monorepo root). The project-level `.cursor/mcp.json` inside OpenThrottle is not loaded then, so register at user level.

1. **Register in** `~/.cursor/mcp.json` (user-level), not the project file.
2. **Use an absolute path** to the launcher — `bash` + `<path-to-openthrottle-checkout>/scripts/run-openthrottle-mcp.sh`. A relative `./scripts/...` resolves against the _open_ workspace and won't exist outside the OT repo.
3. **Same env as local OT** — `API_URL` / `API_URL_INTERNAL` pointed at the running server (e.g. `http://localhost:6021`) and `OPENTHROTTLE_MCP_AUTH_TOKEN` for authenticated tools. These are independent of which folder is open.

The launcher `cd`s into the monorepo and starts Node from that checkout; GraphQL-backed tools (`create_plan`, `create_task`, …) call the server over HTTP and do not depend on the open workspace path. Full detail and failure modes: [verification-environment.md § Secondary workspace](../../packages/openthrottle-mcp/docs/verification-environment.md#secondary-workspace-another-repo-open-in-cursor).

## Worktrees

Two distinct problems: **identity** (one editor, several worktrees, same server name) and **reachability** (a worktree's `.env` names a port with nothing behind it).

### Identity — worktree-aware server names

Cursor reads `.cursor/mcp.json` per workspace, and the **key** in `mcpServers` (e.g. `openthrottle-mcp`) is the server identifier. That key is a static string — Cursor does not fold the workspace path into it — so two worktrees using the same key with a server advertising the same protocol name can be conflated, and one process gets reused across worktrees.

The launcher fixes this from the server side:

- `scripts/run-openthrottle-mcp.sh` (a thin shim over `scripts/run-openthrottle-mcp.ts`) sets `WORKTREE_ID` to the basename of the git worktree root. Outside a git repo it is unset.
- The package's `getServerName()` then advertises `@openthrottle/openthrottle-mcp-{WORKTREE_ID}` when `WORKTREE_ID` is set, the default name otherwise.
- `MCP_SERVER_NAME` overrides both — set it to force a name (tests, or a non-worktree checkout).

For full isolation you can additionally use distinct `mcpServers` **keys** per worktree, but the worktree-aware advertised name is normally enough.

### Reachability — the launcher resolves a live server

**Worktrees do not start their own `openthrottle-server`** — they share the main checkout's server, Postgres and Redis. But worktree setup rewrites the canonical `6020–6025` ports in `.env` to a per-worktree block, so a worktree's configured `OPENTHROTTLE_SERVER_APP_URL` points at a port with nothing listening, and every MCP call returns `fetch failed`.

So the launcher probes `GET <url>/health` and uses the first candidate that answers. Default order is **stable-first**:

1. The main/root checkout's `.env` `OPENTHROTTLE_SERVER_APP_URL` (found via `git rev-parse --git-common-dir`) — the shared canonical server.
2. A running docker `server` container's published host port (from `docker ps`).
3. This worktree's own `.env` `OPENTHROTTLE_SERVER_APP_URL` — a liveness fallback, in case a genuine per-worktree server is running.
4. Canonical fallback `http://localhost:6021`.

Set **`OT_MCP_TARGET=worktree`** to invert the first three and prefer this worktree's own server. The chosen URL is exported as `API_URL` / `API_URL_INTERNAL`.

`.env` is parsed rather than `source`d, so a missing or partial worktree `.env` no longer aborts the launcher — an earlier version died at `source ./.env` and registered **zero** tools. If no candidate answers, it exits non-zero naming everything it tried instead of launching into a `fetch failed` loop.

To debug resolution without starting anything, run:

```bash
OT_MCP_RESOLVE_ONLY=1 bash scripts/run-openthrottle-mcp.sh
```

> **MCP servers register at session start**, so a launcher fix reaches only _new_ sessions. In a session already holding broken tools, drive GraphQL directly against the live server with `curl` (bearer `OPENTHROTTLE_MCP_AUTH_TOKEN`) as a stopgap.

For `openthrottle-mcp-docker`, update the committed `url` port to this worktree's `OPENTHROTTLE_MCP_PORT` (base+6) after `pnpm run worktree:new`.

### A separate database per worktree

Optional, and off by default — worktrees share the main Postgres. To split them, set `POSTGRES_*` (or `POSTGRES_URL`) in each worktree's `.env` with a different port or database name; openthrottle-server reads those at runtime. `openthrottle-mcp` reaches OT over GraphQL, so point it at the matching API URL too (see `OT_MCP_TARGET` above).

## Smoke-test checklist

After registering or changing MCP config, confirm `openthrottle-mcp` works. There is **no docs-mcp gate** (retired). The full, maintained checklist lives in **[verification-environment.md § Registration smoke-test](../../packages/openthrottle-mcp/docs/verification-environment.md#registration-smoke-test-root--secondary-workspace)**; the gates in brief:

**Root (monorepo open):**

1. Ensure `.cursor/mcp.json` (or your editor's equivalent) is loaded, `OPENTHROTTLE_MCP_AUTH_TOKEN` is in `.env`, restart the client.
2. `OT_MCP_RESOLVE_ONLY=1 bash scripts/run-openthrottle-mcp.sh` resolves a live server.
3. `health` → all `ok`.
4. One OT tool (e.g. `list_sources` / `semantic_search`) succeeds.

**Secondary workspace (a different repo open):**

1. `~/.cursor/mcp.json` with an absolute path to `scripts/run-openthrottle-mcp.sh` + same OT env; restart Cursor.
2. The absolute-path launcher resolves the live server from any cwd; `health` passes in the MCP panel.

**Optional:** GitHub MCP is **not** a gate — see the [optional GitHub appendix](../../packages/openthrottle-mcp/docs/verification-environment.md#optional-appendix--github-mcp).

## Related documentation

| Topic                                | Location                                                                                        |
| ------------------------------------ | ----------------------------------------------------------------------------------------------- |
| Per-worktree port blocks             | [worktree-port-allocation.md](../monorepo/worktree-port-allocation.md)                          |
| MCP env, fixtures, smoke checks      | [verification-environment.md](../../packages/openthrottle-mcp/docs/verification-environment.md) |
| Service account tokens & rotation    | [AUTH.md](../../packages/openthrottle-mcp/docs/AUTH.md)                                         |
| First agent workflow after MCP works | [first-time-onboarding.md](./first-time-onboarding.md)                                          |
| Author OT plans & tasks via MCP      | [authoring-plans-via-mcp.md](./authoring-plans-via-mcp.md)                                      |
| Fresh clone → server + MCP           | [local-quickstart.md](./local-quickstart.md)                                                    |
| Committed Cursor config              | [`.cursor/mcp.json`](../../.cursor/mcp.json)                                                    |
| Committed Claude Code config         | [`.mcp.json`](../../.mcp.json)                                                                  |
| Committed VS Code config             | [`.vscode/mcp.json`](../../.vscode/mcp.json)                                                    |
| Committed OpenCode config            | [`opencode.json`](../../opencode.json)                                                          |
