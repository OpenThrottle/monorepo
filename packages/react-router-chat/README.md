# @openthrottle/react-router-chat

Reusable modal chat UI for React Router apps: dialog or sheet shell, scrollable message thread, composer, and preformatted-text rendering for assistant/system content via `@openthrottle/react-router-shadcn`'s `Markdown`.

> [!Warning]
> **Assistant/system bodies are NOT rendered as Markdown — they are shown as escaped preformatted text.** `ChatMessageBody` passes the body to `@openthrottle/react-router-shadcn`'s `Markdown`, which currently emits the raw string inside `<pre>` (no Markdown parsing). The component name is aspirational.
>
> Assistant/system bodies originate from **untrusted sources** — server LLM output and persisted conversation history (see `src/map-persisted-messages.ts`). Before swapping in a real Markdown renderer you **must** keep raw HTML disabled. Mandatory requirements for any renderer change:
>
> - Use a renderer with HTML disabled by default (e.g. `react-markdown` **without** `rehype-raw`), or sanitize output with DOMPurify. Never enable raw HTML passthrough.
> - Add an XSS regression test asserting that an assistant body containing `<img src=x onerror=...>` / `<script>` does not execute or inject markup.
>
> The workspace already has a real renderer at `@openthrottle/react-router-markdown` (`MarkdownRenderer`); evaluate it against these requirements before reusing it here.

## Installation

**In this monorepo:** add `"@openthrottle/react-router-chat": "workspace:^"` to the consuming package’s `package.json`, then run `pnpm install` from the repository root.

> [!Tip]
> This package is **private** to the workspace and is not published to a public registry.

**Peer dependencies** (provided by the host app): `react`, `react-dom`, `react-router`.

Import app styles once in the host app (same pattern as other `@openthrottle/react-router-*` packages):

```ts
import '@openthrottle/react-router-chat/src/index.css';
```

