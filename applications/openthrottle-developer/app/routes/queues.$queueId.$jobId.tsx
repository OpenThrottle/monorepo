import * as React from 'react';
import { mergeRouteModuleMeta } from '@openthrottle/react-router-utils';
import { executeGraphqlWithAuth } from '@openthrottle/react-router-graphql';
import type { GlobalLayoutBreadcrumbsHandle } from '@openthrottle/react-router-ui-global';
import { GlobalScreen } from '@openthrottle/react-router-ui-global';
import {
  CancelPlanRunInputSchema,
  RetryJobInputSchema,
} from '~/__generated__/schemas';
import {
  GetQueueJobDetailsDocument,
  QueueJobDetailCancelPlanRunDocument,
  QueueJobDetailRetryDocument,
} from '~/__generated__/graphql';
import { GlobalErrorBoundary } from '@openthrottle/react-router-ui-global';
import { QueueJobDetail } from '~/routing/queues/components/QueueJobDetail';
import { SITE_TITLE } from '~/global/config/settings';
import { toErrorMessage } from '~/global/utils/utils.error-message';
import type { Route } from '@/app/routes/+types/queues.$queueId.$jobId';

type HandleData = Route.ComponentProps['loaderData'];

export const handle: GlobalLayoutBreadcrumbsHandle<HandleData> = {
  breadcrumb: (match) => {
    const id = match?.params?.jobId;
    if (id == null || id === '') {
      return 'Job';
    }

    return `#${id}`;
  },

  links: (match) => {
    const q = match?.params?.queueId;
    if (q == null || q === '') {
      return [{ children: 'Queues', to: '/queues' }];
    }

    return [
      { children: 'Queues', to: '/queues' },
      { children: q, to: `/queues/${encodeURIComponent(q)}` },
    ];
  },
};

export const loader = async (args: Route.LoaderArgs) => {
  const queueName = args.params.queueId;
  if (queueName == null || queueName === '') {
    throw new Response('Queue name required', { status: 400 });
  }

  const jobIdParam = args.params.jobId;
  if (jobIdParam == null || jobIdParam === '') {
    throw new Response('Job id required', { status: 400 });
  }

  const jobId = decodeURIComponent(jobIdParam);
  const { job } = await executeGraphqlWithAuth(
    args.request,
    GetQueueJobDetailsDocument,
    { jobId, queueName },
  );

  if (!job) {
    throw new Response(`Job not found in queue "${queueName}"`, {
      status: 404,
    });
  }

  return { job, queueName };
};

export const links: Route.LinksFunction = () => {
  return [];
};

export const meta: Route.MetaFunction = mergeRouteModuleMeta((args) => {
  const queueName = args.params.queueId ?? 'Queue';
  const jobId = args.params.jobId ?? '';

  return [{ title: `${jobId} | ${queueName} | Queues | ${SITE_TITLE}` }];
});

export default function Component(
  props: Route.ComponentProps,
): React.ReactElement {
  const { loaderData } = props;
  const { job, queueName } = loaderData;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <GlobalScreen>
      <QueueJobDetail job={job} queueName={queueName} />
    </GlobalScreen>
  );
}

export const action = async (args: Route.ActionArgs) => {
  const queueName = args.params.queueId;
  const jobIdParam = args.params.jobId;

  if (
    queueName == null ||
    queueName === '' ||
    jobIdParam == null ||
    jobIdParam === ''
  ) {
    return { retryJobError: 'Missing queue or job id.' };
  }

  const jobId = decodeURIComponent(jobIdParam);
  const formData = await args.request.formData();
  const intent = formData.get('intent');

  if (intent === 'retryJob') {
    try {
      const input = RetryJobInputSchema().parse({ jobId, queueName });
      const result = await executeGraphqlWithAuth(
        args.request,
        QueueJobDetailRetryDocument,
        { input },
      );

      if (!result.retryJob) {
        return { retryJobError: 'Retry failed.' };
      }

      return { retryJob: result.retryJob };
    } catch (error) {
      return { retryJobError: toErrorMessage(error, 'Retry failed.') };
    }
  }

  if (intent === 'cancelPlanRun') {
    try {
      const planIdField = formData.get('planId');
      const planId =
        typeof planIdField === 'string' && planIdField.trim() !== ''
          ? planIdField.trim()
          : '';

      const input = CancelPlanRunInputSchema().parse({ planId });
      const result = await executeGraphqlWithAuth(
        args.request,
        QueueJobDetailCancelPlanRunDocument,
        { input },
      );

      if (!result.cancelPlanRun) {
        return { cancelPlanRunError: 'Failed to cancel plan run.' };
      }

      return { cancelPlanRun: result.cancelPlanRun };
    } catch (error) {
      return {
        cancelPlanRunError: toErrorMessage(error, 'Failed to cancel plan run.'),
      };
    }
  }

  return {};
};

export const ErrorBoundary = GlobalErrorBoundary;
