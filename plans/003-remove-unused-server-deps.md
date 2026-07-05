# Plan 003: Remove unused `@vscode/ripgrep` and `ts-morph` from the server package

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving on. If
> anything in "STOP conditions" occurs, stop and report — do not improvise.
> When done, update this plan's status row in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 9d10ccc6..HEAD -- applications/openthrottle-server/package.json`
> If it changed since this plan was written, re-verify the "Current state" facts
> before proceeding; on a mismatch, STOP.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: dependencies
- **Planned at**: commit `9d10ccc6`, 2026-07-05

## Why this matters

`applications/openthrottle-server/package.json` declares `@vscode/ripgrep` and `ts-morph` as direct runtime dependencies, but nothing in the server's `src/` imports either one. They are heavy (a native ripgrep binary; a full TypeScript AST library) and are actually used by workspace packages the server depends on (e.g. code-indexing / agentic packages), which declare them themselves. Carrying them as _direct_ server deps bloats the dependency surface and misleads readers into thinking the server does code-parsing/searching directly. Removing them tightens the manifest; if a workspace package needs them, that package already declares them.

## Current state

- `applications/openthrottle-server/package.json` `dependencies` includes:
  - `"@vscode/ripgrep": "catalog:"`
  - `"ts-morph": "catalog:"`
- Server source imports: **zero**. Confirmed — `grep -rn "ripgrep\|ts-morph" applications/openthrottle-server/src` returns nothing.
- These packages are consumed by workspace libraries the server imports (e.g. `@openthrottle/openthrottle-ide` / code-index / agentic utils), which declare their own dependencies. Under pnpm's strict layout, a package must declare what its own source imports — the server does not import these, so it should not declare them.

Convention note: this repo recently ran a sweep declaring undeclared workspace deps (commit `4ca0f102` and the "declare undeclared workspace deps" change). The inverse — removing _unused declared_ deps — is the same hygiene applied in reverse.

## Commands you will need

| Purpose                        | Command                                                             | Expected on success |
| ------------------------------ | ------------------------------------------------------------------- | ------------------- |
| Confirm no src imports         | `grep -rn "ripgrep\|ts-morph" applications/openthrottle-server/src` | no output (exit 1)  |
| Install (refresh lockfile)     | `pnpm install`                                                      | exit 0              |
| Typecheck                      | `pnpm nx run openthrottle-server:typecheck`                         | exit 0              |
| Build (real integration check) | `pnpm nx run openthrottle-server:build`                             | exit 0              |
| Test                           | `pnpm nx run openthrottle-server:test`                              | all pass            |

## Scope

**In scope**:

- `applications/openthrottle-server/package.json` (remove the two dependency lines)
- `pnpm-lock.yaml` (updated by `pnpm install`)

**Out of scope** (do NOT touch):

- Any other package's `package.json` — do not "move" these deps anywhere; the packages that use them already declare them. If one turns out not to, that is a separate finding — STOP and report, don't fix it here.
- Any `catalog:` version entries in `pnpm-workspace.yaml`.

## Git workflow

- Work on the single shared PR branch the operator assigns.
- Commit style: conventional commits, no attribution. Example: `chore(openthrottle-server): drop unused @vscode/ripgrep and ts-morph deps`.
- Do NOT push or open a PR unless instructed.

## Steps

### Step 1: Re-confirm the deps are unused in server source

**Verify**: `grep -rn "ripgrep\|ts-morph" applications/openthrottle-server/src` → no output.

If there is ANY match, STOP (see STOP conditions).

### Step 2: Remove the two dependency lines

In `applications/openthrottle-server/package.json`, delete these two lines from `dependencies`:

```json
    "@vscode/ripgrep": "catalog:",
    "ts-morph": "catalog:",
```

Leave all other dependencies intact and keep the object valid JSON (no trailing comma issues).

**Verify**: `grep -n "@vscode/ripgrep\|ts-morph" applications/openthrottle-server/package.json` → no output.

### Step 3: Refresh the lockfile

Run `pnpm install`.

**Verify**: `pnpm install` → exit 0. `git status` shows `pnpm-lock.yaml` modified (or unchanged if the packages are still needed transitively — either is fine).

### Step 4: Typecheck, build, test

The **build** is the decisive check — if anything in the server (or its bundling) actually needed these at runtime, the build or tests will fail.

**Verify**:

- `pnpm nx run openthrottle-server:typecheck` → exit 0
- `pnpm nx run openthrottle-server:build` → exit 0
- `pnpm nx run openthrottle-server:test` → all pass

## Test plan

No new tests. The typecheck + **build** + existing test suite are the regression guard: they exercise the module graph and would fail on an unresolved import if these deps were secretly required.

## Done criteria

ALL must hold:

- [ ] `grep -n "@vscode/ripgrep\|ts-morph" applications/openthrottle-server/package.json` → no output
- [ ] `pnpm nx run openthrottle-server:typecheck` exits 0
- [ ] `pnpm nx run openthrottle-server:build` exits 0
- [ ] `pnpm nx run openthrottle-server:test` exits 0
- [ ] Only `applications/openthrottle-server/package.json` and `pnpm-lock.yaml` modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report if:

- Step 1's grep finds ANY `ripgrep`/`ts-morph` reference in server `src/` — the "unused" premise is false; report the file:line.
- The build or tests fail after removal (e.g. a dynamic `require`, a runtime plugin, or a Nest module that resolves one of these from the server's own `node_modules`). Report the failing module — do NOT re-add the dep and move on silently, and do NOT start editing other packages.

## Maintenance notes

- Reviewer: confirm the server build passed (not just typecheck) — that's what proves these weren't needed at runtime.
- If a future server feature needs code parsing/search, import it through a workspace package that owns `ts-morph`/ripgrep rather than re-adding a direct dep.
