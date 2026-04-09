/**
 * @description The workflow config is meant to be common across any of
 * our "agentic" workflows. Each workflow can and will have their own
 * own set of config, but the common config will be used to create the workflow.
 */
export interface WorkflowConfig {
  readonly debug: 'debug' | 'omit' | 'verbose';
  readonly iterationMax: number;
  readonly iterations: number;
  readonly iterationTimeout: number | undefined;
  readonly model: string;
  readonly prompt: string;
  readonly timeout: number | undefined;
}

/**
 * @description Stable error shape for workflow steps; callers map from
 * transport or GraphQL errors.
 */
export interface WorkflowError {
  readonly cause: Error | undefined;
  readonly code: string;
  readonly message: string;
}

// /**
//  * @description Fields aligned with the developer app’s `WorkflowRalphRunOptionsInput` (argv / form).
//  * {@link WorkflowRalphContext} extends this shape plus orchestration-only fields (`kind`, `mode`,
//  * `iterations`).
//  */
// export interface WorkflowOptions extends WorkflowConfig {
//   readonly mode: 'plan' | 'task'; // 🤠 (ralph specific)
//   readonly planId: string; // 🤠 (ralph specific)
//   readonly project: string | undefined; // 🤠 (ralph specific)
//   readonly runner: 'RALPH'; // 🤠 (ralph only right now)
//   readonly taskId: string; // 🤠 (ralph specific)
// }

/**
 * @description Terminal outcome of a workflow run (process exit semantics
 * align with current Ralph CLI).
 */
export type WorkflowRunResult<WorkflowFinishedReason, WorkflowFailedReason> =
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
 *
 *
 *      WORKFLOW STEP(S)
 *
 *
 */

export type WorkflowStepFailure<TStep extends string = string> = {
  readonly error: WorkflowError;
  readonly outcome: 'failure';
  readonly step: TStep;
};

export type WorkflowStepSuccess<
  TStep extends string = string,
  TData extends Record<string, unknown> | undefined = undefined,
> = TData extends undefined
  ? { readonly step: TStep; readonly outcome: 'success' }
  : { readonly step: TStep; readonly outcome: 'success'; readonly data: TData };

/**
 *
 *
 *      WORKFLOW ORCHESTRATOR
 *
 *
 */

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
  }) => Promise<WorkflowRunResult<any, any>>;
}
