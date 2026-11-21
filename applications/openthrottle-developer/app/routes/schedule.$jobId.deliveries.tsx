import { executeGraphqlWithAuth } from '@openthrottle/react-router-graphql';
import { Button } from '@openthrottle/react-router-shadcn';
import type { GlobalLayoutBreadcrumbsHandle } from '@openthrottle/react-router-ui-global';
import {
  GlobalErrorBoundary,
  GlobalHeading,
  GlobalScreen,
} from '@openthrottle/react-router-ui-global';
import { mergeRouteModuleMeta } from '@openthrottle/react-router-utils';
import { WebhookIcon } from 'lucide-react';
import * as React from 'react';
import { Link } from 'react-router';

import type { Route } from '@/app/routes/+types/schedule.$jobId.deliveries';
import { ScheduledAgentJobWebhookDeliveriesDocument } from '~/__generated__/graphql';
import { SITE_TITLE } from '~/global/config/settings';
import { ScheduleWebhookDeliveries } from '~/routing/schedule/components/ScheduleWebhookDeliveries';
import { SCHEDULE_WEBHOOK_COPY } from '~/routing/schedule/data/data.copy';

type HandleData = Route.ComponentProps['loaderData'];

export const handle: GlobalLayoutBreadcrumbsHandle<HandleData> = {
  breadcrumb: (_match) => 'Webhook deliveries',
  links: (match) => [
    { children: 'Schedule', to: '/schedule' },
    {
      children: match.loaderData?.job?.name,
      to: `/schedule/${match.loaderData?.job?.id}`,
    },
  ],
};

export const loader = async (args: Route.LoaderArgs) => {
  const { jobId } = args.params;

  const { scheduledAgentJob, scheduledAgentJobWebhookDeliveries } =
    await executeGraphqlWithAuth(
      args.request,
      ScheduledAgentJobWebhookDeliveriesDocument,
      { jobId },
    );

  if (scheduledAgentJob == null) {
    throw new Response('Scheduled job not found', { status: 404 });
  }

  return {
    deliveries: scheduledAgentJobWebhookDeliveries,
    job: scheduledAgentJob,
  };
};

export const links: Route.LinksFunction = () => {
  return [];
};

export const meta: Route.MetaFunction = mergeRouteModuleMeta((_args) => {
  return [{ title: `Webhook deliveries | Schedule | ${SITE_TITLE}` }];
});

export default function Component(
  props: Route.ComponentProps,
): React.ReactElement {
  const { loaderData } = props;
  const { deliveries, job } = loaderData;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <GlobalScreen>
      <div
        className="flex flex-col gap-6"
        data-testid="ScheduleWebhookDeliveriesRoute"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <GlobalHeading
              heading="h1"
              icon={WebhookIcon}
              title={SCHEDULE_WEBHOOK_COPY.deliveriesHeading}
            />
            <p className="text-muted-foreground mt-1 text-sm">{job.name}</p>
            <p className="text-muted-foreground mt-1 max-w-2xl text-sm">
              {SCHEDULE_WEBHOOK_COPY.deliveriesDescription}
            </p>
          </div>
          <Button asChild={true} variant="outline">
            <Link to={`/schedule/${job.id}?tab=webhook`}>
              {SCHEDULE_WEBHOOK_COPY.deliveriesBack}
            </Link>
          </Button>
        </div>

        <ScheduleWebhookDeliveries deliveries={deliveries} jobId={job.id} />
      </div>
    </GlobalScreen>
  );
}

export const ErrorBoundary = GlobalErrorBoundary;
