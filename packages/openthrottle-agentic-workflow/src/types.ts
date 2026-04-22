/**
 * @description The workflow config is meant to be common across all of
 * our "agentic" workflows. Each workflow can and will have its own
 * set of config, these are the common configurations options to drive
 * our workflows (e.g. model, prompt, timeouts, etc.)
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

/**
 * An example of what the 'openthrottle-agentic-ralph' workflow might look like.
 */
// export interface WorkflowOptions extends WorkflowConfig {
//   readonly mode: 'plan' | 'task'; // 🤠 (ralph specific)
//   readonly planId: string; // 🤠 (ralph specific)
//   readonly project: string | undefined; // 🤠 (ralph specific)
//   readonly taskId: string; // 🤠 (ralph specific)
// }

/**
 * Terminal outcome of a workflow run
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
 * @description Immutable snapshot of inputs driving the workflow.
 */
export interface WorkflowFlowContext extends WorkflowConfig {
  /**
   * When set (e.g. BullMQ worker + in-process abort controller), forwarded to each iteration and
   * checked between steps so user cancel matches the spawn-path behavior.
   */
  readonly abortSignal?: AbortSignal;
}

/**
 * @description Minimal contract for future GraphQL-backed flows (no implementation in this phase).
 */
export interface WorkflowOrchestrator<
  WorkflowFinishedReason,
  WorkflowFailedReason,
  TContext extends WorkflowFlowContext = WorkflowFlowContext,
> {
  /**
   * @description Runs the workflow until a terminal {@link WorkflowRunResult}.
   */
  readonly execute: (params: {
    readonly context: TContext;
  }) => Promise<
    WorkflowRunResult<WorkflowFinishedReason, WorkflowFailedReason>
  >;
}
