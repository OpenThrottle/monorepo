import type { QueueJobLogEvent } from '~/routing/queues/types';

/**
 * @description Stable order: by timestamp, then cursor, so renders don't jump
 * on arrival order.
 */
export const compareQueueJobLogEvents = (
  a: QueueJobLogEvent,
  b: QueueJobLogEvent,
): number => {
  const at = String(a.timestamp);
  const bt = String(b.timestamp);
  if (at !== bt) return at < bt ? -1 : 1;
  if (a.cursor !== b.cursor) return a.cursor < b.cursor ? -1 : 1;
  return 0;
};
