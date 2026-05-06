import * as React from 'react';
import { Link } from 'react-router';
import { mergeRouteModuleMeta } from '@openthrottle/react-router-utils';
import { executeGraphqlWithAuth } from '@openthrottle/react-router-graphql';
import {
  GlobalLayoutBreadcrumbsHandle,
  GlobalScreen,
} from '@openthrottle/react-router-ui-global';
import {
  CancelPlanRunInputSchema,
  RetryJobInputSchema,
} from '~/__generated__/schemas';
import {
  GetQueueJobDetailsDocument,
  QueueJobDetailCancelPlanRunDocument,
  QueueJobDetailRetryDocument,
} from '~/__generated__/graphql';
import { GlobalErrorBoundary } from '~/global/components/GlobalErrorBoundary';
import { QueueJobDetail } from '~/routing/queues/components/QueueJobDetail';
import { SITE_TITLE } from '~/global/config/settings';
import type { Route } from '@/app/routes/+types/queues.$queueId.$jobId';

type LoaderData = Route.ComponentProps['loaderData'];

export const handle: GlobalLayoutBreadcrumbsHandle<LoaderData> = {
  breadcrumb: (match) => {
    const id = match?.params?.jobId;
    if (id == null || id === '') {
      return 'Job';
    }
    return id.length > 28 ? `${id.slice(0, 14)}…${id.slice(-8)}` : id;
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
  const jobIdParam = args.params.jobId;
  if (queueName == null || queueName === '') {
    throw new Response('Queue name required', { status: 400 });
  }
  if (jobIdParam == null || jobIdParam === '') {
    throw new Response('Job id required', { status: 400 });
  }

  const jobId = decodeURIComponent(jobIdParam);

  const result = await executeGraphqlWithAuth(
    args.request,
    GetQueueJobDetailsDocument,
    {
      jobId,
      queueName,
    },
  );

  if (!result.job) {
    throw new Response(`Job not found in queue "${queueName}"`, {
      status: 404,
    });
  }

  return { job: result.job, queueName };
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
      <nav className="mb-4 text-sm text-muted-foreground">
        <Link className="hover:text-foreground" to="/queues">
          Queues
        </Link>
        <span className="mx-2">/</span>
        <Link
          className="hover:text-foreground"
          to={`/queues/${encodeURIComponent(queueName)}`}
        >
          {queueName}
        </Link>
        <span className="mx-2">/</span>
        <span className="text-foreground font-mono text-xs break-all">
          {job.id}
        </span>
      </nav>

      <h1 className="text-xl font-semibold mb-6 text-accent">
        Queue job <span className="font-mono text-base">{job.id}</span>
      </h1>

      <QueueJobDetail job={job} queueName={queueName} />
    </GlobalScreen>
  );
}

export const action = async (
  args: Route.ActionArgs,
): Promise<Route.ComponentProps['actionData']> => {
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
      const message = error instanceof Error ? error.message : String(error);

      return { retryJobError: message };
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
      const message = error instanceof Error ? error.message : String(error);

      return { cancelPlanRunError: message };
    }
  }

  return {};
};

export const ErrorBoundary = GlobalErrorBoundary;
