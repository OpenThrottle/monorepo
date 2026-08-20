# @openthrottle/react-router-chat-state — agent notes

Persisted chat-toolbar state, derive-only reconciliation, and the header-chat
controller shared by the React Router apps. Sits _above_
`@openthrottle/react-router-chat` (which stays presentational) and below the apps.

**Consumed by:** `openthrottle-developer` and `openthrottle-admin`.

## Layout

- [src/index.ts](src/index.ts) — public API surface; every export flows through here.
- [src/data/atom.chat-toolbar.ts](src/data/atom.chat-toolbar.ts) — `chatToolbarStateAtom` (localStorage-backed Jotai atom), `ChatToolbarState`, `CHAT_TOOLBAR_STATE_VERSION`, and `normalizeChatToolbarState`.
- [src/utils/chat-toolbar-reconcile.ts](src/utils/chat-toolbar-reconcile.ts) — pure reconciliation of a persisted blob against current loader options + backend capabilities.
- [src/utils/chat-toolbar-decay.ts](src/utils/chat-toolbar-decay.ts) + [src/hooks/useSessionPermissionDecay.tsx](src/hooks/useSessionPermissionDecay.tsx) — per-session safety decay of elevated permission modes.
- [src/hooks/useHeaderChatController.tsx](src/hooks/useHeaderChatController.tsx) — the one stateful export; wires the atom, reconcile, decay, and the shared turn hook together for the header chat.
- [src/config/chat-capabilities.ts](src/config/chat-capabilities.ts), [src/utils/chat-model-option.ts](src/utils/chat-model-option.ts), [src/utils/chat-discovery-options.ts](src/utils/chat-discovery-options.ts) — per-backend capability descriptors, model-id decode / grouping, discovery mappers.
- [src/components/](src/components/) — provider brand glyphs for the model-picker rail only. Not general-purpose UI; anything reusable belongs in `@openthrottle/react-router-shadcn`.

## Invariants & gotchas

- Source-first, no build target (`main` → `./src/index.ts`, `__build` / `__build-package` placeholders) — see [packages/AGENTS.md](../AGENTS.md).
- **Bump `CHAT_TOOLBAR_STATE_VERSION` whenever `ChatToolbarState` changes shape**, and teach `normalizeChatToolbarState` to migrate the old blob forward. Migration preserves still-valid picks rather than wiping them; an unknown/newer version degrades to `DEFAULT_CHAT_TOOLBAR_STATE`. Skipping the bump silently feeds stale-shaped JSON to the reconciler.
- **The storage key is runtime-derived**: `` `${APP_NAME}:chat:toolbar` `` reads `APP_NAME` from `window.env` / `process.env`, so one atom module namespaces developer vs admin automatically. Do not hardcode an app name, and do not assume the key is stable at import time in tests.
- **`reconcileChatToolbarState` must stay pure and derive-only** — no atom writes, no fetches, no side effects. It answers "given this persisted blob and these current options, what is selected?" and nothing else. `persist` is deliberately never capability-gated (every backend can run persisted or Private); it passes through untouched.
- **`perBackend` falls back to the top-level global.** An absent per-backend field means "use the global", not "unset" — see the reconciler before adding a field to `ChatToolbarBackendPrefs`.
- **Permission-mode decay is a safety boundary.** `autoAcceptEdits` and `fullAccess` must not survive a browser session; `supervised` intentionally never decays. Adding a permission mode means deciding explicitly whether it is elevated.
- No GraphQL documents or `__generated__` here — tests need no codegen prerequisite. The header controller takes a host-injected `GraphqlWsClient` + subscription document instead of owning transport.
- Tests use this package's own [vitest.setup.ts](vitest.setup.ts) — jsdom exists only so the atom has `localStorage`; there are deliberately **no** Radix/`ResizeObserver` stubs, because this package is state/logic, not rendering. [vitest.config.ts](vitest.config.ts) aliases `react-router-chat` and `react-router-utils` to their `src/index.ts`.

## Pointers

- [README.md](README.md) — public API table, persistence/versioning contract, the `persist` (v3) Saved/Private semantics.
- [packages/react-router-chat/AGENTS.md](../react-router-chat/AGENTS.md) — the presentational layer this package drives, including the retryable-timeout and usage contracts.
