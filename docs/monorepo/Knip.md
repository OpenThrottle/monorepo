# Knip (dead code / unused exports)

Knip finds unused files, dependencies, and exports across the monorepo. Configuration lives in **`knip.jsonc`** at the repo root (used by Nx `monorepo:knip` via `--config knip.jsonc`). In CI, Knip is a **P3** gate with a committed baseline — see [CI-quality-gates.md](./CI-quality-gates.md).

## Prerequisites: build `@tools/dotfiles` first

Many workspace **`vite.config.ts`**, **`vitest.config.ts`**, and **`eslint.config.ts`** files import **`@tools/dotfiles`**. That package’s **`package.json` → `exports`** resolve runtime imports to **`dist/`** (see [tools/dotfiles/README.md](../../tools/dotfiles/README.md)). If **`tools/dotfiles/dist`** is missing, Knip fails while loading those configs—for example:

```text
Cannot find module '.../node_modules/@tools/dotfiles/dist/src/index.js'
```

**Before** `pnpm nx run monorepo:knip` or `pnpm nx run monorepo:knip-ci`, build dotfiles:

```bash
pnpm nx run @tools/dotfiles:build
pnpm nx run monorepo:knip
```

Nx **`test`** targets already **`dependsOn: ["@tools/dotfiles:build"]`** in `nx.json`; the shared **`knip`** target does not—run the build explicitly on a clean checkout or when `dist/` was removed. CI and local flows that already built dotfiles earlier in the same session may not need a second build.

## Safe workflow (report vs fix)

| Goal                         | Command                                            | Notes                                                                                                                              |
| ---------------------------- | -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| **Report only (default)**    | `pnpm nx run monorepo:knip`                        | Use for CI, PR review, and agents. No source rewrites.                                                                             |
| **Do not use on app UI**     | `knip --fix`, `knip --fix-type exports`            | Removes `export` from unused symbols—including intentional **`export interface FooProps`** / **`export type`** next to components. |
| **Optional, human-reviewed** | `knip --config knip.jsonc --fix-type dependencies` | May edit `package.json`; run only after reading the diff. Never combine with `exports` fix on the same pass without review.        |

**Intentional `export` on Props:** Generators and our component conventions export `*Props` / `*Options` types for consumers, Storybook, and consistency even when nothing imports them externally. That is expected. Root **`ignoreExportsUsedInFile`** for `interface` and `type` keeps Knip from flagging those; do not strip `export` to silence reports.

**Agents:** Run report-only Knip. Do not run `--fix` or `--fix-type exports` unless a task explicitly scopes a safe, reviewed change.

## Audit: where `--fix` runs (2026-05-19)

Repo-wide search for `knip --fix`, `knip --fix-type`, `knip:fix`, and `fix-type exports` found **no automated invocations**. Export stripping in the past came from **manual** `knip --fix` / `knip --fix-type exports` (local terminal or agents), not from CI, hooks, or Nx defaults.