> [!Note]
> **This package does not implement streaming or cancellation.** `ChatComposer`'s `isStreaming` prop is a purely presentational in-flight affordance: when `true` it swaps Send for a Stop button and blocks submit, but the package performs no token streaming and no real cancellation. Wiring an actual streaming transport and deciding what `onStop` cancels is the **host app's** responsibility (see `openthrottle-developer`'s `useConversationStream.tsx`). The turn fetcher (`useChatTurnFetcher`) is request/response — it appends the assistant reply once the fetcher returns idle, not incrementally.

## Public API

| Export                                          | Description                                                                                     |
| ----------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `ChatDialog`                                    | Modal chat (`dialog` or `sheet`); controlled open via `open` / `onOpenChange`, or `defaultOpen` |
| `ChatThread`, `ChatComposer`, `ChatMessageBody` | Thread list, input, and role-aware body rendering                                               |
| `ChatProvider`, `useChat`                       | Optional context so `ChatDialog` can omit `messages` / `onSendMessage` / `onStartNewChat`       |
| `useChatMessages`                               | Uncontrolled local message list (`sendUserMessage`, `appendMessage`, `setMessages`)             |
| `useChatTurnFetcher`                            | Local thread + root `send-agent-message` fetcher (`startNewChat` when persisted)                |
| `ChatMessage`, `ChatTurnResult`                 | Message model and JSON shape for server chat turns                                              |

### Controlled vs uncontrolled

- **Open state:** pass `open` + `onOpenChange` (controlled) or `defaultOpen` only (uncontrolled).
- **Messages:** pass `messages` + `onSendMessage` to `ChatDialog`, or wrap with `ChatProvider` and manage state in the parent.
- **Local thread:** `useChatMessages()` keeps messages in React state; use `sendUserMessage` for the user bubble and `appendMessage` for assistant replies.

## Minimal integration

App shell with root fetcher (`openthrottle-developer` uses `GlobalProviders`):

```tsx
import {
  ChatDialog,
  ChatProvider,
  useChatTurnFetcher,
} from '@openthrottle/react-router-chat';

export const GlobalProviders = ({ children }) => {
  const { composerDisabled, messages, sendUserMessage } = useChatTurnFetcher({
    action: '/',
  });

  return (
    <ChatProvider
      composerDisabled={composerDisabled}
      messages={messages}
      onSendMessage={sendUserMessage}
    >
      {children}
    </ChatProvider>
  );
};

// Any route:
export const Home = () => (
  <ChatDialog title="Assistant" triggerLabel="Ask OpenThrottle" />
);
```

### Server turn shape

Root actions that call `agentsRunChatTurn` should return JSON matching `ChatTurnResult`:

```ts
{
  assistantText: string | null;
  conversationId: string | null;
  errorMessage: string | null;
  mcpTool: string | null;
  readOnlyAgentsChat: boolean;
  routingConfidence: number | null;
  routingReason: string | null;
  structuredPayloadJson: string | null;
  toolMetadataJson: string | null;
}
```

Host apps should expose a root action with `intent: send-agent-message` that returns `ChatTurnResult` JSON (see `openthrottle-developer` `handleSendAgentMessageIntent`).

### Persisted conversations

When the host app authenticates users against openthrottle-server, enable server-backed thread history with `useChatTurnFetcher({ persist: true })`.

**v1 UX (locked):**

| Behavior         | Detail                                                                                                                             |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `persist: true`  | POST `persist=true` on each turn; server owns conversation ids                                                                     |
| `sessionStorage` | One thread per key (default `openthrottle.chat.conversationId`)                                                                    |
| First turn       | No client-minted id; server returns `conversationId` after persist                                                                 |
| Mount            | If a stored server UUID exists, load history via `load-agent-conversation-messages` (limit 100) and hydrate `useChatMessages`      |
| Optimistic UI    | User bubble on send; assistant appended when fetcher is idle                                                                       |
| New chat         | Header control when `persist: true` — clears `sessionStorage` UUID and in-memory thread; next send mints a new server conversation |

**Auth:** persistence requires a human JWT on the server. `persist: true` without auth returns an error from `agentsRunChatTurn`; the hook surfaces `errorMessage` and does not fall back to stateless mode.

**Host wiring (openthrottle-developer):**

```tsx
const { composerDisabled, messages, sendUserMessage, startNewChat } =
  useChatTurnFetcher({
    action: '/',
    persist: true, // when authenticated
  });

<ChatProvider
  composerDisabled={composerDisabled}
  messages={messages}
  onSendMessage={sendUserMessage}
  onStartNewChat={startNewChat}
>
  {children}
</ChatProvider>;
```

Root action handlers:

- `intent: send-agent-message` — forwards `persist` and optional `conversationId` to `agentsRunChatTurn`.
- `intent: load-agent-conversation-messages` — calls `getAgentConversationMessages` and maps rows via `mapPersistedAgentConversationMessages`.

Server design (GraphQL CRUD, `persist` contract, pagination): [applications/openthrottle-server/docs/agent-conversations-design.md](../../applications/openthrottle-server/docs/agent-conversations-design.md). Database schema: [databases/README.md](../../databases/README.md) § Agent conversations.

## Composer controls & capability descriptors

The composer toolbar can surface a **T3-Code-style** control cluster in addition
to the legacy flat `models` / `personas` selects. Every control is
**presentational and independently optional** — supply its props to render it,
omit them and the toolbar degrades to its previous shape. The package still
hardcodes **no data**: consumers supply options and own state.

| Primitive                   | Purpose                                                                               |
| --------------------------- | ------------------------------------------------------------------------------------- |
| `ChatModelPicker`           | Grouped, searchable model/CLI palette (provider rail, sub-labels, favorites, ⌘-hints) |
| `ChatReasoningTierControl`  | The `Low · Standard` dropdown — Reasoning + Service Tier sections                     |
| `ChatPermissionModeControl` | Supervised / Auto-accept edits / Full access, with lock icons + descriptions          |
| `ChatCheckoutSelector`      | Repository/checkout + branch affordance (shown when the backend requires a repo)      |

Every primitive is **controlled** — you pass the current value + an `onXChange`
callback and (where relevant) a `ChatBackendCapabilities` descriptor; the
component owns no state beyond its own open/closed popover. See each exported
`…Props` interface for the full JSDoc:

- `ChatModelPicker` — `groups`, `models`, `selectedModelId`, `onModelChange`, optional `onToggleFavorite`, `disabledModelIds` (capability gating).
- `ChatReasoningTierControl` — `capabilities`, `reasoning`/`onReasoningChange`, `serviceTier`/`onServiceTierChange`.
- `ChatPermissionModeControl` — `capabilities`, `permissionMode`/`onPermissionModeChange`.
- `ChatCheckoutSelector` — `checkouts`, `selectedCheckoutId`, `onCheckoutChange`.
- `ChatComposerToolbar` — composes all of the above via additive props (`modelGroups`, `capabilities`, `checkouts`, `reasoning`, `serviceTier`, `permissionMode`, …); omit them and it renders exactly as before.

Supporting types (`src/types.ts`, all `@public`):

- `ChatReasoningLevel` (`low` · `medium` · `high` · `extraHigh` · `max` · `ultra`), `ChatServiceTier` (`standard` · `fast`), `ChatPermissionMode` (`supervised` · `autoAcceptEdits` · `fullAccess`) — as-const objects (no TS enums).
- `ChatModelOption` gains additive `groupId` / `subLabel` / `favorite` / `shortcut`; `ChatModelGroup` (`id`, `label`, optional `icon`) describes a provider/CLI rail. The flat `{ id, label, description }` shape keeps working.
- `ChatBackendCapabilities` — `{ supportsModelFlag, reasoningLevels, serviceTiers, permissionModes, requiresRepository }` — one per backend; the toolbar gates which controls (and which options within them) render.

### Capability descriptors are derived from the driver registry (planned)

`ChatBackendCapabilities` is deliberately a **parallel, self-contained** contract
today. Consumers hand-seed one descriptor per discovered agent CLI /
OpenAI-compatible endpoint (in `openthrottle-developer`, from `loadAgentClis` /
`loadDiscoveredModels`).

Once **`@openthrottle/openthrottle-drivers`** (plan `dde67342`) lands, the driver
registry becomes the single source of truth for per-backend capability flags.
The reconciliation is a **pure mapping**, not a redesign: a small adapter reads
`DRIVER_IDS` + each driver's capability metadata (which reasoning levels /
service tiers / permission modes it honors, whether it takes a `--model` flag,
whether it needs a checkout) and produces a `ChatBackendCapabilities` per driver
id. The composer's props and the four presentational primitives are unchanged —
only the _source_ of the descriptor moves from hand-seeded consumer code to the
registry. This shape was chosen to make that swap a one-file change; until it
lands, neither plan blocks the other.

## Dependencies

| Package                             | Role                                                                          |
| ----------------------------------- | ----------------------------------------------------------------------------- |
| `@openthrottle/react-router-shadcn` | Dialog/Sheet, `TextArea`, `Markdown` (preformatted text) for assistant bodies |
| `@openthrottle/react-router-ui`     | Shared OpenThrottle UI patterns                                               |

## Nx targets

From the repo root:

```bash
pnpm nx run @openthrottle/react-router-chat:lint
pnpm nx run @openthrottle/react-router-chat:typecheck
pnpm nx run @openthrottle/react-router-chat:test
```
