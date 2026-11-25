import { createMock } from '@golevelup/ts-vitest';
import type { ExecutionContext } from '@nestjs/common';
import { ForbiddenException } from '@nestjs/common';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { Reflector } from '@nestjs/core';
import type { AuthPrincipal } from '@openthrottle/nestjs-auth';
import {
  AUTH_PRINCIPAL_KIND_SERVICE_ACCOUNT,
  AUTH_PRINCIPAL_KIND_USER,
  authPrincipalFromServiceAccountId,
} from '@openthrottle/nestjs-auth';
import {
  PERMISSIONS,
  PERMISSIONS_KEY,
  ROLE_PERMISSIONS,
  ROLES,
} from '@openthrottle/nestjs-rbac';
import type {
  RolesRepository,
  ScheduledAgentJob,
  UserDisabledAgentClisRepository,
} from '@openthrottle/nestjs-repositories-server';
import type { RolesRepositoryMock } from '@openthrottle/nestjs-repositories-server/testing';
import { createRolesRepositoryMock } from '@openthrottle/nestjs-repositories-server/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GqlPermissionsGuard } from '../../../guards/gql-permissions.guard.ts';
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

describe('ScheduledAgentJobAgentResolver authorization', () => {
  const SERVICE_ACCOUNT_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  const WRITE_OPERATIONS = [
    'createScheduledAgentJobAsAgent',
    'deleteScheduledAgentJobAsAgent',
    'runScheduledAgentJobNowAsAgent',
    'updateScheduledAgentJobAsAgent',
  ] as const;

  type Operation =
    (typeof WRITE_OPERATIONS)[number] | 'scheduledAgentJobsAsAgent';

  let roles: RolesRepositoryMock;
  let guard: GqlPermissionsGuard;

  /** The execution context the guard sees for a service-account call to `method`. */
  const serviceAccountContextFor = (method: Operation): ExecutionContext => {
    const req = { user: authPrincipalFromServiceAccountId(SERVICE_ACCOUNT_ID) };
    return createMock<ExecutionContext>({
      getClass: vi.fn().mockReturnValue(ScheduledAgentJobAgentResolver),
      getHandler: vi
        .fn()
        .mockReturnValue(ScheduledAgentJobAgentResolver.prototype[method]),
      getType: vi.fn().mockReturnValue('http'),
      switchToHttp: vi.fn().mockReturnValue({ getRequest: () => req }),
    });
  };

  beforeEach(() => {
    roles = createRolesRepositoryMock();
    roles.getPermissionsForServiceAccount.mockResolvedValue([
      ...ROLE_PERMISSIONS[ROLES.MCP],
    ]);
    guard = new GqlPermissionsGuard(
      new Reflector(),
      createMock<RolesRepository>(roles),
    );
  });

  it('applies GqlPermissionsGuard at the class level', () => {
    expect(
      Reflect.getMetadata(GUARDS_METADATA, ScheduledAgentJobAgentResolver),
    ).toEqual([GqlPermissionsGuard]);
  });

  it('scheduledAgentJobsAsAgent requires exactly schedules:read', () => {
    expect(
      Reflect.getMetadata(
        PERMISSIONS_KEY,
        ScheduledAgentJobAgentResolver.prototype.scheduledAgentJobsAsAgent,
      ),
    ).toEqual([PERMISSIONS.SCHEDULES_READ]);
  });

  it.each(WRITE_OPERATIONS)('%s requires exactly schedules:write', (method) => {
    expect(
      Reflect.getMetadata(
        PERMISSIONS_KEY,
        ScheduledAgentJobAgentResolver.prototype[method],
      ),
    ).toEqual([PERMISSIONS.SCHEDULES_WRITE]);
  });

  describe('when the caller is a service account holding the mcp role', () => {
    it.each([...WRITE_OPERATIONS, 'scheduledAgentJobsAsAgent'] as const)(
      '%s is allowed',
      async (method) => {
        await expect(
          guard.canActivate(serviceAccountContextFor(method)),
        ).resolves.toBe(true);

        expect(roles.getPermissionsForServiceAccount).toHaveBeenCalledWith(
          SERVICE_ACCOUNT_ID,
        );
      },
    );
  });

  describe('when the service account holds only schedules:read', () => {
    it('createScheduledAgentJobAsAgent is refused with the missing permission named', async () => {
      roles.getPermissionsForServiceAccount.mockResolvedValue([
        PERMISSIONS.SCHEDULES_READ,
      ]);

      await expect(
        guard.canActivate(
          serviceAccountContextFor('createScheduledAgentJobAsAgent'),
        ),
      ).rejects.toThrow('Missing permission: schedules:write');
    });
  });
});
