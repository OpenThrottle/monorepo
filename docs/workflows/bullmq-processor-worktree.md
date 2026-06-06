# Using the worktree workflow in BullMQ job processors

> **Which path runs when?** The worktree workflow applies to the **Plans queue — spawn (legacy opt-in)**
> surface when `WORKTREE_TARGETS` is set and jobs run with `runKind: 'spawn'` (or
> `OPENTHROTTLE_DEFAULT_RUN_KIND=spawn`). The **default** queued path is the **in-process orchestrator**
> (`AgenticRalphOrchestratorService`), which does not use `runWorktreeWorkflow` or the tracker.
> For the single canonical decision table across all three surfaces (Local CLI / spawn / orchestrator),
> see
> [tools/workflows/README.md → Which path runs when](../../tools/workflows/README.md#which-path-runs-when-canonical-decision-table)
> and the full map in
> [ralph-execution-paths-and-package-layering.md](./ralph-execution-paths-and-package-layering.md).

The worktree + BullMQ workflow from plan `2f94f33c` (fan-out/fan-in) can be used **inside** a BullMQ job processor so each job acquires a worktree, runs the loop (e.g. Ralph), ensures commit, then releases the target.

**Run transcripts on disk:** OpenThrottle’s API workers can mirror Ralph `stdout`/`stderr` to per-job JSONL when `OT_BULLMQ_RUN_OUTPUT_DIR` is set (see `packages/nestjs-logging` README, section “BullMQ per-job run transcripts”, and [bullmq-run-output-spec.md](../../packages/nestjs-logging/docs/bullmq-run-output-spec.md)).

**Execution backend (Cursor vs Claude Code):** Plan jobs carry optional `ralph` tuning from GraphQL (`RalphNestedRunTuningInput`), including **`backend`** (`cursor` \| `claude`). The spawn path turns that into `--backend` on nested `workflow-ralph` when non-default, and merges persisted plan-run execution backend when tuning omits it — **one** runner for the whole nested run, matching local CLI semantics. See `applications/openthrottle-server/src/queues/plans/plans.types.ts` and [`tools/workflows/README.md`](../../tools/workflows/README.md) § Worktree + BullMQ workflow.

## Package overview

[`@openthrottle/nestjs-worktrees`](../../packages/nestjs-worktrees/README.md) ships **local aligned copies** of the worktree workflow (`runWorktreeWorkflow`, parent-job helpers, types) — not thin re-exports from `@tools/workflows`. The Nest module provides a **mutex-wrapped** `IWorktreeTargetsTracker` from `WORKTREE_TARGETS`. For production spawn parity (nested spawn env, streaming, abort/timeout), import `runChildJob` and spawn helpers from `@tools/workflows` directly.

| Import from                      | Use for                                                                                                                                                                     |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@openthrottle/nestjs-worktrees` | `NestjsWorktreesModule`, `WORKTREE_TRACKER_TOKEN`, `runWorktreeWorkflow`, types (`IWorktreeTargetsTracker`, `WorktreeWorkflowResult`, …), optional simplified `runChildJob` |
| `@tools/workflows`               | `runChildJob` (streaming spawn + nested env), `buildNestedWorkflowRalphSpawnEnv`, `loadWorkflowRalphConfig`, Ralph tuning argv helpers                                      |

## 1. Add dependency

This is a **private workspace package**. Add it in your app's `package.json`:

```json
"dependencies": {
  "@openthrottle/nestjs-worktrees": "workspace:*"
}
```

Then install and build (consumers resolve `dist/` exports):

```bash
pnpm install
pnpm nx run @openthrottle/nestjs-worktrees:build
```

## 2. Provide a shared tracker and worktree paths

Import `NestjsWorktreesModule` in the module that registers your queue (e.g. `PlansQueueModule`). The module is `@Global()` and provides `WORKTREE_TRACKER_TOKEN` with a **mutex-wrapped** tracker built from the `WORKTREE_TARGETS` env var (JSON array of `[id, path]` tuples or `{ id, path }` objects). No extra factory needed.

See [`packages/nestjs-worktrees/README.md`](../../packages/nestjs-worktrees/README.md) for module wiring and `WORKTREE_TARGETS` format.

## 3. Use `runWorktreeWorkflow` in the processor

In a spawn-path processor, inject the tracker and call the workflow from `process(job)`. **Live reference:** `applications/openthrottle-server/src/queues/plans/plans.processor.backup.ts` (legacy spawn + worktree). The current `plans.processor.ts` is orchestrator-only and does not use this workflow.

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
    const { planId } = job.data;
    const jobId = String(job.id);

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
      // No target available — handle skip/retry
      return;
    }

    if (result.loop && !result.loop.ok) {
      // Ralph loop failed
      return;
    }

    if (result.ensureCommit && !result.ensureCommit.ok) {
      // Uncommitted changes or checks failed
      return;
    }

    // result.released is true when acquire succeeded
  }
}
```

- **`lockedBy: jobId`** ties the lock to the BullMQ job so release is correct and no other job can use the same target while this one runs.
- **`runLoop: (handoff) => runChildJob({ handoff, planId, iterations })`** is the pluggable loop: use **`runChildJob` from `@tools/workflows`** for production spawn env and streaming; the copy exported by `@openthrottle/nestjs-worktrees` is a simplified `spawnSync` variant.
- **`result.released`** is always `true` when acquire succeeded, so the target is never left locked.

Other live consumers inject the tracker without running the workflow — e.g. `system-metrics.service.ts` reads active worktree locks for metrics.

## 4. Thread-safety and concurrency

- **Worktree path vs cwd:** The worktree flow is as safe as the legacy "process cwd" path for concurrency. All spawns use an **explicit cwd** from `handoff.worktreePath` (no `process.cwd()` or shared path). Flow: `runWorktreeWorkflow` → `runLoop(handoff)` → `runChildJob({ handoff })` uses `handoff.worktreePath` for pnpm and `git -C`; parent-job `ensureCommit` uses the same path. There is no shared mutable path between jobs.
- **Agent CLI `--worktree`:** Nested `workflow-ralph` forwards `--worktree <targetId>` by default (overridable via `ralph.worktree` on enqueue). Iterations pass `-w` / `--worktree` to cursor-agent and claude when configured. See [ralph-worktree-flag.md](./ralph-worktree-flag.md).
- **Tracker:** `NestjsWorktreesModule` wraps the in-memory tracker with `MutexWorktreeTargetsTracker` (`async-mutex`) so acquire/release are safe when BullMQ `concurrency > 1` within a single worker process. The base in-memory tracker still has a TOCTOU gap without the mutex; `release(id, lockedBy)` is correctly scoped: only the same `lockedBy` can release; wrong owner or double-release fail.
- **Raising concurrency:** With the mutex-wrapped tracker, safe concurrency within one worker is bounded by the **number of worktree targets**. For **multiple worker processes**, use a Redis-backed `IWorktreeTargetsTracker` so every process sees the same lock state.

## 5. In-memory vs Redis tracker

- **`NestjsWorktreesModule`** builds an in-memory `WorktreeTargetsTracker` from env and wraps it with a process-local mutex. It works when you have **one** worker process (or several jobs in one process with concurrency ≤ target count).
- For **multiple worker processes** (e.g. several API instances each running a plans worker), you need a **Redis-backed** implementation of `IWorktreeTargetsTracker` so every process sees the same lock state. The current plan did not add that; you’d implement `acquire`/`release`/`listTargets`/`getAvailableTarget` using Redis keys or a small library (e.g. Redlock) and register that implementation in the same way as the in-memory tracker.

## 6. Fallback when no worktrees are configured

If `WORKTREE_TARGETS` is empty, every job will get `acquire.ok === false` (no targets). On the legacy spawn path you can:

- Keep the “run Ralph in process cwd” behavior when the tracker has no targets (e.g. `if (this.tracker.listTargets().length === 0) { /* spawn at workspace root */ }`), or
- Require worktrees and treat “no targets” as a skipped job.

See [tools/workflows/README.md → Legacy spawn skips ensureCommit](../../tools/workflows/README.md#legacy-spawn-skips-ensurecommit-configure-worktree_targets-for-post-run-checks) for how `WORKTREE_TARGETS` affects post-run `ensureCommit` on spawn jobs.

## Summary

- Add **`@openthrottle/nestjs-worktrees`** for the Nest module, workflow shell, and mutex-wrapped tracker; add **`@tools/workflows`** when you need production **`runChildJob`** and spawn env helpers.
- Import **`NestjsWorktreesModule`** once (e.g. in `PlansQueueModule`); inject **`WORKTREE_TRACKER_TOKEN`** as **`IWorktreeTargetsTracker`**.
- On the **legacy spawn** processor path, call **`runWorktreeWorkflow`** with `acquire.lockedBy: job.id`, **`runLoop: (handoff) => runChildJob({ handoff, planId })`** (from `@tools/workflows`), and optional **`ensureCommit`**.
- Use **`result.acquire`**, **`result.loop`**, and **`result.ensureCommit`** to log and notify; **`result.released`** confirms the target was released.

**See also:**

- [`@openthrottle/nestjs-worktrees` README](../../packages/nestjs-worktrees/README.md) — installation, injection, import split, canonical example links
- [Worktree registration and allocation](../../tools/workflows/docs/worktree-registration-and-allocation.md)
- [Plans queue: reproducing job interrupted by server restart](./plans-queue-restart-reproduction.md) — steps to reproduce and observe BullMQ job state and Cortex plan status when the server restarts mid-job
