import * as React from 'react';
import { mergeRouteModuleMeta } from '@openthrottle/react-router-utils';
import { executeGraphqlWithAuth } from '@openthrottle/react-router-graphql';
import {
  GlobalHeading,
  GlobalLayoutBreadcrumbsHandle,
  GlobalScreen,
} from '@openthrottle/react-router-ui-global';
import { OpenThrottlePaginationSimple } from '@openthrottle/react-router-ui';
import { ListOrderedIcon } from 'lucide-react';
import { useSearchParams } from 'react-router';
import { GetQueueDocument } from '~/__generated__/graphql';
import { GlobalErrorBoundary } from '@openthrottle/react-router-ui-global';
import { QueueDetailControls } from '~/routing/queues/components/QueueDetailControls';
import { QueueHealthPill } from '~/routing/queues/components/QueueHealthPill';
import { QueueJobsTable } from '~/routing/queues/components/QueueJobsTable';
import { QueueOpsToolbar } from '~/routing/queues/components/QueueOpsToolbar';
import { QueueStatRow } from '~/routing/queues/components/QueueStatRow';
import { QUEUE_JOB_STATE_FILTER_OPTIONS } from '~/routing/queues/data/job-state-filter-options';
import { parseQueueJobsPagination } from '~/routing/queues/utils/parse-queue-jobs-pagination';
import { runQueueDetailAction } from '~/routing/queues/actions/queueId';
import { SITE_TITLE } from '~/global/config/settings';
import type { Route } from '@/app/routes/+types/queues.$queueId._index';

type HandleData = Route.ComponentProps['loaderData'];

export const handle: GlobalLayoutBreadcrumbsHandle<HandleData> = {
  breadcrumb: (match) => match.loaderData?.queue?.name ?? 'Queue Details',
  links: (_match) => [{ children: 'Queues', to: '/queues' }],
};

export const loader = async (args: Route.LoaderArgs) => {
  const queueName = args.params.queueId;
  if (!queueName) {
    throw new Response('Queue name required', { status: 400 });
  }

  const { limit, offset, page } = parseQueueJobsPagination(args.url.toString());

  const selectedStates = new URL(args.url.toString()).searchParams.getAll(
    'state',
  );
  const states =
    selectedStates.length > 0
      ? selectedStates
      : [...QUEUE_JOB_STATE_FILTER_OPTIONS];

  const { queue } = await executeGraphqlWithAuth(
    args.request,
    GetQueueDocument,
    {
      input: {
        limit,
        name: queueName,
        offset,
        states,
      },
    },
  );

  if (!queue) {
    throw new Response(`Queue "${queueName}" not found`, { status: 404 });
  }

  return { limit, page, queue };
};

export const links: Route.LinksFunction = () => {
  return [];
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

  // Hooks
  const [searchParams] = useSearchParams();

  // Setup
  const queueBasePath = `/queues/${encodeURIComponent(queue.name)}`;
  const allJobs = queue.jobs?.jobs ?? [];
  const total = queue.jobs?.total ?? 0;
  const query = (searchParams.get('q') ?? '').trim().toLowerCase();
  const jobs =
    query === ''
      ? allJobs
      : allJobs.filter(
          (job) =>
            job.id.toLowerCase().includes(query) ||
            (job.name ?? '').toLowerCase().includes(query),
        );

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <GlobalScreen>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <GlobalHeading heading="h1" icon={ListOrderedIcon} title={queue.name}>
          <QueueHealthPill
            activeCount={queue.activeCount}
            delayedCount={queue.delayedCount}
            failedCount={queue.failedCount}
            waitingCount={queue.waitingCount}
          />
        </GlobalHeading>
        <QueueDetailControls queueName={queue.name} />
      </div>

      <QueueStatRow
        columns={5}
        stats={[
          {
            color: 'bg-green-300',
            title: 'Completed',
            value: queue.completedCount,
          },
          { color: 'bg-yellow-300', title: 'Active', value: queue.activeCount },
          { color: 'bg-blue-300', title: 'Waiting', value: queue.waitingCount },
          {
            color: 'bg-violet-300',
            title: 'Delayed',
            value: queue.delayedCount,
          },
          { color: 'bg-red-300', title: 'Failed', value: queue.failedCount },
        ]}
      />

      <QueueOpsToolbar
        searchAriaLabel="Find a job on this page"
        searchPlaceholder="Find a job on this page"
        stateOptions={QUEUE_JOB_STATE_FILTER_OPTIONS}
      />

      <QueueJobsTable className="bg-card" jobs={jobs} queueName={queue.name} />

      <OpenThrottlePaginationSimple
        basePath={queueBasePath}
        limit={limit}
        page={page}
        resultLabel="jobs"
        total={total}
      />
    </GlobalScreen>
  );
}

export const action = (args: Route.ActionArgs) => runQueueDetailAction(args);

export const ErrorBoundary = GlobalErrorBoundary;
