import * as React from 'react';
import {
  DEFAULT_PAGINATION_LIMIT,
  mergeRouteModuleMeta,
} from '@openthrottle/react-router-utils';
import { executeGraphqlWithAuth } from '@openthrottle/react-router-graphql';
import {
  GlobalHeading,
  GlobalLayoutBreadcrumbsHandle,
  GlobalScreen,
} from '@openthrottle/react-router-ui-global';
import { OpenThrottlePaginationSimple } from '@openthrottle/react-router-ui';
import { ListOrderedIcon } from 'lucide-react';
import { useSearchParams } from 'react-router';
import {
  GetQueueDocument,
  QueueDetailCleanQueueDocument,
  QueueDetailPauseQueueDocument,
  QueueDetailResumeQueueDocument,
} from '~/__generated__/graphql';
import { GlobalErrorBoundary } from '@openthrottle/react-router-ui-global';
import { QueueDetailControls } from '~/routing/queues/components/QueueDetailControls';
import { QueueHealthPill } from '~/routing/queues/components/QueueHealthPill';
import { QueueJobsTable } from '~/routing/queues/components/QueueJobsTable';
import { QueueOpsToolbar } from '~/routing/queues/components/QueueOpsToolbar';
import { QueueStatRow } from '~/routing/queues/components/QueueStatRow';
import { SITE_TITLE } from '~/global/config/settings';
import type { Route } from '@/app/routes/+types/queues.$queueId._index';

const QUEUE_JOBS_LIMIT_MIN = 10;
const QUEUE_JOBS_LIMIT_MAX = 100;

/** Job states selectable from the detail toolbar and used as the loader default. */
const QUEUE_JOB_STATE_FILTER_OPTIONS = [
  'waiting',
  'active',
  'completed',
  'failed',
  'delayed',
] as const;

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

export const action = async (args: Route.ActionArgs) => {
  const queueName = args.params.queueId;
  if (queueName == null || queueName === '') {
    return { error: 'Queue name is required.' };
  }

  const formData = await args.request.formData();
  const intent = formData.get('intent');

  if (intent === 'pauseQueue') {
    const { pauseQueue } = await executeGraphqlWithAuth(
      args.request,
      QueueDetailPauseQueueDocument,
      { input: { queueName } },
    );

    if (!pauseQueue?.success) {
      return { error: pauseQueue?.error ?? 'Failed to pause queue.' };
    }

    return { paused: pauseQueue.queueName ?? queueName };
  }

  if (intent === 'resumeQueue') {
    const { resumeQueue } = await executeGraphqlWithAuth(
      args.request,
      QueueDetailResumeQueueDocument,
      { input: { queueName } },
    );

    if (!resumeQueue?.success) {
      return { error: resumeQueue?.error ?? 'Failed to resume queue.' };
    }

    return { resumed: resumeQueue.queueName ?? queueName };
  }

  if (intent === 'cleanQueue') {
    const stateField = formData.get('state');
    const state = typeof stateField === 'string' ? stateField : '';
    const confirm = formData.get('confirm') === 'true';

    const { cleanQueue } = await executeGraphqlWithAuth(
      args.request,
      QueueDetailCleanQueueDocument,
      { input: { confirm, queueName, state } },
    );

    if (!cleanQueue?.success) {
      return { error: cleanQueue?.error ?? 'Failed to clean queue.' };
    }

    return {
      cleaned: {
        queueName: cleanQueue.queueName ?? queueName,
        removedCount: cleanQueue.removedCount,
      },
    };
  }

  return {};
};

export const ErrorBoundary = GlobalErrorBoundary;
