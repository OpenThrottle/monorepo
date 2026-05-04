import * as React from 'react';
import {
  DEFAULT_PAGINATION_LIMIT,
  mergeRouteModuleMeta,
} from '@openthrottle/react-router-utils';
import {
  OpenThrottlePagination,
  OpenThrottleStatCard,
} from '@openthrottle/react-router-ui';
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

export const handle: GlobalLayoutBreadcrumbsHandle = {
  breadcrumb: (_match) => _match?.data?.queue?.name ?? 'Queue Details',
  links: (_match) => [{ children: 'Queues', to: '/queues' }],
};

export const loader = async (args: Route.LoaderArgs) => {
  const queueName = args.params.queueId;
  if (!queueName) {
    throw new Response('Queue name required', { status: 400 });
  }

  const { queue } = await executeGraphqlWithAuth(
    args.request,
    GetQueueDocument,
    {
      input: {
        limit: DEFAULT_PAGINATION_LIMIT,
        name: queueName,
        offset: 0,
        states: ['waiting', 'active', 'completed', 'failed', 'delayed'],
      },
    },
  );

  if (!queue) {
    throw new Response(`Queue "${queueName}" not found`, { status: 404 });
  }

  return { queue };
};

export const meta: Route.MetaFunction = mergeRouteModuleMeta((args) => {
  const queueName = args.params.queueId ?? 'Queue';

  return [{ title: `${queueName} | Queues | ${SITE_TITLE}` }];
});

export default function Component(
  props: Route.ComponentProps,
): React.ReactElement {
  const { actionData: _a, loaderData, matches: _m, params: _p } = props;
  const { queue } = loaderData;

  const jobs = queue.jobs?.jobs ?? [];
  const hasNext = queue.jobs?.hasNext ?? false;

  return (
    <GlobalScreen>
      <p
        className="mb-6 max-w-3xl text-sm text-muted-foreground"
        data-testid="queue-detail-operational-hint"
      >
        Jobs listed below are a single page of recent items. Open a job for the
        full payload, timestamps, failure or return value, retry (
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

          {hasNext && (
            <p className="text-sm text-muted-foreground">
              More jobs available (next page not yet implemented).
            </p>
          )}

          <OpenThrottlePagination
            basePath="/queues"
            className="mt-8"
            limit={100}
            page={1}
            total={jobs.length}
          />
        </>
      )}
    </GlobalScreen>
  );
}

// export const action = async (args: Route.ActionArgs) => {
//   return {};
// };

export const ErrorBoundary = GlobalErrorBoundary;
