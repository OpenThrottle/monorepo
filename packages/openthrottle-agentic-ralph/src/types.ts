import type { WorkflowConfig } from '@openthrottle/openthrottle-agentic-workflow';
import type { WorkflowRunResult as WorkflowRunResultBase } from '@openthrottle/openthrottle-agentic-workflow';

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
export interface WorkflowOptions extends WorkflowConfig {
  readonly mode: 'plan' | 'task'; // 🤠 (ralph specific)
  readonly planId: string; // 🤠 (ralph specific)
  readonly project: string | undefined; // 🤠 (ralph specific)
  readonly runner: 'RALPH'; // 🤠 (ralph only right now)
  readonly taskId: string; // 🤠 (ralph specific)
}

/**
 * @description Immutable snapshot of inputs driving the Ralph-shaped orchestration (compare
 * the `main` function in `tools/workflows/src/bin/ralph.ts`). Extends {@link WorkflowOptions}
 * with `kind`, `mode`, and effective `iterations` after CLI rules.
 */
export interface WorkflowRalphContext extends WorkflowOptions {
  /**
   * When set (e.g. BullMQ worker + in-process abort controller), forwarded to each iteration and
   * checked between steps so user cancel matches the spawn-path behavior.
   */
  readonly abortSignal?: AbortSignal;
  readonly kind: 'ralph';
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
export interface WorkflowOrchestrator {
  /**
   * @description Runs the workflow until a terminal {@link WorkflowRunResult}.
   */
  readonly execute: (params: {
    readonly context: WorkflowRalphContext;
  }) => Promise<WorkflowRunResult>;
}
