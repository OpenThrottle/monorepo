/**
 * @description Fishery factory for {@link ScheduledAgentJobWebhookDelivery}. Use in tests to build mock rows.
 */

import { faker } from '@faker-js/faker';
import { Factory } from 'fishery';

import type { ScheduledAgentJobWebhookDelivery } from './scheduled-agent-job-webhook-delivery.entity.ts';

/**
 * Factory for ScheduledAgentJobWebhookDelivery-shaped objects: an accepted delivery by default.
 * Override any field via .build({ status: 'filtered', httpStatus: 202 }).
 * @public
 */
export const scheduledAgentJobWebhookDeliveriesFactory =
  Factory.define<ScheduledAgentJobWebhookDelivery>(() => {
    return {
      bodyBytes: 128,
      bodySha256: faker.string.hexadecimal({ length: 64, prefix: '' }),
      createdAt: faker.date.recent(),
      dedupeKey: faker.string.uuid(),
      filterIndex: null,
      headers: {},
      httpStatus: 202,
      id: faker.string.uuid(),
      rejectReason: null,
      renderedPrompt: null,
      runId: faker.string.uuid(),
      scheduledAgentJobId: faker.string.uuid(),
      status: 'accepted',
      triggerId: faker.string.uuid(),
    };
  });
