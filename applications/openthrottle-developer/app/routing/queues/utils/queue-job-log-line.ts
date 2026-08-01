import type { QueueJobLogEvent } from '~/routing/queues/hooks/useQueueJobLogs';

const formatTimestamp = (value: unknown): string => {
  if (typeof value !== 'string' && typeof value !== 'number') {
    return '';
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString();
};

/**
 * @description Render one job-log event as a single fixed-width console line
 * (`<timestamp> <LEVEL> <source>  <message>`) for display and clipboard copy.
 */
export const formatQueueJobLogLine = (event: QueueJobLogEvent): string => {
  const ts = formatTimestamp(event.timestamp);
  return `${ts} ${event.level.toUpperCase().padEnd(5)} ${event.source}  ${event.message}`;
};
