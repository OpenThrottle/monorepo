/**
 * Fields required for canonical plan task list ordering.
 *
 * Deliberately excludes `wave`: sortOrder alone remains sufficient to execute
 * any plan (docs/openthrottle/task-wave-encoding.md § Interaction with
 * sortOrder), and this module — including task picking —
 * picks and orders tasks strictly sequentially. Nothing here reads `wave` or
 * runs tasks concurrently; that consumption is explicitly out of scope until a
 * later plan.
 */
export interface PlanTaskSortFields {
  readonly createdAt: string;
  readonly sortOrder: number;
}

/**
 * @description Compares tasks by sortOrder ASC, then createdAt ASC (matches {@link PLAN_TASK_LIST_ORDER} on server).
 */
export const comparePlanTaskListOrder = (
  a: PlanTaskSortFields,
  b: PlanTaskSortFields,
): number => {
  if (a.sortOrder !== b.sortOrder) {
    return a.sortOrder - b.sortOrder;
  }

  return a.createdAt.localeCompare(b.createdAt);
};

/**
 * @description Returns a new array sorted by canonical plan task list order.
 */
export const sortTasksByPlanListOrder = <T extends PlanTaskSortFields>(
  tasks: readonly T[],
): T[] => {
  return [...tasks].sort(comparePlanTaskListOrder);
};

/** Statuses that keep a task in the run (not yet terminal). */
export const PLAN_REMAINING_TASK_STATUSES = new Set([
  'BLOCKED',
  'IN_PROGRESS',
  'PENDING',
  'QUEUED',
]);

/**
 * Statuses the agent loop can still make progress on. {@link PLAN_REMAINING_TASK_STATUSES} minus
 * BLOCKED: a blocked task keeps the plan from COMPLETED, but no iteration can move it — only a human.
 */
export const PLAN_WORKABLE_TASK_STATUSES = new Set([
  'IN_PROGRESS',
  'PENDING',
  'QUEUED',
]);

/** Minimal hook-identity fields needed to route a task between the runner and the agent loop. */
export interface PlanTaskHookFields {
  readonly hookRole?: string | null;
  readonly hookSource?: string | null;
  readonly parentTaskId?: string | null;
}

/**
 * @description A materialized hook-task the job-run hooks RUNNER executes, not the agent loop:
 * a plan-level skill hook (parentTaskId null + hookSource 'skill'). These project into
 * beforeAll/afterAll/beforeEach/afterEach hook entries at enqueue and fire via the lifecycle
 * dispatcher, so the runner must not also pick them as ordinary tasks (double execution).
 * Task-level hooks and template hooks are NOT runner-executed — they run as materialized tasks.
 */
export const isRunnerExecutedHookTask = (task: PlanTaskHookFields): boolean => {
  return (
    task.hookRole != null &&
    task.hookSource === 'skill' &&
    (task.parentTaskId === null || task.parentTaskId === undefined)
  );
};

/**
 * @description True when a task should be picked and worked by the agent loop: a remaining
 * status AND not a runner-executed hook-task ({@link isRunnerExecutedHookTask}).
 */
export const isRunnablePlanTask = (
  task: PlanTaskHookFields & { readonly status: string },
): boolean => {
  return (
    PLAN_REMAINING_TASK_STATUSES.has(task.status) &&
    !isRunnerExecutedHookTask(task)
  );
};

/**
 * @description True when the agent loop can still work a task: a workable status
 * ({@link PLAN_WORKABLE_TASK_STATUSES}) AND not a runner-executed hook-task. Drives loop exit,
 * task picking and "last task" detection; {@link isRunnablePlanTask} (which also counts BLOCKED)
 * decides only whether the plan is COMPLETED.
 */
export const isWorkablePlanTask = (
  task: PlanTaskHookFields & { readonly status: string },
): boolean => {
  return (
    PLAN_WORKABLE_TASK_STATUSES.has(task.status) &&
    !isRunnerExecutedHookTask(task)
  );
};
