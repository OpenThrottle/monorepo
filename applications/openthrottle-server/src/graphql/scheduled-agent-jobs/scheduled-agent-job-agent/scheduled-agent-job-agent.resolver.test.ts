import { createMock } from '@golevelup/ts-vitest';
import { ForbiddenException } from '@nestjs/common';
import type { AuthPrincipal } from '@openthrottle/nestjs-auth';
import {
  AUTH_PRINCIPAL_KIND_SERVICE_ACCOUNT,
  AUTH_PRINCIPAL_KIND_USER,
} from '@openthrottle/nestjs-auth';
import type {
  ScheduledAgentJob,
  UserDisabledAgentClisRepository,
} from '@openthrottle/nestjs-repositories-server';
import { describe, expect, it, vi } from 'vitest';

import type { EffectiveUserResolutionService } from '../../../services/effective-user-resolution/effective-user-resolution.service.ts';
import { ScheduledAgentJobAgentResolver } from './scheduled-agent-job-agent.resolver.ts';
import type { ScheduledAgentJobAgentService } from './scheduled-agent-job-agent.service.ts';

const user: AuthPrincipal = { kind: AUTH_PRINCIPAL_KIND_USER, sub: 'user-1' };
const serviceAccount: AuthPrincipal = {
  kind: AUTH_PRINCIPAL_KIND_SERVICE_ACCOUNT,
  sub: 'sa-1',
};

const build = (
  actingUserId: string | null,
): {
  resolver: ScheduledAgentJobAgentResolver;
  service: ScheduledAgentJobAgentService;
} => {
  const service = createMock<ScheduledAgentJobAgentService>({
    create: vi.fn().mockResolvedValue(createMock<ScheduledAgentJob>()),
    delete: vi.fn().mockResolvedValue(true),
    list: vi.fn().mockResolvedValue([]),
  });
  const resolver = new ScheduledAgentJobAgentResolver(
    createMock<UserDisabledAgentClisRepository>({
      isEnabled: vi.fn().mockResolvedValue(true),
      isModelEnabled: vi.fn().mockResolvedValue(true),
    }),
    createMock<EffectiveUserResolutionService>({
      resolveEffectiveUserId: vi.fn().mockResolvedValue(actingUserId),
    }),
    service,
  );

  return { resolver, service };
};

const input = {
  cronPattern: '0 * * * *',
  driverId: 'claude',
  idempotencyKey: 'k',
  name: 'n',
  prompt: 'p',
  repositoryCheckoutId: 'checkout-1',
};

describe('ScheduledAgentJobAgentResolver', () => {
  describe('with a service account that has no acting user', () => {
    it('refuses every agent operation before touching the service', async () => {
      const { resolver, service } = build(null);

      await expect(
        resolver.scheduledAgentJobsAsAgent(serviceAccount),
      ).rejects.toBeInstanceOf(ForbiddenException);
      await expect(
        resolver.createScheduledAgentJobAsAgent(serviceAccount, input),
      ).rejects.toBeInstanceOf(ForbiddenException);
      await expect(
        resolver.updateScheduledAgentJobAsAgent(serviceAccount, { id: 'j' }),
      ).rejects.toBeInstanceOf(ForbiddenException);
      await expect(
        resolver.deleteScheduledAgentJobAsAgent(serviceAccount, 'j'),
      ).rejects.toBeInstanceOf(ForbiddenException);
      await expect(
        resolver.runScheduledAgentJobNowAsAgent(serviceAccount, 'j'),
      ).rejects.toBeInstanceOf(ForbiddenException);

      expect(service.create).not.toHaveBeenCalled();
      expect(service.list).not.toHaveBeenCalled();
    });
  });

  describe('with a service account linked to an acting user', () => {
    it('creates and lists as the acting user', async () => {
      const { resolver, service } = build('user-7');

      await resolver.createScheduledAgentJobAsAgent(serviceAccount, input);
      await resolver.scheduledAgentJobsAsAgent(serviceAccount);

      expect(service.create).toHaveBeenCalledWith('user-7', input);
      expect(service.list).toHaveBeenCalledWith('user-7');
    });
  });

  describe('with a user principal', () => {
    it('creates as the calling user', async () => {
      const { resolver, service } = build(null);

      await resolver.createScheduledAgentJobAsAgent(user, input);

      expect(service.create).toHaveBeenCalledWith('user-1', input);
    });

    it('lists the calling user’s jobs', async () => {
      const { resolver, service } = build(null);

      await resolver.scheduledAgentJobsAsAgent(user);

      expect(service.list).toHaveBeenCalledWith('user-1');
    });
  });
});
