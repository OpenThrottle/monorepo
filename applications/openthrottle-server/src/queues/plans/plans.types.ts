import type { Job } from 'bullmq';
import type { WorktreeWorkflowResult } from '@openthrottle/nestjs-worktrees';
import type {
  ChildProcessMetrics,
  JobRunHooksConfig,
  RalphExecutionBackendId,
  RalphNestedRunTuningInput,
  WallClockMetrics,
} from '@tools/workflows';
import type { TaskRunMetrics } from '../../metrics/process-metrics.types';
import type { RunPlanOrchestratorJobData } from '../agentic-ralph/agentic-ralph.types';
import { isRunPlanOrchestratorJobData } from '../agentic-ralph/agentic-ralph.types';

export type { RunPlanOrchestratorJobData };
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
 * - **Orchestrator:** `runKind: 'orchestrator'`. Worker uses `AgenticRalphOrchestratorService` from
 *   `queues/agentic-ralph` (`createWorkflowRalphOrchestrator` from `@openthrottle/openthrottle-agentic-ralph`) with
 *   worker-scoped `executeGraphqlV2` and an in-process `iterationRunner` (no child `workflow-ralph`
 *   process). Use optional `mode` / `taskId` for task-centric parity with CLI `--task`.
 *
 * **Tuning:** `ralph` is always {@link RalphNestedRunTuningInput} (argv-equivalent nested flags).
 * Map to workflow context via `buildRalphFlowContextFromPlanRunTuning` in
 * `@openthrottle/openthrottle-agentic-ralph` (orchestrator path) or `buildWorkflowRalphRunTuningArgv`
 * (spawn path), consistent with GraphQL enqueue and `tools/workflows` CLI.
 *
 * **Migration from CLI-only / spawn-only:** Existing persisted jobs `{ planId, ralph? }` remain
 * valid spawn payloads. New code that enqueues orchestrator runs sets `runKind: 'orchestrator'`.
 * Product default can stay spawn until orchestrator is wired; local `pnpm exec workflow-ralph`
 * remains unchanged for out-of-band runs.
 */
export interface RunPlanSpawnJobData {
  /**
   * Execution backend selected once for this run. Optional only for previously persisted BullMQ jobs.
   */
  readonly executionBackend?: RalphExecutionBackendId;
  /**
   * Lifecycle hooks copied from the plan (or enqueue override) at queue time.
   */
  readonly jobRunHooks?: JobRunHooksConfig;
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
  /**
   * Optional absolute path to a local project directory. When set, the worker uses this as the
   * cwd for spawning workflow-ralph instead of the monorepo root (WORKSPACE_ROOT / process.cwd()).
   * Validated at enqueue time: must be an existing directory.
   */
  readonly workingDirectory?: string;
}

export type RunPlanJobData = RunPlanSpawnJobData | RunPlanOrchestratorJobData;

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
export type PlanRunJobResult =
  | (WorktreeWorkflowResult &
      ChildJobMetrics & { readonly taskRunMetrics?: TaskRunMetrics })
  | { readonly taskRunMetrics: TaskRunMetrics };

export type RunPlanJob = Job<RunPlanJobData, PlanRunJobResult | void>;
