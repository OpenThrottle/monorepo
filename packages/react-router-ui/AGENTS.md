# @openthrottle/react-router-ui — agent notes

OpenThrottle-branded composite components and hooks (`OpenThrottle*` prefix) built on
`@openthrottle/react-router-shadcn` primitives: forms, layout, navigation, tabs, pagination,
tables, server-metrics hooks.

**Consumed by:** `openthrottle-developer`, `openthrottle-email`, `@openthrottle/react-router-chat`.

## Layout

- [src/index.ts](src/index.ts) — public API (components, `data/data.*.ts` copy, hooks).
- [src/components/](src/components/) — one `OpenThrottle*.tsx` per component.
- [src/hooks/](src/hooks/) — `useUrlSyncedTabValue`, `useDebouncedSearchParam`, `usePollServerMetrics`, audio/share hooks.
- [src/tabs/](src/tabs/) — internal shared tab API (`open-throttle-tabs.api.ts`, active-class helpers), not exported directly.
- [src/data/](src/data/) — hardcoded copy/marketing data (`data.taglines.ts`, `data.features.ts`, …) per the component/data boundary rule.

## Invariants & gotchas

- Source-first, no build target — see [packages/AGENTS.md](../AGENTS.md).
- **Two separate tab APIs — do not merge them.** Approach A (`OpenThrottleTabs` +
  `useUrlSyncedTabValue`) is controlled/URL-param tabs on one route; Approach B
  (`OpenThrottleTabsNav` + `OpenThrottleTabLink`) is link/route tabs (a `<nav>` of `NavLink`s, not
  a Radix `Tabs`). The README's decision table and import map are canonical; both reuse
  `tabsTriggerVariants` / `tabsListVariants` from shadcn for style parity.
- URL-synced state follows [docs/monorepo/url-first-ui-state.md](../../docs/monorepo/url-first-ui-state.md):
  feature-prefixed param names, delete the param when the default tab is active,
  `preventScrollReset` on param-only updates.
- [vitest.setup.ts](vitest.setup.ts) defines `window.env` **before** anything imports
  `@openthrottle/react-router-utils` — that package snapshots its env source at module load, so
  tests importing it without `window.env` set see an empty env. This package hand-rolls its setup;
  it does not use `@openthrottle/react-router-testing`.

## Pointers

- [README.md](README.md) — the full tabs guide (when to use which API, examples, `parse` validation).
- [../../docs/monorepo/url-first-ui-state.md](../../docs/monorepo/url-first-ui-state.md) — search-param conventions this package implements.
