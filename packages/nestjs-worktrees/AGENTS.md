# @openthrottle/nestjs-worktrees — agent notes

Worktree + BullMQ spawn workflows for NestJS: a mutex-wrapped `IWorktreeTargetsTracker`
built from the `WORKTREE_TARGETS` env var, plus the worktree workflow shell
(`runWorktreeWorkflow`: acquire → run loop → ensure commit → release). Part of the
replacement for the **deprecated** `@tools/workflows` (see [tools/AGENTS.md](../../tools/AGENTS.md)).

**Consumed by:** `openthrottle-server` — `plans-queue.module.ts` imports the module;
`system-metrics.service.ts` injects the tracker for lock reporting. The **live** plans
processor is orchestrator-only and does not run the worktree workflow; the spawn-path
reference is `plans.processor.backup.ts`.

## Layout

- `src/modules/nestjs-worktrees.module.ts` — `@Global()` module; factory parses
  `WORKTREE_TARGETS`, wraps `WorktreeTargetsTracker` in `MutexWorktreeTargetsTracker`
  (`async-mutex`), registers it under `WORKTREE_TRACKER_TOKEN` (a `Symbol`).
- `src/utils/workflow.ts` / `parent-job.ts` / `child-job.ts` — the workflow shell, branch/commit
  helpers, and a simplified `runChildJob`.
- `src/worktree-targets.env.ts` — `getWorktreeTargetsFromEnv()` (tuple or object JSON forms).
- `src/types/worktree.ts` — the exported result/option types.

## Invariants & gotchas

- Built package (real `build` target, `exports` → `dist/`; `__dev` is a placeholder — no watch
  target) — see [../AGENTS.md](../AGENTS.md).
- The workflow functions are **local aligned copies** of the `@tools/workflows` versions, not
  re-exports — keep names/argv semantics aligned when changing either side. The `runChildJob`
  exported here is a simplified `spawnSync` variant **without**
  `buildNestedWorkflowRalphSpawnEnv`; the streaming spawn + nested-env helpers still live in
  `@tools/workflows`, which is now shim-only — check [tools/AGENTS.md](../../tools/AGENTS.md)
  before adding any new import from it (the README's import-split table predates that).
- Only the tracker is a Nest provider; workflow functions are plain imports from the barrel.
- This package covers only the worktree/spawn surface. The default plans-queue path is the
  in-process orchestrator, which uses neither the workflow nor the tracker — canonical decision
  table: [tools/workflows/README.md § Which path runs when](../../tools/workflows/README.md#which-path-runs-when-canonical-decision-table).
- `WORKTREE_TARGETS` unset/empty is valid: the tracker has no targets and `acquire` fails —
  processors must handle the skip/fallback branch, not assume acquisition.

## Pointers

- [README.md](./README.md) — full processor example, env formats, import-split table, and
  links to the live/backup server consumers.
- [docs/workflows/bullmq-processor-worktree.md](../../docs/workflows/bullmq-processor-worktree.md).
