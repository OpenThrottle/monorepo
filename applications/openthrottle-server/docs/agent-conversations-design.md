# Agent conversations — data model and GraphQL API

Design for persisted web chat threads in OpenThrottle. Implements plan `4fa6d16c-a1d4-4aba-923c-52e35e3deb66`.

## Scope

- **Web chat only** — developer UI chat via `agentsRunChatTurn` and `@openthrottle/react-router-chat`.
- **Human JWT users only** for persistence and conversation CRUD. Service accounts receive an error when `persist: true`; they may still use stateless `agentsRunChatTurn`.
- **Backwards compatible:** `persist` omitted or `false` keeps prior stateless behavior (`conversationId` echoed for correlation only; no DB writes).
- **Separate from Ralph:** `plan_output_stream` remains the store for Ralph iteration logs. Do not write Ralph output to agent conversations.

## Persistence

Migration: `databases/migrations/051_create_agent_conversations_tables.sql`

TypeORM: `packages/nestjs-repositories/src/modules/agent-conversations/`

GraphQL module: `applications/openthrottle-server/src/graphql/agent-conversations/`

Persistence helpers for chat turns: `applications/openthrottle-server/src/graphql/agents/agents-chat-persistence.ts`

See [databases/README.md](../../../databases/README.md) § Agent conversations for FK rules, lifecycle, size caps, and the boundary vs `plan_output_stream`.

## `agentsRunChatTurn` — `persist` flag

Input field on `AgentsRunChatTurnInput`:

| `persist`         | Principal                       | Behavior                                                               |
| ----------------- | ------------------------------- | ---------------------------------------------------------------------- |
| omitted / `false` | any                             | Stateless: echo `conversationId` from input (or null); no DB writes    |
| `true`            | human JWT user                  | Persist turn after successful MCP response                             |
| `true`            | service account or missing user | `errorMessage`: _Authentication required for persisted conversations._ |

When `persist: true` and authenticated:

1. **`conversationId` omitted** — mint a new conversation; auto-title from user message (~80 chars).
2. **`conversationId` provided** — validate the row exists and `user_id` matches caller; otherwise return _Agent conversation not found._ (no silent fallback to stateless).
3. **After successful turn** — append user + assistant messages in one transaction (consecutive `sort_order`), store denormalized routing + capped `tool_metadata` on the assistant row, update `model_provider` / `model_name` on the conversation when the router LLM ran.
4. **MCP error turn** — no message rows appended.

Response always includes `conversationId` (persisted id when `persist: true`, otherwise the echo id).

## GraphQL CRUD (human JWT only)

All queries and mutations call `assertHumanAuthPrincipal` — service accounts are rejected.

Permissions: `settings:read` for queries, `settings:write` for mutations.

### Queries

| Operation                      | Defaults                                             | Max         |
| ------------------------------ | ---------------------------------------------------- | ----------- |
| `listAgentConversations`       | `status=active`, `limit=20`, `offset=0`              | `limit` 100 |
| `getAgentConversation`         | —                                                    | —           |
| `getAgentConversationMessages` | `limit=100`, `offset=0`, ordered by `sort_order ASC` | `limit` 500 |

### Mutations

| Mutation                       | Notes                                                                                                                                                                                       |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `createAgentConversation`      | Optional explicit create; title may instead be set on first persist turn                                                                                                                    |
| `archiveAgentConversation`     | Sets `status=archived` (a user-visible "put away" state)                                                                                                                                    |
| `deleteAgentConversation`      | Soft-delete: sets `status=deleted`; row + messages retained, hidden from the default list (reversible; a later purge job may hard-delete). Distinct from archive. Added by plan `16c97e11`. |
| `updateAgentConversationTitle` | Updates `title` on an owned conversation (also backs inline rename)                                                                                                                         |

### Lifecycle (`status`)

`active` (default) → `archived` (put away, still user-visible) or `deleted`
(soft-delete, hidden from the default list, reversible). Migration
`081_add_deleted_status_to_agent_conversations.sql` widened the
`agent_conversations_status_check` CHECK to `('active','archived','deleted')`.
`listConversationsForUser` filters to a single status (default `active`), so
both archived and deleted are excluded from the default list.

## `startConversationStream` — `persist` flag (Private mode)

