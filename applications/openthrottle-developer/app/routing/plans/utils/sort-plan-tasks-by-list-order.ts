import type { PlanTaskRowFragment } from '~/__generated__/graphql';

/**
 * @description Compares plan tasks by sortOrder ASC, then createdAt ASC (matches server {@link PLAN_TASK_LIST_ORDER}).
 *
 * Deliberately ignores `wave`: sortOrder alone remains sufficient to order any
 * plan's task list for display (docs/openthrottle/task-wave-encoding.md §
 * Interaction with sortOrder). Grouping the list visually by wave is not done
 * here yet.
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
