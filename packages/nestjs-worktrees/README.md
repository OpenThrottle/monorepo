# @openthrottle/nestjs-worktrees

NestJS module for worktree-based BullMQ workflows: acquire target → run loop → ensure commit → release. Ships **local aligned copies** of the worktree workflow (`runWorktreeWorkflow`, `runChildJob`, parent-job helpers, types) under this package — not thin re-exports from `@tools/workflows`. The module provides a **mutex-wrapped** `IWorktreeTargetsTracker` from the `WORKTREE_TARGETS` env var so queue processors can inject a shared tracker without wiring `@tools/workflows` for the workflow shell.

**Scope:** This package applies to the **worktree + BullMQ spawn** surface (when `WORKTREE_TARGETS` is set and jobs run nested `workflow-ralph` in a worktree). The default OpenThrottle plans queue path is the **in-process orchestrator** (`AgenticRalphOrchestratorService`), which does not use `runWorktreeWorkflow` or the tracker. See [tools/workflows/README.md → Which path runs when](../../tools/workflows/README.md#which-path-runs-when-canonical-decision-table).

## Installation

This is a **private workspace package**. Add it as a workspace dependency in your app's `package.json`:

```json
"dependencies": {
  "@openthrottle/nestjs-worktrees": "workspace:^"
}
```

Then install and build (consumers resolve `dist/` exports):

```bash
pnpm install
pnpm nx run @openthrottle/nestjs-worktrees:build
```

## Usage

### 1. Import `NestjsWorktreesModule`

Import `NestjsWorktreesModule` in the module that registers your queue processors (e.g. `PlansQueueModule`). The module is `@Global()`, so the tracker token is available everywhere once imported.

The module factory:

1. Parses `WORKTREE_TARGETS` via `getWorktreeTargetsFromEnv()`
2. Builds a base `WorktreeTargetsTracker` from those targets
3. Wraps it with `MutexWorktreeTargetsTracker` (`async-mutex`) for safe concurrent acquire/release when worker `concurrency > 1`
4. Registers the result under `WORKTREE_TRACKER_TOKEN`

Workflow functions (`runWorktreeWorkflow`, `runChildJob`, etc.) are **not** Nest providers — import them from the package barrel.

```ts
import { Module } from '@nestjs/common';
import { NestjsWorktreesModule } from '@openthrottle/nestjs-worktrees';

@Module({
  imports: [NestjsWorktreesModule /*, your BullMQ queue module */],
})
export class PlansQueueModule {}
```

### 2. Inject the tracker and call the workflow

Inject the mutex-wrapped tracker with `@Inject(WORKTREE_TRACKER_TOKEN)` and type it as `IWorktreeTargetsTracker`. Call `runWorktreeWorkflow` from this package; pass a `runLoop` that runs your child job (typically Ralph via `workflow-ralph`).

**Import split:** Use this package for the workflow shell and tracker. For production spawn parity with OpenThrottle (nested spawn env, streaming, abort/timeout), import `runChildJob` and spawn helpers from `@tools/workflows` directly — the copy exported here is a simplified `spawnSync` variant without `buildNestedWorkflowRalphSpawnEnv`.

| Import from                      | Use for                                                                                                                                                                     |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@openthrottle/nestjs-worktrees` | `NestjsWorktreesModule`, `WORKTREE_TRACKER_TOKEN`, `runWorktreeWorkflow`, types (`IWorktreeTargetsTracker`, `WorktreeWorkflowResult`, …), optional simplified `runChildJob` |
| `@tools/workflows`               | `runChildJob` (streaming spawn + nested env), `buildNestedWorkflowRalphSpawnEnv`, `loadWorkflowRalphConfig`, Ralph tuning argv helpers                                      |

```ts
import { Inject } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import {
  runWorktreeWorkflow,
  WORKTREE_TRACKER_TOKEN,
} from '@openthrottle/nestjs-worktrees';
import type { IWorktreeTargetsTracker } from '@openthrottle/nestjs-worktrees';
import { runChildJob } from '@tools/workflows';

@Processor('plans', { concurrency: 1 })
export class PlansProcessor extends WorkerHost {
  constructor(
    @Inject(WORKTREE_TRACKER_TOKEN)
    private readonly tracker: IWorktreeTargetsTracker,
  ) {
    super();
  }

  async process(job: { data: { planId: string }; id: string | number }) {
    const planId = job.data.planId;
    const jobId = String(job.id);

    const result = await runWorktreeWorkflow({
      tracker: this.tracker,
      acquire: { lockedBy: jobId, baseBranch: 'main' },
      runLoop: (handoff) => runChildJob({ handoff, planId, iterations: 10 }),
      ensureCommit: {},
    });

    if (!result.acquire.ok) {
      // No target available — handle skip/retry
      return;
    }
    // Handle result.loop / result.ensureCommit / result.released
  }
}
```

Other live consumers inject the tracker without running the workflow — e.g. `system-metrics.service.ts` reads active worktree locks for metrics.

### 3. Set `WORKTREE_TARGETS`

Set `WORKTREE_TARGETS` to a JSON array of `[id, path]` tuples or `{ id, path }` objects. If unset or empty, the tracker has no targets (`acquire` fails; processors can fall back to in-process behavior).

```json
[
  ["wt1", "/path/to/wt1"],
  ["wt2", "/path/to/wt2"]
]
```

```json
[
  { "id": "wt1", "path": "/path/to/wt1" },
  { "id": "wt2", "path": "/path/to/wt2" }
]
```

You can also call `getWorktreeTargetsFromEnv()` directly when building a custom tracker outside Nest DI.

## Examples and references

- **Worktree spawn processor (legacy reference):** [`plans.processor.backup.ts`](../../applications/openthrottle-server/src/queues/plans/plans.processor.backup.ts) — uses `runWorktreeWorkflow` from this package and `runChildJob` + spawn env from `@tools/workflows`.
- **Live plans processor:** [`plans.processor.ts`](../../applications/openthrottle-server/src/queues/plans/plans.processor.ts) — orchestrator-only; does not use the worktree workflow.
- **Module wiring:** [`plans-queue.module.ts`](../../applications/openthrottle-server/src/queues/plans/plans-queue.module.ts) imports `NestjsWorktreesModule`.
- **Metrics consumer:** [`system-metrics.service.ts`](../../applications/openthrottle-server/src/metrics/system-metrics.service.ts) injects `WORKTREE_TRACKER_TOKEN` for active lock reporting.
- **Registration / allocation:** [tools/workflows/docs/worktree-registration-and-allocation.md](../../tools/workflows/docs/worktree-registration-and-allocation.md).
- **Which path runs when:** [tools/workflows/README.md → Which path runs when](../../tools/workflows/README.md#which-path-runs-when-canonical-decision-table).
