import type { QueueJobLogsPageFragment } from '~/__generated__/graphql';

/** Page shape returned by the queue-job-logs resource loader (mirrors QueueJobLogPageObject). */
export type QueueJobLogsPage = QueueJobLogsPageFragment;

/** Empty page returned when the loader has no job/queue to query. */
export const EMPTY_PAGE: QueueJobLogsPage = {
  events: [],
  hasMore: false,
  nextCursor: null,
};
