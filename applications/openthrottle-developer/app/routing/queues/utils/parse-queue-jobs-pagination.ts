import { DEFAULT_PAGINATION_LIMIT } from '@openthrottle/react-router-utils';
import {
  QUEUE_JOBS_LIMIT_MAX,
  QUEUE_JOBS_LIMIT_MIN,
} from '~/routing/queues/config/queue-jobs';

/**
 * @description Parses `page` and `limit` search params for BullMQ job pagination (GraphQL offset/limit).
 */
export const parseQueueJobsPagination = (
  requestUrl: string,
): { limit: number; offset: number; page: number } => {
  const url = new URL(requestUrl);
  const page = Math.max(
    1,
    parseInt(url.searchParams.get('page') ?? '1', 10) || 1,
  );
  const limitRaw = url.searchParams.get('limit');
  const limitParsed =
    limitRaw != null && limitRaw !== '' ? parseInt(limitRaw, 10) : Number.NaN;
  const limit =
    Number.isFinite(limitParsed) && limitParsed > 0
      ? Math.min(
          QUEUE_JOBS_LIMIT_MAX,
          Math.max(QUEUE_JOBS_LIMIT_MIN, Math.floor(limitParsed)),
        )
      : DEFAULT_PAGINATION_LIMIT;

  const offset = (page - 1) * limit;

  return { limit, offset, page };
};
