# @openthrottle/react-router-chat

Reusable modal chat UI for React Router apps: dialog or sheet shell, scrollable message thread, composer, and Markdown rendering for assistant/system content via `@openthrottle/react-router-shadcn`.

## Installation

**In this monorepo:** add `"@openthrottle/react-router-chat": "workspace:*"` to the consuming package’s `package.json`, then run `pnpm install` from the repository root.

> [!Tip]
> This package is **private** to the workspace and is not published to a public registry.

**Peer dependencies** (provided by the host app): `react`, `react-dom`, `react-router`.

Import app styles once in the host app (same pattern as other `@openthrottle/react-router-*` packages):

```ts
import '@openthrottle/react-router-chat/src/index.css';
```

## Public API

| Export                                          | Description                                                                                     |
| ----------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `ChatDialog`                                    | Modal chat (`dialog` or `sheet`); controlled open via `open` / `onOpenChange`, or `defaultOpen` |
| `ChatThread`, `ChatComposer`, `ChatMessageBody` | Thread list, input, and role-aware body rendering                                               |
| `ChatProvider`, `useChat`                       | Optional context so `ChatDialog` can omit `messages` / `onSendMessage`                          |
| `useChatMessages`                               | Uncontrolled local message list (`sendUserMessage`, `appendMessage`, `setMessages`)             |
| `useChatTurnFetcher`                            | Local thread + root `send-agent-message` fetcher (optimistic user, assistant on idle)           |
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
  errorMessage: string | null;
  toolMetadataJson: string | null;
}
```

Host apps should expose a root action with `intent: send-agent-message` that returns `ChatTurnResult` JSON (see `openthrottle-developer` `handleSendAgentMessageIntent`).

## Dependencies

| Package                             | Role                                                      |
| ----------------------------------- | --------------------------------------------------------- |
| `@openthrottle/react-router-shadcn` | Dialog/Sheet, `TextArea`, `Markdown` for assistant bodies |
| `@openthrottle/react-router-ui`     | Shared OpenThrottle UI patterns                           |

## Nx targets

From the repo root:

```bash
pnpm nx run @openthrottle/react-router-chat:lint
pnpm nx run @openthrottle/react-router-chat:typecheck
pnpm nx run @openthrottle/react-router-chat:test
```
