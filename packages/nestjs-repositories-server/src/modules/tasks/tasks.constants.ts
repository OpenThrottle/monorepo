import type { SortOrderScope } from '@openthrottle/nestjs-postgres';
import { SORT_ORDER_GAP } from '@openthrottle/nestjs-postgres';

/**
 * @description Where a task's position lives: `tasks.sort_order`, unique per plan among live
 * rows (`idx_tasks_plan_id_sort_order_live`). Pass it to the `@openthrottle/nestjs-postgres`
 * sort-order helpers.
 * @public
 */
export const TASKS_SORT_ORDER_SCOPE: SortOrderScope = {
  gap: SORT_ORDER_GAP,
  idColumn: 'id',
  liveCondition: 'deleted_at IS NULL',
  orderColumn: 'sort_order',
  scopeColumn: 'plan_id',
  table: 'tasks',
  tiebreakColumn: 'created_at',
};

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
