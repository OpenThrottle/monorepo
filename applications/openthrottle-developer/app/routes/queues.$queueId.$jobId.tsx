import * as React from 'react';
import { Link } from 'react-router';
import { mergeRouteModuleMeta } from '@openthrottle/react-router-utils';
import { OpenThrottleStatCard } from '@openthrottle/react-router-ui';
import { GlobalErrorBoundary } from '~/global/components/GlobalErrorBoundary';
import { SITE_TITLE } from '~/global/config/settings';
import type { Route } from '@/app/routes/+types/queues.$queueId.$jobId';

export const loader = async (args: Route.LoaderArgs) => {
  const queueName = args.params.queueId;
  const jobId = args.params.jobId;

  if (!queueName) {
    throw new Response('Queue name required', { status: 400 });
  }

  return { jobId, queueName };
};

export const meta: Route.MetaFunction = mergeRouteModuleMeta((args) => {
  const queueName = args.params.queueId ?? 'Queue';

  return [{ title: `${queueName} | Queues | ${SITE_TITLE}` }];
});

export default function Component(
  props: Route.ComponentProps,
): React.ReactElement {
  const { actionData: _a, loaderData, matches: _m, params: _p } = props;

  // Hooks

  // Setup
  const { jobId, queueName } = loaderData;
  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <main className="p-4 md:p-8 lg:p-12 relative h-full max-w-7xl mx-auto w-full">
      <nav className="mb-4 text-sm text-muted-foreground">
        <Link className="hover:text-foreground" to="/queues">
          Queues
        </Link>
        <span className="mx-2">/</span>
        <span className="text-foreground">{jobId}</span>
      </nav>

      <div className="grid md:grid-cols-5 gap-4 lg:gap-8">
        <OpenThrottleStatCard title="Completed" value={1} />
        <OpenThrottleStatCard title="Completed" value={2} />
        <OpenThrottleStatCard title="Completed" value={3} />
      </div>

      <h1 className="text-xl my-4 text-highlight">Queue: {queueName}</h1>

      <h2 className="text-xl font-semibold mb-4">Job Details</h2>
    </main>
  );
}

// export const action = async (args: Route.ActionArgs) => {
//   return {};
// };

export const ErrorBoundary = GlobalErrorBoundary;
