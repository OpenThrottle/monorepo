# @openthrottle/openthrottle-mcp

Model Context Protocol (MCP) server for OpenThrottle: plans, tasks, and GraphQL-backed tools (no direct database access). Tools call `openthrottle-server` over GraphQL only.

For schema, embeddings, and local Postgres setup, see [databases/README.md](../../databases/README.md). Workspace-wide conventions: [AGENTS.md](../../AGENTS.md).

**Registering this server:** the canonical guide is [docs/openthrottle/mcp-registration.md](../../docs/openthrottle/mcp-registration.md) — tiers, config locations, the `.cursor/mcp.json.example` template, and editor parity. The package-specific launcher and env details below stay here.

**Cursor launcher:** [`scripts/run-openthrottle-mcp.sh`](../../scripts/run-openthrottle-mcp.sh) does not require a root **`OPENAI_API_KEY`**; configure **`OLLAMA_BASE_URL`** or **`OPENAI_API_KEY`** on **openthrottle-server** for semantic search. See [docs/verification-environment.md](docs/verification-environment.md) and [run-locally-oss.md](../../docs/openthrottle/run-locally-oss.md).

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

## Tools overview

| Category                                                      | MCP tools                                                                                                           | Auth                                       |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| Plans, tasks, notes, activity, output stream, semantic search | `create_plan`, `get_plan`, `list_plans_by_status`, `get_plan_output`, `append_plan_output`, `delete_plan_output`, … | Service account (recommended) or human JWT |
| Agent conversations (web chat threads)                        | `agent_conversation_list`, `agent_conversation_get`, `agent_conversation_get_messages`                              | **Human JWT only** (user-scoped)           |

GraphQL-only — no direct Postgres access. Prerequisite for conversation tools: v1 persistence from plan `4fa6d16c-a1d4-4aba-923c-52e35e3deb66` (`agent_conversations` / `agent_conversation_messages` tables, `agentsRunChatTurn` with `persist: true`).

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
