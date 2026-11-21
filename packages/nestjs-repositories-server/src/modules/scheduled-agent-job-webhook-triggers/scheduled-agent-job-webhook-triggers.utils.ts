import type { CreateModelInput } from '@openthrottle/nestjs-postgres';
import { createBaseRepositoryMock } from '@openthrottle/nestjs-postgres/testing';
import { vi } from 'vitest';

import type { ScheduledAgentJobWebhookTrigger } from './scheduled-agent-job-webhook-trigger.entity.ts';
import { scheduledAgentJobWebhookTriggersFactory } from './scheduled-agent-job-webhook-triggers.factory.ts';
import type { ScheduledAgentJobWebhookTriggersRepositoryMock } from './scheduled-agent-job-webhook-triggers.types.ts';

/**
 * @description Builds a {@link ScheduledAgentJobWebhookTriggersRepositoryMock} that starts as an
 * empty `scheduled_agent_job_webhook_triggers` table: lookups resolve null, deletes resolve false.
 * `createTrigger` resolves a factory row carrying its input. Provide it in place of
 * `ScheduledAgentJobWebhookTriggersRepository` and stub per test. Test-only: imports `vitest`.
 * @public
 */
export function createScheduledAgentJobWebhookTriggersRepositoryMock(): ScheduledAgentJobWebhookTriggersRepositoryMock {
  return {
    ...createBaseRepositoryMock<
      ScheduledAgentJobWebhookTrigger,
      CreateModelInput<ScheduledAgentJobWebhookTrigger>
    >('scheduled_agent_job_webhook_triggers'),
    createTrigger: vi.fn(async (input) => {
      return scheduledAgentJobWebhookTriggersFactory.build({ ...input });
    }),
    deleteTriggerForJob: vi.fn(async () => {
      return false;
    }),
    findTriggerByJobId: vi.fn(async () => {
      return null;
    }),
    findTriggerByTokenHash: vi.fn(async () => {
      return null;
    }),
    rotateTrigger: vi.fn(async () => {
      return null;
    }),
    updateTriggerConfig: vi.fn(async () => {
      return null;
    }),
  };
}
