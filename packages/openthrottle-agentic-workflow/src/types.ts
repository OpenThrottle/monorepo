export type WorkflowConfigDebug = 'debug' | 'omit' | 'verbose';
export type WorkflowConfigModel = 'auto' | (string & {});
export type WorkflowConfigRunner = 'cursor' | 'claude' | 'opencode';

/**
 * Shared configuration fields for agentic workflows (model, prompts,
 * iteration limits, timeouts). Workflow-specific options belong in downstream packages
 * via {@link WorkflowRunContext} extensions.
 */
export interface WorkflowConfig {
  readonly debug: WorkflowConfigDebug;
  readonly iterationMax: number;
  readonly iterationTimeout: number | undefined;
  readonly iterations: number;
  readonly model: WorkflowConfigModel;
  readonly prompt: string;
  readonly timeout: number | undefined;
}

/**
 * Align structured logs using `correlationId` (and optionally `queueJobId`,
 * `queueName`) so aggregators can join with queue metrics such as {@link WORKFLOW_EVENT}.
 */
export interface WorkflowCorrelation {
  /**
   * Primary key for cross-service correlation (often a BullMQ job id or generated run id).
   */
  readonly correlationId: string;
  /**
   * Queue-backed job identifier when applicable (may match {@link WorkflowCorrelation.correlationId}).
   */
  readonly queueJobId?: string;
  /**
   * Logical queue name (e.g. BullMQ queue name) for log filtering.
   */
  readonly queueName?: string;
}

/**
 * Structured log event names for agentic workflow lifecycle lines (start/end).
 * Application code should emit JSON payloads that include correlation fields from
 * {@link WorkflowCorrelation} plus workflow-specific attributes at the app layer.
 */
export const WORKFLOW_EVENT = {
  JOB_RUN: 'job_run',
  METRIC: 'metric',
} as const;

export type WorkflowEventKey = keyof typeof WORKFLOW_EVENT;
export type WorkflowEvent = (typeof WORKFLOW_EVENT)[WorkflowEventKey];

/**
 * Optional runtime hooks merged into {@link WorkflowRunContext}.
 * Downstream workflows may add fields by extending {@link WorkflowRunContext}.
 *
 * @example Workflow-specific context in a consumer package
 * ```ts
 * interface RalphFlowContext extends WorkflowRunContext {
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
  /**
   * Optional tracing metadata for structured logging; must not encode plan/task identifiers.
   */
  readonly correlation?: WorkflowCorrelation;
}

/**
 * Immutable snapshot of inputs driving a workflow run: shared
 * {@link WorkflowConfig} plus optional {@link WorkflowExecutionHooks}.
 */
export interface WorkflowRunContext
  extends WorkflowConfig, WorkflowExecutionHooks {}

/**
 * Stable error shape for workflow steps; callers map from transport-layer errors.
 */
export interface WorkflowError {
  readonly cause: Error | undefined;
  readonly code: string;
  readonly message: string;
}

/**
 * Terminal outcome of a workflow run. Downstream packages supply
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
  ? {
      readonly outcome: 'success';
      readonly step: TStep;
    }
  : {
      readonly data: TData;
      readonly outcome: 'success';
      readonly step: TStep;
    };

/**
 * Runs a workflow until a terminal {@link WorkflowRunResult}.
 * Implementations live in downstream packages; this package defines only the contract.
 *
 * Use {@link WorkflowRunContext} or a subtype for `TContext` so workflow-specific
 * fields stay outside this package.
 */
export interface WorkflowOrchestrator<
  WorkflowFinishedReason,
  WorkflowFailedReason,
  TContext extends WorkflowRunContext = WorkflowRunContext,
> {
  readonly execute: (params: {
    readonly context: TContext;
  }) => Promise<
    WorkflowRunResult<WorkflowFinishedReason, WorkflowFailedReason>
  >;
}
