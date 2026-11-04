import { PLAN_TOOLBAR_COPY } from '~/routing/plans/data/data.copy';

/**
 * @description The Run tooltip's explanation for a plan that already has a run waiting on its
 * delayed job: "a run is scheduled for <local time>; cancel it to run now." Takes the plan's
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
  if (scheduledRunAt == null) {
    return null;
  }

  const instant = new Date(scheduledRunAt);
  if (Number.isNaN(instant.getTime())) {
    return null;
  }

  const localTime = instant.toLocaleString(options.locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: options.timeZone,
  });

  return PLAN_TOOLBAR_COPY.runScheduledTooltip(localTime);
};
