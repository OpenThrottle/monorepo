# Knip (dead code / unused exports)

Knip finds unused files, dependencies, and exports across the monorepo. Configuration lives in **`knip.jsonc`** at the repo root (used by Nx `monorepo:knip` via `--config knip.jsonc`). In CI, Knip is a **P3** gate with a committed baseline — see [CI-quality-gates.md](./CI-quality-gates.md).

## Safe workflow (report vs fix)

| Goal                         | Command                                            | Notes                                                                                                                              |
| ---------------------------- | -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| **Report only (default)**    | `pnpm nx run monorepo:knip`                        | Use for CI, PR review, and agents. No source rewrites.                                                                             |
| **Do not use on app UI**     | `knip --fix`, `knip --fix-type exports`            | Removes `export` from unused symbols—including intentional **`export interface FooProps`** / **`export type`** next to components. |
| **Optional, human-reviewed** | `knip --config knip.jsonc --fix-type dependencies` | May edit `package.json`; run only after reading the diff. Never combine with `exports` fix on the same pass without review.        |

**Intentional `export` on Props:** Generators and our component conventions export `*Props` / `*Options` types for consumers, Storybook, and consistency even when nothing imports them externally. That is expected. Root **`ignoreExportsUsedInFile`** for `interface` and `type` keeps Knip from flagging those; do not strip `export` to silence reports.

**Agents:** Run report-only Knip. Do not run `--fix` or `--fix-type exports` unless a task explicitly scopes a safe, reviewed change.

> **Status (2026-07-10):** the Nx `knip` target was temporarily stubbed out (an `echo` disabling it). It is now re-enabled as a **report-only (dry-run) target**: `knip --config knip.jsonc --no-exit-code`. It is non-blocking (`--no-exit-code`) and non-destructive — knip only mutates files when `--fix`/`--fix-type`/`--allow-remove-files` is passed, and the target carries none of those. We are working through the backlog of findings **piecemeal** (see below) rather than accepting knip's suggested removals wholesale. **Do not add `--fix` to the `knip` target.**

## Piecemeal triage workflow (scoping the report)

Knip's default is a full-repo report. To review and resolve findings in small, reviewable slices, scope the run by **issue type** and/or **workspace** — this is how we chip away at the baseline without a giant, risky sweep.

- **By issue type** — `--include <type>` / `--exclude <type>`. Types: `files`, `dependencies`, `unlisted`, `unresolved`, `binaries`, `exports`, `types`, `duplicates`. Shortcuts: `--dependencies`, `--exports`, `--files`.
- **By project** — `--workspace <projectRoot>` to focus one app/package at a time.

```bash
# Just the unused-exports findings for one app:
pnpm exec knip --config knip.jsonc --no-exit-code \
  --workspace applications/openthrottle-developer --include exports

# Just dependency findings across the whole repo:
pnpm exec knip --config knip.jsonc --no-exit-code --dependencies

# A compact per-type count (good for a baseline snapshot):
pnpm exec knip --config knip.jsonc --no-exit-code --reporter compact
```

Suggested slice order, lowest-risk → highest: `duplicates` → `binaries` (unlisted) → `dependencies` → `types` → `exports` → `files` (review each; expect false positives from codegen / React-Router typegen output and entry globs).

**For each finding, decide:** genuinely dead → remove it (or stop exporting it); false positive the static graph can't see (codegen output, dynamic import, deliberate public API, entry point) → suppress it properly (see [Preserving intentional exports](#preserving-intentional-exports) and the `knip.jsonc` `ignore` / `ignoreExportsUsedInFile` / `ignoreUnresolved` lists). Land each slice as its own small PR and re-run the scoped command to confirm the count dropped.

**If you use auto-fix at all**, keep it scoped and reviewed: `--fix-type <one-type> --workspace <one-project>` in a dedicated PR, read the diff, never a blanket `--fix`. Per [CLAUDE.md](../../CLAUDE.md), **never run `knip --fix` on app UI**; `--allow-remove-files` is opt-in only.

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
- **Prettier** via lint-staged and `editor.formatOnSave`, or repo-wide with `pnpm format` / `pnpm format:check`. Config is the single `prettierConfig` from `@tools/dotfiles`.

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

### Package and tool public APIs (`@public`)

For **non-component** exports that are part of a deliberate public surface (package `exports` subpaths, shared workflow helpers, `@tools/dotfiles` factories), tag the export with a JSDoc **`@public`** tag:

```ts
/**
 * @description Resolves auth for GraphQL-backed MCP tools.
 * @public
 */
export function getAuthToken(): string {
  /* ... */
}
```

`@public` is Knip's **built-in** tag, recognized natively — tagged exports are excluded from unused-export reports and from **`--fix-type exports`** without any custom `tags` configuration in `knip.jsonc`.

**When to use `@public`**

- Symbols listed in a package **`package.json` → `exports`** map (including barrel re-exports).
- Shared utilities consumed across workspaces but not always visible to static import graphs (e.g. `@tools/workflows` parser helpers, `@tools/workflows/ralph-debug`).
- Documented extension points in `CONTRIBUTING.md` or package READMEs.

**When not to use `@public`**

- React component **`Props` / `Options`** types (use `ignoreExportsUsedInFile` instead).
- Truly dead code—remove it or stop exporting it.
- One-off suppressions for unrelated issue types; prefer fixing the graph or a narrow `ignoreIssues` entry.

**History**

- This repo previously used a custom **`@publicApi`** tag with a `"tags": ["-publicApi"]` filter in `knip.jsonc`. That was migrated to Knip's built-in **`@public`** tag, and the custom `tags` filter was removed (the built-in tag needs no configuration).

### Manual / agent risk

The highest-risk path is **ad hoc** runs, for example:

```bash
knip --config knip.jsonc --fix
knip --config knip.jsonc --fix-type exports
```

Agents and humans should use **report-only** Knip unless a follow-up task explicitly scopes a safe fix (e.g. unused dependencies after review).

## See also

- Plan: Knip config — preserve intentional component exports (`2d5358d0-d96c-4eca-95c9-861a94931a0d` in OpenThrottle).
- [CONTRIBUTING.md](../../CONTRIBUTING.md) — `@public` convention for package exports.
- [NX.md](./NX.md) — Husky / lint-staged on release commits.
