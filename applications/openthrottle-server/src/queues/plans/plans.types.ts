import type { WorktreeWorkflowResult } from '@openthrottle/nestjs-worktrees';
import type { WorkflowFinishedReason } from '@openthrottle/openthrottle-agentic-loop';
import type {
  ChildProcessMetrics,
  JobRunHooksConfig,
  PlanRunTuningSettings,
  WallClockMetrics,
  WorkflowConfigRunner,
} from '@openthrottle/openthrottle-agentic-utils';
import type {
  PlanRunConfigOtLoop,
  PlanRunContainmentProfile,
} from '@openthrottle/openthrottle-plan-config';
import type { Job } from 'bullmq';

import type { TaskRunMetrics } from '../../metrics/process-metrics/process-metrics.types.ts';

/**
 * @description Plan vs task-centric scope for a plan-run job. Matches the `mode` GraphQL enum.
 */
export type RunPlanJobWorkflowMode = 'plan' | 'task';

/**
 * @description The BullMQ payload of a plan run on the `plans` queue. `runKind` must be
 * `orchestrator`: the run executes in-process through OT Loop, never as a spawned child.
 */
export interface RunPlanOrchestratorJobData {
  /**
   * Containment profile resolved from the plan's run config at enqueue. Optional only for previously
   * persisted BullMQ jobs, which run under the default profile.
   */
  readonly containment?: PlanRunContainmentProfile;
  /**
   * Driver selected once for this run. Optional only for previously persisted BullMQ jobs.
   */
  readonly driver?: WorkflowConfigRunner;
  /**
   * Lifecycle hooks copied from the plan (or enqueue override) at queue time.
   */
  readonly jobRunHooks?: JobRunHooksConfig;
  /**
   * @description Defaults to `plan` when omitted. When `task`, set `taskId` for task-centric runs.
   */
  readonly mode?: RunPlanJobWorkflowMode;
  /**
   * OT Loop run tuning (docs/workflows/ot-loop-job.md § 1).
   */
  readonly otLoop?: PlanRunConfigOtLoop;
  readonly planId: string;
  readonly runKind: 'orchestrator';
  readonly taskId?: string;
  /**
   * Run tuning: OT Loop reads the driver, model, effort, worktree name and timeout from it.
   */
  readonly tuning?: PlanRunTuningSettings;
  /**
   * Optional absolute path to a local project directory. When set, the run uses this as the
   * working directory instead of the monorepo root.
   */
  readonly workingDirectory?: string;
}

/**
 * ## Plans queue job shape (design)
 *
 * **Queue:** A single BullMQ queue (`PLANS_QUEUE_NAME`, `plans`): plan status reconciliation,
 * cancellation by `planId`, health, and Bull Board all key off it.
 *
 * **Run kind:** Every queued run is now an in-process orchestrator run (`runKind: 'orchestrator'`).
 * `PlansProcessor` runs every job through `OtLoopOrchestratorService` (OT Loop) with
 * worker-scoped `executeGraphqlV2` — no child process. `enqueuePlanRun` routes through the
 * orchestrator enqueue.
 *
 * **Tuning:** `tuning` is {@link PlanRunTuningSettings}; OT Loop reads the driver, model, effort,
 * worktree name and timeout from it. `mode` / `taskId` give task-centric runs.
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

/** The task fields `countPlanTasks` reads: status plus the hook identity that routes a task. */
export interface PlanTaskOutcomeFields {
  readonly hookRole: string | null;
  readonly hookSource: string | null;
  readonly parentTaskId: string | null;
  readonly status: string;
}

/**
 * @description How much of a plan an agent run can still move. `workable` tasks are ones an iteration
 * can pick (PENDING / QUEUED / IN_PROGRESS); `remaining` adds BLOCKED, which keeps a plan from
 * COMPLETED although only a human can move it. Runner-executed hook tasks count as neither.
 */
export interface PlanTaskCounts {
  readonly blocked: number;
  readonly remaining: number;
  readonly workable: number;
}

/** A plan status the server settles a plan with no running job into. */
export type PlanSettleStatus = 'BLOCKED' | 'COMPLETED' | 'QUEUED';

/** Input to `buildFinishedRunNotification`. */
export interface FinishedRunNotificationInput {
  readonly counts: PlanTaskCounts;
  readonly planId: string;
  readonly planStatus: string | null;
  readonly prNumber: number | undefined;
  readonly reason: WorkflowFinishedReason;
}

/** The queue-job-completed notification for a finished run. */
export interface FinishedRunNotification {
  readonly message: string;
  readonly severity: 'success' | 'warning';
}
