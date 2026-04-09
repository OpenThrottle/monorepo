import type { WorkflowConfig } from '@openthrottle/openthrottle-agentic-workflow';
import type { WorkflowRunResult as WorkflowRunResultBase } from '@openthrottle/openthrottle-agentic-workflow';
import {
  WorkflowFailedReason,
  WorkflowFinishedReason,
} from './contract/orchestrator';

/**
 * @description Fields aligned with the developer app’s `WorkflowRalphRunOptionsInput` (argv / form).
 * {@link WorkflowRalphContext} extends this shape plus orchestration-only fields (`kind`, `mode`,
 * `iterations`).
 */
export interface WorkflowOptions extends WorkflowConfig {
  readonly mode: 'plan' | 'task'; // 🤠 (ralph specific)
  readonly planId: string; // 🤠 (ralph specific)
  readonly project: string | undefined; // 🤠 (ralph specific)
  readonly runner: 'RALPH'; // 🤠 (ralph only right now)
  readonly taskId: string; // 🤠 (ralph specific)
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
 * @description Minimal contract for future GraphQL-backed flows (no implementation in this phase).
 */
export interface WorkflowOrchestrator<
  // TContext extends WorkflowFlowContext = WorkflowFlowContext,
  TContext = unknown,
> {
  /**
   * @description Runs the workflow until a terminal {@link WorkflowRunResult}.
   */
  readonly execute: (params: {
    readonly context: TContext;
  }) => Promise<WorkflowRunResult>;
}
