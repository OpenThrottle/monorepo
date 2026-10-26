import { createMock } from '@golevelup/ts-vitest';
import {
  AUTH_PRINCIPAL_KIND_SERVICE_ACCOUNT,
  AUTH_PRINCIPAL_KIND_USER,
} from '@openthrottle/nestjs-auth';
import type {
  RolesService,
  ServiceAccount,
  ServiceAccountsService,
  UsersService,
} from '@openthrottle/nestjs-repositories';
import { usersFactory } from '@openthrottle/nestjs-repositories/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  getEditorNameForPrincipal,
  getPermissionsForPrincipal,
} from './principal-access.ts';

const userId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const serviceAccountId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

const userPrincipal = { kind: AUTH_PRINCIPAL_KIND_USER, sub: userId } as const;
const serviceAccountPrincipal = {
  kind: AUTH_PRINCIPAL_KIND_SERVICE_ACCOUNT,
  sub: serviceAccountId,
} as const;

const userNamed = (
  githubUsername: string,
  email: string | null,
): ReturnType<typeof usersFactory.build> & { roles: never[] } => ({
  ...usersFactory.build({ email, githubUsername }),
  roles: [],
});

const serviceAccount: ServiceAccount = {
  actingUserId: null,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  credentials: [],
  description: null,
  disabledAt: null,
  id: serviceAccountId,
  name: 'ot-mcp',
  roles: [],
};

describe('principal-access', () => {
  let rolesService: RolesService;
  let usersService: UsersService;
  let serviceAccountsService: ServiceAccountsService;

  beforeEach(() => {
    rolesService = createMock<RolesService>();
    usersService = createMock<UsersService>();
    serviceAccountsService = createMock<ServiceAccountsService>();
  });

  describe('getPermissionsForPrincipal', () => {
    it('resolves a user principal through the user roles', async () => {
      vi.mocked(rolesService.getPermissionsForUser).mockResolvedValue([
        'blog:draft',
      ]);

      await expect(
        getPermissionsForPrincipal(rolesService, userPrincipal),
      ).resolves.toEqual(['blog:draft']);
      expect(rolesService.getPermissionsForUser).toHaveBeenCalledWith(userId);
      expect(
        rolesService.getPermissionsForServiceAccount,
      ).not.toHaveBeenCalled();
    });

    it('resolves a service account principal through its own roles', async () => {
      vi.mocked(rolesService.getPermissionsForServiceAccount).mockResolvedValue(
        ['plans:read'],
      );

      await expect(
        getPermissionsForPrincipal(rolesService, serviceAccountPrincipal),
      ).resolves.toEqual(['plans:read']);
      expect(rolesService.getPermissionsForServiceAccount).toHaveBeenCalledWith(
        serviceAccountId,
      );
      expect(rolesService.getPermissionsForUser).not.toHaveBeenCalled();
    });
  });

  describe('getEditorNameForPrincipal', () => {
    const services = (): {
      serviceAccountsService: ServiceAccountsService;
      usersService: UsersService;
    } => ({ serviceAccountsService, usersService });

    describe('service account principal', () => {
      it('uses the service account name', async () => {
        vi.mocked(serviceAccountsService.findById).mockResolvedValue(
          serviceAccount,
        );

        await expect(
          getEditorNameForPrincipal(services(), serviceAccountPrincipal),
        ).resolves.toBe('ot-mcp');
        expect(usersService.findById).not.toHaveBeenCalled();
      });

      it('falls back to the id when the account is gone', async () => {
        vi.mocked(serviceAccountsService.findById).mockResolvedValue(null);

        await expect(
          getEditorNameForPrincipal(services(), serviceAccountPrincipal),
        ).resolves.toBe(serviceAccountId);
      });
    });

    describe('user principal', () => {
      it('prefers the GitHub username', async () => {
        vi.mocked(usersService.findById).mockResolvedValue(
          userNamed('octocat', 'octo@example.com'),
        );

        await expect(
          getEditorNameForPrincipal(services(), userPrincipal),
        ).resolves.toBe('octocat');
      });

      it('falls back to the stored email when the username is blank', async () => {
        vi.mocked(usersService.findById).mockResolvedValue(
          userNamed('  ', 'octo@example.com'),
        );

        await expect(
          getEditorNameForPrincipal(services(), userPrincipal),
        ).resolves.toBe('octo@example.com');
      });

      it('falls back to the token email, then the id, when the user row is gone', async () => {
        vi.mocked(usersService.findById).mockResolvedValue(null);

        await expect(
          getEditorNameForPrincipal(services(), {
            ...userPrincipal,
            email: 'token@example.com',
          }),
        ).resolves.toBe('token@example.com');
        await expect(
          getEditorNameForPrincipal(services(), userPrincipal),
        ).resolves.toBe(userId);
      });
    });
  });
});
