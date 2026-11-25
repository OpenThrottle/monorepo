/**
 * @description The plan fields the finish step reads for the PR title and body. Structural, so the
 * loop package takes no GraphQL-generated type.
 * @public
 */
export interface PlanRunFinalizePlanRow {
  readonly description?: string | null | undefined;
  readonly summary?: string | null | undefined;
  readonly title: string;
}

/**
 * @description The task fields the finish step reads: list order (`sortOrder`, `createdAt`) and
 * what the PR body shows (`id`, `status`, `summary`, `title`).
 * @public
 */
export interface PlanRunFinalizeTaskRow {
  readonly createdAt: string;
  readonly id: string;
  readonly sortOrder: number;
  readonly status: string;
  readonly summary?: string | null | undefined;
  readonly title: string;
}

/**
 * @description What the finish step needs from OpenThrottle, injected by the host (the server
 * implements it over GraphQL). Every method may reject; the finish step treats each as best effort
 * and never lets one fail the run.
 * @public
 */
export interface PlanRunFinalizePort {
  /** Appends one plan-output chunk (the finish step's narration and owed-step diagnostics). */
  readonly appendOutput: (input: {
    readonly content: string;
    readonly planId: string;
  }) => Promise<void>;
  /** The plan row, or `null`/`undefined` when it cannot be found. */
  readonly readPlan: (
    planId: string,
  ) => Promise<PlanRunFinalizePlanRow | null | undefined>;
  /** The plan's tasks, in any order. */
  readonly readTasks: (
    planId: string,
  ) => Promise<readonly PlanRunFinalizeTaskRow[] | null | undefined>;
}
