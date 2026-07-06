# @openthrottle/react-router-chat — agent notes

Reusable modal chat UI (dialog/sheet shell, message thread, composer) for React Router apps.
Presentation + local message state only — no transport of its own.

**Consumed by:** `openthrottle-developer` (chat routes/hooks) and `@openthrottle/react-router-ui-global` (`GlobalProviders`, `GlobalLayoutHeader`).

## Layout

- [src/index.ts](src/index.ts) — public API surface; everything exported flows through here.
- [src/components/ChatDialog.tsx](src/components/ChatDialog.tsx) — top-level shell; controlled (`open`/`onOpenChange`) or uncontrolled (`defaultOpen`).
- [src/turn-events.ts](src/turn-events.ts) — canonical fold of backend stream chunks into `ChatTurnEvent`s; live streaming and persisted replay must both go through it.
- [src/hooks/useChatTurnFetcher.tsx](src/hooks/useChatTurnFetcher.tsx) — request/response fetcher; posts `intent: send-agent-message` / `load-agent-conversation-messages` to the host app's root action (`/` by default).
- [src/map-persisted-messages.ts](src/map-persisted-messages.ts) — persisted-conversation rows → `ChatMessage`s.

## Invariants & gotchas

- Source-first, no build target (`main` → `./src/index.ts`, `__build`/`__build-package` placeholders) — see [packages/AGENTS.md](../AGENTS.md).
- **XSS boundary:** assistant/system bodies are untrusted (LLM output, persisted history) and are deliberately rendered as escaped preformatted text — the shadcn `Markdown` component does no Markdown parsing. Swapping in a real renderer requires HTML disabled + an XSS regression test; read the README warning first.
- **No streaming here.** `ChatComposer`'s `isStreaming` is purely presentational (Send↔Stop swap); real streaming/cancellation lives in the host app (`openthrottle-developer`'s `useConversationStream.tsx`). `useChatTurnFetcher` appends the reply only when the fetcher goes idle.
- `useChatTurnFetcher` assumes the host app's root action handles both intents above; it also persists `conversationId` under localStorage key `openthrottle.chat.conversationId`.
- No GraphQL documents or `__generated__` in this package — tests need no codegen prerequisite.
- Tests use this package's own [vitest.setup.ts](vitest.setup.ts) (jsdom stubs for `ResizeObserver`, `scrollIntoView`, Pointer Capture — Radix needs them), not `@openthrottle/react-router-testing`'s app setup. [vitest.config.ts](vitest.config.ts) aliases this package and `@openthrottle/react-router-shadcn` to their `src/index.ts`.

## Pointers

- [README.md](README.md) — public API table, controlled vs uncontrolled patterns, minimal integration, root-action contract.
- [applications/openthrottle-server/docs/agent-conversations-design.md](../../applications/openthrottle-server/docs/agent-conversations-design.md) — server-side persist/pagination contract behind the fetcher intents.
