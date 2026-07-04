# packages/ — agent notes

Family-shared notes for everything under `packages/`. Per-project deltas live in each package's own `AGENTS.md`; monorepo-wide rules live in the root [AGENTS.md](../AGENTS.md) / [CLAUDE.md](../CLAUDE.md).

## Three families

- `nestjs-*` — NestJS server modules (auth, bullmq, graphql, typeorm, redis, repositories, …) consumed by `openthrottle-server`; typically `forRoot`/`forRootAsync`-style modules with a real `build` target shipping `dist/`.
- `react-router-*` — shared UI/client libraries (shadcn, ui, testing, utils, graphql, chat, ide, …) consumed **source-first** by the React Router apps; no `build` target by design.
- `openthrottle-*` — agentic/product libraries (agentic-ralph, workflows, mcp, ide, skills, notifications, developer-codegen, …); mixed build story — check each package, don't assume.
- A few one-offs sit outside those prefixes: `ai-mcp`, `graphql-codegen`, `nodejs-graphql`, `vscode-openthrottle`.

## Source-first vs built — how to tell

- The reliable discriminator is `nx.targets` in the package's `package.json`: `__build` / `__build-package` **placeholder keys** mean intentionally no build target (consumers' Vite/tsc compiles the source). A real `build` or `build-package` target means it ships `dist/`.
- `main`/`types` → `./src/index.ts` is **not** sufficient evidence of source-first: built `nestjs-*` packages also point `main` at src while `exports["."]` points at `./dist/src/index.js`.
- ~18 projects have no `build` target by design — full list in [CONTRIBUTING.md § Nx targets: projects without `build`](../CONTRIBUTING.md). Never add `build` to them; validate with `lint`/`typecheck`/`typecheck-tests`/`test`, then run `dev` or `build` on a consumer app (e.g. `openthrottle-developer`) as the integration check. `pnpm nx affected --target=build` will not schedule them.
- Packages that `openthrottle-server` imports must keep top-level `exports` → `dist` (not only `publishConfig`), or the Docker runtime fails with `ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING` on `src/*.ts`.

## Import and export rules

- No deep imports between workspace packages: consume via the main entry (`import { X } from '@openthrottle/foo'`) and re-export new symbols from the package's `index.ts`. Do not add subpath exports just to expose one symbol.
- Server/client boundary: Node-only engines (e.g. `openthrottle-ide`) are consumed by UI packages via type-only imports plus `*.server.ts` dynamic imports; never import Node-only packages into browser code.

## Gotchas

- `packages/openthrottle-postgres/` contains only a stray `dist/` — no `package.json`, not an Nx project. Don't model new packages on it.
- Some packages carry their own codegen targets (`codegen-graphql`, e.g. `openthrottle-mcp`, `openthrottle-workflows`); their `__generated__` output follows the root codegen flow — regenerate, never hand-edit.
