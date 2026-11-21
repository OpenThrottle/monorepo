/**
 * @description Fishery factory for {@link ScheduledAgentJobWebhookTrigger}. Use in tests to build mock rows.
 */

import { faker } from '@faker-js/faker';
import { Factory } from 'fishery';

import type { ScheduledAgentJobWebhookTrigger } from './scheduled-agent-job-webhook-trigger.entity.ts';

/**
 * Factory for ScheduledAgentJobWebhookTrigger-shaped objects: an enabled `generic` trigger with
 * the default admission caps. Override any field via .build({ signaturePreset: 'github' }).
 * @public
 */
export const scheduledAgentJobWebhookTriggersFactory =
  Factory.define<ScheduledAgentJobWebhookTrigger>(() => {
    return {
      coalesceWindowMs: 0,
      createdAt: faker.date.recent(),
      deliveryIdHeader: 'X-OT-Webhook-Id',
      enabled: true,
      filters: [],
      id: faker.string.uuid(),
      maxInFlight: 3,
      rateLimitPerMinute: 30,
      rotatedAt: null,
      scheduledAgentJobId: faker.string.uuid(),
      secretCiphertext: Buffer.from(faker.string.alphanumeric(48)),
      signatureEncoding: 'hex',
      signatureHeader: 'X-OT-Signature',
      signaturePreset: 'generic',
      timestampHeader: 'X-OT-Timestamp',
      timestampToleranceSeconds: 300,
      tokenHash: Buffer.from(faker.string.alphanumeric(32)),
      tokenPrefix: faker.string.alphanumeric(6),
      updatedAt: faker.date.recent(),
    };
  });
