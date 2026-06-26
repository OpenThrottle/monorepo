import { WorkflowConfigLegacy } from './config.ts';
import { WORKFLOW_EVENT } from '../config/index.ts';

/**
 * Align structured logs using `correlationId` (and optionally `queueJobId`,
 * `queueName`) so aggregators can join with queue metrics such as {@link WORKFLOW_EVENT}.
 */
export interface WorkflowCorrelation {
  /** Primary key for cross-service correlation (often a BullMQ job id or generated run id). */
  readonly correlationId: string;

  /** Queue-backed job identifier when applicable (may match {@link WorkflowCorrelation.correlationId}). */
  readonly queueJobId?: string;

  /** Logical queue name (e.g. BullMQ queue name) for log filtering. */
  readonly queueName?: string;
}

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
 * {@link WorkflowConfigLegacy} plus optional {@link WorkflowExecutionHooks}.
 *
 * @todo Migration: rebase this onto the newer {@link WorkflowConfig} and drop
 * the dependency on the deprecated {@link WorkflowConfigLegacy}. Until this and
 * `openthrottle-agentic-ralph/src/types.ts` are migrated, `WorkflowConfigLegacy`
 * cannot be removed — it is still the live base of this context.
 */
export interface WorkflowRunContext
  extends WorkflowConfigLegacy, WorkflowExecutionHooks {}

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
export type WorkflowRunResult<
  WorkflowFinishedReason extends string,
  WorkflowFailedReason extends string,
> =
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
  WorkflowFinishedReason extends string,
  WorkflowFailedReason extends string,
  TContext extends WorkflowRunContext = WorkflowRunContext,
> {
  readonly execute: (params: {
    readonly context: TContext;
  }) => Promise<
    WorkflowRunResult<WorkflowFinishedReason, WorkflowFailedReason>
  >;
}
