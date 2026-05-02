import type { Job, Queue } from 'bullmq';
import type { WorktreeWorkflowResult } from '@openthrottle/nestjs-worktrees';
import type { ChildProcessMetrics, WallClockMetrics } from '@tools/workflows';
import type { TaskRunMetrics } from '../../metrics/process-metrics.types';
import type {
  RunPlanJobData,
  RunPlanOrchestratorJobData,
  RunPlanSpawnJobData,
} from '../plans/plans.types';
import { isRunPlanOrchestratorJobData } from '../plans/plans.types';

export type { RunPlanOrchestratorJobData, RunPlanSpawnJobData, RunPlanJobData };
export { isRunPlanOrchestratorJobData };

/**
 * ## Plans queue job shape (design)
 *
 * **Queue:** Keep a single BullMQ queue (`PLANS_QUEUE_NAME`, `plans`). Do not add a separate queue
 * for in-process Ralph: plan status reconciliation, cancellation by `planId`, health, and Bull Board
 * already key off this queue; a second queue would duplicate registration and operational surface.
 *
 * **Discriminant:** Use {@link RunPlanJobData.runKind}:
 * - **Spawn (default / legacy):** Omit `runKind` or set `runKind: 'spawn'`. Worker runs nested
 *   `pnpm exec workflow-ralph --plan <planId>` (worktree workflow when `WORKTREE_TARGETS` is set;
 *   legacy cwd spawn otherwise). Same behavior as today.
 * - **Orchestrator:** `runKind: 'orchestrator'`. Worker calls
 *   `createWorkflowRalphOrchestrator` with server-side `executeGraphqlV2` and an in-process
 *   `iterationRunner` (no child `workflow-ralph` process). Use optional `mode` / `taskId` for
 *   task-centric parity with CLI `--task` and {@link WorkflowRalphContext}.
 *
 * **Tuning:** `ralph` is always `RalphNestedRunTuningInput` from `@tools/workflows` (argv-equivalent nested flags).
 * Map to {@link WorkflowRalphContext} via `buildRalphFlowContextFromPlanRunTuning` in
 * `@openthrottle/openthrottle-workflows` (orchestrator path) or `buildWorkflowRalphRunTuningArgv`
 * (spawn path), consistent with GraphQL enqueue and `tools/workflows` CLI.
 *
 * **Migration from CLI-only / spawn-only:** Existing persisted jobs `{ planId, ralph? }` remain
 * valid spawn payloads. New code that enqueues orchestrator runs sets `runKind: 'orchestrator'`.
 * Product default can stay spawn until orchestrator is wired; local `pnpm exec workflow-ralph`
 * remains unchanged for out-of-band runs.
 */

/**
 * @description Additional metrics captured from the child job (runChildJob).
 * childProcessMetrics: peak/avg CPU%, peak/avg RSS from pidusage polling.
 * wallClockMetrics: wall-clock duration vs CPU time (ratio, interpretation).
 */
interface ChildJobMetrics {
  readonly childProcessMetrics?: ChildProcessMetrics;
  readonly wallClockMetrics?: WallClockMetrics;
}

/**
 * Job return value: worktree workflow result (with optional task-run metrics and child job metrics) or
 * metrics-only when running in process cwd (legacy path). taskRunMetrics is captured
 * at job start and end so "CPU and memory while running" can be reported.
 * childProcessMetrics and wallClockMetrics are captured from runChildJob for detailed resource usage.
 */
export type WorkflowJobResult =
  | (WorktreeWorkflowResult &
      ChildJobMetrics & { readonly taskRunMetrics?: TaskRunMetrics })
  | { readonly taskRunMetrics: TaskRunMetrics };

export type WorkflowQueue = Queue<RunPlanJobData, WorkflowJobResult | void>;
export type WorkflowJob = Job<RunPlanJobData, WorkflowJobResult | void>;
