/** Gap between auto-assigned sortOrder values within a plan (matches server {@link TASK_SORT_ORDER_GAP}). */
export const TASK_SORT_ORDER_GAP = 1000;

/**
 * @description Returns the highest sortOrder among tasks, or null when none have sortOrder.
 */
export const maxSortOrderFromTasks = (
  tasks: readonly { sortOrder?: number | null }[],
): number | null => {
  let max: number | null = null;

  for (const task of tasks) {
    if (task.sortOrder != null && (max == null || task.sortOrder > max)) {
      max = task.sortOrder;
    }
  }

  return max;
};

/**
 * @description Resolves sortOrder for each batch-create item: explicit values are kept; omitted values append after plan max in array order (1000, 2000, … gap).
 */
export const resolveBatchCreateSortOrders = (
  existingMaxSortOrder: number | null,
  items: readonly { sortOrder?: number | null }[],
): number[] => {
  let nextAuto =
    existingMaxSortOrder != null
      ? existingMaxSortOrder + TASK_SORT_ORDER_GAP
      : TASK_SORT_ORDER_GAP;

  return items.map((item) => {
    if (item.sortOrder != null) {
      return item.sortOrder;
    }

    const assigned = nextAuto;
    nextAuto += TASK_SORT_ORDER_GAP;
    return assigned;
  });
};
