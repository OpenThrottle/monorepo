/**
 * @description Timestamp formatting for the timeline axis and tooltips. The
 * viewer's own zone is used throughout, and `timelineZoneLabel` names it in the
 * axis label so a reader never has to guess which clock the chart is on.
 */

/** Full timestamp for a tooltip or popover. */
export const formatTimelineTimestamp = (
  value: Date | number | string,
): string =>
  new Date(value).toLocaleString(undefined, {
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    month: 'short',
  });

/** Short axis tick: hours inside a day-scale window, dates above it. */
export const formatTimelineTick = (
  value: Date | number | string,
  scale: 'day' | 'hour',
): string => {
  const date = new Date(value);

  if (scale === 'hour') {
    return date.toLocaleTimeString(undefined, {
      hour: 'numeric',
      minute: '2-digit',
    });
  }

  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
};

/**
 * The viewer's IANA zone (e.g. `America/Los_Angeles`), for the axis label.
 * Falls back to a neutral string where the runtime cannot report one.
 */
export const timelineZoneLabel = (): string =>
  Intl.DateTimeFormat().resolvedOptions().timeZone ?? 'local time';

/** Human duration for a span tooltip: `2h 14m`, `45s`. */
export const formatTimelineDuration = (ms: number): string => {
  if (ms < 1000) return '<1s';

  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;

  return `${seconds}s`;
};
