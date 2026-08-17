# openthrottle-workbench — agent notes

Storybook 10 host for `@openthrottle/react-router-shadcn`. Owns **no components and no
stories** — only `.storybook/`. Plain React + Vite via `@storybook/react-vite`; the shadcn
package is router-free, so there is no React Router framework here.

**Consumed by:** nothing — a local dev tool. Not deployed in v1.

## Commands

- `pnpm nx run openthrottle-workbench:dev` — Storybook on <http://localhost:6006>.
- `pnpm nx run openthrottle-workbench:build` — static site to `storybook-static/` (gitignored,
  declared as the Nx output so it caches). Nothing consumes it yet.

## Layout

- `.storybook/main.ts` — framework, stories glob, Tailwind via `viteFinal`, docgen wiring.
- `.storybook/preview.tsx` — theme toolbar (`globalTypes` + decorator), global autodocs.
- `.storybook/preview.css` — Tailwind and the package theme, in the order `index.css` requires.

Stories live in `packages/react-router-shadcn/src/components/`, beside the component they
document. See [README.md](./README.md).

## Invariants & gotchas

- **No `tsconfig.lib.json`.** `tools/nx-plugins/package-typecheck.ts` globs
  `{applications,packages,tools}/*/tsconfig.{lib,app}.json` and would infer an
  `emitDeclarationOnly` typecheck — wrong for an app. `typecheck` is hand-declared as
  `tsc --noEmit -p tsconfig.json`.
- **No `@nx/storybook`.** Targets here are hand-declared in `package.json` `nx.targets`
  against `nx.json` `targetDefaults`, like everything else in this repo.
- **No `^build` edge on the shadcn package.** Because these targets declare their own
  `executor`, the name-keyed `build` targetDefault's `@nx/vite:build` options and `dependsOn`
  are both skipped. That is correct — the package is source-first and Vite consumes its `src`
  directly. Do not add a `build` target to `react-router-shadcn`.
- **Docgen needs BOTH `tsconfigPath` and `include`.** The plugin intersects a glob taken from
  this app's Vite root with the tsconfig's file list, so components outside this app are
  silently skipped ("not included in the active TypeScript project") unless both are set.
  Setting only `tsconfigPath` — the obvious fix — does nothing.
- **The prop filter excludes only `@types/react`/`@types/react-dom`**, not all of
  `node_modules`. Most of the package is thin Radix wrappers whose props come from
  `ComponentPropsWithoutRef<typeof Primitive.Root>`; the usual `!/node_modules/` recipe throws
  away the entire real API (Tabs documented one prop before this was narrowed).
- **Recharts charts look empty when inspected through an automated browser — that is the
  tooling, not a bug.** Recharts animates chart _geometry_ from `t=0` and only advances it from
  a `requestAnimationFrame` loop (`animation/JavascriptAnimate.js` →
  `RequestAnimationFrameTimeoutController`). Browsers never fire rAF in a hidden tab, and
  `document.visibilityState === 'hidden'` is the normal state for headless/background browser
  tools. Pinned at `t=0`, recharts' `Rectangle` and `Sector` have zero size and return `null`,
  so `SimpleBarChart` emits `.recharts-bar-rectangle` groups containing an empty
  `.recharts-inactive-bar` and no `rect`/`path`, and `.recharts-pie` is an empty layer.
  **Do not "fix" the components for this** — do not add `isAnimationActive={false}` and do not
  pin recharts. They render correctly in any visible browser.
  - **Counting DOM nodes is not a valid check here.** Line and Area _do_ emit their paths at
    `t=0`, but draw nothing: the curve carries `stroke-dasharray="0px <fullLength>px"`, so it
    is invisible while `querySelectorAll('.recharts-line-curve').length` still reports `1`.
    Judging by selector counts is what made an earlier investigation conclude Line/Area were
    unaffected when they were equally starved. **Screenshot instead.**
  - To inspect charts through automation, shim rAF onto a timer before mount
    (`window.requestAnimationFrame = (cb) => setTimeout(() => cb(performance.now()), 16)`) or
    set `isAnimationActive={false}` in a throwaway story. Keep both out of committed code.
- **`cva()` exposes nothing at runtime.** Its returned function has no `.variants`, so story
  option lists cannot be derived by importing a component — they are parsed from source by the
  generator (`tools/generators/src/utils/cva-variants.ts`) or declared by hand.
- **`@storybook/addon-themes` is intentionally absent** — both of its decorators bind the same
  `theme` global, so the palette and light/dark axes collide.
- Stories are excluded from the package's `tsconfig.lib.json` (they must not reach its emitted
  declarations) and included in `tsconfig.test.json` so they are still type-checked.
- Knip: stories are declared as `entry` in `knip.jsonc`, never ignored.

## Pointers

- [README.md](./README.md) — running it, where stories live, the generator command, themes.
- [docs/monorepo/component-shape-shadcn-variant.md](../../docs/monorepo/component-shape-shadcn-variant.md) — why stories are exempt from the component shape.
