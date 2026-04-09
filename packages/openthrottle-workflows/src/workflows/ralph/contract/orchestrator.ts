import type { WorkflowRunResult as WorkflowRunResultBase } from '@openthrottle/openthrottle-agentic-workflow';
import type { WorkflowRalphContext } from './flow-context.js';

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
 * @description Terminal outcome of a workflow run (process exit semantics
 * align with current Ralph CLI).
 */
export type LegacyWorkflowResult = WorkflowRunResultBase<
  WorkflowFinishedReason,
  WorkflowFailedReason
>;

/**
 * @description Minimal contract for future GraphQL-backed flows (no implementation in this phase).
 */
export interface WorkflowOrchestrator {
  /**
   * @description Runs the workflow until a terminal {@link LegacyWorkflowResult}.
   */
  readonly execute: (params: {
    readonly context: WorkflowRalphContext;
  }) => Promise<LegacyWorkflowResult>;
}
