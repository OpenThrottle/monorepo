import {
  PLANS_SORT_ORDER,
  PlansSortBy,
  PlansSortOrder,
} from '~/routing/plans/config/types';

/**
 * @description Parses sortBy and sortOrder from URL search params; defaults to createdAt-desc.
 */
export function parsePlansSortFromSearch(searchParams: URLSearchParams): {
  sortBy: PlansSortBy;
  sortOrder: PlansSortOrder;
} {
  const by = searchParams.get('sortBy');
  const order = searchParams.get('sortOrder');

  return {
    sortBy: (PLANS_SORT_ORDER as readonly string[]).includes(by ?? '')
      ? (by as PlansSortBy)
      : 'createdAt',
    sortOrder: (PLANS_SORT_ORDER as readonly string[]).includes(order ?? '')
      ? (order as PlansSortOrder)
      : 'desc',
  };
}
