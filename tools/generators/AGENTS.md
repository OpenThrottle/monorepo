# @tools/generators — agent notes

Local Nx plugin holding the five workspace generators (`folders`, `nestjs`, `package`, `react`, `react-router`) behind the repo's "generators first" rule. Usage (NX_ISOLATE_PLUGINS=false, `--describe`, `--list`, comma-separated `--name` batching) is documented in the [README](./README.md) and [docs/tools/templates/AGENT_USAGE.md](../../docs/tools/templates/AGENT_USAGE.md) — this file only covers changing the plugin itself.

**Consumed by:** the root `package.json` devDependency (`workspace:^`) which registers the plugin, and `@tools/workflows` (imports `getNxProjectNames` from the index).

## Commands

- `pnpm nx run @tools/generators:test` — Vitest over `generator.<sub>.test.ts` files (`createTreeWithEmptyWorkspace` from `@nx/devkit/testing`, assert on the in-memory tree) plus `src/generators/template-conventions.test.ts`.
- `build` (`@nx/js:tsc` → `dist/`, cache disabled) exists but is not needed to run generators — `generators.json` factories point at `./src/...` TypeScript, which is why every invocation needs `NX_ISOLATE_PLUGINS=false` (see [NX_ISOLATE_PLUGINS.md](../../docs/tools/templates/NX_ISOLATE_PLUGINS.md)).

## Layout

- `generators.json` — the plugin manifest: generator name → `factory` (`src/generators/<name>/generator`) + `schema.json`. New generators must be added here.
- `src/generators/<name>/generator.ts` — entry point; handles `--describe` / `--list` (machine-readable JSON, no writes) and dispatches `--subGenerator` to sibling `generator.<sub>.ts` files.
- `src/generators/<name>/files/<sub>/` — templates emitted via `@nx/devkit` `generateFiles`.
- `src/generators/package/files/{react,node,nestjs,tools}/` — full new-package scaffolds (`package.json`, tsconfigs, vite/vitest, eslint, `README.md`); these README templates define the repo-wide package README conventions. `files/common/LICENSE.md` is shared.
- `src/utils/` — shared prompt/validation/project-graph helpers (`questions.ts`, `projects.ts`, `validation.ts`, `regex.ts`).
- `src/generators/folders/CANONICAL_ROUTING_SUBTREE.md` — the routing-folder layout the `folders` generator emits.

## Template conventions

- File/dir name substitution uses `__name__` (e.g. `files/component/__name__.tsx`, `__tests__/__name__.test.tsx`); file contents use EJS `<%= name %>`. There is no `.template` suffix convention in this repo.
- Templates are never compiled or executed: `vitest.config.ts` adds `exclude: ['**/files/**']`. Type errors in templates surface only in generated output.
- `src/generators/template-conventions.test.ts` is the guard for that gap — it reads React/React Router test templates off disk and asserts repo testing rules (no `fireEvent`, no global `screen`, queries via the returned `component`, `userEvent` for interaction). Adding or changing an emitted `__tests__` template means updating its template lists.
- The React/React Router component templates carry the section-comment scaffold (`// Hooks`, `// Setup`, `// Handlers`, `// Markup`, `// Life Cycle`, `// 🔌 Short Circuit`). It is owned by `.agents/rules/coding/frontend-design-openthrottle.mdc` — keep it in templates even when sections are empty.

## Invariants & gotchas

- The plugin is registered via the root `package.json` devDependency, not `nx.json` `plugins` — `pnpm nx g @tools/generators:<name>` resolves through workspace node_modules. Renaming the package or `generators.json` breaks every doc/skill that scaffolds.
- Non-interactive is the contract: missing options must throw (`Missing required option: ...`), never silently prompt. `--interactive` opts in to `prompts`.
- Keep `schema.json`, the `--describe` JSON, and the generator's TS schema interface in sync when adding an option; `--generator` is reserved by Nx, so sub-generator selection stays `--subGenerator`.
- `src/index.ts` exports only `getNxProjectNames` (used by `@tools/workflows`); generators are reached through `generators.json`, not the package index.

## Pointers

- [README.md](./README.md) — invocation, `--describe` / `--list` catalog.
- [docs/tools/templates/](../../docs/tools/templates/) — `AGENT_USAGE.md`, `NX_ISOLATE_PLUGINS.md`, `TROUBLESHOOTING.md`, `RULES_TO_GENERATORS_MAP.md`, per-generator docs.
- `.agents/rules/personal-generators.mdc` — the generators-first policy this package backs.
