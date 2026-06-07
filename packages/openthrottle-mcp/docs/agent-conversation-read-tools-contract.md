# Agent conversation MCP read tools — contract

Design contract for three read-only MCP tools in `@openthrottle/openthrottle-mcp` that expose persisted **web chat** thread history via GraphQL only. Implements plan `fbe54bc3-1a97-49b4-ad40-e9f55edcabb1` task `1572ea33` (parent GraphQL from plan `4fa6d16c-a1d4-4aba-923c-52e35e3deb66`).

**Status:** Locked for implementation (tasks `6c915d91`, `4961543e`, `84fd9eb8`).

## Boundary (grill-me 6A, Q10)

| Data store             | MCP tools                                                                              | Use for                                                                              |
| ---------------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `agent_conversation_*` | `agent_conversation_list`, `agent_conversation_get`, `agent_conversation_get_messages` | Developer UI web chat threads persisted via `agentsRunChatTurn` with `persist: true` |
| `plan_output_stream`   | `get_plan_output`, `append_plan_output`                                                | Ralph / workflow iteration logs tied to a plan                                       |

**Do not** expose `plan_output_stream` through conversation tools. **Do not** write agent conversations from MCP in v1 (no append/create/archive MCP tools unless `AGENTS_CHAT_ALLOW_MUTATIONS` extends later).

Each tool **description** must end with this inline boundary warning:

> Web chat threads only — use `get_plan_output` for Ralph/plan iteration logs.

## Auth (human JWT, user-scoped)

GraphQL queries call `assertHumanAuthPrincipal` and `settings:read`. **Service account tokens are rejected** (`403 Human authentication required`).

| Context                                        | Token source                                                                       |
| ---------------------------------------------- | ---------------------------------------------------------------------------------- |
| Cursor stdio MCP                               | Human JWT in `OPENTHROTTLE_MCP_AUTH_TOKEN` (see [AUTH.md](./AUTH.md) § Human JWT)  |
| Embedded in openthrottle-server / developer UI | Per-request JWT via `withMcpDeveloperAuthToken` / `withMcpDeveloperAuthTokenAsync` |

Results are always scoped to the authenticated human user's rows (`user_id` match on server).

## Tool naming (grill-me Q1, Q2)

All tools use the `agent_conversation_` prefix to disambiguate from plan/Ralph tools.

| MCP tool name                     | GraphQL operation              |
| --------------------------------- | ------------------------------ |
| `agent_conversation_list`         | `listAgentConversations`       |
| `agent_conversation_get`          | `getAgentConversation`         |
| `agent_conversation_get_messages` | `getAgentConversationMessages` |

Implementation files (follow-up tasks): `src/tools/agent-conversations.ts`, register in `run-server.ts`, `nest-tool-handlers.ts`, `nest/openthrottle-mcp-mcp-surface.ts`.

## Tool: `agent_conversation_list`

**Description (full string for registry):**

List persisted web chat conversations for the authenticated human user. Optional status filter (default `active`), limit, and offset. Web chat threads only — use `get_plan_output` for Ralph/plan iteration logs.

**Parameters (MCP args → GraphQL `ListAgentConversationsInput`):**

| MCP param | GraphQL field | Type   | Default    | Max                        |
| --------- | ------------- | ------ | ---------- | -------------------------- |
| `status`  | `status`      | string | `"active"` | — (`active` \| `archived`) |
| `limit`   | `limit`       | number | `20`       | `100`                      |
| `offset`  | `offset`      | number | `0`        | —                          |

Zod: reuse `ListAgentConversationsInputSchema()` from codegen; add `.max(100)` on `limit` at handler boundary if not enforced by schema.

**GraphQL call:**

```graphql
query listAgentConversations($input: ListAgentConversationsInput) {
  listAgentConversations(input: $input) {
    conversations {
      ...AgentConversationFields
    }
    totalCount
  }
}
```

**structuredContent:**

```ts
{
  conversations: AgentConversationObject[];
  totalCount: number;
}
```

**Conversation fields** (full GraphQL row mirror): `id`, `userId`, `title`, `status`, `planId`, `projectId`, `modelProvider`, `modelName`, `metadataJson`, `createdAt`, `updatedAt`.

**Empty result:** `{ conversations: [], totalCount: 0 }` with text summary (not an error).

**Errors:** Missing token → existing `getAuthToken` throw. Service account / non-human → GraphQL 403 surfaced via `runTool`. Invalid args → `invalidArgsContent`.

## Tool: `agent_conversation_get`

**Description (full string for registry):**

