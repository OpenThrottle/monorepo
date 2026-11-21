import {
  scheduledAgentJobWebhookDeliveriesFactory,
  scheduledAgentJobWebhookTriggersFactory,
} from '@openthrottle/nestjs-repositories-server/testing';
import { describe, expect, it } from 'vitest';

import {
  toScheduledAgentJobWebhookDeliveryObject,
  toScheduledAgentJobWebhookTriggerCredentialsObject,
  toScheduledAgentJobWebhookTriggerObject,
} from './scheduled-agent-job-webhook-trigger.mapper.ts';

describe('webhook trigger mappers', () => {
  it('never copies the token hash or the secret ciphertext', () => {
    const trigger = scheduledAgentJobWebhookTriggersFactory.build();

    const object = toScheduledAgentJobWebhookTriggerObject(trigger);

    expect(object).not.toHaveProperty('tokenHash');
    expect(object).not.toHaveProperty('secretCiphertext');
    expect(object.tokenPrefix).toBe(trigger.tokenPrefix);
  });

  it('splits a filter value into value and values', () => {
    const trigger = scheduledAgentJobWebhookTriggersFactory.build({
      filters: [
        { op: 'equals', path: 'a', value: 'x' },
        { op: 'in', path: 'b', value: ['y', 'z'] },
        { op: 'exists', path: 'c', value: undefined },
      ],
    });

    expect(
      toScheduledAgentJobWebhookTriggerObject(trigger).filters,
    ).toStrictEqual([
      { op: 'equals', path: 'a', value: 'x', values: null },
      { op: 'in', path: 'b', value: null, values: ['y', 'z'] },
      { op: 'exists', path: 'c', value: null, values: null },
    ]);
  });

  it('builds the ingress path from the token and carries the secret, on the credentials object only', () => {
    const credentials = toScheduledAgentJobWebhookTriggerCredentialsObject(
      scheduledAgentJobWebhookTriggersFactory.build(),
      'tok123',
      'sec456',
    );

    expect(credentials.webhookPath).toBe('/webhooks/agent-jobs/tok123');
    expect(credentials.secret).toBe('sec456');
    expect(credentials.trigger).not.toHaveProperty('secret');
  });

  it('serialises delivery headers and renames createdAt to receivedAt', () => {
    const delivery = scheduledAgentJobWebhookDeliveriesFactory.build({
      headers: { 'x-a': '1' },
    });

    const object = toScheduledAgentJobWebhookDeliveryObject(delivery);

    expect(object.headersJson).toBe('{"x-a":"1"}');
    expect(object.receivedAt).toBe(delivery.createdAt);
  });
});