| Entry point                                                    | Runs Knip? | Uses `--fix`? | Notes                                                                                                  |
| -------------------------------------------------------------- | ---------- | ------------- | ------------------------------------------------------------------------------------------------------ |
| **Nx `monorepo:knip`**                                         | Yes        | **No**        | `nx.json` → `knip --config knip.jsonc` only (report).                                                  |
| **Root `package.json` scripts**                                | No         | No            | No `knip` script.                                                                                      |
| **GitHub CI** (`continuous-integration.yml` → `knip-report`)   | Yes        | **No**        | `pnpm nx run monorepo:knip-ci` — report-only; `knip-baseline.json` + `dist/knip-report.json` artifact. |
| **GitHub release** (`.github/workflows/nx-release.yml`)        | No         | No            | Job disabled (`if: false`).                                                                            |
| **Husky `pre-commit`**                                         | No         | No            | Runs `lint-staged` only.                                                                               |
| **Husky `pre-push`**                                           | No         | No            | Branch protection only.                                                                                |
| **lint-staged** (`.lintstagedrc.js`)                           | No         | No            | Prettier + ESLint `--fix` on staged files; no Knip.                                                    |
| **VS Code / Cursor** (`.vscode/settings.json`)                 | No         | No            | `formatOnSave` + `source.fixAll.eslint` on save; no Knip task or Knip extension.                       |
| **Cursor / agent rules** (`.cursor/`, `AGENTS.md`, `.agents/`) | No         | No            | No Knip `--fix` guidance or commands.                                                                  |
| **tools/workflows, scripts/**                                  | No         | No            | No Knip references.                                                                                    |

### Related save-time tooling (not Knip)

These can change source on save/commit but **do not** run Knip or remove `export` keywords:

- **ESLint `--fix`** via lint-staged and optional `source.fixAll.eslint` in the editor.
- **Prettier** via lint-staged and `editor.formatOnSave`.

### Canonical report command

```bash
pnpm nx run monorepo:knip
```

Equivalent: `knip --config knip.jsonc` from the repo root (with the same dummy env vars Nx injects for Expo-related config).

### CI baseline gate (report-only)

CI runs **`pnpm nx run monorepo:knip-ci`**, which:

1. Writes **`dist/knip-report.json`** (JSON reporter; no source changes).
2. Fails only when Knip’s error-count exceeds **`knip-baseline.json` → `maxIssues`** (via `knip --max-issues`; never `--fix`).

After a reviewed cleanup that reduces issues, lower `maxIssues` in `knip-baseline.json` and commit it with the fixes. To find the current ceiling locally:

```bash
pnpm exec tsx ./scripts/knip-ci.ts --write-report
```

Do **not** add `--fix` or `--fix-type exports` to this target without an explicit team decision and review—those flags rewrite source and have removed intentional `export` on component prop types.

## Preserving intentional exports

Knip is configured in **`knip.jsonc`** to reduce false positives and to avoid stripping public API surface.

### Component prop types (`interface` / `type`)

Root **`ignoreExportsUsedInFile`** treats exported `interface` and `type` symbols as used when referenced only in the same file (typical `*Props` / `*Options` next to a component). No per-file allowlist is required for that pattern.

### Package and tool public APIs (`@publicApi`)

For **non-component** exports that are part of a deliberate public surface (package `exports` subpaths, shared workflow helpers, `@tools/dotfiles` factories), tag the export with a JSDoc **`@publicApi`** tag:

```ts
/**
 * @description Resolves auth for GraphQL-backed MCP tools.
 * @publicApi
 */
export function getAuthToken(): string {
  /* ... */
}
```

Root config includes **`"tags": ["-publicApi"]`**, so Knip excludes tagged exports from unused-export reports and from **`--fix-type exports`**.

**When to use `@publicApi`**

- Symbols listed in a package **`package.json` → `exports`** map (including barrel re-exports).
- Shared utilities consumed across workspaces but not always visible to static import graphs (e.g. `@tools/workflows` parser helpers, `@tools/workflows/ralph-debug`).
- Documented extension points in `CONTRIBUTING.md` or package READMEs.

**When not to use `@publicApi`**

- React component **`Props` / `Options`** types (use `ignoreExportsUsedInFile` instead).
- Truly dead code—remove it or stop exporting it.
- One-off suppressions for unrelated issue types; prefer fixing the graph or a narrow `ignoreIssues` entry.

**Alternatives**

- Knip’s built-in **`@public`** tag behaves similarly; this repo standardizes on **`@publicApi`** to avoid confusion with TypeScript visibility or TSDoc `@public` semantics elsewhere.

### Manual / agent risk

The highest-risk path is **ad hoc** runs, for example:

```bash
knip --config knip.jsonc --fix
knip --config knip.jsonc --fix-type exports
```

Agents and humans should use **report-only** Knip unless a follow-up task explicitly scopes a safe fix (e.g. unused dependencies after review).

## See also

- Plan: Knip config — preserve intentional component exports (`2d5358d0-d96c-4eca-95c9-861a94931a0d` in OpenThrottle).
- [CONTRIBUTING.md](../../CONTRIBUTING.md) — `@publicApi` convention for package exports.
- [NX.md](./NX.md) — Husky / lint-staged on release commits.
