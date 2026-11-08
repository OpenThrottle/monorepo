import { PLAN_RUN_STATUS_CELL_COPY } from '~/routing/plans/data/data.copy';

export interface PlanRunStatusBadgeVariant {
  readonly color: 'amber' | 'orange' | 'sky' | 'slate';
  readonly label: string;
}

/**
 * @description The badge a plan run status earns in the audit table: `USAGE_LIMITED` (amber),
 * `SCHEDULED` (sky, still pending), `MISSED` (orange, never fired), `SUPERSEDED` and `SKIPPED` (slate,
 * neutral: skipped on purpose). `null` for every other status, which renders as plain text. Pure: no hooks, no I/O.
 */
export const getPlanRunStatusBadgeVariant = (
  status: string,
): PlanRunStatusBadgeVariant | null => {
  switch (status) {
    case 'MISSED':
      return { color: 'orange', label: PLAN_RUN_STATUS_CELL_COPY.missedBadge };
    case 'SCHEDULED':
      return { color: 'sky', label: PLAN_RUN_STATUS_CELL_COPY.scheduledBadge };
    case 'SKIPPED':
      return { color: 'slate', label: PLAN_RUN_STATUS_CELL_COPY.skippedBadge };
    case 'SUPERSEDED':
      return {
        color: 'slate',
        label: PLAN_RUN_STATUS_CELL_COPY.supersededBadge,
      };
    case 'USAGE_LIMITED':
      return {
        color: 'amber',
        label: PLAN_RUN_STATUS_CELL_COPY.usageLimitedBadge,
      };
    default:
      return null;
  }
};
