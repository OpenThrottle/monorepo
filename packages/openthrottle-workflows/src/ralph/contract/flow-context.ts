/**
 * @description Discriminated flow context for GraphQL-first workflows. Extend with new `kind`
 * variants when adding non-Ralph flows.
 */
export type WorkflowFlowContext = RalphFlowContext;

/**
 * @description Immutable snapshot of inputs driving the Ralph-shaped orchestration (compare
 * the `main` function in `tools/workflows/src/bin/ralph.ts`).
 */
export interface RalphFlowContext {
  readonly kind: 'ralph';
  /** Resolved OpenThrottle plan id (from `--plan` or derived from `--task`). */
  readonly planId: string;
  /**
   * @description When `--task` is set, the focused task; in plan-centric mode the runner may
   * still set focus per iteration — that runtime value is not duplicated here; use iteration
   * state in the orchestrator implementation.
   */
  readonly focusTaskId: string | undefined;
  readonly mode: 'plan-centric' | 'task-centric';
  /** After CLI resolution: task-centric forces 1. */
  readonly maxIterations: number;
  /** User prompt fragment before OpenThrottle plan/task injection. */
  readonly userPrompt: string;
  readonly nxProjectName: string | undefined;
}
