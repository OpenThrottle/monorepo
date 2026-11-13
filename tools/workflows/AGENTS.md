# @tools/workflows — agent notes

Legacy Ralph workflow package — deprecated (status, replacement packages, and no-new-imports rule are in [tools/AGENTS.md](../AGENTS.md)) but still the code that runs Ralph today. This file covers what remains here and what moved.

**Consumed by:** `openthrottle-server`, `@openthrottle/nestjs-worktrees`, and the root `package.json` (which is what makes `pnpm exec workflow-ralph` resolve).

## Commands

- `pnpm nx run @tools/workflows:build` — `build:tsc` then `chmod +x dist/src/bin/*.js`. The `bin` entries and `exports["."]` point at `dist/`, so **rebuild after editing `src/` before running any bin or the server** (`main` → `src/index.ts` is misleading here; this is a built package).
- `pnpm nx run @tools/workflows:dev` — continuous `tsc --watch` into `dist/` (no clean).

## Which path runs when

README § [Which path runs when](./README.md#which-path-runs-when-canonical-decision-table) is the canonical decision table for the three Ralph surfaces (local CLI, queued spawn, in-process orchestrator) — always start there, never infer from code. Key switches:

- `OPENTHROTTLE_DEFAULT_RUN_KIND=spawn` — flips queued `enqueuePlanRun` back to the legacy nested-CLI spawn path (default is the in-process orchestrator).
- `WORKFLOW_RALPH_TRANSPORT=postgres-direct` — rolls the CLI/spawn transport back from GraphQL to direct `pg` (see [docs/workflows/graphql-only-transport-boundary.md](../../docs/workflows/graphql-only-transport-boundary.md)).

## Where the code actually lives now

Moved out (edit there, not here):

- Orchestrator loop → `@openthrottle/openthrottle-agentic-ralph`; Nest DI + BullMQ queue wiring → `@openthrottle/nestjs-agentic-workflow`; worktree acquire/run/release → `@openthrottle/nestjs-worktrees`; transport-free contracts → `@openthrottle/openthrottle-agentic-workflow`; shared env/debug constants → `@openthrottle/openthrottle-agentic-utils`.
- The "re-export shims" are `@deprecated` aliases inside remaining files (e.g. `src/utils/ralphDebugLogger.ts` re-exports `WORKFLOW_RALPH_DEBUG_ENV` from `openthrottle-agentic-utils` as `RALPH_DEBUG_ENV`), not a shim-only index — `src/index.ts` still exports real local code.

Still real logic here (OK to touch for fixes):

- `src/bin/ralph.ts` — the `workflow-ralph` CLI (`--plan`/`--task`); `src/bin/runIteration.ts` — the iteration runner the orchestrator borrows via `src/utils/createCursorWorkflowRalphIterationRunner.ts`.
- `src/bin/link-merge.ts` (`workflow-link-merge`) and `src/bin/lighthouse.ts` (`workflow-lighthouse`) — parked here until relocated to standalone tool packages (README § Target architecture).
- `src/config/loadWorkflowRalphConfig.ts` — config resolution.
- `src/utils/` — parent/child job + worktree workflow plumbing (`child-job.ts`, `parent-job.ts`, `WorktreeTargetsTracker.ts`).

New workflow, queue, orchestrator, or worktree behavior belongs in the `@openthrottle` packages above; changes here should be shims, bin fixes, or migration steps.

## Config and debugging

- Config precedence: built-in defaults < `.workflow-ralph.json` **in the cwd** < `WORKFLOW_RALPH_*` env vars < CLI/enqueue overrides (`src/config/loadWorkflowRalphConfig.ts`; filename constant `WORKFLOW_RALPH_DEFAULTS_FILENAME`).
- `WORKFLOW_RALPH_DEBUG=1` enables debug logging (legacy alias `RALPH_DEBUG`); `WORKFLOW_RALPH_DEBUG=verbose` or `WORKFLOW_RALPH_VERBOSE` adds verbose lines. Debug output goes to stderr prefixed `[workflow-ralph:debug]`.

## Worktree checkout registration (run-start only)

At CLI / orchestrator **run-start** (once the concrete worktree path is known, before
the first agent turn), Ralph soft-calls `registerPlanRunWorktreeCheckout` as the run
actor so a linked worktree can land in `repository_checkouts` and point
`plan_runs.checkout_id` + `branch` at that worktree (overwriting a scheduling-time
primary checkout). **Not** done from `pnpm worktree:new` / `setup_worktree.ts`
(service-account shell callback is deferred); a worktree does not show in Workspace
Settings until a run touches it. To remove one, use `pnpm worktree:remove <name>`
(the `ot-worktree` destroy action).

## Pointers

- [README.md](./README.md) — decision table, target architecture (Phase 2), building, executables.
- [docs/](./docs/) — process model, worktree registration/allocation, verification and reporting, cross-repo usage.
- Root skill `workflow-ralph` covers running (vs. changing) the CLI.
