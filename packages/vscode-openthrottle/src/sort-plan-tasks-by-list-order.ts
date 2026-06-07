import type { TaskByPlanResponseFragment } from './__generated__/graphql.js';

/**
 * @description Compares plan tasks by sortOrder ASC, then createdAt ASC (matches server plan list order).
 */
export const comparePlanTasksByListOrder = (
  a: Pick<TaskByPlanResponseFragment, 'createdAt' | 'sortOrder'>,
  b: Pick<TaskByPlanResponseFragment, 'createdAt' | 'sortOrder'>,
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
  tasks: readonly TaskByPlanResponseFragment[],
): TaskByPlanResponseFragment[] => [...tasks].sort(comparePlanTasksByListOrder);
