import { executeGraphqlWithAuth } from '@openthrottle/react-router-graphql';

import {
  CreateScheduledAgentJobWebhookTriggerDocument,
  DeleteScheduledAgentJobWebhookTriggerDocument,
  RotateScheduledAgentJobWebhookTriggerDocument,
  UpdateScheduledAgentJobWebhookTriggerDocument,
} from '~/__generated__/graphql';
import type { WebhookCredentials } from '~/routing/schedule/utils/getWebhookCredentials';
import { parseWebhookForm } from '~/routing/schedule/utils/parseWebhookForm';

export type WebhookIntent =
  'webhook-create' | 'webhook-delete' | 'webhook-rotate' | 'webhook-update';

/**
 * @description One success shape, so the route's inferred action data cannot collapse the
 * credentials variant into a plain `{ ok: true }`. Only create and rotate carry credentials.
 */
export type WebhookIntentResult =
  | {
      readonly ok: true;
      readonly webhookCredentials: WebhookCredentials | null;
    }
  | { readonly webhookError: string };

/** @description Narrows a form `intent` value to one of the webhook intents. */
export const isWebhookIntent = (
  intent: FormDataEntryValue | null,
): intent is WebhookIntent => {
  return (
    intent === 'webhook-create' ||
    intent === 'webhook-delete' ||
    intent === 'webhook-rotate' ||
    intent === 'webhook-update'
  );
};

/**
 * @description Runs one webhook-trigger intent of the schedule detail action. Create and rotate
 * return the URL path and secret once; they pass straight through to the component's one-time
 * reveal and are never stored or logged here.
 */
export const runWebhookIntent = async (
  request: Request,
  jobId: string,
  intent: WebhookIntent,
  form: FormData,
): Promise<WebhookIntentResult> => {
  if (intent === 'webhook-rotate') {
    const { rotateScheduledAgentJobWebhookTrigger: rotated } =
      await executeGraphqlWithAuth(
        request,
        RotateScheduledAgentJobWebhookTriggerDocument,
        { scheduledAgentJobId: jobId },
      );
    return {
      ok: true,
      webhookCredentials: {
        secret: rotated.secret,
        webhookPath: rotated.webhookPath,
      },
    };
  }

  if (intent === 'webhook-delete') {
    await executeGraphqlWithAuth(
      request,
      DeleteScheduledAgentJobWebhookTriggerDocument,
      { scheduledAgentJobId: jobId },
    );
    return { ok: true, webhookCredentials: null };
  }

  const parsed = parseWebhookForm(form);

  if (!parsed.ok) {
    return { webhookError: parsed.error };
  }

  const input = { ...parsed.input, scheduledAgentJobId: jobId };

  if (intent === 'webhook-update') {
    await executeGraphqlWithAuth(
      request,
      UpdateScheduledAgentJobWebhookTriggerDocument,
      { input },
    );
    return { ok: true, webhookCredentials: null };
  }

  const { createScheduledAgentJobWebhookTrigger: created } =
    await executeGraphqlWithAuth(
      request,
      CreateScheduledAgentJobWebhookTriggerDocument,
      { input },
    );

  return {
    ok: true,
    webhookCredentials: {
      secret: created.secret,
      webhookPath: created.webhookPath,
    },
  };
};
