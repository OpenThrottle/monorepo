import type {
  ScheduledAgentJobWebhookDelivery,
  ScheduledAgentJobWebhookFilter,
  ScheduledAgentJobWebhookTrigger,
} from '@openthrottle/nestjs-repositories-server';

import { WEBHOOK_INGRESS_PATH } from '../../../modules/agent-job-webhooks/agent-job-webhooks.constants.ts';
import type {
  ScheduledAgentJobWebhookDeliveryObject,
  ScheduledAgentJobWebhookFilterObject,
  ScheduledAgentJobWebhookTriggerCredentialsObject,
  ScheduledAgentJobWebhookTriggerObject,
} from './scheduled-agent-job-webhook-trigger.object.ts';

const toFilterObject = (
  filter: ScheduledAgentJobWebhookFilter,
): ScheduledAgentJobWebhookFilterObject => {
  const { value } = filter;

  return {
    op: filter.op,
    path: filter.path,
    value: typeof value === 'string' ? value : null,
    values:
      typeof value === 'string' || value === undefined ? null : [...value],
  };
};

/** @description Maps a trigger row to its GraphQL object: the token hash and secret ciphertext are never copied. */
export const toScheduledAgentJobWebhookTriggerObject = (
  trigger: ScheduledAgentJobWebhookTrigger,
): ScheduledAgentJobWebhookTriggerObject => {
  return {
    coalesceWindowMs: trigger.coalesceWindowMs,
    createdAt: trigger.createdAt,
    deliveryIdHeader: trigger.deliveryIdHeader,
    enabled: trigger.enabled,
    filters: trigger.filters.map(toFilterObject),
    id: trigger.id,
    maxInFlight: trigger.maxInFlight,
    rateLimitPerMinute: trigger.rateLimitPerMinute,
    rotatedAt: trigger.rotatedAt,
    scheduledAgentJobId: trigger.scheduledAgentJobId,
    signatureEncoding: trigger.signatureEncoding,
    signatureHeader: trigger.signatureHeader,
    signaturePreset: trigger.signaturePreset,
    timestampHeader: trigger.timestampHeader,
    timestampToleranceSeconds: trigger.timestampToleranceSeconds,
    tokenPrefix: trigger.tokenPrefix,
    updatedAt: trigger.updatedAt,
  };
};

/** @description The one-time reveal: the trigger, its full ingress path and the plaintext secret. */
export const toScheduledAgentJobWebhookTriggerCredentialsObject = (
  trigger: ScheduledAgentJobWebhookTrigger,
  token: string,
  secret: string,
): ScheduledAgentJobWebhookTriggerCredentialsObject => {
  return {
    secret,
    trigger: toScheduledAgentJobWebhookTriggerObject(trigger),
    webhookPath: `${WEBHOOK_INGRESS_PATH}/${token}`,
  };
};

export const toScheduledAgentJobWebhookDeliveryObject = (
  delivery: ScheduledAgentJobWebhookDelivery,
): ScheduledAgentJobWebhookDeliveryObject => {
  return {
    bodyBytes: delivery.bodyBytes,
    bodySha256: delivery.bodySha256,
    dedupeKey: delivery.dedupeKey,
    filterIndex: delivery.filterIndex,
    headersJson: JSON.stringify(delivery.headers),
    httpStatus: delivery.httpStatus,
    id: delivery.id,
    receivedAt: delivery.createdAt,
    rejectReason: delivery.rejectReason,
    renderedPrompt: delivery.renderedPrompt,
    runId: delivery.runId,
    scheduledAgentJobId: delivery.scheduledAgentJobId,
    status: delivery.status,
    triggerId: delivery.triggerId,
  };
};