The streaming turn surface (`conversation-stream/`, used by the agentic chat in
both apps) also takes a `persist` flag (nullable; default `true`):

| `persist`        | Behavior                                                                                           |
| ---------------- | -------------------------------------------------------------------------------------------------- |
| omitted / `true` | Persisted turn as before: resolve-or-create the conversation row, write user + assistant messages. |
| `false`          | **Private mode** — ephemeral: NO conversation row is created and NO messages are written.          |

In Private mode the resolver mints a synthetic `randomUUID()` conversation id
(never persisted), skips the user-message append + history load (single-turn
context), and CLI backends run a fresh, non-resumed session (no metadata
read/write). The synthetic id still drives the `conversation:<id>:stream` topic

- `cancelConversationStream`; the stream service registers it in an in-memory
  `ephemeralOwners` map so the `conversationStreamChunkAdded` subscription can
  authorize the owner without a DB row (the synthetic id is an unguessable UUID
  handed only to its owner). Added by plan `16c97e11`.

## Idle-timeout backstop + retryable terminal chunk (plan `039454a0`)

`ConversationStreamService.runStream()` wraps the backend stream in a per-chunk
idle timer (`withIdleTimeout`) so a wedged backend — including the otherwise
unbounded HTTP/openai one, even if it ignores its `AbortSignal` — always
terminates the turn instead of hanging the loop and leaving the client stuck.

- **Knob:** `resolveChatIdleTimeoutMs()` (env `OPENTHROTTLE_CHAT_IDLE_TIMEOUT_MS`;
  default = `resolveAgentTimeouts().idleMs` + `30_000` margin = **`150_000` ms**).
  Idle-only — no orchestrator wall-clock cap; the 30s margin keeps the backstop
  above the CLI/HTTP idle (120s) so their own cleaner terminal wins first.
- **On expiry:** abort the backend, persist whatever streamed (partial output is
  kept), and publish a terminal `done` chunk carrying a clear message +
  `metadataJson = { retryable: true, timedOut: true }`.
- **Client recovery:** the shared reducer surfaces the marker as
  `StreamState.retryableIds`; `useAgenticChatTurn` auto-retries the turn **once**
  (a client stall watchdog covers a silently-dead subscription), then exposes a
  manual **Retry** affordance. Private-mode turns emit the terminal chunk and
  recover identically (the publish path is independent of `persist`).

## Frontend v1 (openthrottle-developer)

When the user is authenticated, the developer app passes `persist: true` on every chat turn and loads history on mount. See [packages/react-router-chat/README.md](../../../packages/react-router-chat/README.md) § Persisted conversations.

- **One thread per `sessionStorage` key** (`openthrottle.chat.conversationId` by default).
- Server-returned `conversationId` replaces any client-minted id after the first persisted turn.

### Conversations sidebar + persist toggle (plan `16c97e11`)

Both openthrottle-developer and openthrottle-admin surface the persistence
backbone in the UI, on both surfaces (the home-route chat and the global header
`ChatDialog`):

- **Persist toggle** — a `Switch` in `ChatComposerToolbar` (Saved / Private);
  OFF sends `persist=false` for a Private-mode turn. Stored in the
  `chatToolbarStateAtom` (`react-router-chat-state`), namespaced per app via its
  `${APP_NAME}:chat:toolbar` storage key so developer vs admin never bleed.
- **Conversations switcher** — `ChatConversationSidebar` (`react-router-chat`):
  paginated list, restore-on-click, inline rename (`updateAgentConversationTitle`),
  soft-delete (`deleteAgentConversation`), and New chat. Mounted as a left rail on
  the developer home route and inside a header-`ChatDialog` popover on both apps.
- Data ops post to a route-independent `/resources/agent-conversations` action
  (list / load-messages / rename / delete), reachable from every chat surface.
- The shared `useAgenticChatTurn` gained `restore({conversationId})` (hydrates a
  thread) + `reset()` (New chat).

## MCP read tools (deferred)

Listing or reading conversations via openthrottle-mcp is **out of scope for v1**. Follow-up plan `fbe54bc3-1a97-49b4-ad40-e9f55edcabb1` covers `list_conversations` / `get_conversation_messages` MCP tools.
