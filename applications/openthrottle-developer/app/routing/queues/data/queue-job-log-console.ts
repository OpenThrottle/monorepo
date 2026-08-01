import type { QueueJobLogStreamStatus } from '~/routing/queues/hooks/useQueueJobLogs';

/** Log levels the console can filter by, in ascending severity. */
export const QUEUE_JOB_LOG_LEVELS = ['debug', 'info', 'warn', 'error'] as const;

/** Job states after which no further logs will ever arrive. */
export const QUEUE_JOB_FINISHED_STATES = new Set(['completed', 'failed']);

/** Stream-status → indicator dot color + label for the console header. */
export const QUEUE_JOB_LOG_STATUS_META: Record<
  QueueJobLogStreamStatus,
  { dot: string; label: string }
> = {
  ended: { dot: 'bg-muted-foreground', label: 'Stream ended' },
  error: { dot: 'bg-red-500', label: 'Stream error' },
  idle: { dot: 'bg-muted-foreground', label: 'Live updates unavailable' },
  live: { dot: 'bg-green-500', label: 'Live' },
};
