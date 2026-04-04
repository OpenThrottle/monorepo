import type { WorkflowFlowContext } from './flow-context.js';

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

export type WorkflowStatus = 'finished' | 'failed';

/**
 * @description Terminal outcome of a workflow run (process exit semantics align with current Ralph CLI).
 */
export type WorkflowRunOutcome =
  | {
      readonly exitCode: 0;
      readonly reason: WorkflowFinishedReason;
      readonly status: 'finished';
    }
  | {
      readonly exitCode: 1;
      readonly reason: WorkflowFailedReason;
      readonly status: 'failed';
    };

/**
 * @description Minimal contract for future GraphQL-backed flows (no implementation in this phase).
 */
export interface WorkflowOrchestrator<
  TContext extends WorkflowFlowContext = WorkflowFlowContext,
> {
  /**
   * @description Runs the workflow until a terminal {@link WorkflowRunOutcome}.
   */
  readonly execute: (params: {
    readonly context: TContext;
  }) => Promise<WorkflowRunOutcome>;
}
