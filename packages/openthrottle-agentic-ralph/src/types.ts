export type WorkflowConfigDebug = 'debug' | 'omit' | 'verbose';
export type WorkflowConfigMode = 'plan' | 'task';

export interface WorkflowConfig {
  readonly debug: WorkflowConfigDebug;
  readonly iterationMax: number;
  readonly iterations: number;
  readonly iterationTimeout: number | undefined;
  readonly model: string;
  readonly prompt: string;
  readonly timeout: number | undefined;
}

/**
 * @description Stable error shape for workflow steps; callers map from transport or GraphQL errors.
 */
export interface WorkflowError {
  readonly cause: Error | undefined;
  readonly code: string;
  readonly message: string;
}

/**
 * @description Fields aligned with the developer app’s `WorkflowRalphRunOptionsInput` (argv / form).
 * {@link WorkflowRalphContext} extends this shape plus orchestration-only fields (`kind`, `mode`,
 * `iterations`).
 */
export interface WorkflowOptions extends WorkflowConfig {
  readonly mode: WorkflowConfigMode; // 🤠 (ralph specific)
  readonly planId: string; // 🤠 (ralph specific)
  readonly project: string | undefined; // 🤠 (ralph specific)
  readonly runner: 'RALPH'; // 🤠 (ralph only right now)
  readonly taskId: string; // 🤠 (ralph specific)
}

export type WorkflowStatus = 'failed' | 'finished';

/**
 * @description Terminal outcome of a workflow run (process exit semantics
 * align with current Ralph CLI).
 */
export type WorkflowRunOutcome<WorkflowFinishedReason, WorkflowFailedReason> =
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

export type WorkflowStepFailure<TStep extends string[] = string[]> = {
  readonly error: WorkflowError;
  readonly outcome: 'failure';
  readonly step: TStep;
};

export type WorkflowStepSuccess<
  TStep extends string[] = string[],
  TData extends Record<string, unknown> | undefined = undefined,
> = TData extends undefined
  ? { readonly step: TStep; readonly outcome: 'success' }
  : { readonly step: TStep; readonly outcome: 'success'; readonly data: TData };

// /**
//  * @description Minimal contract for future GraphQL-backed flows (no implementation in this phase).
//  */
// export interface WorkflowOrchestrator<
//   // TContext extends WorkflowFlowContext = WorkflowFlowContext,
//   TContext = unknown,
// > {
//   /**
//    * @description Runs the workflow until a terminal {@link WorkflowRunOutcome}.
//    */
//   readonly execute: (params: {
//     readonly context: TContext;
//   }) => Promise<WorkflowRunOutcome<any, any>>;
// }
