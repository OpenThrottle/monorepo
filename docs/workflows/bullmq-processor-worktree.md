# Using the worktree workflow in BullMQ job processors

The worktree + BullMQ workflow from plan `2f94f33c` (fan-out/fan-in) can be used **inside** a BullMQ job processor so each job acquires a worktree, runs the loop (e.g. Ralph), ensures commit, then releases the target.

## 1. Add dependency

Use `@openthrottle/nestjs-worktrees`, which re-exports the workflow from `@tools/workflows` and provides the tracker from env:

```json
"dependencies": {
  "@openthrottle/nestjs-worktrees": "workspace:*"
}
```

Then install and build:

```bash
pnpm install
nx build @openthrottle/nestjs-worktrees
```

## 2. Provide a shared tracker and worktree paths

Import `NestjsWorktreesModule` in the module that registers your queue (e.g. `PlansQueueModule`). The module is `@Global()` and provides `WORKTREE_TRACKER_TOKEN` with a `WorktreeTargetsTracker` built from the `WORKTREE_TARGETS` env var (JSON array of `[id, path]` tuples or `{ id, path }` objects). No extra factory needed.

## 3. Use `runWorktreeWorkflow` in the processor

In `PlansProcessor`, inject the tracker and call the workflow from `process(job)`:

```ts
import {
  runWorktreeWorkflow,
  runChildJob,
  WORKTREE_TRACKER_TOKEN,
} from '@openthrottle/nestjs-worktrees';
import type { IWorktreeTargetsTracker } from '@openthrottle/nestjs-worktrees';

@Processor(PLANS_QUEUE_NAME, { concurrency: 1 })
export class PlansProcessor extends WorkerHost {
  constructor(
    private readonly logger: LoggerService,
    private readonly notifications: NotificationsService,
    @Inject(WORKTREE_TRACKER_TOKEN)
    private readonly tracker: IWorktreeTargetsTracker,
  ) {
    super();
  }

  async process(job: RunPlanJob): Promise<void> {
    const { planId } = job.data;
    const jobId = String(job.id);
    const logContext = `${PlansProcessor.name} [planId=${planId}, jobId=${jobId}]`;

    this.logger.info(
      `Plan job started: planId=${planId}, jobId=${jobId}`,
      PlansProcessor.name,
    );

    const result = await runWorktreeWorkflow({
      tracker: this.tracker,
      acquire: {
        lockedBy: jobId,
        baseBranch: 'main',
      },
      runLoop: (handoff) =>
        runChildJob({
          handoff,
          planId,
          iterations: 10, // optional
        }),
      ensureCommit: {
        runChecks: true, // optional: lint/test/typecheck in worktree before release
      },
    });

    if (!result.acquire.ok) {
      this.logger.warn(
        `Acquire failed: ${result.acquire.reason}, planId=${planId}, jobId=${jobId}`,
        PlansProcessor.name,
      );
      this.notifications.emitQueueJobCompleted({
        jobType: 'plans',
        message: `Plan run skipped (no worktree): ${planId}`,
        planId,
        severity: 'warning',
      });
      return;
    }

    if (result.loop && !result.loop.ok) {
      this.logger.warn(
        `Ralph loop failed: ${result.loop.reason}, planId=${planId}, jobId=${jobId}`,
        PlansProcessor.name,
      );
      this.notifications.emitQueueJobCompleted({
        jobType: 'plans',
        message: `Plan run failed: ${planId} — ${result.loop.reason}`,
        planId,
        severity: 'error',
      });
      return;
    }

    if (result.ensureCommit && !result.ensureCommit.ok) {
      this.logger.warn(
        `Ensure-commit failed: ${result.ensureCommit.reason}, planId=${planId}, jobId=${jobId}`,
        PlansProcessor.name,
      );
      this.notifications.emitQueueJobCompleted({
        jobType: 'plans',
        message: `Plan run: uncommitted or checks failed — ${planId}`,
        planId,
        severity: 'warning',
      });
      return;
    }

    this.logger.info(
      `Plan job finished: planId=${planId}, jobId=${jobId}, released=${result.released}`,
      PlansProcessor.name,
    );
    this.notifications.emitQueueJobCompleted({
      jobType: 'plans',
      message: `Plan run finished: ${planId}`,
      planId,
      severity: 'success',
    });
  }
}
```

- **`lockedBy: jobId`** ties the lock to the BullMQ job so release is correct and no other job can use the same target while this one runs.
- **`runLoop: (handoff) => runChildJob({ handoff, planId, iterations })`** is the pluggable loop: it runs Ralph in the worktree and returns `WorkflowLoopResult`.
- **`result.released`** is always `true` when acquire succeeded, so the target is never left locked.

## 4. Thread-safety and concurrency

- **Worktree path vs cwd:** The worktree flow is as safe as the legacy "process cwd" path for concurrency. All spawns use an **explicit cwd** from `handoff.worktreePath` (no `process.cwd()` or shared path). Flow: `runWorktreeWorkflow` → `runLoop(handoff)` → `runChildJob({ handoff })` uses `handoff.worktreePath` for pnpm and `git -C`; parent-job `ensureCommit` uses the same path. There is no shared mutable path between jobs.
- **Tracker:** The in-memory `WorktreeTargetsTracker` has a TOCTOU gap: `acquire()` is not atomic (between `getAvailableTarget()` and mutating the target). It is safe when only one job runs at a time (e.g. BullMQ `concurrency: 1`). `release(id, lockedBy)` is correctly scoped: only the same `lockedBy` can release; wrong owner or double-release fail.
- **Raising concurrency:** To run with `CONCURRENCY > 1`, use either a process-local mutex around acquire/release or a Redis-backed `IWorktreeTargetsTracker`. With an atomic tracker, the maximum safe concurrency is the **number of worktree targets** (one job per target).

## 5. In-memory vs Redis tracker

- **`WorktreeTargetsTracker`** is in-memory. It works when you have **one** worker process (e.g. `concurrency: 1` and a single Node process). All jobs in that process share the same tracker instance.
- For **multiple worker processes** (e.g. several API instances each running a plans worker), you need a **Redis-backed** implementation of `IWorktreeTargetsTracker` so every process sees the same lock state. The current plan did not add that; you’d implement `acquire`/`release`/`listTargets`/`getAvailableTarget` using Redis keys or a small library (e.g. Redlock) and register that implementation in the same way as the in-memory tracker.

## 6. Fallback when no worktrees are configured

If `WORKTREE_TARGETS` is empty, every job will get `acquire.ok === false` (no targets). You can:

- Keep the current “run Ralph in process cwd” behavior when the tracker has no targets (e.g. `if (this.tracker.listTargets().length === 0) { /* current spawn at workspace root */ }`), or
- Require worktrees and treat “no targets” as a skipped job (as in the example above).

## Summary

- Add **`@tools/workflows`** to the server.
- Provide **one** `IWorktreeTargetsTracker` (in-memory for single process, Redis for multi-worker) built from configured worktree paths.
- In the **BullMQ processor**, call **`runWorktreeWorkflow`** with `acquire.lockedBy: job.id`, **`runLoop: (handoff) => runChildJob({ handoff, planId })`**, and optional **`ensureCommit`**.
- Use **`result.acquire`**, **`result.loop`**, and **`result.ensureCommit`** to log and send notifications; **`result.released`** confirms the target was released.

**See also:** [Plans queue: reproducing job interrupted by server restart](./plans-queue-restart-reproduction.md) — steps to reproduce and observe BullMQ job state and Cortex plan status when the server restarts mid-job.
