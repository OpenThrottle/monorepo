# @openthrottle/react-router-chat — agent notes

Reusable modal chat UI (dialog/sheet shell, message thread, composer) for React Router apps.
Presentation + local message state only — no transport of its own.

**Consumed by:** `openthrottle-developer` (chat routes/hooks) and `@openthrottle/react-router-ui-global` (`GlobalProviders`, `GlobalLayoutHeader`).

## Layout

- [src/index.ts](src/index.ts) — public API surface; everything exported flows through here.
- [src/components/ChatDialog.tsx](src/components/ChatDialog.tsx) — top-level shell; controlled (`open`/`onOpenChange`) or uncontrolled (`defaultOpen`).
- [src/turn-events.ts](src/turn-events.ts) — canonical fold of backend stream chunks into `ChatTurnEvent`s; live streaming and persisted replay must both go through it. `applyTurnUsage` folds every `kind:'usage'` chunk into ONE accumulating usage event.
- [src/usage.ts](src/usage.ts) — pure, framework-free token-usage model: `ChatTokenUsage`, `normalizeUsage` (per-backend), `sumUsage`, `hasUsageCounts`, `formatTokenCount`, `formatUsageCost`.
- [src/components/ChatUsageCounter.tsx](src/components/ChatUsageCounter.tsx) / [src/components/ChatTurnUsageSummary.tsx](src/components/ChatTurnUsageSummary.tsx) — composer footer running counter and per-turn Badge+Tooltip breakdown.
- [src/hooks/useChatTurnFetcher.tsx](src/hooks/useChatTurnFetcher.tsx) — request/response fetcher; posts `intent: send-agent-message` / `load-agent-conversation-messages` to the host app's root action (`/` by default).
- [src/map-persisted-messages.ts](src/map-persisted-messages.ts) — persisted-conversation rows → `ChatMessage`s.

## Invariants & gotchas

- Source-first, no build target (`main` → `./src/index.ts`, `__build`/`__build-package` placeholders) — see [packages/AGENTS.md](../AGENTS.md).
- **XSS boundary:** assistant/system bodies are untrusted (LLM output, persisted history) and are deliberately rendered as escaped preformatted text — the shadcn `Markdown` component does no Markdown parsing. Swapping in a real renderer requires HTML disabled + an XSS regression test; read the README warning first.
- **No streaming here.** `ChatComposer`'s `isStreaming` is purely presentational (Send↔Stop swap); real streaming/cancellation lives in the host app (`openthrottle-developer`'s `useConversationStream.tsx`). `useChatTurnFetcher` appends the reply only when the fetcher goes idle.
- `useChatTurnFetcher` assumes the host app's root action handles both intents above; it also persists `conversationId` under localStorage key `openthrottle.chat.conversationId`.
- **Usage is best-effort + per-backend.** `normalizeUsage` never throws and returns `{}` for anything it can't read; an absent `ChatTokenUsage` field means "not reported", never `0`. Backends differ: claude/cursor ride usage on the terminal chunk, opencode reports per step mid-stream, openai may report nothing — all fold into one accumulating usage event. **Wire contract:** the server must re-emit a terminal chunk's `metadata` as a `kind:'usage'` chunk and persist it (see `openthrottle-server` `conversation-stream.service.ts`), or reloaded turns lose their counts. The composer counter is fed by the consumer via `sessionUsage` (package stays presentational).
- No GraphQL documents or `__generated__` in this package — tests need no codegen prerequisite.
- Tests use this package's own [vitest.setup.ts](vitest.setup.ts) (jsdom stubs for `ResizeObserver`, `scrollIntoView`, Pointer Capture — Radix needs them), not `@openthrottle/react-router-testing`'s app setup. [vitest.config.ts](vitest.config.ts) aliases this package and `@openthrottle/react-router-shadcn` to their `src/index.ts`.

## Pointers

- [README.md](README.md) — public API table, controlled vs uncontrolled patterns, minimal integration, root-action contract.
- [applications/openthrottle-server/docs/agent-conversations-design.md](../../applications/openthrottle-server/docs/agent-conversations-design.md) — server-side persist/pagination contract behind the fetcher intents.
