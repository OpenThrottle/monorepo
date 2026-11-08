/** Gap between auto-assigned sortOrder values within a plan. */
export const TASK_SORT_ORDER_GAP = 1000;

/** Canonical order for plan-scoped task list queries. */
export const PLAN_TASK_LIST_ORDER = {
  createdAt: 'ASC',
  sortOrder: 'ASC',
} as const;

/** Canonical order for cross-plan task list queries (within each plan). */
export const CROSS_PLAN_TASK_LIST_ORDER = {
  createdAt: 'ASC',
  planId: 'ASC',
  sortOrder: 'ASC',
} as const;
