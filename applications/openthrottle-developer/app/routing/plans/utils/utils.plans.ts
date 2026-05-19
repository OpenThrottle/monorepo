import { BadgeProps } from '@openthrottle/react-router-shadcn';
import { PLAN_STATUS_FILTER_OPTIONS } from '~/routing/plans/config/status-options';
import { PlanStatusKey } from '~/routing/plans/types';

/**
 * Whether the UI should offer stopping a Ralph / plan-run job
 * for this plan status (queue or active worker).
 */
export const getPlanIsCancelable = (
  status: string | null | undefined,
): boolean => {
  return status === 'QUEUED' || status === 'IN_PROGRESS';
};

/**
 * Returns a human-readable label for a plan status
 * (e.g. IN_PROGRESS → "In progress"). Falls back to the raw value if unknown.
 */
export function getPlanStatusLabel(status: string | null | undefined): string {
  if (status == null) return 'Unknown';

  const option = PLAN_STATUS_FILTER_OPTIONS.find(
    (option) => option.value === status,
  );

  return option?.label ?? status;
}

/**
 * Returns the color for a plan status badge
 */
export const getPlanStatusBadgeColor = (
  status: PlanStatusKey,
): BadgeProps['color'] => {
  let color: BadgeProps['color'] = `default`;

  switch (status) {
    case 'BACKLOG':
      color = `violet`;
      break;
    case 'BLOCKED':
      color = `amber`;
      break;
    case 'CANCELED':
      color = `slate`;
      break;
    case 'COMPLETED':
      color = `lime`;
      break;
    case 'IN_PROGRESS':
      color = `yellow`;
      break;
    case 'PENDING':
      color = `sky`;
      break;
    case 'QUEUED':
      color = `orange`;
      break;
    case 'SKIPPED':
      color = `red`;

      break;
  }

  return color;
};
