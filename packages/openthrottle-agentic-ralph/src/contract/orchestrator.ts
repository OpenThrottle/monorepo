import type { WorkflowRunResult as WorkflowRunResultBase } from '@openthrottle/openthrottle-agentic-workflow';
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

export type WorkflowRunResult = WorkflowRunResultBase<
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
   * @description Runs the workflow until a terminal {@link WorkflowRunResult}.
   */
  readonly execute: (params: {
    readonly context: TContext;
  }) => Promise<WorkflowRunResult>;
}
