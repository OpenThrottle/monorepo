import type { WorkflowRunOutcome as WorkflowRunOutcomeBase } from '../types.js';
import type { WorkflowFlowContext } from './flow-context.js';

export type WorkflowFailedReason =
  | 'agent_error'
  | 'input_required'
  | 'unhandled';

export type WorkflowFinishedReason =
  | 'agent_complete'
  | 'cancelled'
  | 'max_iterations'
  | 'plan_already_terminal'
  | 'tasks_exhausted';

export type WorkflowRunOutcome = WorkflowRunOutcomeBase<
  WorkflowFinishedReason,
  WorkflowFailedReason
>;

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
