# @openthrottle/react-router-ui-global — agent notes

The `Global*` app-shell layer shared by React Router apps: layout/sidebar/header, providers,
theme, error boundary + Rollbar client logging, metrics panel, and the WebGL `GradientMesh`
background.

**Consumed by:** `openthrottle-developer`, `openthrottle-email`.

## Layout

- [src/index.ts](src/index.ts) — public API (`Global*` components, `config`, hooks).
- [src/components/GlobalProviders.tsx](src/components/GlobalProviders.tsx) — DnD + Sidebar + Tooltip + Chat providers; wires `useChatTurnFetcher` to the host app's root action (`/`).
- [src/components/GlobalErrorBoundary.tsx](src/components/GlobalErrorBoundary.tsx) + [src/utils/client-error-rollbar.ts](src/utils/client-error-rollbar.ts) — client error reporting.
- [src/config/index.ts](src/config/index.ts) — metrics storage keys, poll-interval presets, `GLOBAL_METRICS_CHART_CONFIG`.
- [src/components/GradientMesh.tsx](src/components/GradientMesh.tsx) — `@paper-design/shaders-react` mesh; honors `usePrefersReducedMotion`.

## Invariants & gotchas

- Source-first, no build target — see [packages/AGENTS.md](../AGENTS.md).
- **Two test-setup files exist; only one runs.** [vitest.config.ts](vitest.config.ts) points at
  [vitest.setup.ts](vitest.setup.ts) (hand-rolled `window.env` + jsdom shims);
  [tests/setup.ts](tests/setup.ts) calls `setupReactRouterTest` but is not wired into the config.
  Check the wiring before assuming the shared setup applies.
- `GlobalProviders` imports `react-dnd` / `react-dnd-html5-backend`, which are **not** declared in
  this package's `package.json` — they resolve through the consuming app (source-first transpile).
- `GlobalProviders` requires the host root action to handle the chat intents
  (`send-agent-message`, `load-agent-conversation-messages`) — the contract lives in
  [react-router-chat](../react-router-chat/AGENTS.md).
- `GradientMesh` is WebGL: it cannot read CSS variables (colors are concrete hex values), and
  jsdom suites in consumers need app-level WebGL stubs (openthrottle-developer keeps them in its
  own `tests/setup.ts`).
- `window.env` must be defined before importing `@openthrottle/react-router-utils` (it snapshots
  env at module load); the active setup file does this.
- [README.md](README.md) is still the generator stub (as is `package.json` `description`) — don't
  treat it as documentation.

## Pointers

- [../react-router-chat/AGENTS.md](../react-router-chat/AGENTS.md) — chat fetcher/root-action contract behind `GlobalProviders`.
- [../AGENTS.md](../AGENTS.md) — source-first pattern, no deep imports.
