import { parsePagination } from '@openthrottle/react-router-utils';
import {
  QUEUE_JOBS_LIMIT_MAX,
  QUEUE_JOBS_LIMIT_MIN,
} from '~/routing/queues/config/queue-jobs';

/**
 * @description Parses `page` and `limit` search params for BullMQ job pagination (GraphQL offset/limit).
 */
export const parseQueueJobsPagination = (
  requestUrl: string,
): { limit: number; offset: number; page: number } =>
  parsePagination(new URL(requestUrl).searchParams, {
    maxLimit: QUEUE_JOBS_LIMIT_MAX,
    minLimit: QUEUE_JOBS_LIMIT_MIN,
  });
