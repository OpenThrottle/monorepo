import { PLAN_RUN_STATUS_CELL_COPY } from '~/routing/plans/data/data.copy';

export interface PlanRunStatusBadgeVariant {
  readonly color:
    'amber' | 'blue' | 'default' | 'green' | 'orange' | 'red' | 'sky' | 'slate';
  readonly label: string;
}

/**
 * @description The badge a plan run status earns in the audit table. Live: `IN_PROGRESS` (blue),
 * `QUEUED` (neutral). Settled: `COMPLETED` (green), `FAILED` and `STALE` (red), `CANCELLED`,
 * `SUPERSEDED` and `SKIPPED` (slate: stopped on purpose), `USAGE_LIMITED` (amber), `MISSED` (orange,
 * never fired). Pending: `SCHEDULED` (sky). Any other status keeps its raw value in a neutral badge,
 * so a status the server adds later still renders. Pure: no hooks, no I/O.
 */
export const getPlanRunStatusBadgeVariant = (
  status: string,
): PlanRunStatusBadgeVariant => {
  switch (status) {
    case 'CANCELLED':
      return {
        color: 'slate',
        label: PLAN_RUN_STATUS_CELL_COPY.cancelledBadge,
      };
    case 'COMPLETED':
      return {
        color: 'green',
        label: PLAN_RUN_STATUS_CELL_COPY.completedBadge,
      };
    case 'FAILED':
      return { color: 'red', label: PLAN_RUN_STATUS_CELL_COPY.failedBadge };
    case 'IN_PROGRESS':
      return {
        color: 'blue',
        label: PLAN_RUN_STATUS_CELL_COPY.inProgressBadge,
      };
    case 'MISSED':
      return { color: 'orange', label: PLAN_RUN_STATUS_CELL_COPY.missedBadge };
    case 'QUEUED':
      return { color: 'default', label: PLAN_RUN_STATUS_CELL_COPY.queuedBadge };
    case 'SCHEDULED':
      return { color: 'sky', label: PLAN_RUN_STATUS_CELL_COPY.scheduledBadge };
    case 'SKIPPED':
      return { color: 'slate', label: PLAN_RUN_STATUS_CELL_COPY.skippedBadge };
    case 'STALE':
      return { color: 'red', label: PLAN_RUN_STATUS_CELL_COPY.staleBadge };
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
      return { color: 'default', label: status };
  }
};
