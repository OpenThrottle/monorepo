# @openthrottle/react-router-shadcn — agent notes

Shadcn-style component library (Radix primitives + Tailwind v4 + cva) and the shared CSS-variable
theme for all React Router apps. The base layer of the `react-router-*` UI stack.

**Consumed by:** `openthrottle-developer`, `openthrottle-email`, and 9 `react-router-*` packages
(`ui`, `ui-global`, `chat`, `ide`, `docs`, `notifications`, `profiling`, `scheduling`, `floor-layout`).

## Layout

- [src/index.ts](src/index.ts) — public API; every component/util must be re-exported here (main-entry-only imports).
- [src/components/](src/components/) — one PascalCase file per simple component (`Button.tsx`), a folder with `index` for composites (`Dialog/`, `Sidebar/`, `Chart/`, `Tabs/`).
- [src/index.css](src/index.css) + [src/theme.css](src/theme.css) — OKLCH CSS-variable theme; `package.json` `style` points at `src/index.css` (apps import the stylesheet).
- [src/utils/cn.ts](src/utils/cn.ts) — the `cn` merge helper every component uses.
- [components.json](components.json) — shadcn CLI/MCP config; aliases map to the `package.json` `imports` (`#components/*`, `#hooks/*`, `#utils/*`).

## Adding components

- `components.json` lets the shadcn CLI/MCP resolve into this package, but raw CLI output does not
  match the tree: house components are PascalCase (not `ui/kebab-case.tsx`), keep the section-comment
  scaffold, and follow the README conventions (user `className` as the trailing `cn` arg; cva variant
  sets inline unless shared/large; plain function components — React 19 `ref` prop, no new `forwardRef`).
  Adapt and rename CLI output, then export from `src/index.ts`.
- `Badge` `color` (fixed named-hue palette, public contract) vs `variant` (semantic theme tokens) is
  deliberate — never remap `color` to theme tokens. See [README.md](README.md) § Conventions.

## Invariants & gotchas

- Source-first, no build target (`__build`/`__build-package` placeholders) — see [packages/AGENTS.md](../AGENTS.md).
- **Charts under jsdom:** the test setup's `ResizeObserver` stub is a no-op, so recharts
  `ResponsiveContainer` never gets a size — no chart geometry, ticks, or axis labels render. And
  `ChartContainer` spreads extra props onto `ResponsiveContainer` (a recharts component, not a DOM
  element), so `data-testid` never reaches the DOM. Test pure logic (`chart-config.ts`) and static
  markup, not rendered ticks. Consumers wanting real geometry can pass `resizeObserverSize` to
  `@openthrottle/react-router-testing`'s `setupReactRouterTest`.
- Tests use this package's own [vitest.setup.ts](vitest.setup.ts) (jest-dom + ResizeObserver /
  matchMedia / scrollIntoView stubs), not `@openthrottle/react-router-testing`.
  [vitest.config.ts](vitest.config.ts) aliases `@openthrottle/react-router-shadcn` to `src/index.ts`,
  so tests import the public entry — an un-exported component fails its own test.
- Theme changes ripple to every app and UI package at once; tokens and dark-mode overrides are
  documented in [docs/Theming.md](docs/Theming.md).

## Pointers

- [README.md](README.md) — component list and the contribution conventions (cn/cva/ref/Badge).
- [docs/Theming.md](docs/Theming.md) — CSS-variable / OKLCH theming system.
- [../AGENTS.md](../AGENTS.md) — source-first pattern, no deep imports, `@publicApi`.
