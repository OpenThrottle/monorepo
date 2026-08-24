# @openthrottle/react-router-ui-global — agent notes

The `Global*` app-shell layer shared by React Router apps: layout/sidebar/header, providers,
theme, error boundary + Rollbar client logging, metrics panel, WebGL `GradientMesh`, and the
shared per-row table Actions menu (`GlobalPopover`).

**Consumed by:** `openthrottle-developer`, `openthrottle-admin`, `openthrottle-email`,
`openthrottle-website`.

## Layout

- [src/index.ts](src/index.ts) — public API (`Global*` components, `config`, hooks).
- [src/components/GlobalProviders.tsx](src/components/GlobalProviders.tsx) — DnD + Sidebar + Tooltip + Chat providers; wires `useChatTurnFetcher` to the host app's root action (`/`).
- [src/components/GlobalErrorBoundary.tsx](src/components/GlobalErrorBoundary.tsx) + [src/utils/client-error-rollbar.ts](src/utils/client-error-rollbar.ts) — client error reporting.
- [src/components/GlobalPopover.tsx](src/components/GlobalPopover.tsx) — per-row Actions menu (`DropdownMenu` under the hood). Siblings: `GlobalPopoverActionItem`, `GlobalPopoverConfirmDialog`, `GlobalPopoverActionsHeader`.
- [src/data/data.copy.ts](src/data/data.copy.ts) — `GLOBAL_POPOVER_COPY` (Actions header + default confirm labels).
- [src/config/index.ts](src/config/index.ts) — metrics storage keys, poll-interval presets, `GLOBAL_METRICS_CHART_CONFIG`.
- [src/components/GradientMesh.tsx](src/components/GradientMesh.tsx) — `@paper-design/shaders-react` mesh; honors `usePrefersReducedMotion`.

## GlobalPopover (table row Actions)

- **Use for** per-row action columns with 2+ items, or when the row already links to detail and inline primary actions should collapse into one trigger.
- **Kinds:** `submit` (Form + optional `confirm` AlertDialog + `pending`/`pendingLabel`), `link` (`Link` + `to`), `select` (`onSelect`). Discriminated union — no enums, no casts. Use `separatorBefore` between groups.
- **Header:** always `GlobalPopoverActionsHeader` (not `header: () => 'Actions'` or custom padding).
- **Leave inline** when the row has exactly one action and no detail link.
- **Out of scope:** bulk/toolbar action bars.
- **Canonical call sites:** queues column (`kind: 'link' | 'select'`) and `RepositoryRowActions` (`kind: 'submit'` + confirm). Full API + copy-paste example: [README.md](README.md).
- **Convention rule:** [`.agents/rules/coding/frontend-design-openthrottle.mdc`](../../.agents/rules/coding/frontend-design-openthrottle.mdc) (table row Actions section).
- **Workbench / lint:** stories are shadcn-only; do not add a `GlobalPopover` story without expanding `openthrottle-workbench`. Do **not** add a DropdownMenu-in-tables ESLint ban yet (high false positives) — see README § Guarding against regression.

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
- Keep new public exports alphabetized in [src/index.ts](src/index.ts) and tagged `@public` for Knip.

## Pointers

- [README.md](README.md) — GlobalPopover API, queues example, when to stay inline.
- [../react-router-chat/AGENTS.md](../react-router-chat/AGENTS.md) — chat fetcher/root-action contract behind `GlobalProviders`.
- [../AGENTS.md](../AGENTS.md) — source-first pattern, no deep imports.
