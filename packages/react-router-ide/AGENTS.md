# @openthrottle/react-router-ide — agent notes

Presentational, client-safe UI for the `@openthrottle/openthrottle-ide` code-intelligence engine: repository selector, workspace file palette, text/symbol/semantic search forms and result components. Components take already-serialized view-model props and emit callbacks — no data fetching here except the `useSymbolDetails` fetcher.

**Consumed by:** `openthrottle-developer` (IDE routes under `app/routing/ide/`).

## Layout

- [src/index.ts](src/index.ts) — public API surface (components, hooks, utils, view-model types).
- [src/data/view-models.ts](src/data/view-models.ts) — the serializable transport boundary: re-exports engine leaf types verbatim and owns the envelope DTOs loaders produce.
- [src/components/](src/components/) — one component per file; all built on `react-router-shadcn` primitives.
- [src/hooks/useSymbolDetails.tsx](src/hooks/useSymbolDetails.tsx) — the only fetcher (definition/references via a resource route); text search is GET → loader.
- [src/data/**tests**/engine-boundary.test.ts](src/data/__tests__/engine-boundary.test.ts) — scans every source file and fails on a value import from the engine.

## Invariants & gotchas

- Source-first, no build target (`__build`/`__build-package` placeholders) — see [packages/AGENTS.md](../AGENTS.md).
- **Engine boundary:** `@openthrottle/openthrottle-ide` is a server-only Node library (`@vscode/ripgrep`, `chokidar`, `ts-morph`). This package may reference it via **type-only** imports/exports (`import type` / `export type`) — a value import drags Node deps into the client bundle. Enforced twice: `@typescript-eslint/no-restricted-imports` with `allowTypeImports: true` in [eslint.config.ts](eslint.config.ts), plus the engine-boundary test above.
- This package has **no `*.server.ts` files** — the seam rests entirely on type-only imports. Runtime engine calls live in the consuming app's loader-side server module (`openthrottle-developer`'s `app/routing/ide/data/ide-engine.server.ts`, dynamically `import()`-ed), which maps engine results → the envelope DTOs here.
- No `ScrollArea` primitive is used on purpose (it doesn't exist in `react-router-shadcn` yet); bounded scroll uses cmdk `Command` lists or `overflow-auto`.
- Tests use [tests/setup.ts](tests/setup.ts) (`setupReactRouterTest` from `@openthrottle/react-router-testing`); no GraphQL codegen prerequisite.

## Don't

- Don't add value imports from the engine or move fetching into components — the loader/resource-route tiers in the README's data-flow contract are the design.

## Pointers

- [README.md](README.md) — "Server/client boundary (read this first)" and the data-flow contract table (which tier loads via loader vs fetcher vs resource route).
