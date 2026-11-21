import type { SortOrderScope } from '@openthrottle/nestjs-postgres';
import { SORT_ORDER_GAP } from '@openthrottle/nestjs-postgres';

/**
 * @description Where a plan's position in its project lives: `plans.project_sort_order`,
 * unique per project among live plans (`uq_plans_project_id_project_sort_order`). Pass it to
 * the `@openthrottle/nestjs-postgres` sort-order helpers.
 * @public
 */
export const PLANS_PROJECT_SORT_ORDER_SCOPE: SortOrderScope = {
  gap: SORT_ORDER_GAP,
  idColumn: 'id',
  liveCondition: 'deleted_at IS NULL',
  orderColumn: 'project_sort_order',
  scopeColumn: 'project_id',
  table: 'plans',
  tiebreakColumn: 'created_at',
};

/** Page size `listFiltered` serves when the caller sends no `limit`. */
export const LIST_PLANS_FILTERED_DEFAULT_LIMIT = 20;

/**
 * @description `listFiltered` has never been capped, and a client depends on that:
 * tools/workflows `listAllPlansGraphql` reads every plan (limit 2000 today, ~1.4k plans) to
 * resolve plan ids. Capping it is its own decision, made together with that caller.
 */
export const LIST_PLANS_FILTERED_MAX_LIMIT = Number.MAX_SAFE_INTEGER;
