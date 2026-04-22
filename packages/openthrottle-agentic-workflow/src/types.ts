/**
 * @description Shared configuration fields for agentic workflows (model, prompts,
 * iteration limits, timeouts). Workflow-specific options belong in downstream packages
 * via {@link WorkflowFlowContext} extensions.
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
 * @description Optional runtime hooks merged into {@link WorkflowFlowContext}.
 * Downstream workflows may add fields by extending {@link WorkflowFlowContext}.
 *
 * @example Workflow-specific context in a consumer package
 * ```ts
 * interface RalphFlowContext extends WorkflowFlowContext {
 *   readonly mode: 'plan' | 'task';
 *   readonly planId: string;
 *   readonly taskId: string | undefined;
 * }
 * ```
 */
export interface WorkflowExecutionHooks {
  /**
   * When set (for example a BullMQ worker plus an in-process abort controller),
   * implementations should forward this to each iteration and honor cancellation between steps.
   */
  readonly abortSignal?: AbortSignal;
}

/**
 * @description Immutable snapshot of inputs driving a workflow run: shared
 * {@link WorkflowConfig} plus optional {@link WorkflowExecutionHooks}.
 */
export interface WorkflowFlowContext
  extends WorkflowConfig, WorkflowExecutionHooks {}

/**
 * @description Stable error shape for workflow steps; callers map from transport-layer errors.
 */
export interface WorkflowError {
  readonly cause: Error | undefined;
  readonly code: string;
  readonly message: string;
}

/**
 * @description Terminal outcome of a workflow run. Downstream packages supply
 * discriminated reason types for finished vs failed branches.
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
  ? { readonly outcome: 'success'; readonly step: TStep }
  : {
      readonly data: TData;
      readonly outcome: 'success';
      readonly step: TStep;
    };

/**
 * @description Runs a workflow until a terminal {@link WorkflowRunResult}.
 * Implementations live in downstream packages; this package defines only the contract.
 *
 * Use {@link WorkflowFlowContext} or a subtype for `TContext` so workflow-specific
 * fields stay outside this package.
 */
export interface WorkflowOrchestrator<
  WorkflowFinishedReason,
  WorkflowFailedReason,
  TContext extends WorkflowFlowContext = WorkflowFlowContext,
> {
  readonly execute: (params: {
    readonly context: TContext;
  }) => Promise<
    WorkflowRunResult<WorkflowFinishedReason, WorkflowFailedReason>
  >;
}
