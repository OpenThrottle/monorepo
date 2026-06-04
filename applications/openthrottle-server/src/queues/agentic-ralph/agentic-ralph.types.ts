import { WorkflowConfigRunner } from '@openthrottle/openthrottle-agentic-workflow';
import type {
  JobRunHooksConfig,
  RalphNestedRunTuningInput,
} from '@tools/workflows';

/**
 * @description Plan vs task-centric scope for in-process Ralph orchestrator runs. Matches `WorkflowMode` on
 * `WorkflowContext` in `@openthrottle/openthrottle-agentic-ralph`.
 */
export type RunPlanJobWorkflowMode = 'plan' | 'task';

/**
 * @description In-process GraphQL-backed Ralph (orchestrator) job on the `plans` queue. `runKind` must be
 * `orchestrator` so the worker uses `createWorkflowRalphOrchestrator` instead of spawning `workflow-ralph`.
 */
export interface RunPlanOrchestratorJobData {
  /**
   * Execution backend selected once for this run. Optional only for previously persisted BullMQ jobs.
   */
  readonly executionBackend?: WorkflowConfigRunner;
  /**
   * Lifecycle hooks copied from the plan (or enqueue override) at queue time.
   */
  readonly jobRunHooks?: JobRunHooksConfig;
  /**
   * @description Defaults to `plan` when omitted. When `task`, set `taskId` for task-centric runs.
   */
  readonly mode?: RunPlanJobWorkflowMode;
  readonly planId: string;
  /**
   * Optional Ralph runtime (argv-equivalent nested flags); see `RalphNestedRunTuningInput` in `@tools/workflows`.
   */
  readonly ralph?: RalphNestedRunTuningInput;
  readonly runKind: 'orchestrator';
  readonly taskId?: string;
  /**
   * Optional absolute path to a local project directory. When set, the orchestrator uses this as the
   * working directory instead of the monorepo root.
   */
  readonly workingDirectory?: string;
}

/**
 * @description Narrows to the in-process orchestrator payload. Safe for any object with optional `runKind`
 * and `planId` (including spawn payloads on the same queue).
 */
export const isRunPlanOrchestratorJobData = (data: {
  readonly planId: string;
  readonly runKind?: string;
}): data is RunPlanOrchestratorJobData => data.runKind === 'orchestrator';
