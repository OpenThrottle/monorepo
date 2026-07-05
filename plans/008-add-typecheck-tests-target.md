# Plan 008: Add a `typecheck-tests` target for the server

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving on. This
> plan has a real chance of surfacing pre-existing type errors — if it does,
> that is a STOP condition, not something to fix here. When done, update this
> plan's status row in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 9d10ccc6..HEAD -- applications/openthrottle-server/tsconfig.app.json applications/openthrottle-server/tsconfig.json nx.json`
> On any change, re-verify the "Current state" facts; on a mismatch, STOP.

## Status

- **Priority**: P3
- **Effort**: S to add the target; UNKNOWN to fix any errors it surfaces (explicitly out of scope — see STOP conditions)
- **Risk**: MED
- **Depends on**: none
- **Category**: dx
- **Planned at**: commit `9d10ccc6`, 2026-07-05

## Why this matters

The server's `*.test.ts` files are **never type-checked**. The `typecheck` target compiles via `tsconfig.app.json`, which explicitly `exclude`s `src/**/*.test.ts`, and there is no `typecheck-tests` target (buildable packages like `@openthrottle/nodejs-graphql` have one; the server does not). So test code can drift out of type-safety — stale mock signatures, wrong argument shapes, broken helpers — and nothing catches it until someone runs the suite. Adding a `typecheck-tests` target closes the gap and matches the rest of the workspace (the root `check:local` already runs `check:local:affected-typecheck-tests`, which today skips the server because it has no such target).

## Current state

- `applications/openthrottle-server/tsconfig.app.json` — `"exclude": ["build", "src/**/*.test.ts"]` (tests excluded from the app typecheck).
- The server has `tsconfig.json` and `tsconfig.app.json` but **no** `tsconfig.test.json`.
- `pnpm nx show project openthrottle-server --json` shows a `typecheck` target but **no** `typecheck-tests`.
- Targets are **inferred**, not hand-written: `nx.json` `plugins` includes `@nx/js/typescript` (infers TS targets for buildable/solution projects), `@nx/react/router-plugin`, and the local `./tools/nx-plugins/react-router-typecheck.ts` (which only matches `applications/*/react-router.config.ts` — i.e. RR apps, NOT this NestJS server).
- **Exemplar** — a project that HAS `typecheck-tests`, `packages/nodejs-graphql`, has a `tsconfig.test.json`:
  ```json
  {
    "$schema": "https://json.schemastore.org/tsconfig",
    "extends": ["./tsconfig.json", "../../tsconfig.vitest-node.json"],
    "compilerOptions": {
      "composite": false,
      "declaration": false,
      "declarationMap": false,
      "noEmit": true
    },
    "include": [
      "src/**/*.spec.ts",
      "src/**/*.spec.tsx",
      "src/**/*.test.ts",
      "src/**/*.test.tsx",
      "tests/**/*.spec.ts",
      "tests/**/*.spec.tsx",
      "tests/**/*.test.ts",
      "tests/**/*.test.tsx",
      "vitest.setup.ts",
      "vitest.setup.tsx"
    ]
  }
  ```
  The hypothesis: adding an analogous `tsconfig.test.json` to the server causes `@nx/js/typescript` to infer a `typecheck-tests` target, exactly as it does for `nodejs-graphql`.

## Commands you will need

| Purpose                    | Command                                           | Expected                                                                                  |
| -------------------------- | ------------------------------------------------- | ----------------------------------------------------------------------------------------- | ----------------------------------- |
| Does the target exist yet? | `pnpm nx show project openthrottle-server --json  | python3 -c "import sys,json;print('typecheck-tests' in json.load(sys.stdin)['targets'])"` | `False` before, `True` after Step 1 |
| Run the new target         | `pnpm nx run openthrottle-server:typecheck-tests` | exit 0 (see STOP if it errors)                                                            |
| App typecheck still works  | `pnpm nx run openthrottle-server:typecheck`       | exit 0                                                                                    |
| Tests still run            | `pnpm nx run openthrottle-server:test`            | all pass                                                                                  |

