import {
  executeGraphqlWithAuth,
  parseFormData,
} from '@openthrottle/react-router-graphql';
import { Button } from '@openthrottle/react-router-shadcn';
import type { GlobalLayoutBreadcrumbsHandle } from '@openthrottle/react-router-ui-global';
import {
  GlobalScreen,
  GlobalStatsPanel,
  GlobalStatsToggleButton,
  readSearchParam,
  ROUTE_STATS_URL,
  shouldRevalidateIgnoringParams,
} from '@openthrottle/react-router-ui-global';
import { GlobalErrorBoundary } from '@openthrottle/react-router-ui-global';
import { mergeRouteModuleMeta } from '@openthrottle/react-router-utils';
import { PlusIcon } from 'lucide-react';
import * as React from 'react';
import { useSearchParams } from 'react-router';
import { Link } from 'react-router';

import type { Route } from '@/app/routes/+types/queues._index';
import {
  GetQueuesDocument,
  QueuesPauseQueueDocument,
  QueuesResumeQueueDocument,
} from '~/__generated__/graphql';
import { SITE_TITLE } from '~/global/config/settings';
import { QueueOpsToolbar } from '~/routing/queues/components/QueueOpsToolbar';
import { QueuesIntroduction } from '~/routing/queues/components/QueuesIntroduction';
import { QueuesStats } from '~/routing/queues/components/QueuesStats';
import { QueuesTable } from '~/routing/queues/components/QueuesTable';
import { QueueStateChart } from '~/routing/queues/components/QueueStateChart';
import { QueueStatRow } from '~/routing/queues/components/QueueStatRow';
import { QueueControlFormSchema } from '~/routing/queues/utils/QueueControlFormSchema';
import { summarizeQueues } from '~/routing/queues/utils/summarizeQueues';

type HandleData = Route.ComponentProps['loaderData'];

export const handle: GlobalLayoutBreadcrumbsHandle<HandleData> = {
  breadcrumb: (_match) => 'Queues',
  links: (_match) => [],
};

export const loader = async (args: Route.LoaderArgs) => {
  const { queues } = await executeGraphqlWithAuth(
    args.request,
    GetQueuesDocument,
  );

  return { queues };
};

export const links: Route.LinksFunction = () => {
  return [];
};

export const meta: Route.MetaFunction = mergeRouteModuleMeta((_args) => {
  return [{ title: `Queues | ${SITE_TITLE}` }];
});

export default function Component(
  props: Route.ComponentProps,
): React.ReactElement {
  const { actionData: _a, loaderData, matches: _m, params: _p } = props;
  const { queues } = loaderData;

  // Hooks
  const [searchParams] = useSearchParams();

  // Setup
  const query = readSearchParam(searchParams).toLowerCase();
  const hasQuery = query !== '';
  const matchingQueues = queues.filter((queue) => {
    return queue.name.toLowerCase().includes(query);
  });
  const filteredQueues = hasQuery ? matchingQueues : queues;
  const summary = summarizeQueues(queues);

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <GlobalScreen>
      <QueuesIntroduction />
      <GlobalStatsPanel>
        <QueueStatRow
          columns={4}
          stats={[
            {
              color: 'bg-yellow-300',
              title: 'Backlog',
              value: summary.backlog,
            },
            {
              color: 'bg-blue-300',
              title: 'In flight',
              value: summary.inFlight,
            },
            { color: 'bg-red-300', title: 'Failed', value: summary.failed },
            {
              color: 'bg-green-300',
              title: 'Completed',
              value: summary.completed,
            },
          ]}
        />
      </GlobalStatsPanel>

      <div>
        <QueueOpsToolbar
          actions={
            <>
              <GlobalStatsToggleButton />
              <Button asChild={true} className="shrink-0" variant="outline">
                <Link to="/queues/create">
                  <PlusIcon className="h-4 w-4" /> Create queue
                </Link>
              </Button>
            </>
          }
          className="mb-4"
          searchAriaLabel="Search queues"
          searchPlaceholder="Search queues"
        />

        <QueuesTable
          // className="bg-card"
          queues={filteredQueues}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 md:gap-8">
        <QueueStateChart queues={filteredQueues} />
        <QueuesStats queues={filteredQueues} />
      </div>
    </GlobalScreen>
  );
}

export const shouldRevalidate = shouldRevalidateIgnoringParams([
  ROUTE_STATS_URL.param,
]);

export const action = async (args: Route.ActionArgs) => {
  const formData = await args.request.formData();
  const parsed = parseFormData(formData, QueueControlFormSchema, {
    allow: [],
  });
  if (!parsed.success) {
    return { error: parsed.error };
  }

  const { intent, queueName } = parsed.data;

  if (intent === 'pauseQueue') {
    const { pauseQueue } = await executeGraphqlWithAuth(
      args.request,
      QueuesPauseQueueDocument,
      { input: { queueName } },
    );

    if (!pauseQueue?.success) {
      return { error: pauseQueue?.error ?? 'Failed to pause queue.' };
    }

    return { paused: pauseQueue.queueName ?? queueName };
  }

  const { resumeQueue } = await executeGraphqlWithAuth(
    args.request,
    QueuesResumeQueueDocument,
    { input: { queueName } },
  );

  if (!resumeQueue?.success) {
    return { error: resumeQueue?.error ?? 'Failed to resume queue.' };
  }

  return { resumed: resumeQueue.queueName ?? queueName };
};

export const ErrorBoundary = GlobalErrorBoundary;
