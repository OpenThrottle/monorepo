import * as React from 'react';
import { Link } from 'react-router';
import {
  DEFAULT_PAGINATION_LIMIT,
  mergeRouteModuleMeta,
} from '@openthrottle/react-router-utils';
import {
  OpenThrottlePagination,
  OpenThrottleStatCard,
} from '@openthrottle/react-router-ui';
import { executeGraphqlWithAuth } from '@openthrottle/react-router-graphql';
import { GetQueueDocument } from '~/__generated__/graphql';
import { GlobalErrorBoundary } from '~/global/components/GlobalErrorBoundary';
import { SITE_TITLE } from '~/global/config/settings';
import { QueueJobCard } from '~/routing/queues/components/QueueJobCard';
import type { Route } from '@/app/routes/+types/queues.$queueId';

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
    <main className="p-4 md:p-8 lg:p-12 relative h-full max-w-7xl mx-auto w-full">
      <nav className="mb-4 text-sm text-muted-foreground">
        <Link className="hover:text-foreground" to="/queues">
          Queues
        </Link>
        <span className="mx-2">/</span>
        <span className="text-foreground">{queue.name}</span>
      </nav>

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
                <QueueJobCard job={job} />
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
    </main>
  );
}

export const ErrorBoundary = GlobalErrorBoundary;
