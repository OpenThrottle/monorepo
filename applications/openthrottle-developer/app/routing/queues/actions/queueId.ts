import {
  coerceBoolean,
  executeGraphqlWithAuth,
  parseFormData,
} from '@openthrottle/react-router-graphql';
import { z } from 'zod/v3';
import { CleanQueueInputSchema } from '~/__generated__/schemas';
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
    const parsed = parseFormData(
      formData,
      CleanQueueInputSchema()
        .omit({ queueName: true })
        .extend({ confirm: coerceBoolean(z.boolean().default(false)) }),
      { strict: false },
    );
    if (!parsed.success) {
      return { error: parsed.error };
    }

    const { cleanQueue } = await executeGraphqlWithAuth(
      args.request,
      QueueDetailCleanQueueDocument,
      {
        input: {
          confirm: parsed.data.confirm,
          queueName,
          state: parsed.data.state,
        },
      },
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
