# packages/ — agent notes

Family-shared notes for everything under `packages/`. Per-project deltas live in each package's own `AGENTS.md`; monorepo-wide rules live in the root [AGENTS.md](../AGENTS.md) / [CLAUDE.md](../CLAUDE.md).

## Three families

- `nestjs-*` — NestJS server modules (auth, bullmq, graphql, typeorm, redis, repositories, …) consumed by `openthrottle-server`; typically `forRoot`/`forRootAsync`-style modules with a real `build` target shipping `dist/`.
- `react-router-*` — shared UI/client libraries (shadcn, ui, testing, utils, graphql, chat, ide, …) consumed **source-first** by the React Router apps; no `build` target by design.
- `openthrottle-*` — agentic/product libraries (agentic-ralph, workflows, mcp, ide, skills, notifications, developer-codegen, showroom, …); mixed build story — check each package, don't assume. `openthrottle-showroom` is the @OpenThrottleAI screencast pipeline: typed episode scripts, demo flows, Playwright capture, narration, ffmpeg assembly and a pre-publish leak scan.
- A few one-offs sit outside those prefixes: `graphql-codegen`, `node-client`, `nodejs-graphql`.

## Source-first vs built — how to tell

- The reliable discriminator is `nx.targets` in the package's `package.json`: `__build` / `__build-package` **placeholder keys** mean intentionally no build target (consumers' Vite/tsc compiles the source). A real `build` or `build-package` target means it ships `dist/`.
- `main`/`types` → `./src/index.ts` is **not** sufficient evidence of source-first: built `nestjs-*` packages also point `main` at src while `exports["."]` points at `./dist/src/index.js`.
- A sizable set of projects has no `build` target by design — see [MONOREPO.md § Projects without a `build` target](../MONOREPO.md#projects-without-a-build-target). **Do not audit that set by diffing `pnpm nx show projects` against `--with-target=build`:** Nx _infers_ a `build` target from a package's `vite.config.ts`, so source-first packages like `nodejs-utils` and `openthrottle-showroom` appear in that list too. Grep for the `__build` placeholder in `package.json` instead — that is the discriminator named above. Never add `build` to them; validate with `lint`/`typecheck`/`test`, then run `dev` or `build` on a consumer app (e.g. `openthrottle-developer`) as the integration check. `pnpm nx affected --target=build` will not schedule them.
- Packages that `openthrottle-server` imports must keep top-level `exports` → `dist` (not only `publishConfig`), or the Docker runtime fails with `ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING` on `src/*.ts`.

## Import and export rules

- No deep imports between workspace packages: consume via the main entry (`import { X } from '@openthrottle/foo'`) and re-export new symbols from the package's `index.ts`. Do not add subpath exports just to expose one symbol.
- **Server/client boundary — nothing but `check-client-boundary` catches a violation.** A `node:*` import anywhere on a client module's import graph ships a Vite stub that throws on page load; `typecheck`, `lint` and `build` all pass regardless. The `check-client-boundary` Nx target on the four React Router apps reads their `build/client` output and is the only gate that sees it. Escape hatches, all three already used here: move the code server-side (how `expandHome` was fixed — it now lives in `applications/openthrottle-server/src/services/paths/`), `import type` (erased at compile time), or a `*.server.ts` module (never bundled for the browser).
  - **A package's name is not a signal.** `nodejs-utils` sounds server-only and is imported by browser code — one `node:os` import in its barrel reached all eight client modules importing `isRecord` from it. Barrels amplify: anything behind `index.ts` reaches every client consumer of that package.
  - Node-only engines (e.g. `openthrottle-ide`, `openthrottle-agentic-utils`, `openthrottle-skills`) stay fine as-is — they are reached only through type-only imports and `*.server.ts` dynamic imports. Full rule: [.agents/rules/coding/client-node-boundary.mdc](../.agents/rules/coding/client-node-boundary.mdc).

## Gotchas

- `packages/openthrottle-postgres/` contains only a stray `dist/` — no `package.json`, not an Nx project. Don't model new packages on it.
- Some packages carry their own codegen targets (`codegen-graphql`, e.g. `openthrottle-mcp`, `openthrottle-agentic-ralph`); their `__generated__` output follows the root codegen flow — regenerate, never hand-edit.
