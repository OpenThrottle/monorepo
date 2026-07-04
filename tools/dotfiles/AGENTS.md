# @tools/dotfiles — agent notes

Shared ESLint, Prettier, Vite, and Vitest configuration factories. Source-first with no `build` target (see [tools/AGENTS.md](../AGENTS.md)); consumers load `src/index.ts` directly.

**Consumed by:** effectively everything — the root `eslint.config.ts` and `.prettierrc.mjs`, plus the `eslint.config.ts` / `vite.config.ts` / `vitest.config.ts` of nearly every app and package. A change here re-lints/re-tests the whole workspace.

## Layout

- `src/index.ts` — the ESLint flat config plus all public re-exports (`eslintConfig`, `prettierConfig`, config factories).
- `src/vitest-config.ts` — `createVitestConfig`, `createVitestConfigJsdom`, `createVitestConfigHappyDom`, `createVitestConfigNode`.
- `src/vite-config.ts` — `createViteConfig`, `getDirname`.
- `src/prettier-config.ts` — the single source of truth for Prettier options; the root `.prettierrc.mjs` just re-exports it.
- `src/types.d.ts` — ambient `declare module` shims for ESLint plugins that ship no types (included via `tsconfig.lib.json`).

## Invariants & gotchas

- Internal relative imports carry explicit `.ts` extensions (`from './vite-config.ts'`); this is legal because root `tsconfig.base.json` sets `rewriteRelativeImportExtensions: true`. Keep the extensions — consumers transpile the TS source as-is.
- Inside this package use relative `./src/...` imports, never `@tools/dotfiles` — `@nx/enforce-module-boundaries` forbids self-reference by package name.
- Coverage is opt-in: the Vitest factories enable coverage only when `VITEST_COVERAGE=true` (or vitest's own `--coverage`). Don't make it always-on — that previously caused a flaky v8 tmp-file race on concurrent runs.
- `prettierConfig` pins YAML to single quotes via a `*.{yml,yaml}` override; keep that in sync with the `quote_type = single` entries in the root `.editorconfig`.

## Pointers

- [README.md](./README.md) — usage snippets and the full export list.
