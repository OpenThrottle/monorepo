import type { QueueHealthLevel } from '~/routing/queues/utils/queue-health';

/** Health level → indicator dot background class. */
export const QUEUE_HEALTH_DOT_CLASS: Record<QueueHealthLevel, string> = {
  critical: 'bg-red-500',
  degraded: 'bg-amber-500',
  healthy: 'bg-green-500',
};

/** Sort rank for health levels — worst first, so at-risk queues surface. */
export const QUEUE_HEALTH_RANK: Record<QueueHealthLevel, number> = {
  critical: 0,
  degraded: 1,
  healthy: 2,
};
