# openthrottle-workbench

Storybook 10 host for **[@openthrottle/react-router-shadcn](../../packages/react-router-shadcn)** — browse the component library, exercise every `cva` variant, read generated API tables, and see the whole thing under any theme in the registry.

Before this existed, every visual check meant booting a consuming application.

## Run it

```bash
pnpm nx run openthrottle-workbench:dev
```

Storybook comes up on <http://localhost:6006>. `build` emits a static site to `storybook-static/`:

```bash
pnpm nx run openthrottle-workbench:build
```

Nothing deploys that build today — it exists so a later static deploy is a small follow-up rather than a new project.

## Stories live in the package, not in this app

**This is the one convention to get right.** The workbench owns no components and no stories. A story sits next to the component it documents:

```
packages/react-router-shadcn/src/components/Button.tsx
packages/react-router-shadcn/src/components/Button.stories.tsx        ← here

packages/react-router-shadcn/src/components/Card/Card.tsx
packages/react-router-shadcn/src/components/Card/Card.stories.tsx     ← and here
```

This app contributes only `.storybook/`, whose `stories` glob reaches into the package.

The precedent was already set before any story existed: `packages/react-router-shadcn/eslint.config.ts` exempts `**/*.stories.tsx` from the `openthrottle/component-primitive-shape` rule. A story is documentation, not a component — no section markers, no `forwardRef` signature, no paired `*Props` interface. See [component-shape-shadcn-variant.md](../../docs/monorepo/component-shape-shadcn-variant.md#scope).

## Add a story

Use the generator. It reads the component's `cva` map and emits typed option lists, `argTypes`, and a variant matrix:

```bash
NX_ISOLATE_PLUGINS=false pnpm nx g @tools/generators:react --subGenerator=story --destination=@openthrottle/react-router-shadcn --name=Accordion --no-interactive
```

`--name` takes a comma-separated list, so a whole batch is one command:

```bash
NX_ISOLATE_PLUGINS=false pnpm nx g @tools/generators:react --subGenerator=story --destination=@openthrottle/react-router-shadcn --name=Accordion,Collapsible,Separator --no-interactive
```

Output is meant to be usable as-is — it typechecks, lints, and renders without hand editing. If a batch shows a systematic gap, **fix the template**, not the emitted files:

- `tools/generators/src/generators/react/files/story/__name__.stories.tsx` — the template
- `tools/generators/src/utils/cva-variants.ts` — the `cva` source parser

### What the generator can't know

- **Variant maps that live on a child.** `Tabs` has no variants; `TabsList` does. The generator reads the named component only, so families like this need the matrix pointed at the right part by hand.
- **More than two variant groups.** The matrix grids the first two; the rest are reachable through controls. `Badge` (color × size × variant) is the live example.
- **Generic components.** `satisfies Meta<typeof DataTable>` collapses the type parameters to `unknown`. Name the instantiated type instead — see [DataTable.stories.tsx](../../packages/react-router-shadcn/src/components/DataTable.stories.tsx).
- **Composition.** Compound families (`Card`, `Dialog`, `Select`) should be shown assembled the way apps use them, not part by part.

## Themes

The toolbar has two independent axes — palette and light/dark — because every `Theme` in the registry carries both variants.

The palette list is built by mapping `THEMES` from [`themes/registry.ts`](../../packages/react-router-shadcn/src/themes/registry.ts), so **adding a theme there surfaces it in the toolbar with no change to this app**. The decorator applies a selection exactly the way a consuming app does: `buildThemeStylesheet(THEMES)` injected once into the head, then `data-theme` plus the `dark` class on `<html>` — mirroring `openthrottle-developer`'s `root.tsx`.

`@storybook/addon-themes` is deliberately not used: both of its decorators bind the same `theme` global, so the two axes collide.

One caveat, faithful to production: `Toaster` reads `next-themes`, and there is no `ThemeProvider` here — nor in the consuming apps. Its own light/dark therefore follows the OS while its surface tokens follow the toolbar. See [Sonner.stories.tsx](../../packages/react-router-shadcn/src/components/Sonner.stories.tsx).

## What this is not (v1)

Deliberately out of scope, each a candidate follow-up:

- **No interaction or browser tests.** No Storybook Vitest addon, no play functions.
- **No visual regression** or snapshot diffing.
- **No `@storybook/addon-a11y`.**
- **Not deployed.** Local dev only.
- **Scoped to `react-router-shadcn`.** Other `react-router-*` packages are not included.

## Notes

- Docgen is `react-docgen-typescript`, pointed at the package's `tsconfig.lib.json` with an explicit `include`. Both are required: the plugin intersects its own file glob (taken from this app's Vite root) with the tsconfig's files, so a component outside this app is skipped unless both are set.
- The prop filter excludes only `@types/react`, not all of `node_modules` — most of the package is thin Radix wrappers, and filtering everything strips the entire real API.
- Autodocs is on globally in `.storybook/preview.tsx`, so every component gets a generated API page.
