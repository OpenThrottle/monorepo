# @openthrottle/openthrottle-mcp

Model Context Protocol (MCP) server for OpenThrottle: plans, tasks, and GraphQL-backed tools (no direct database access). Tools call `openthrottle-server` over GraphQL only.

For schema, embeddings, and local Postgres setup, see [databases/README.md](../../databases/README.md). Workspace-wide conventions: [AGENTS.md](../../AGENTS.md).

**Registering this server:** the canonical guide is [docs/openthrottle/mcp-registration.md](../../docs/openthrottle/mcp-registration.md) — tiers, config locations, the `.cursor/mcp.json` template, and editor parity. The package-specific launcher and env details below stay here.

**Cursor launcher:** [`scripts/run-openthrottle-mcp.sh`](../../scripts/run-openthrottle-mcp.sh) does not require a root **`OPENAI_API_KEY`**; configure **`OLLAMA_BASE_URL`** or **`OPENAI_API_KEY`** on **openthrottle-server** for semantic search. See [docs/verification-environment.md](docs/verification-environment.md) and [Ollama.md § Embeddings for OpenThrottle](../../docs/monorepo/Ollama.md#embeddings-for-openthrottle-ollama-or-openai). It picks its own Node rather than the client's PATH; for "Connection closed" on the desktop app or the `OT_MCP_NODE` override, see [Launcher Node version](#launcher-node-version).

## Authentication

Authenticated GraphQL calls use a bearer token from the environment. Set **`OPENTHROTTLE_MCP_AUTH_TOKEN`** to a service account token (`ot_sa_<prefix>_<secret>`) minted via `pnpm run database:bootstrap-service-accounts` or admin GraphQL — not a short-lived human JWT. See [docs/AUTH.md](docs/AUTH.md) for setup, rotation, and Cursor MCP config. For local verification (services, env vars, smoke checklist), see [docs/verification-environment.md](docs/verification-environment.md).

**Exception — agent conversation read tools:** `agent_conversation_list`, `agent_conversation_get`, and `agent_conversation_get_messages` require a **human JWT** (from `login` / `register`). Service account tokens are rejected with **403 Human authentication required**. See [docs/AUTH.md](docs/AUTH.md) § Human JWT and [docs/agent-conversation-read-tools-contract.md](docs/agent-conversation-read-tools-contract.md).

## Installation

**In this monorepo:** add `"@openthrottle/openthrottle-mcp": "workspace:^"` where needed, or run the MCP from this package after a build. See [AGENTS.md](../../AGENTS.md) for OpenThrottle MCP usage.

**Build and run (monorepo):**

```bash
pnpm nx run @openthrottle/openthrottle-mcp:build
pnpm nx run @openthrottle/openthrottle-mcp:serve
```

> [!Tip]
> This package is **private** to the workspace and is not published to a public registry.

## Launcher Node version

`scripts/run-openthrottle-mcp.sh` chooses its own Node instead of trusting the first `node` on the PATH an MCP client hands it. This section covers the failure that made that necessary, how the choice is made, and how to override it.

The launcher is two files on purpose. The `.sh` shim picks the runtime and the `.ts` does the work (server discovery, auth preflight, spawning the server). A `.ts` cannot choose the Node it runs on, since something has to start it first, and under `env -i` there is no `node` at all. The shim's path is also baked into user-global client configs, so it stays put.

### Symptom

Before the launcher pinned Node, a client could fail like this while everything looked healthy:

- The **Claude desktop app** shows `openthrottle-mcp` as **"Connection closed"**, while the same registration works from the `claude` CLI in a terminal.
- The MCP log shows the launcher starting on an old Node and blaming the server, although `curl http://localhost:6021/health` answers:

  ```text
  🔍 Using Node.js version: v16.17.1
  …
  ✗ openthrottle-mcp: no reachable OpenThrottle server found.
  ```

- Under a bare environment (`env -i`), the shim exits **127** because there is no `node` at all.

### Cause

MCP clients launch servers with **their own PATH**, not your shell's. The Claude desktop app builds it from every nvm install in ascending order, so `node` resolves to the **oldest** one, whatever your nvm default is. The CLI works because it inherits a terminal where nvm has already selected the right version.

Node 16 has no global `fetch`. The launcher's server probe called it, the resulting `ReferenceError` was swallowed by a bare `catch`, and every candidate server was reported unreachable.

### How the launcher picks Node

Before it starts tsx, the shim resolves a Node that satisfies the root `package.json` `engines.node`, puts that Node's `bin` directory at the front of `PATH`, and then `exec`s tsx. tsx's `#!/usr/bin/env node` and the server child the launcher spawns both run on it. First hit wins:

1. **`OT_MCP_NODE`**: an explicit node binary (see [Overriding](#overriding)).
2. **The `.nvmrc` version** at `$NVM_DIR/versions/node/v<version>` (`$NVM_DIR` defaults to `~/.nvm`). The checkout's own `.nvmrc` is used, or the primary checkout's when a worktree has none. Only an exact `x.y.z` is looked up, so aliases such as `lts/*` move on to the next step.
3. **The newest nvm install** that satisfies `engines.node`.
4. **The `node` on PATH**, if its version satisfies `engines.node`.

If nothing fits, the shim exits 1 with one stderr line naming the range and everything it tried:

```text
🔴 run-openthrottle-mcp: no Node satisfying engines.node ">=22.22.3 <23 || >=24.15 <25 || >=26" — tried: .nvmrc v24.18.0 (not installed in /Users/you/.nvm); none of 3 nvm installs in /Users/you/.nvm; PATH node /usr/local/bin/node v20.11.0. …
```

Resolution is plain bash ([`scripts/utils/resolve-node.sh`](../../scripts/utils/resolve-node.sh)). It takes about 6 ms, never sources `nvm.sh` (about 210 ms, and `nvm use` prints to stdout), and writes nothing to stdout, which carries only JSON-RPC. Its range parser matches the `pnpm install` guard in [`scripts/check-node-engine.mjs`](../../scripts/check-node-engine.mjs), and the tests check that the two agree.

If the shim is bypassed, for example by running the `.ts` with tsx directly on an old Node, `run-openthrottle-mcp.ts` checks `engines.node` itself. It refuses to start with a banner that names the running version and the required range, and it does so before probing any server. Its probe treats only real network failures and timeouts as "unreachable", so a broken runtime can no longer be reported as a down server.

### Overriding

Pin a specific binary with **`OT_MCP_NODE`** in the client config's `env` block. It wins over everything else. It must still satisfy `engines.node`; if it doesn't, the launcher fails rather than quietly choosing a different Node.

```bash
claude mcp add-json openthrottle-mcp --scope user '{"command":"bash","args":["/abs/path/to/monorepo/scripts/run-openthrottle-mcp.sh"],"env":{"OT_MCP_NODE":"/Users/you/.nvm/versions/node/v24.18.0/bin/node"}}'
```

For Cursor, add the same `"env": { "OT_MCP_NODE": "…" }` to the server's entry in `~/.cursor/mcp.json`.

The other inputs:

- **`PATH`** in the `env` block only matters when no nvm install fits (step 4). Use it when you manage Node without nvm, for example with Homebrew, fnm, Volta or mise; their shims or binaries just need to be on that PATH.
- **`NVM_DIR`** in the `env` block points the lookup at an nvm that is not in `~/.nvm`.

[`scripts/setup_mcp-instructions.ts`](../../scripts/setup_mcp-instructions.ts) still emits no `env` block. The launcher resolves Node by itself, and writing a `PATH` into a user-global config would freeze one machine's install list there, where it goes stale after the next `nvm install`.

### Diagnosing

Run the launcher the way a client does. The first stderr line names the Node it chose:

```bash
env -i HOME="$HOME" OT_MCP_RESOLVE_ONLY=1 bash scripts/run-openthrottle-mcp.sh
```

To reproduce the desktop app's PATH, put an old Node first:

```bash
PATH="$HOME/.nvm/versions/node/v16.17.1/bin:$PATH" OT_MCP_RESOLVE_ONLY=1 bash scripts/run-openthrottle-mcp.sh
```

Both should report the `.nvmrc` version. MCP servers register when a session starts, so after you change the launcher or its config, reconnect the server (`/mcp` in Claude Code) or restart the client.

## Tools overview

| Category                                                      | MCP tools                                                                                                           | Auth                                       |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| Plans, tasks, notes, activity, output stream, semantic search | `create_plan`, `get_plan`, `list_plans_by_status`, `get_plan_output`, `append_plan_output`, `delete_plan_output`, … | Service account (recommended) or human JWT |
| Agent conversations (web chat threads)                        | `agent_conversation_list`, `agent_conversation_get`, `agent_conversation_get_messages`                              | **Human JWT only** (user-scoped)           |

GraphQL-only — no direct Postgres access. Prerequisite for conversation tools: v1 persistence from plan `4fa6d16c-a1d4-4aba-923c-52e35e3deb66` (`agent_conversations` / `agent_conversation_messages` tables, `agentsRunChatTurn` with `persist: true`).

## Blog authoring tools (draft-only)

`list_blog_posts`, `get_blog_post`, `create_blog_post`, `update_blog_post`, `set_blog_post_tags`, `list_blog_tags`, `list_blog_authors`. They need a `blog:draft` service account and work on **DRAFT** posts only. There is deliberately **no** publish, schedule, unpublish, archive, tag-create or author-create tool: a human does those in the developer app at `/blog`, and editing a non-draft post returns `BlogPostPublishPermissionRequiredError`.

- Results carry the server's typed union in `structuredContent.result` (every member has `__typename`) plus one human-readable line. Write results (and `get_blog_post`) also carry `structuredContent.editorUrl`, `<developer app URL>/blog/<postId>`.
- `update_blog_post` **requires** `expectedUpdatedAt` (the `updatedAt` from your latest `get_blog_post`). On `BlogPostStaleWriteError` nothing was written: re-read with `get_blog_post`, then retry.
- The editor link origin is `OPENTHROTTLE_DEVELOPER_URL`, falling back to `APP_URL_DEVELOPER`, then `http://localhost:6020`. The stdio launcher does not read `.env` for it; set it in the MCP client `env` if your developer app is not on `:6020`.

## The creating workspace (`workspacePath`)

On the **stdio** transport the server captures its own working directory once at startup and sends
it to `create_plan` / `create_plans` as `workspacePath`, so a plan records the checkout it was
authored from and the developer UI's `02. Workspace` opens pre-selected instead of on the monorepo
root. Callers do not pass it.

Precedence, first match wins: a workspace already named in `runConfigJson` → an explicit
`workspacePath` argument (pass `""` to opt out) → the captured stdio cwd → nothing.

The path is a hint, never an authority. openthrottle-server resolves it against the **authenticated
caller's own** registered checkouts (realpath-normalized, matched on path-segment boundaries,
deepest containing checkout wins) and ignores anything it cannot own. It never fails plan creation.

- **`OPENTHROTTLE_MCP_WORKSPACE_PATH`** — overrides the captured cwd. Set it when your client
  launches the MCP server from a fixed directory rather than from the workspace you are working in.
- **Stdio only.** The HTTP / Nest-hosted surface runs inside openthrottle-server, where
  `process.cwd()` is the server's own directory; it sends no `workspacePath` at all. The capture is
  gated on `runServerLocal` rather than module load precisely so importing the shared tool handlers
  cannot pick up a bogus path.

## Agent conversation read tools

Three **read-only** MCP tools expose persisted **web chat** thread history from `agent_conversation_*` tables via GraphQL. They mirror the developer UI chat persistence layer — not Ralph iteration logs.

**Prerequisite:** Parent plan `4fa6d16c-a1d4-4aba-923c-52e35e3deb66` (Postgres tables, GraphQL CRUD, `agentsRunChatTurn`, developer UI resumable chat). **Write tools** (append/create/archive via MCP) are deferred until `AGENTS_CHAT_ALLOW_MUTATIONS` extends the policy.

### Boundary vs plan output stream

| Data                   | MCP tools                                                                              | Use for                                                                  |
| ---------------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `agent_conversation_*` | `agent_conversation_list`, `agent_conversation_get`, `agent_conversation_get_messages` | Developer UI web chat threads (`agentsRunChatTurn` with `persist: true`) |
| `plan_output_stream`   | `get_plan_output`, `append_plan_output`, `delete_plan_output`                          | Ralph / workflow iteration logs tied to a plan                           |

Each tool description ends with: _Web chat threads only — use `get_plan_output` for Ralph/plan iteration logs._

Do **not** use conversation tools for Ralph logs; do **not** expose `plan_output_stream` through conversation tools.

#### `delete_plan_output`

Removes chunks from a plan's `plan_output_stream` — used to clean up stale or
incorrect output (e.g. when resetting a plan back to `PENDING`). GraphQL-only:
it delegates to the `deletePlanOutput` mutation and never touches Postgres
directly. Returns `deletedCount`.

| Param     | Required | Semantics                                                                          |
| --------- | -------- | ---------------------------------------------------------------------------------- |
| `planId`  | yes      | Plan whose output is affected.                                                     |
| `chunkId` | no       | Delete this single chunk. It must belong to `planId`, else the call is rejected.   |
| `taskId`  | no       | Only when `chunkId` is omitted: scope the clear to chunks attributed to this task. |

- **Single chunk:** pass `chunkId` (+ `planId`) → deletes exactly that chunk.
- **Clear a plan:** omit `chunkId` → deletes every chunk for `planId`.
- **Clear a task's chunks:** omit `chunkId`, pass `taskId` → deletes that plan's chunks attributed to the task.

### Tool reference

| MCP tool                          | GraphQL                        | Purpose                                                         |
| --------------------------------- | ------------------------------ | --------------------------------------------------------------- |
| `agent_conversation_list`         | `listAgentConversations`       | List conversations for the authenticated human user             |
| `agent_conversation_get`          | `getAgentConversation`         | Fetch one conversation by `id` (null if not found or not owned) |
| `agent_conversation_get_messages` | `getAgentConversationMessages` | List messages for a conversation, ordered by `sort_order` ASC   |

Full contract (parameters, structuredContent shapes, errors): [docs/agent-conversation-read-tools-contract.md](docs/agent-conversation-read-tools-contract.md).

### Pagination and parameters

**List (`agent_conversation_list`):**

| Param    | Default    | Max   | Notes                      |
| -------- | ---------- | ----- | -------------------------- |
| `status` | `"active"` | —     | `"active"` \| `"archived"` |
| `limit`  | `20`       | `100` |                            |
| `offset` | `0`        | —     |                            |

**Messages (`agent_conversation_get_messages`):**

| Param            | Default  | Max   | Notes                             |
| ---------------- | -------- | ----- | --------------------------------- |
| `conversationId` | required | —     | Matches GraphQL field name        |
| `limit`          | `100`    | `500` |                                   |
| `offset`         | `0`      | —     | Server orders by `sort_order` ASC |

**Get (`agent_conversation_get`):** single param `id` (UUID) — matches GraphQL `getAgentConversation(id: ID!)`.

### Message payload (structuredContent)

`agent_conversation_get_messages` returns full GraphQL row mirrors in `structuredContent.messages`, including assistant routing metadata:

`id`, `conversationId`, `role`, `content`, `sortOrder`, `createdAt`, `routingConfidence`, `routingModel`, `routingReason`, `routingTier`, `toolMetadataJson`.

List/get conversation tools return conversation fields: `id`, `userId`, `title`, `status`, `planId`, `projectId`, `modelProvider`, `modelName`, `metadataJson`, `createdAt`, `updatedAt`.

### Auth

- **Human JWT** in `OPENTHROTTLE_MCP_AUTH_TOKEN` (see [AUTH.md](docs/AUTH.md) § Human JWT).
- Results are scoped to the authenticated user's rows (`user_id` match on server).
- Service account tokens (`ot_sa_…`) → **403** on all three tools.

### Verification

Smoke checklist (human JWT, persist fixture, boundary warning): [docs/verification-environment.md](docs/verification-environment.md) § Agent conversation read tools smoke.

### Related (not MCP scope)

- **New chat UX** (clear sessionStorage UUID, mint fresh conversation on next send): developer UI in `@openthrottle/react-router-chat` — plan task `3ff35e87`, not these MCP tools.
- **DB schema:** [databases/README.md](../../databases/README.md) § Agent conversations.
- **Server design:** [applications/openthrottle-server/docs/agent-conversations-design.md](../../applications/openthrottle-server/docs/agent-conversations-design.md).
