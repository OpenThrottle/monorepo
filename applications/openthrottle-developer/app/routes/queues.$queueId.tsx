import * as React from 'react';
import { Link } from 'react-router';
import {
  DEFAULT_PAGINATION_LIMIT,
  mergeRouteModuleMeta,
} from '@openthrottle/react-router-utils';
import { OpenThrottleStatCard } from '@openthrottle/react-router-ui';
import { Button } from '@openthrottle/react-router-shadcn';
import { executeGraphqlWithAuth } from '@openthrottle/react-router-graphql';
import {
  GlobalLayoutBreadcrumbsHandle,
  GlobalScreen,
} from '@openthrottle/react-router-ui-global';
import { GetQueueDocument } from '~/__generated__/graphql';
import { GlobalErrorBoundary } from '~/global/components/GlobalErrorBoundary';
import { QueueJobCard } from '~/routing/queues/components/QueueJobCard';
import { SITE_TITLE } from '~/global/config/settings';
import type { Route } from '@/app/routes/+types/queues.$queueId';

const QUEUE_JOBS_LIMIT_MIN = 10;
const QUEUE_JOBS_LIMIT_MAX = 100;

/**
 * @description Parses `page` and `limit` search params for BullMQ job pagination (GraphQL offset/limit).
 */
const parseQueueJobsPagination = (
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

export const handle: GlobalLayoutBreadcrumbsHandle = {
  breadcrumb: (_match) => _match?.data?.queue?.name ?? 'Queue Details',
  links: (_match) => [{ children: 'Queues', to: '/queues' }],
};

export const loader = async (args: Route.LoaderArgs) => {
  const queueName = args.params.queueId;
  if (!queueName) {
    throw new Response('Queue name required', { status: 400 });
  }

  const { limit, offset, page } = parseQueueJobsPagination(args.request.url);

  const { queue } = await executeGraphqlWithAuth(
    args.request,
    GetQueueDocument,
    {
      input: {
        limit,
        name: queueName,
        offset,
        states: ['waiting', 'active', 'completed', 'failed', 'delayed'],
      },
    },
  );

  if (!queue) {
    throw new Response(`Queue "${queueName}" not found`, { status: 404 });
  }

  return { limit, page, queue };
};

export const meta: Route.MetaFunction = mergeRouteModuleMeta((args) => {
  const queueName = args.params.queueId ?? 'Queue';

  return [{ title: `${queueName} | Queues | ${SITE_TITLE}` }];
});

export default function Component(
  props: Route.ComponentProps,
): React.ReactElement {
  const { actionData: _a, loaderData, matches: _m, params: _p } = props;
  const { limit, page, queue } = loaderData;

  const jobs = queue.jobs?.jobs ?? [];
  const hasNext = queue.jobs?.hasNext ?? false;
  const queueBasePath = `/queues/${encodeURIComponent(queue.name)}`;
  const buildJobsPageHref = (nextPage: number): string => {
    const params = new URLSearchParams();
    params.set('page', String(nextPage));
    params.set('limit', String(limit));

    return `${queueBasePath}?${params.toString()}`;
  };

  return (
    <GlobalScreen>
      <p
        className="mb-6 max-w-3xl text-sm text-muted-foreground"
        data-testid="queue-detail-operational-hint"
      >
        Jobs use URL pagination (
        <code className="rounded bg-muted px-1 text-xs">?page=</code>,{' '}
        <code className="rounded bg-muted px-1 text-xs">?limit=</code>,{' '}
        {QUEUE_JOBS_LIMIT_MIN}–{QUEUE_JOBS_LIMIT_MAX}). Open a job for the full
        payload, timestamps, failure or return value, retry (
        <code className="rounded bg-muted px-1 text-xs">retryJob</code>), cancel
        plan run when applicable (
        <code className="rounded bg-muted px-1 text-xs">cancelPlanRun</code>),
        and plan/task deep links from the parsed payload.
      </p>
      <div className="grid md:grid-cols-5 gap-4 lg:gap-8">
        <OpenThrottleStatCard title="Completed" value={queue.completedCount} />
        <OpenThrottleStatCard title="Active" value={queue.activeCount} />
        <OpenThrottleStatCard title="Waiting" value={queue.waitingCount} />
        <OpenThrottleStatCard title="Delayed" value={queue.delayedCount} />
        <OpenThrottleStatCard title="Failed" value={queue.failedCount} />
      </div>

      <h1 className="text-xl my-4 text-highlight">Jobs</h1>
      {jobs.length === 0 ? (
        <p className="text-muted-foreground">No jobs in this queue.</p>
      ) : (
        <>
          <ul className="space-y-3 mb-4">
            {jobs.map((job) => (
              <li key={job.id}>
                <QueueJobCard job={job} queueName={queue.name} />
              </li>
            ))}
          </ul>

          {(jobs.length > 0 || page > 1 || hasNext) && (
            <div
              className="mt-8 flex flex-col gap-3 border-t pt-6 sm:flex-row sm:items-center sm:justify-between"
              data-testid="queue-jobs-pagination"
            >
              <p className="text-sm text-muted-foreground">
                Page {page} · {jobs.length} job{jobs.length === 1 ? '' : 's'} ·{' '}
                {limit} per page
                {hasNext ? ' · more on next page' : ''}
              </p>
              <div className="flex flex-wrap gap-2">
                {page > 1 ? (
                  <Button asChild={true} size="sm" variant="outline">
                    <Link rel="prev" to={buildJobsPageHref(page - 1)}>
                      Previous
                    </Link>
                  </Button>
                ) : (
                  <Button
                    className="pointer-events-none opacity-50"
                    disabled={true}
                    size="sm"
                    variant="outline"
                  >
                    Previous
                  </Button>
                )}
                {hasNext ? (
                  <Button asChild={true} size="sm" variant="outline">
                    <Link rel="next" to={buildJobsPageHref(page + 1)}>
                      Next
                    </Link>
                  </Button>
                ) : (
                  <Button
                    className="pointer-events-none opacity-50"
                    disabled={true}
                    size="sm"
                    variant="outline"
                  >
                    Next
                  </Button>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </GlobalScreen>
  );
}

// export const action = async (args: Route.ActionArgs) => {
//   return {};
// };

export const ErrorBoundary = GlobalErrorBoundary;
