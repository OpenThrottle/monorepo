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
import {
  OpenThrottlePaginationSimple,
  OpenThrottleStatCard,
} from '@openthrottle/react-router-ui';
import { ListOrderedIcon } from 'lucide-react';
import { GetQueueDocument } from '~/__generated__/graphql';
import { GlobalErrorBoundary } from '@openthrottle/react-router-ui-global';
import { QueueJobsTable } from '~/routing/queues/components/QueueJobsTable';
import { SITE_TITLE } from '~/global/config/settings';
import type { Route } from '@/app/routes/+types/queues.$queueId._index';

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
  const params = new URLSearchParams();

  // Setup
  const jobs = queue.jobs?.jobs ?? [];
  const queueBasePath = `/queues/${encodeURIComponent(queue.name)}`;
  // const hasNext = queue.jobs?.hasNext ?? false;

  const _buildJobsPageHref = (nextPage: number): string => {
    params.set('page', String(nextPage));
    params.set('limit', String(limit));

    return `${queueBasePath}?${params.toString()}`;
  };

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <GlobalScreen>
      <div className="grid gap-4 md:grid-cols-5 md:gap-8 lg:gap-12">
        <OpenThrottleStatCard title="Completed" value={queue.completedCount} />
        <OpenThrottleStatCard title="Active" value={queue.activeCount} />
        <OpenThrottleStatCard title="Waiting" value={queue.waitingCount} />
        <OpenThrottleStatCard title="Delayed" value={queue.delayedCount} />
        <OpenThrottleStatCard title="Failed" value={queue.failedCount} />
      </div>

      <div>
        <GlobalHeading
          className="mb-4"
          heading="h1"
          icon={ListOrderedIcon}
          title={`Queues: ${queue.name}`}
        />

        <p
          className="text-muted-foreground mb-6 text-sm"
          data-testid="queue-detail-operational-hint"
        >
          Jobs use URL pagination (
          <code className="bg-muted rounded px-1 text-xs">?page=</code>,{' '}
          <code className="bg-muted rounded px-1 text-xs">?limit=</code>,{' '}
          {QUEUE_JOBS_LIMIT_MIN}–{QUEUE_JOBS_LIMIT_MAX}). Open a job for the
          full payload, timestamps, failure or return value, retry (
          <code className="bg-muted rounded px-1 text-xs">retryJob</code>),
          cancel plan run when applicable (
          <code className="bg-muted rounded px-1 text-xs">cancelPlanRun</code>),
          and plan/task deep links from the parsed payload.
        </p>
      </div>

      <QueueJobsTable
        className="bg-card mb-4"
        jobs={jobs}
        queueName={queue.name}
      />
      <OpenThrottlePaginationSimple
        basePath={queueBasePath}
        limit={limit}
        page={page}
        total={queue.jobs?.jobs?.length ?? 0}
      />
    </GlobalScreen>
  );
}

export const action = async (_args: Route.ActionArgs) => {
  return {};
};

export const ErrorBoundary = GlobalErrorBoundary;
