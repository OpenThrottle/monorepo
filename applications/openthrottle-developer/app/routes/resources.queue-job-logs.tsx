import { executeGraphqlWithAuth } from '@openthrottle/react-router-graphql';
import { QueueJobLogsDocument } from '~/__generated__/graphql';
import {
  DEFAULT_LIMIT,
  MAX_LIMIT,
} from '~/routing/queues/config/queue-job-logs';
import {
  EMPTY_PAGE,
  type QueueJobLogsPage,
} from '~/routing/queues/data/queue-job-logs-page';
import type { Route } from '@/app/routes/+types/resources.queue-job-logs';

/**
 * Resource loader backing the live job-log console's history backfill —
 * `GET /resources/queue-job-logs?jobId=&queueName=&after=&limit=`. Cursor-paged
 * (BullMQ per-job log history) so the client can "load older" without a full
 * navigation. Runs the auth'd query server-side; the console merges the events
 * into the same cursor-keyed map its live `queueJobLogTail` subscription writes to.
 */
export const loader = async (
  args: Route.LoaderArgs,
): Promise<QueueJobLogsPage> => {
  const url = new URL(args.request.url);
  const jobId = url.searchParams.get('jobId') ?? '';
  const queueName = url.searchParams.get('queueName') ?? '';

  if (jobId === '' || queueName === '') {
    return EMPTY_PAGE;
  }

  const after = url.searchParams.get('after');
  const limitParsed = parseInt(url.searchParams.get('limit') ?? '', 10);
  const limit =
    Number.isFinite(limitParsed) && limitParsed > 0
      ? Math.min(MAX_LIMIT, limitParsed)
      : DEFAULT_LIMIT;

  const { queueJobLogs } = await executeGraphqlWithAuth(
    args.request,
    QueueJobLogsDocument,
    {
      input: {
        after: after != null && after !== '' ? after : null,
        jobId,
        limit,
        queueName,
      },
    },
  );

  return queueJobLogs;
};
