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
