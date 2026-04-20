import type { Job, Queue } from 'bullmq';
import type { WorktreeWorkflowResult } from '@openthrottle/nestjs-worktrees';
import type {
  ChildProcessMetrics,
  RalphNestedRunTuningInput,
  WallClockMetrics,
} from '@tools/workflows';
import type { TaskRunMetrics } from '../../metrics/process-metrics.types';

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
 * **Tuning:** `ralph` is always {@link RalphNestedRunTuningInput} (argv-equivalent nested flags).
 * Map to {@link WorkflowRalphContext} via `buildRalphFlowContextFromPlanRunTuning` in
 * `@openthrottle/openthrottle-workflows` (orchestrator path) or `buildWorkflowRalphRunTuningArgv`
 * (spawn path), consistent with GraphQL enqueue and `tools/workflows` CLI.
 *
 * **Migration from CLI-only / spawn-only:** Existing persisted jobs `{ planId, ralph? }` remain
 * valid spawn payloads. New code that enqueues orchestrator runs sets `runKind: 'orchestrator'`.
 * Product default can stay spawn until orchestrator is wired; local `pnpm exec workflow-ralph`
 * remains unchanged for out-of-band runs.
 */
export interface RunPlanSpawnJobData {
  readonly planId: string;
  /**
   * Optional Ralph runtime (layers 1–3): prompt profile, execution backend, run tuning.
   * When omitted, nested `workflow-ralph` uses env / `.workflow-ralph.json` in the worktree or workspace cwd (same precedence as manual CLI).
   */
  readonly ralph?: RalphNestedRunTuningInput;
  /**
   * Explicit spawn path; omit for backward compatibility (treated as spawn).
   */
  readonly runKind?: 'spawn';
}

/**
 * In-process GraphQL-backed Ralph (orchestrator) job. `runKind` must be `orchestrator`
 * so the worker uses `createWorkflowRalphOrchestrator` instead of spawning `workflow-ralph`.
 */
export interface RunPlanOrchestratorJobData {
  readonly mode?: 'plan' | 'task';
  readonly planId: string;
  readonly ralph?: RalphNestedRunTuningInput;
  readonly runKind: 'orchestrator';
  readonly taskId?: string;
}

export type RunPlanJobData = RunPlanSpawnJobData | RunPlanOrchestratorJobData;

/**
 * Narrows to orchestrator payload for the plans worker.
 */
export const isRunPlanOrchestratorJobData = (
  data: RunPlanJobData,
): data is RunPlanOrchestratorJobData => data.runKind === 'orchestrator';

/**
 * Additional metrics captured from the child job (runChildJob).
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
