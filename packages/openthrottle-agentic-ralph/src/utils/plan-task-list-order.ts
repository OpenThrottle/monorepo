/** Fields required for canonical plan task list ordering. */
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
): T[] => [...tasks].sort(comparePlanTaskListOrder);

const RALPH_NEXT_TASK_STATUSES = new Set(['PENDING', 'QUEUED']);

/** Statuses that keep a task in the run (not yet terminal). */
export const RALPH_REMAINING_TASK_STATUSES = new Set([
  'BLOCKED',
  'IN_PROGRESS',
  'PENDING',
  'QUEUED',
]);

/** Minimal hook-identity fields needed to route a task between the runner and the agent loop. */
export interface RalphTaskHookFields {
  readonly hookRole?: string | null;
  readonly hookSource?: string | null;
  readonly parentTaskId?: string | null;
}

/**
 * @description A materialized hook-task the job-run hooks RUNNER executes, not the Ralph agent loop:
 * a plan-level skill hook (parentTaskId null + hookSource 'skill'). These project into
 * beforeAll/afterAll/beforeEach/afterEach hook entries at enqueue and fire via the lifecycle
 * dispatcher, so the orchestrator must not also pick them as ordinary tasks (double execution).
 * Task-level hooks and template hooks are NOT runner-executed — they run as materialized tasks.
 */
export const isRunnerExecutedHookTask = (task: RalphTaskHookFields): boolean =>
  task.hookRole != null &&
  task.hookSource === 'skill' &&
  (task.parentTaskId === null || task.parentTaskId === undefined);

/**
 * @description True when a task should be picked and worked by the Ralph agent loop: a remaining
 * status AND not a runner-executed hook-task ({@link isRunnerExecutedHookTask}).
 */
export const isRunnableRalphTask = (
  task: RalphTaskHookFields & { readonly status: string },
): boolean =>
  RALPH_REMAINING_TASK_STATUSES.has(task.status) &&
  !isRunnerExecutedHookTask(task);

/**
 * @description Picks the Ralph iteration task: lowest sortOrder among IN_PROGRESS, else among PENDING/QUEUED.
 */
export const pickRalphTaskForIteration = <
  T extends PlanTaskSortFields & {
    readonly id: string;
    readonly status: string;
  },
>(
  remaining: readonly T[],
): T | undefined => {
  const sorted = sortTasksByPlanListOrder(remaining);
  const inProgress = sorted.find((task) => task.status === 'IN_PROGRESS');

  if (inProgress) {
    return inProgress;
  }

  return sorted.find((task) => RALPH_NEXT_TASK_STATUSES.has(task.status));
};
