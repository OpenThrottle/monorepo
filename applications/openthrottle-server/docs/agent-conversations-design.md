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

| Mutation                       | Notes                                                                    |
| ------------------------------ | ------------------------------------------------------------------------ |
| `createAgentConversation`      | Optional explicit create; title may instead be set on first persist turn |
| `archiveAgentConversation`     | Sets `status=archived`; no hard delete in v1                             |
| `updateAgentConversationTitle` | Updates `title` on an owned conversation                                 |

## Frontend v1 (openthrottle-developer)

When the user is authenticated, the developer app passes `persist: true` on every chat turn and loads history on mount. See [packages/react-router-chat/README.md](../../../packages/react-router-chat/README.md) § Persisted conversations.

- **One thread per `sessionStorage` key** (`openthrottle.chat.conversationId` by default).
- Server-returned `conversationId` replaces any client-minted id after the first persisted turn.
- **New chat** control deferred to follow-up plan `fbe54bc3-1a97-49b4-ad40-e9f55edcabb1` (task `3ff35e87`).

## MCP read tools (deferred)

Listing or reading conversations via openthrottle-mcp is **out of scope for v1**. Follow-up plan `fbe54bc3-1a97-49b4-ad40-e9f55edcabb1` covers `list_conversations` / `get_conversation_messages` MCP tools.