Fetch one persisted web chat conversation by id for the authenticated human user. Returns null when not found or not owned. Web chat threads only — use `get_plan_output` for Ralph/plan iteration logs.

**Parameters (grill-me Q9 — match GraphQL arg name):**

| MCP param | GraphQL                         | Type          | Required |
| --------- | ------------------------------- | ------------- | -------- |
| `id`      | `getAgentConversation(id: ID!)` | string (UUID) | yes      |

Zod: `z.object({ id: z.string().min(1) })` (same pattern as `get_plan`).

**GraphQL call:**

```graphql
query getAgentConversation($id: ID!) {
  getAgentConversation(id: $id) {
    ...AgentConversationFields
  }
}
```

**structuredContent:**

```ts
{
  conversation: AgentConversationObject | null;
}
```

**Not found:** GraphQL returns `null` → `{ conversation: null }` with explanatory text (not `isError`).

## Tool: `agent_conversation_get_messages`

**Description (full string for registry):**

List messages for an owned web chat conversation ordered by sort_order ascending. Optional limit and offset. Web chat threads only — use `get_plan_output` for Ralph/plan iteration logs.

**Parameters (grill-me Q9 — match GraphQL field names):**

| MCP param        | GraphQL field    | Type          | Default  | Max   |
| ---------------- | ---------------- | ------------- | -------- | ----- |
| `conversationId` | `conversationId` | string (UUID) | required | —     |
| `limit`          | `limit`          | number        | `100`    | `500` |
| `offset`         | `offset`         | number        | `0`      | —     |

Zod: reuse `GetAgentConversationMessagesInputSchema()` from codegen; add `.max(500)` on `limit` at handler boundary if needed.

**GraphQL call:**

```graphql
query getAgentConversationMessages($input: GetAgentConversationMessagesInput!) {
  getAgentConversationMessages(input: $input) {
    messages {
      ...AgentConversationMessageFields
    }
    totalCount
  }
}
```

**structuredContent:**

```ts
{
  messages: AgentConversationMessageObject[];
  totalCount: number;
}
```

**Message fields** (grill-me Q3 — full GraphQL row mirror): `id`, `conversationId`, `role`, `content`, `sortOrder`, `createdAt`, `routingConfidence`, `routingModel`, `routingReason`, `routingTier`, `toolMetadataJson`.

Ordering is enforced server-side (`sort_order ASC`); MCP does not accept a sort parameter.

**Empty result:** `{ messages: [], totalCount: 0 }` when conversation exists but has no messages, or when offset is past end.

**Not owned / missing conversation:** Server behavior for unauthorized conversation access should surface as GraphQL error or empty messages per service layer — handlers pass through via `runTool` without inventing rows.

## GraphQL documents and codegen (task `6c915d91`)

Add to `src/graphql/queries.graphql`:

- `listAgentConversations`
- `getAgentConversation`
- `getAgentConversationMessages`

Add fragments in `src/graphql/fragments.graphql`:

- `AgentConversation` — all fields listed above
- `AgentConversationMessage` — all fields listed above

Run:

```bash
pnpm nx run @openthrottle/openthrottle-mcp:codegen-graphql
```

No mutations in MCP scope for v1.

## Handler patterns (task `4961543e`)

Follow existing tools (`src/tools/plans.ts`, `src/tools/activity.ts`):

1. Export `*ToolParameters` (Zod), `*ToolDescription`, `*ToolHandler`.
2. Use `getAuthToken()` + `executeGraphqlWithAuth`.
3. Return `runTool` with `structuredContent` + human-readable `text` (JSON pretty-print for non-empty lists).
4. Register in `registerAgentConversationTools(server)` called from stdio bootstrap and Nest surface.

## Verification smoke (task `4961543e`)

Document in [verification-environment.md](./verification-environment.md):

1. Human JWT in `OPENTHROTTLE_MCP_AUTH_TOKEN` (service account must fail with 403).
2. Persist a turn via developer UI (`persist: true`) or GraphQL `agentsRunChatTurn`.
3. `agent_conversation_list` → includes conversation id.
4. `agent_conversation_get` with `id` → same row.
5. `agent_conversation_get_messages` with `conversationId` → user + assistant rows with routing fields on assistant.

## Related docs

- Server design: [applications/openthrottle-server/docs/agent-conversations-design.md](../../../applications/openthrottle-server/docs/agent-conversations-design.md)
- DB schema: [databases/README.md](../../../databases/README.md) § Agent conversations
- MCP auth: [AUTH.md](./AUTH.md)
- New chat UX (not MCP): plan task `3ff35e87`
