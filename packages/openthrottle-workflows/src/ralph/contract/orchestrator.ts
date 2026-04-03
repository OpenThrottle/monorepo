import type { WorkflowFlowContext } from './flow-context';

/**
 * @description Terminal outcome of a workflow run (process exit semantics align with current Ralph CLI).
 */
export type WorkflowRunOutcome =
  | {
      readonly status: 'finished';
      readonly exitCode: 0;
      readonly reason:
        | 'agent_complete'
        | 'max_iterations'
        | 'plan_already_terminal'
        | 'tasks_exhausted';
    }
  | {
      readonly status: 'failed';
      readonly exitCode: 1;
      readonly reason: 'agent_error' | 'input_required' | 'unhandled';
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
