/**
 * @description Status filter options for the plans list (PlansToolbar).
 * Aligns with PlanStatusBadge / format-status.
 */
export const DEFAULT_PLAN_STATUS = 'PENDING' as const;

/** Default statuses when none are in the URL (aligns with API PlansListFilters). */
export const DEFAULT_STATUSES: readonly string[] = [
  'BACKLOG',
  // 'COMPLETED',
  'IN_PROGRESS',
  'PENDING',
  'QUEUED',
];

export const PLAN_STATUS_FILTER_OPTIONS = [
  { label: 'Pending', value: 'PENDING' },
  { label: 'In Progress', value: 'IN_PROGRESS' },
  { label: 'Completed', value: 'COMPLETED' },
  { label: 'Backlog', value: 'BACKLOG' },
  { label: 'Blocked', value: 'BLOCKED' },
  { label: 'Canceled', value: 'CANCELED' },
  { label: 'Queued', value: 'QUEUED' },
  { label: 'Skipped', value: 'SKIPPED' },
] as const;

export type PlanStatusFilterValue =
  (typeof PLAN_STATUS_FILTER_OPTIONS)[number]['value'];

/** All valid status values as a string array (for multi-select options). */
export const STATUS_OPTIONS: readonly string[] = PLAN_STATUS_FILTER_OPTIONS.map(
  (opt) => opt.value,
);

const VALID_STATUSES = new Set(
  PLAN_STATUS_FILTER_OPTIONS.map((opt) => opt.value),
);

/**
 * @description Returns the status from the URL or default. Invalid values
 * fall back to DEFAULT_PLAN_STATUS.
 */
export function parseStatusFromSearchParams(
  searchParams: URLSearchParams,
): PlanStatusFilterValue {
  const raw = searchParams.get('status')?.toUpperCase() ?? DEFAULT_PLAN_STATUS;
  return (
    VALID_STATUSES.has(raw as PlanStatusFilterValue) ? raw : DEFAULT_PLAN_STATUS
  ) as PlanStatusFilterValue;
}

/**
 * @description Returns multiple statuses from the URL (getAll("status") and
 * comma-separated). Defaults to DEFAULT_STATUSES when none valid.
 */
export function parseStatusesFromSearchParams(
  searchParams: URLSearchParams,
): string[] {
  const raw = searchParams
    .getAll('status')
    .flatMap((s) => s.split(','))
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean);

  const valid = raw.filter((s) =>
    VALID_STATUSES.has(s as PlanStatusFilterValue),
  );

  return valid.length > 0 ? valid : [...DEFAULT_STATUSES];
}
