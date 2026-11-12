/**
 * @description Renders a plan's `scheduledRunAt` (an absolute UTC instant) in the browser's local
 * time zone, e.g. "Nov 8, 2026, 9:00 AM". `locale` and `timeZone` default to the browser's and exist
 * so a test can pin the output. Returns `null` when nothing is scheduled or the value is not a valid
 * instant. Pure: no hooks, no I/O.
 */
export const formatPlanScheduledFor = (
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

  return instant.toLocaleString(options.locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: options.timeZone,
  });
};
