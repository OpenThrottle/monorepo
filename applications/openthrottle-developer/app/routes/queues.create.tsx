import * as React from 'react';
import { mergeRouteModuleMeta } from '@openthrottle/react-router-utils';
import { redirect } from 'react-router';
import { executeGraphqlWithAuth } from '@openthrottle/react-router-graphql';
import {
  GlobalLayoutBreadcrumbsHandle,
  GlobalScreen,
} from '@openthrottle/react-router-ui-global';
import { CreateQueueDocument } from '~/__generated__/graphql';
import { GlobalErrorBoundary } from '~/global/components/GlobalErrorBoundary';
import { QueueForm } from '~/routing/queues/components/QueueForm';
import { SITE_TITLE } from '~/global/config/settings';
import type { Route } from '@/app/routes/+types/queues.create';

export const handle: GlobalLayoutBreadcrumbsHandle = {
  breadcrumb: (_match) => 'Create Queue',
  links: (_match) => [{ children: 'All Queues', to: '/queues' }],
};

// export const loader = async (args: Route.LoaderArgs) => {
//   return {};
// };

// export const links: LinksFunction = () => {
//   return [{ href: stylesheet, rel: 'stylesheet' }];
// };

export const meta: Route.MetaFunction = mergeRouteModuleMeta((_args) => {
  return [{ title: `Create queue | ${SITE_TITLE}` }];
});

export default function Component(
  props: Route.ComponentProps,
): React.ReactElement {
  const { actionData, loaderData: _l, matches: _m, params: _p } = props;

  return (
    <GlobalScreen>
      <div className="max-w-xl mx-auto">
        <h1 className="text-xl my-4 text-highlight">Create queue</h1>
        <QueueForm actionData={actionData} />
      </div>
    </GlobalScreen>
  );
}

export const action = async (args: Route.ActionArgs) => {
  const formData = await args.request.formData();
  const name = formData.get('name');

  if (typeof name !== 'string' || !name.trim()) {
    return { error: 'Queue name is required.' };
  }

  try {
    const result = await executeGraphqlWithAuth(
      args.request,
      CreateQueueDocument,
      { input: { name: name.trim() } },
    );

    if (!result.createQueue.success || !result.createQueue.queueName) {
      return {
        error: result.createQueue.error ?? 'Failed to create queue.',
      };
    }

    return redirect(`/queues/${result.createQueue.queueName}`);
  } catch (error) {
    const isError = error instanceof Error;
    const message = isError ? error.message : 'Failed to update queue.';

    return { error: message };
  }

  // 🚨 Default to invalid action error when no intent is provided.
  // throw new Error('Invalid intent');
};

export const ErrorBoundary = GlobalErrorBoundary;