## Scope

**In scope**:

- `applications/openthrottle-server/tsconfig.test.json` (create, modeled on the exemplar)
- Possibly `applications/openthrottle-server/tsconfig.json` references, ONLY if required for the inference to pick up the test config (match how `nodejs-graphql/tsconfig.json` wires its references)

**Out of scope** (do NOT touch, and do NOT attempt to fix here):

- Any `*.test.ts` source that the new target reports type errors in — cataloguing/fixing those is a SEPARATE effort (STOP and report).
- `tsconfig.app.json`'s existing `exclude` — leave the app typecheck as-is; tests get their own config.
- `nx.json` plugin config.

## Git workflow

- Work on the single shared PR branch the operator assigns.
- Commit style: conventional commits, no attribution. Example: `dx(openthrottle-server): add typecheck-tests target`.
- Do NOT push or open a PR unless instructed.

## Steps

### Step 1: Add `tsconfig.test.json`

Create `applications/openthrottle-server/tsconfig.test.json` modeled on the `nodejs-graphql` exemplar above, adjusting `extends` to the server's own `tsconfig.json` (and the same shared `../../tsconfig.vitest-node.json` base the exemplar uses — confirm that path exists from the server dir; if the server should use a different shared vitest base, match whatever `applications/*/tsconfig` test configs use — read one first if any exists).

**Verify**: `pnpm nx show project openthrottle-server --json` now lists a `typecheck-tests` target. If it does NOT appear, STOP (inference for an application may differ from a package — report).

### Step 2: Run it — and treat errors as a STOP, not a task

Run `pnpm nx run openthrottle-server:typecheck-tests`.

- If it exits 0: the server's test files are already type-clean.
- If it reports type errors: **STOP**. Do not fix them in this plan. Capture the full error list and the count, and report back. Fixing pre-existing test type errors is a separate, scoped effort (it may be large, and some fixes are judgment calls). Leave the `tsconfig.test.json` in place or revert it per the operator's call when you report.

**Verify**: `pnpm nx run openthrottle-server:typecheck-tests` → exit 0, OR a STOP report with the error list.

### Step 3: Confirm no regressions to existing targets

**Verify**:

- `pnpm nx run openthrottle-server:typecheck` → exit 0 (app typecheck unaffected)
- `pnpm nx run openthrottle-server:test` → all pass

## Test plan

No new runtime tests — this adds a static-analysis gate, it doesn't change behavior. The gate itself (`typecheck-tests` exiting 0) is the deliverable.

## Done criteria

ALL must hold:

- [ ] `applications/openthrottle-server/tsconfig.test.json` exists
- [ ] `pnpm nx show project openthrottle-server --json` lists `typecheck-tests`
- [ ] `pnpm nx run openthrottle-server:typecheck-tests` exits 0 **OR** a STOP report enumerating the pre-existing test type errors was produced
- [ ] `pnpm nx run openthrottle-server:typecheck` still exits 0
- [ ] `pnpm nx run openthrottle-server:test` still passes
- [ ] `plans/README.md` status row updated (DONE if green; BLOCKED with the error count if Step 2 tripped)

## STOP conditions

Stop and report (do not improvise) if:

- Adding `tsconfig.test.json` does NOT cause a `typecheck-tests` target to be inferred (the `@nx/js/typescript` inference may require additional wiring for an application project, or a different mechanism — report what you tried).
- `typecheck-tests` surfaces ANY type errors — report the count and the list; do not fix them here (out of scope, potentially large, and some are judgment calls).
- Adding the test config perturbs the existing `typecheck` target or the build.

## Maintenance notes

- Reviewer: the value here is the gate existing and passing. If Step 2 found errors, the right outcome is a follow-up plan to fix them (or a decision to land the config with a documented known-errors baseline) — not silently widening excludes.
- Once green, consider adding `typecheck-tests` to the server's expectations so `check:local:affected-typecheck-tests` covers it going forward (it already runs that target for projects that have it).
