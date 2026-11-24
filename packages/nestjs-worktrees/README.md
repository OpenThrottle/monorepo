# @openthrottle/nestjs-worktrees

NestJS module for worktree-based BullMQ workflows: acquire target → run loop → ensure commit → release. Ships the worktree workflow (`runWorktreeWorkflow`, parent-job helpers) and its types (`ChildJobInput`, `ChildJobResult`, `ChildJobStreamChunk`, …) in this package. The module provides a **mutex-wrapped** `IWorktreeTargetsTracker` from the `WORKTREE_TARGETS` env var so queue processors can inject a shared tracker.

**Scope:** This package applies to the **worktree + BullMQ spawn** surface (when `WORKTREE_TARGETS` is set and a processor runs a loop inside an acquired worktree). The plans queue runs the in-process OT Loop job, which provisions its worktree through `PlanRunWorkspaceService` and does not use `runWorktreeWorkflow` or the tracker.

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

Workflow functions (`runWorktreeWorkflow`, the parent-job helpers) are **not** Nest providers — import them from the package barrel.

```ts
import { Module } from '@nestjs/common';
import { NestjsWorktreesModule } from '@openthrottle/nestjs-worktrees';

@Module({
  imports: [NestjsWorktreesModule /*, your BullMQ queue module */],
})
export class PlansQueueModule {}
```

### 2. Inject the tracker and call the workflow

Inject the mutex-wrapped tracker with `@Inject(WORKTREE_TRACKER_TOKEN)` and type it as `IWorktreeTargetsTracker`. Call `runWorktreeWorkflow` from this package; pass a `runLoop` that runs your child job and returns a `ChildJobResult` (branch name and commit SHA, or a failure reason).

**Scope:** this package owns the worktree shell, the tracker and the child-job types. It does not spawn the child process: the processor supplies `runLoop`, which receives the `ParentJobHandoff` (branch, target id, worktree path) and spawns whatever runs in that worktree.

```ts
import { Inject } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import {
  runWorktreeWorkflow,
  WORKTREE_TRACKER_TOKEN,
} from '@openthrottle/nestjs-worktrees';
import type {
  ChildJobResult,
  IWorktreeTargetsTracker,
  ParentJobHandoff,
} from '@openthrottle/nestjs-worktrees';

/** Your own child runner: spawn the agent in `handoff.worktreePath` and report the outcome. */
declare const runChild: (input: {
  readonly handoff: ParentJobHandoff;
  readonly planId: string;
}) => Promise<ChildJobResult>;

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
      runLoop: (handoff) => runChild({ handoff, planId }),
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

- **Plans processor:** [`plans.processor.ts`](../../applications/openthrottle-server/src/queues/plans/plans.processor.ts) — runs the OT Loop job; does not use the worktree workflow.
- **Module wiring:** [`plans-queue.module.ts`](../../applications/openthrottle-server/src/queues/plans/plans.module.ts) imports `NestjsWorktreesModule`.
- **Metrics consumer:** [`system-metrics.service.ts`](../../applications/openthrottle-server/src/metrics/system-metrics/system-metrics.service.ts) injects `WORKTREE_TRACKER_TOKEN` for active lock reporting.
