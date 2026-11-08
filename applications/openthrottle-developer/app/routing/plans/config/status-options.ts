/**
 * @description Status filter options for the plans list (PlansToolbar). Values and
 * labels come from the shared SSOT ({@link PlanStatusKey} / {@link planStatusValues},
 * derived from the generated PlanTaskStatus GraphQL enum) so this filter cannot
 * drift from the canonical status vocabulary. Only the display ORDER is local.
 */
import { PLAN_STATUS_FILTER_GROUPS } from '~/routing/plans/data/data.plan-status-filter-groups';
import { type PlanStatusKey, planStatusValues } from '~/routing/plans/types';

export const DEFAULT_PLAN_STATUS = 'PENDING' as const;

/** Default statuses when none are in the URL (aligns with API PlansListFilters). */
export const DEFAULT_STATUSES: readonly PlanStatusKey[] = [
  'BACKLOG',
  // 'COMPLETED',
  'IN_PROGRESS',
  'PENDING',
  'QUEUED',
  // A scheduled plan is still waiting on work, so it stays in the default view.
  'SCHEDULED',
];

/**
 * @description `?status=all` — every status, no narrowing. The sentinel exists
 * because an absent `status` param already means {@link DEFAULT_STATUSES}.
 */
export const ALL_STATUSES_PARAM = 'all';

/**
 * Display order for the plans filter (distinct from the DB enum order): the
 * Active / Resolved groups in `data/`, flattened.
 */
const PLAN_STATUS_FILTER_ORDER: readonly PlanStatusKey[] =
  PLAN_STATUS_FILTER_GROUPS.flatMap((group) => group.statuses);

export const PLAN_STATUS_FILTER_OPTIONS: readonly {
  label: string;
  value: PlanStatusKey;
}[] = PLAN_STATUS_FILTER_ORDER.map((value) => ({
  label: planStatusValues[value],
  value,
}));

export type PlanStatusFilterValue = PlanStatusKey;

/** All valid status values as a string array (for multi-select options). */
export const STATUS_OPTIONS: readonly PlanStatusKey[] =
  PLAN_STATUS_FILTER_OPTIONS.map((opt) => opt.value);

export const VALID_STATUSES: ReadonlySet<string> = new Set(STATUS_OPTIONS);

/** Type guard: narrows an arbitrary string to a valid {@link PlanStatusFilterValue}. */
export function isPlanStatusFilterValue(
  value: string,
): value is PlanStatusFilterValue {
  return VALID_STATUSES.has(value);
}

/**
 * @description Returns the status from the URL or default. Invalid values
 * fall back to DEFAULT_PLAN_STATUS.
 */
export function parseStatusFromSearchParams(
  searchParams: URLSearchParams,
): PlanStatusFilterValue {
  const raw = searchParams.get('status')?.toUpperCase() ?? DEFAULT_PLAN_STATUS;
  return isPlanStatusFilterValue(raw) ? raw : DEFAULT_PLAN_STATUS;
}

/**
 * @description Returns multiple statuses from the URL (getAll("status") and
 * comma-separated). `status=all` ({@link ALL_STATUSES_PARAM}) yields every
 * status; otherwise defaults to DEFAULT_STATUSES when none are valid.
 */
export function parseStatusesFromSearchParams(
  searchParams: URLSearchParams,
): string[] {
  const raw = searchParams
    .getAll('status')
    .flatMap((s) => s.split(','))
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean);

  if (raw.includes(ALL_STATUSES_PARAM.toUpperCase())) {
    return [...STATUS_OPTIONS];
  }

  const valid = raw.filter(isPlanStatusFilterValue);

  return valid.length > 0 ? valid : [...DEFAULT_STATUSES];
}

const isSameStatusSet = (
  statuses: readonly string[],
  expected: readonly string[],
): boolean => {
  const set = new Set(statuses);
  return set.size === expected.length && expected.every((s) => set.has(s));
};

/**
 * @description True when a selection means "every status": nothing selected
 * (an empty filter narrows nothing) or every status selected.
 */
export const isAllStatusSelection = (statuses: readonly string[]): boolean => {
  return statuses.length === 0 || isSameStatusSet(statuses, STATUS_OPTIONS);
};

/** True when a selection is exactly {@link DEFAULT_STATUSES}, in any order. */
export const isDefaultStatusSelection = (
  statuses: readonly string[],
): boolean => {
  return isSameStatusSet(statuses, DEFAULT_STATUSES);
};

/**
 * @description The `status` param values that round-trip a selection through
 * {@link parseStatusesFromSearchParams}: `[]` (omit the param) for the
 * defaults, `['all']` for an empty or complete selection, else the statuses.
 */
export const statusesToSearchParamValues = (
  statuses: readonly string[],
): string[] => {
  if (isAllStatusSelection(statuses)) {
    return [ALL_STATUSES_PARAM];
  }

  return isDefaultStatusSelection(statuses) ? [] : [...statuses];
};
