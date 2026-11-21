import type { QueueJobLogsPageFragment } from '~/__generated__/graphql';

/** Empty page returned when the loader has no job/queue to query. */
export const EMPTY_PAGE: QueueJobLogsPageFragment = {
  events: [],
  hasMore: false,
  nextCursor: null,
};
