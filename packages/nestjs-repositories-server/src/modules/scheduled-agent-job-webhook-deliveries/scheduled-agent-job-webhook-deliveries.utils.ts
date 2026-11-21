import type { CreateModelInput } from '@openthrottle/nestjs-postgres';
import { createBaseRepositoryMock } from '@openthrottle/nestjs-postgres/testing';
import { vi } from 'vitest';

import { scheduledAgentJobWebhookDeliveriesFactory } from './scheduled-agent-job-webhook-deliveries.factory.ts';
import type { ScheduledAgentJobWebhookDeliveriesRepositoryMock } from './scheduled-agent-job-webhook-deliveries.types.ts';
import type { ScheduledAgentJobWebhookDelivery } from './scheduled-agent-job-webhook-delivery.entity.ts';

/**
 * @description Builds a {@link ScheduledAgentJobWebhookDeliveriesRepositoryMock} that starts as an
 * empty `scheduled_agent_job_webhook_deliveries` table: counts are zero, lookups resolve null or
 * false, and `recordDelivery` resolves a `recorded` factory row carrying its input. Provide it in
 * place of `ScheduledAgentJobWebhookDeliveriesRepository` and stub per test. Test-only: imports
 * `vitest`.
 * @public
 */
export function createScheduledAgentJobWebhookDeliveriesRepositoryMock(): ScheduledAgentJobWebhookDeliveriesRepositoryMock {
  return {
    ...createBaseRepositoryMock<
      ScheduledAgentJobWebhookDelivery,
      CreateModelInput<ScheduledAgentJobWebhookDelivery>
    >('scheduled_agent_job_webhook_deliveries'),
    attachRun: vi.fn(async () => {
      return undefined;
    }),
    countAcceptedSince: vi.fn(async () => {
      return 0;
    }),
    deleteDelivery: vi.fn(async () => {
      return undefined;
    }),
    findLatestAcceptedSince: vi.fn(async () => {
      return null;
    }),
    hasDedupeKey: vi.fn(async () => {
      return false;
    }),
    listDeliveriesForJob: vi.fn(async () => {
      return [];
    }),
    recordDelivery: vi.fn(async (input) => {
      return {
        delivery: scheduledAgentJobWebhookDeliveriesFactory.build({ ...input }),
        kind: 'recorded',
      };
    }),
  };
}
