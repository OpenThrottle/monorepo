import type {
  WorkflowConfig,
  WorkflowRunResult as WorkflowRunResultBase,
  WorkflowOrchestrator as WorkflowOrchestratorBase,
} from '@openthrottle/openthrottle-agentic-workflow';

export type WorkflowFinishedReason =
  | 'agent_complete'
  | 'cancelled'
  | 'max_iterations'
  | 'plan_already_terminal'
  | 'tasks_exhausted';

export type WorkflowFailedReason =
  | 'agent_error'
  | 'input_required'
  | 'unhandled';

/**
 * @description Fields aligned with the developer app’s `WorkflowRalphRunOptionsInput` (argv / form).
 * {@link WorkflowRalphContext} extends this shape plus orchestration-only fields (`kind`, `mode`,
 * `iterations`).
 */
export interface WorkflowContext extends WorkflowConfig {
  /**
   * When set (e.g. BullMQ worker + in-process abort controller), forwarded to each iteration and
   * checked between steps so user cancel matches the spawn-path behavior.
   */
  readonly abortSignal?: AbortSignal;

  // 🤠 - agentic ralph workflow specifics
  readonly kind: 'ralph';
  readonly mode: 'plan' | 'task';
  readonly planId: string;
  readonly project: string | undefined;
  readonly runner: 'RALPH';
  readonly taskId: string;
}

/**
 * @description Terminal outcome of a workflow run (process exit semantics
 * align with current Ralph CLI).z
 */
export type WorkflowRunResult = WorkflowRunResultBase<
  WorkflowFinishedReason,
  WorkflowFailedReason
>;

/**
 * @description Create an Orchestrator type for Ralph workflow customized
 * with the Ralph-specific context(s) and results. Now this package can
 * implement its own Ralph orchestrator.
 */
export type WorkflowOrchestrator = WorkflowOrchestratorBase<
  WorkflowFinishedReason,
  WorkflowFailedReason,
  WorkflowContext
>;
