import { BadgeProps } from '@openthrottle/react-router-shadcn';
import { PlanStatusKey } from '~/routing/plans/types';

/**
 * Canonical "a run is active" check: true while the plan is QUEUED or
 * IN_PROGRESS. This is the single predicate the plan and task toolbars gate
 * their mutating actions on (Run/Queue, Evaluate rules, Mark Complete, Promote,
 * status transitions) so those cannot fire out from under a live worker. Kill
 * run is the deliberate exception — it stays available while running.
 */
export const getPlanIsRunning = (
  status: string | null | undefined,
): boolean => {
  return status === 'QUEUED' || status === 'IN_PROGRESS';
};

/**
 * Whether the UI should offer stopping a Ralph / plan-run job
 * for this plan status (queue or active worker). Shares the exact
 * QUEUED/IN_PROGRESS condition with {@link getPlanIsRunning}.
 */
export const getPlanIsCancelable = (
  status: string | null | undefined,
): boolean => {
  return getPlanIsRunning(status);
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
