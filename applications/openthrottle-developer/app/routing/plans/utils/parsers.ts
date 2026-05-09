import {
  PLANS_SORT_ORDER,
  PlansSortBy,
  PlansSortOrder,
} from '~/routing/plans/config/types';

/** Valid tab keys for the plan detail page (`/plans/:planId`). */
export type PlanDetailTab =
  | 'configuration'
  | 'metadata'
  | 'overview'
  | 'requirements'
  | 'tasks';

/**
 * @description Search param for the active tab on plan detail (`plansDetailTab`). Omitted when `overview`.
 */
export const PLANS_DETAIL_TAB_SEARCH_PARAM = 'plansDetailTab' as const;

const PLAN_DETAIL_TAB_VALUES = new Set<string>([
  'configuration',
  'metadata',
  'overview',
  'requirements',
  'tasks',
]);

/**
 * @description Parses `plansDetailTab` for plan detail primary tabs (Details, Tasks, …).
 */
export const parsePlanDetailTab = (
  raw: string | null,
): PlanDetailTab | null => {
  if (raw === null || raw === '') {
    return null;
  }

  return PLAN_DETAIL_TAB_VALUES.has(raw) ? (raw as PlanDetailTab) : null;
};

/**
 * @description Parses `view` query/localStorage values for the plan tasks table vs board switcher.
 */
export const parsePlanTasksView = (
  raw: string | null,
): 'board' | 'table' | null => {
  if (raw === 'board' || raw === 'table') {
    return raw;
  }

  return null;
};

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
