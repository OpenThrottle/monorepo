import { BadgeProps } from '@openthrottle/react-router-shadcn';
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
      color = `red`;
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
      color = `amber`;
      break;
    case 'SKIPPED':
      color = `red`;

      break;
  }

  return color;
};
