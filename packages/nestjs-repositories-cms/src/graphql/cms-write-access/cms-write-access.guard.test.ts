import { createMock } from '@golevelup/ts-vitest';
import type { ExecutionContext } from '@nestjs/common';
import type { ModuleRef } from '@nestjs/core';
import {
  AUTH_PRINCIPAL_KIND_SERVICE_ACCOUNT,
  AUTH_PRINCIPAL_KIND_USER,
} from '@openthrottle/nestjs-auth';
import { describe, expect, it, vi } from 'vitest';

import type { CmsProfilesService } from '../cms-profiles/cms-profiles.service.ts';
import { CmsWriteGuard } from './cms-write-access.guard.ts';
import type { CmsWriteAuthorizer } from './cms-write-access.types.ts';

const buildContext = (
  user: unknown,
): { context: ExecutionContext; request: object } => {
  const request = { user };
  const context = createMock<ExecutionContext>({
    getType: () => 'http',
    switchToHttp: () => {
      return createMock({ getRequest: () => request });
    },
  });

  return { context, request };
};

const buildGuard = (authorizer: CmsWriteAuthorizer | null) => {
  const moduleRef = createMock<ModuleRef>();
  const cmsProfilesService = createMock<CmsProfilesService>();

  vi.mocked(moduleRef.get).mockImplementation(() => {
    if (!authorizer) {
      throw new Error('not found');
    }

    return authorizer;
  });

  return {
    cmsProfilesService,
    guard: new CmsWriteGuard(moduleRef, cmsProfilesService),
  };
};

const USER = { kind: AUTH_PRINCIPAL_KIND_USER, sub: 'u1' };

describe('CmsWriteGuard', () => {
  describe('when nobody is signed in', () => {
    it('refuses as UNAUTHENTICATED', async () => {
      const { guard } = buildGuard({
        authorize: vi.fn(),
      });

      await expect(
        guard.canActivate(buildContext(undefined).context),
      ).rejects.toMatchObject({ extensions: { code: 'UNAUTHENTICATED' } });
    });
  });

  describe('when the host registers no authorizer', () => {
    it('fails closed as FORBIDDEN', async () => {
      const { guard } = buildGuard(null);

      await expect(
        guard.canActivate(buildContext(USER).context),
      ).rejects.toMatchObject({ extensions: { code: 'FORBIDDEN' } });
    });
  });

  describe('when the authorizer refuses', () => {
    it('is FORBIDDEN with its reason', async () => {
      const { guard } = buildGuard({
        authorize: async () => {
          return { ok: false, reason: 'Missing permission: cms:write' };
        },
      });

      await expect(
        guard.canActivate(buildContext(USER).context),
      ).rejects.toMatchObject({
        extensions: { code: 'FORBIDDEN' },
        message: 'Missing permission: cms:write',
      });
    });
  });

  describe('when a user is authorized', () => {
    it('resolves their profile onto the request', async () => {
      const writer = {
        email: 'a@example.test',
        kind: 'user',
        userId: 'u1',
      } as const;
      const { cmsProfilesService, guard } = buildGuard({
        authorize: async () => {
          return { ok: true, writer };
        },
      });
      const profile = { uuid: 'p1' };
      const { context, request } = buildContext(USER);

      vi.mocked(cmsProfilesService.resolveForUser).mockResolvedValue(
        Object.assign(Object.create(null), profile),
      );

      await expect(guard.canActivate(context)).resolves.toBe(true);
      expect(cmsProfilesService.resolveForUser).toHaveBeenCalledWith(writer);
      expect(Reflect.get(request, 'cmsProfile')).toMatchObject(profile);
    });
  });

  describe('when a service account is authorized', () => {
    it('lets it through without a profile', async () => {
      const { cmsProfilesService, guard } = buildGuard({
        authorize: async () => {
          return {
            ok: true,
            writer: { kind: 'service-account', serviceAccountId: 'sa1' },
          };
        },
      });

      await expect(
        guard.canActivate(
          buildContext({
            kind: AUTH_PRINCIPAL_KIND_SERVICE_ACCOUNT,
            sub: 'sa1',
          }).context,
        ),
      ).resolves.toBe(true);
      expect(cmsProfilesService.resolveForUser).not.toHaveBeenCalled();
    });
  });
});
