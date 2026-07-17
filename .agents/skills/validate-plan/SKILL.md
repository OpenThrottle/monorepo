---
name: validate-plan
description: >-
  Run the required validation checks (lint, typecheck, test) for the work in
  progress and fail loudly if any do not pass. USE WHEN layered onto a plan/task
  lifecycle hook (typically afterEach or afterAll) as a validation-as-skill gate,
  or when asked to validate a change before it is considered done.
disable-model-invocation: true
---

Your job is to validate the current work by running the project's required
checks and reporting a clear pass/fail. This skill is the canonical
"validation-as-skill" gate referenced by lifecycle hooks
(see docs/monorepo/lifecycle-hooks-design.md, "Validation-as-skill"). It is
attached to a hook slot — typically `afterEach` (validate each task) or
`afterAll` (validate the whole plan) — and the hooks runner executes it with the
phase's onFailure policy (before\* → block, after\* → warn).

## Required checks

Run these against the affected projects, through Nx + pnpm (never the underlying
tooling directly):

1. **Lint** — `pnpm nx affected --target=lint --parallel`
2. **Typecheck** — `pnpm nx affected --target=typecheck --parallel`
3. **Test** — `pnpm nx affected --target=test`

For repo-wide or root-level changes, prefer `nx run-many --target=<t> --all`
over `affected` (see the check-local memory: `affected` can under-select).

## Rules

- **ALWAYS** run all three checks; do not stop at the first pass.
- **NEVER** use `--no-verify`, skip a check, or mark validation passed when a
  check failed or was not run — report the failure with the command output.
- Run Nx targets **sequentially**, not in parallel across targets — test/build/
  lint share the Nx cache and concurrent runs cause spurious failures.
- If a check fails, report which check, the failing project(s), and the relevant
  output. A `block` hook (before\*) stops the run; a `warn` hook (after\*)
  records the failure without blocking.

## Org-custom checks

Teams may fork this skill (same `name`, different commands) to declare a
different required set — e.g. an integration suite, a security scan, or a
codegen-drift guard. The hook contract is unchanged: the skill declares the
checks; the hook slot decides when they run and whether failure blocks.

## Output

Report a single line per check (`✅`/`❌` + command) followed by any failure
detail, then a final verdict: **PASS** only if every check passed.
