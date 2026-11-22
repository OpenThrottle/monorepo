import { createMock } from '@golevelup/ts-vitest';
import { ForbiddenException } from '@nestjs/common';
import type { AuthPrincipal } from '@openthrottle/nestjs-auth';
import { AUTH_PRINCIPAL_KIND_USER } from '@openthrottle/nestjs-auth';
import {
  scheduledAgentJobsFactory,
  scheduledAgentJobWebhookTriggersFactory,
} from '@openthrottle/nestjs-repositories-server/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ScheduledAgentJobsGraphqlService } from '../scheduled-agent-jobs.service.ts';
import { ScheduledAgentJobWebhookTriggerResolver } from './scheduled-agent-job-webhook-trigger.resolver.ts';
import type { ScheduledAgentJobWebhookTriggerService } from './scheduled-agent-job-webhook-trigger.service.ts';

const owner: AuthPrincipal = { kind: AUTH_PRINCIPAL_KIND_USER, sub: 'user-1' };
const stranger: AuthPrincipal = {
  kind: AUTH_PRINCIPAL_KIND_USER,
  sub: 'user-2',
};
const input = { scheduledAgentJobId: 'job-1' };

describe('ScheduledAgentJobWebhookTriggerResolver', () => {
  const trigger = scheduledAgentJobWebhookTriggersFactory.build();
  let service: ScheduledAgentJobWebhookTriggerService;
  let resolver: ScheduledAgentJobWebhookTriggerResolver;

  beforeEach(() => {
    const jobs = createMock<ScheduledAgentJobsGraphqlService>({
      get: vi.fn().mockResolvedValue(
        scheduledAgentJobsFactory.build({
          id: 'job-1',
          ownerUserId: 'user-1',
        }),
      ),
    });
    service = createMock<ScheduledAgentJobWebhookTriggerService>({
      create: vi
        .fn()
        .mockResolvedValue({ secret: 'sec', token: 'tok', trigger }),
      delete: vi.fn().mockResolvedValue(true),
      rotate: vi
        .fn()
        .mockResolvedValue({ secret: 'sec2', token: 'tok2', trigger }),
      update: vi.fn().mockResolvedValue(trigger),
    });
    resolver = new ScheduledAgentJobWebhookTriggerResolver(jobs, service);
  });

  it('create returns the one-time path and secret to the job owner', async () => {
    const result = await resolver.createScheduledAgentJobWebhookTrigger(
      owner,
      input,
    );

    expect(result.webhookPath).toBe('/webhooks/agent-jobs/tok');
    expect(result.secret).toBe('sec');
  });

  it('rotate returns the new path and secret', async () => {
    const result = await resolver.rotateScheduledAgentJobWebhookTrigger(
      owner,
      'job-1',
    );

    expect(result.webhookPath).toBe('/webhooks/agent-jobs/tok2');
  });

  it('update returns the trigger without any credentials', async () => {
    const result = await resolver.updateScheduledAgentJobWebhookTrigger(
      owner,
      input,
    );

    expect(result).not.toHaveProperty('secret');
    expect(result).not.toHaveProperty('webhookPath');
  });

  it.each([
    [
      'create',
      (r: ScheduledAgentJobWebhookTriggerResolver) =>
        r.createScheduledAgentJobWebhookTrigger(stranger, input),
    ],
    [
      'update',
      (r: ScheduledAgentJobWebhookTriggerResolver) =>
        r.updateScheduledAgentJobWebhookTrigger(stranger, input),
    ],
    [
      'rotate',
      (r: ScheduledAgentJobWebhookTriggerResolver) =>
        r.rotateScheduledAgentJobWebhookTrigger(stranger, 'job-1'),
    ],
    [
      'delete',
      (r: ScheduledAgentJobWebhookTriggerResolver) =>
        r.deleteScheduledAgentJobWebhookTrigger(stranger, 'job-1'),
    ],
  ])('%s refuses a user who does not own the job', async (_name, call) => {
    await expect(call(resolver)).rejects.toThrow(ForbiddenException);
  });

  it('refuses when the job does not exist', async () => {
    const jobs = createMock<ScheduledAgentJobsGraphqlService>({
      get: vi.fn().mockResolvedValue(null),
    });
    const missing = new ScheduledAgentJobWebhookTriggerResolver(jobs, service);

    await expect(
      missing.rotateScheduledAgentJobWebhookTrigger(owner, 'nope'),
    ).rejects.toThrow(ForbiddenException);
  });
});
