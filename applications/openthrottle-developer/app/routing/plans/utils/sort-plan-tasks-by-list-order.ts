import type { PlanTaskRowFragment } from '~/__generated__/graphql';

/**
 * @description Compares plan tasks by sortOrder ASC, then createdAt ASC (matches server {@link PLAN_TASK_LIST_ORDER}).
 */
export const comparePlanTasksByListOrder = (
  a: Pick<PlanTaskRowFragment, 'createdAt' | 'sortOrder'>,
  b: Pick<PlanTaskRowFragment, 'createdAt' | 'sortOrder'>,
): number => {
  if (a.sortOrder !== b.sortOrder) {
    return a.sortOrder - b.sortOrder;
  }

  return String(a.createdAt).localeCompare(String(b.createdAt));
};

/**
 * @description Returns tasks sorted by canonical plan list order for display.
 */
export const sortPlanTasksByListOrder = (
  tasks: readonly PlanTaskRowFragment[],
): PlanTaskRowFragment[] => [...tasks].sort(comparePlanTasksByListOrder);

/**
 * @description 1-based step index (#1, #2, …) from position in sorted plan task list.
 */
export const getPlanTaskStepIndex = (sortedIndex: number): number =>
  sortedIndex + 1;
