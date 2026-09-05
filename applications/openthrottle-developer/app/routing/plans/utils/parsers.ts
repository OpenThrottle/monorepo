import type { BadgeProps } from '@openthrottle/react-router-shadcn';
import type { PlansSortBy, PlansSortOrder } from '~/routing/plans/config/types';
import { PLANS_SORT_ORDER } from '~/routing/plans/config/types';
import { PLAN_STATUS_FILTER_OPTIONS } from '~/routing/plans/config/status-options';

/** Parse multiple assignee values from URL (repeated params or comma-separated). */
export const parseAssigneesFromSearchParams = (
  searchParams: URLSearchParams,
): string[] => {
  const raw = searchParams.getAll('assignee').flatMap((a) => a.split(','));
  return raw.map((a) => a.trim()).filter(Boolean);
};

/**
 * @description True when any list-narrowing filter is active on the plans index
 * (search text, status, or assignee). Used to distinguish a genuinely-new user
 * (no plans + no filters → onboarding) from a filtered no-results view (→ the
 * terse PlanTasksEmpty). Mirrors the signal PlansTable derives for its own empty
 * state so both agree.
 */
export const hasActivePlansFilters = (searchParams: URLSearchParams): boolean =>
  (searchParams.get('q') ?? '') !== '' ||
  searchParams.getAll('status').length > 0 ||
  searchParams.getAll('assignee').length > 0;

/**
 * @description Build the per-status filter URLs for the plans list (one `/plans?…`
 * link per status option, resetting to page 1). Pure over the current search params.
 */
export const buildStatusFilterUrls = (
  searchParams: URLSearchParams,
): Record<string, string> =>
  Object.fromEntries(
    PLAN_STATUS_FILTER_OPTIONS.map((option) => {
      const params = new URLSearchParams(searchParams);

      params.delete('status');
      params.append('status', option.value);
      params.set('page', '1');

      return [option.value, `/plans?${params.toString()}`] as const;
    }),
  );

/** Valid tab keys for the plan detail page (`/plans/:planId`). */
export type PlanDetailTab =
  | 'configuration'
  | 'metadata'
  | 'overview'
  | 'output'
  | 'requirements'
  | 'tasks';

/**
 * @description Search param for the active tab on plan detail (`plansDetailTab`). Omitted when `overview`.
 */
export const PLANS_DETAIL_TAB_SEARCH_PARAM = 'tab';

const PLAN_DETAIL_TAB_VALUES: readonly PlanDetailTab[] = [
  'configuration',
  'metadata',
  'overview',
  'output',
  'requirements',
  'tasks',
];

const isPlanDetailTab = (raw: string): raw is PlanDetailTab =>
  PLAN_DETAIL_TAB_VALUES.some((tab) => tab === raw);

/**
 * @description Parses `plansDetailTab` for plan detail primary tabs (Details, Tasks, …).
 */
export const parsePlanDetailTab = (
  raw: string | null,
): PlanDetailTab | null => {
  if (raw === null || raw === '') {
    return null;
  }

  return isPlanDetailTab(raw) ? raw : null;
};

/** Valid tab keys for the task detail page (`/plans/:planId/tasks/:taskId`). */
export type TaskDetailTab = 'artifacts' | 'details' | 'hooks' | 'output';

const TASK_DETAIL_TAB_VALUES: readonly TaskDetailTab[] = [
  'artifacts',
  'details',
  'hooks',
  'output',
];

const isTaskDetailTab = (raw: string): raw is TaskDetailTab =>
  TASK_DETAIL_TAB_VALUES.some((tab) => tab === raw);

/**
 * @description Parses the `tab` search param for task detail primary tabs
 * (Details, Output, Artifacts, Hooks). Shares {@link PLANS_DETAIL_TAB_SEARCH_PARAM}.
 */
export const parseTaskDetailTab = (
  raw: string | null,
): TaskDetailTab | null => {
  if (raw === null || raw === '') {
    return null;
  }

  return isTaskDetailTab(raw) ? raw : null;
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
// NOTE: preserves existing behavior — both sortBy and sortOrder are validated
// against PLANS_SORT_ORDER (`asc`/`desc`). This looks like a pre-existing bug
// for sortBy (it never matches a real PlansSortBy and always defaults to
// `createdAt`), but it is kept as-is here to avoid a behavior change during the
// as-cast cleanup.
const isPlansSortByValue = (value: string | null): value is PlansSortBy =>
  value !== null && PLANS_SORT_ORDER.some((v) => v === value);

const isPlansSortOrderValue = (value: string | null): value is PlansSortOrder =>
  value !== null && PLANS_SORT_ORDER.some((v) => v === value);

export function parsePlansSortFromSearch(searchParams: URLSearchParams): {
  sortBy: PlansSortBy;
  sortOrder: PlansSortOrder;
} {
  const by = searchParams.get('sortBy');
  const order = searchParams.get('sortOrder');

  return {
    sortBy: isPlansSortByValue(by) ? by : 'createdAt',
    sortOrder: isPlansSortOrderValue(order) ? order : 'desc',
  };
}

export const parseTaskStatusColor = (status: string): BadgeProps['color'] => {
  switch (status) {
    case 'CANCELED':
      return 'violet';
    case 'COMPLETED':
      return 'lime';
    case 'IN_PROGRESS':
      return 'yellow';
    case 'PENDING':
      return 'blue';
    case 'QUEUED':
      return 'orange';
    case 'SKIPPED':
      return 'red';

    default:
      return 'default';
  }
};
