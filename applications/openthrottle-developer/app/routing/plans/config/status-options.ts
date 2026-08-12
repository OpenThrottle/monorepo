/**
 * @description Status filter options for the plans list (PlansToolbar). Values and
 * labels come from the shared SSOT ({@link PlanStatusKey} / {@link planStatusValues},
 * derived from the generated PlanTaskStatus GraphQL enum) so this filter cannot
 * drift from the canonical status vocabulary. Only the display ORDER is local.
 */
import { planStatusValues, type PlanStatusKey } from '~/routing/plans/types';

export const DEFAULT_PLAN_STATUS = 'PENDING' as const;

/** Default statuses when none are in the URL (aligns with API PlansListFilters). */
export const DEFAULT_STATUSES: readonly PlanStatusKey[] = [
  'BACKLOG',
  // 'COMPLETED',
  'IN_PROGRESS',
  'PENDING',
  'QUEUED',
];

/**
 * Display order for the plans filter (distinct from the DB enum order). Typed as
 * `PlanStatusKey[]` so every entry must be a canonical status — a misspelled or
 * removed status fails to compile here.
 */
const PLAN_STATUS_FILTER_ORDER = [
  'BACKLOG',
  'PENDING',
  'IN_PROGRESS',
  'QUEUED',
  'COMPLETED',
  'BLOCKED',
  'CANCELED',
  'SKIPPED',
] as const satisfies readonly PlanStatusKey[];

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

  const valid = raw.filter(isPlanStatusFilterValue);

  return valid.length > 0 ? valid : [...DEFAULT_STATUSES];
}
