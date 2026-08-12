import { executeGraphqlWithAuth } from '@openthrottle/react-router-graphql';
import {
  QueueDetailCleanQueueDocument,
  QueueDetailPauseQueueDocument,
  QueueDetailResumeQueueDocument,
} from '~/__generated__/graphql';
import type { Route } from '@/app/routes/+types/queues.$queueId._index';

/**
 * @description Queue detail ops (pause / resume / clean), dispatched by `intent`.
 * Extracted from the route action per route-primitive-shape R4 so the route file
 * stays a thin adapter.
 */
export const runQueueDetailAction = async (args: Route.ActionArgs) => {
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
