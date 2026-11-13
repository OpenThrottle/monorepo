/**
 * @description Unit tests for CmsWriteAuthorizerService: the cms:write check against
 * database-backed permissions, and the writer it returns for users and service accounts.
 */

import { createMock } from '@golevelup/ts-vitest';
import {
  AUTH_PRINCIPAL_KIND_SERVICE_ACCOUNT,
  AUTH_PRINCIPAL_KIND_USER,
} from '@openthrottle/nestjs-auth';
import { PERMISSIONS } from '@openthrottle/nestjs-rbac';
import type {
  RolesService,
  UsersService,
} from '@openthrottle/nestjs-repositories';
import { describe, expect, it, vi } from 'vitest';

import { CmsWriteAuthorizerService } from './cms-write-authorizer.service.ts';

const buildService = (permissions: readonly string[]) => {
  const rolesService = createMock<RolesService>();
  const usersService = createMock<UsersService>();

  vi.mocked(rolesService.getPermissionsForUser).mockResolvedValue([
    ...permissions,
  ]);
  vi.mocked(rolesService.getPermissionsForServiceAccount).mockResolvedValue([
    ...permissions,
  ]);

  return {
    rolesService,
    service: new CmsWriteAuthorizerService(rolesService, usersService),
    usersService,
  };
};

describe('CmsWriteAuthorizerService', () => {
  describe('when the principal lacks cms:write', () => {
    it('refuses, naming the permission', async () => {
      const { service } = buildService([PERMISSIONS.SETTINGS_WRITE]);

      await expect(
        service.authorize({ kind: AUTH_PRINCIPAL_KIND_USER, sub: 'u1' }),
      ).resolves.toEqual({
        ok: false,
        reason: `Missing permission: ${PERMISSIONS.CMS_WRITE}`,
      });
    });
  });

  describe('when a user holds cms:write', () => {
    it('returns a user writer with the email from the users row', async () => {
      const { rolesService, service, usersService } = buildService([
        PERMISSIONS.CMS_WRITE,
      ]);

      vi.mocked(usersService.findById).mockResolvedValue(
        Object.assign(Object.create(null), { email: 'row@example.test' }),
      );

      await expect(
        service.authorize({
          email: 'token@example.test',
          kind: AUTH_PRINCIPAL_KIND_USER,
          sub: 'u1',
        }),
      ).resolves.toEqual({
        ok: true,
        writer: { email: 'row@example.test', kind: 'user', userId: 'u1' },
      });
      expect(rolesService.getPermissionsForUser).toHaveBeenCalledWith('u1');
    });
  });

  describe('when a service account holds cms:write', () => {
    it('returns a service-account writer without looking up a user', async () => {
      const { service, usersService } = buildService([PERMISSIONS.CMS_WRITE]);

      await expect(
        service.authorize({
          kind: AUTH_PRINCIPAL_KIND_SERVICE_ACCOUNT,
          sub: 'sa1',
        }),
      ).resolves.toEqual({
        ok: true,
        writer: { kind: 'service-account', serviceAccountId: 'sa1' },
      });
      expect(usersService.findById).not.toHaveBeenCalled();
    });
  });
});
