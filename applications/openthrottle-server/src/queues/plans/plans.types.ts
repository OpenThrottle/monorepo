import type { Job } from 'bullmq';
import type { WorktreeWorkflowResult } from '@openthrottle/nestjs-worktrees';
import type {
  ChildProcessMetrics,
  WallClockMetrics,
} from '@openthrottle/openthrottle-agentic-utils';
import type { TaskRunMetrics } from '../../metrics/process-metrics.types';
import type { RunPlanOrchestratorJobData } from '../agentic-ralph/agentic-ralph.types';
import { isRunPlanOrchestratorJobData } from '../agentic-ralph/agentic-ralph.types';

export type { RunPlanOrchestratorJobData };
export { isRunPlanOrchestratorJobData };

/**
 * ## Plans queue job shape (design)
 *
 * **Queue:** A single BullMQ queue (`PLANS_QUEUE_NAME`, `plans`): plan status reconciliation,
 * cancellation by `planId`, health, and Bull Board all key off it.
 *
 * **Run kind:** Every queued run is now an in-process orchestrator run (`runKind: 'orchestrator'`).
 * `PlansProcessor` uses `AgenticRalphOrchestratorService` (`createWorkflowRalphOrchestrator` from
 * `@openthrottle/openthrottle-agentic-ralph`) with worker-scoped `executeGraphqlV2` and an in-process
 * `iterationRunner` — no child `workflow-ralph` process. The legacy nested-`workflow-ralph` spawn
 * worker path was removed (OT plan 2ab62876); `enqueuePlanRun` routes through the orchestrator.
 *
 * **Tuning:** `ralph` is always {@link RalphNestedRunTuningInput} (argv-equivalent nested flags),
 * mapped to workflow context via `buildRalphFlowContextFromPlanRunTuning`. `mode` / `taskId` give
 * task-centric parity with CLI `--task`. Local `pnpm exec workflow-ralph` remains for out-of-band runs.
 */
export type RunPlanJobData = RunPlanOrchestratorJobData;

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
