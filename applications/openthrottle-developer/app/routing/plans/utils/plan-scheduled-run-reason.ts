import {
  PLAN_STATUS_BADGE_COPY,
  PLAN_TOOLBAR_COPY,
} from '~/routing/plans/data/data.copy';
import { formatPlanScheduledFor } from '~/routing/plans/utils/formatPlanScheduledFor';

/**
 * @description The Run tooltip's explanation for a plan that already has a run waiting on its
 * delayed job: "a run is scheduled for <local time>; running now will unschedule it first." Takes the plan's
 * `scheduledRunAt` (the soonest SCHEDULED run's `scheduled_for`, an absolute UTC instant) and renders
 * it in the browser's local time zone. `locale` and `timeZone` default to the browser's and exist so
 * a test can pin the output.
 *
 * Returns `null` when nothing is scheduled (or the value is not a valid instant), so callers can fall
 * through to their next tooltip reason. Pure: no hooks, no I/O.
 */
export const getPlanScheduledRunReason = (
  scheduledRunAt: Date | string | null | undefined,
  options: {
    readonly locale?: string;
    readonly timeZone?: string;
  } = {},
): string | null => {
  const localTime = formatPlanScheduledFor(scheduledRunAt, options);
  if (localTime === null) {
    return null;
  }

  return PLAN_TOOLBAR_COPY.runScheduledTooltip(localTime);
};

/**
 * @description The tooltip of a SCHEDULED {@link PlanStatusBadge}: "Scheduled for <local time>",
 * or `undefined` when the plan has no valid `scheduledRunAt` (the badge then carries no tooltip).
 */
export const getPlanScheduledForTitle = (
  scheduledRunAt: Date | string | null | undefined,
): string | undefined => {
  const localTime = formatPlanScheduledFor(scheduledRunAt);

  return localTime === null
    ? undefined
    : PLAN_STATUS_BADGE_COPY.scheduledFor(localTime);
};
