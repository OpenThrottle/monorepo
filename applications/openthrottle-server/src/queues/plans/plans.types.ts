import type { Job, Queue } from 'bullmq';
import type { WorktreeWorkflowResult } from '@openthrottle/nestjs-worktrees';
import type {
  ChildProcessMetrics,
  RalphNestedRunTuningInput,
  WallClockMetrics,
} from '@tools/workflows';
import type { TaskRunMetrics } from '../../metrics/process-metrics.types';

export interface RunPlanJobData {
  readonly planId: string;
  /**
   * Optional Ralph runtime (layers 1–3): prompt profile, execution backend, run tuning.
   * When omitted, nested `workflow-ralph` uses env / `.workflow-ralph.json` in the worktree or workspace cwd (same precedence as manual CLI).
   */
  readonly ralph?: RalphNestedRunTuningInput;
}

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

export type PlansQueue = Queue<RunPlanJobData, PlanRunJobResult | void>;

export type RunPlanJob = Job<RunPlanJobData, PlanRunJobResult | void>;
