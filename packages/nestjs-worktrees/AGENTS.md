# @openthrottle/nestjs-worktrees — agent notes

Worktree + BullMQ spawn workflows for NestJS: a mutex-wrapped `IWorktreeTargetsTracker`
built from the `WORKTREE_TARGETS` env var, plus the worktree workflow shell
(`runWorktreeWorkflow`: acquire → run loop → ensure commit → release).

**Consumed by:** `openthrottle-server` — `plans-queue.module.ts` imports the module;
`system-metrics.service.ts` injects the tracker for lock reporting. The plans
processor runs the OT Loop job and does not use the worktree workflow.

## Layout

- `src/nestjs-worktrees.module.ts` — `@Global()` module; factory parses
  `WORKTREE_TARGETS`, wraps `WorktreeTargetsTracker` in `MutexWorktreeTargetsTracker`
  (`async-mutex`), registers it under `WORKTREE_TRACKER_TOKEN` (a `Symbol`).
- `src/workflow/workflow.utils.ts` / `src/parent-job/parent-job.utils.ts` — the workflow shell and the branch/commit
  helpers.
- `src/nestjs-worktrees.utils.ts` — `getWorktreeTargetsFromEnv()` (tuple or object JSON forms).
- `src/nestjs-worktrees.types.ts` — the exported result/option types.

## Invariants & gotchas

- Built package (real `build` target, `exports` → `dist/`; `__dev` is a placeholder — no watch
  target) — see [../AGENTS.md](../AGENTS.md).
- No child-process spawn lives here: `runWorktreeWorkflow` takes the processor's `runLoop`. `ChildJobStreamChunk` is
  the stdout/stderr chunk type the server's BullMQ keyed-run logging consumes.
- Only the tracker is a Nest provider; workflow functions are plain imports from the barrel.
- This package covers only the worktree/spawn surface. The plans-queue path is the
  in-process OT Loop job, which uses neither the workflow nor the tracker.
- `WORKTREE_TARGETS` unset/empty is valid: the tracker has no targets and `acquire` fails —
  processors must handle the skip/fallback branch, not assume acquisition.

## Pointers

- [README.md](./README.md) — full processor example, env formats, import-split table, and
  links to the server consumers.
