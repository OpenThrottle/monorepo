import { createMock } from '@golevelup/ts-vitest';
import {
  AUTH_PRINCIPAL_KIND_SERVICE_ACCOUNT,
  AUTH_PRINCIPAL_KIND_USER,
} from '@openthrottle/nestjs-auth';
import type {
  RolesRepository,
  ServiceAccountsRepository,
  UsersRepository,
} from '@openthrottle/nestjs-repositories-server';
import {
  createRolesRepositoryMock,
  createServiceAccountsRepositoryMock,
  createUsersRepositoryMock,
  serviceAccountsFactory,
  usersFactory,
} from '@openthrottle/nestjs-repositories-server/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import {
  getEditorNameForPrincipal,
  getPermissionsForPrincipal,
  isCredentialScopeAllowed,
} from './guards.utils.ts';

const userId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const serviceAccountId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

const userPrincipal = { kind: AUTH_PRINCIPAL_KIND_USER, sub: userId } as const;
const serviceAccountPrincipal = {
  kind: AUTH_PRINCIPAL_KIND_SERVICE_ACCOUNT,
  sub: serviceAccountId,
} as const;

const serviceAccount = serviceAccountsFactory.build({
  id: serviceAccountId,
  name: 'ot-mcp',
});

describe('principal-access', () => {
  let roles: ReturnType<typeof createRolesRepositoryMock>;
  let serviceAccounts: ReturnType<typeof createServiceAccountsRepositoryMock>;
  let users: ReturnType<typeof createUsersRepositoryMock>;

  beforeEach(() => {
    roles = createRolesRepositoryMock();
    serviceAccounts = createServiceAccountsRepositoryMock();
    users = createUsersRepositoryMock();
  });

  describe('getPermissionsForPrincipal', () => {
    it('resolves a user principal through the user roles', async () => {
      roles.getPermissionsForUser.mockResolvedValue(['blog:draft']);

      await expect(
        getPermissionsForPrincipal(
          createMock<RolesRepository>(roles),
          userPrincipal,
        ),
      ).resolves.toEqual(['blog:draft']);
      expect(roles.getPermissionsForUser).toHaveBeenCalledWith(userId);
      expect(roles.getPermissionsForServiceAccount).not.toHaveBeenCalled();
    });

    it('resolves a service account principal through its own roles', async () => {
      roles.getPermissionsForServiceAccount.mockResolvedValue(['plans:read']);

      await expect(
        getPermissionsForPrincipal(
          createMock<RolesRepository>(roles),
          serviceAccountPrincipal,
        ),
      ).resolves.toEqual(['plans:read']);
      expect(roles.getPermissionsForServiceAccount).toHaveBeenCalledWith(
        serviceAccountId,
      );
      expect(roles.getPermissionsForUser).not.toHaveBeenCalled();
    });
  });

  describe('getEditorNameForPrincipal', () => {
    const services = (): {
      serviceAccountsRepository: ServiceAccountsRepository;
      usersRepository: UsersRepository;
    } => {
      return {
        serviceAccountsRepository:
          createMock<ServiceAccountsRepository>(serviceAccounts),
        usersRepository: createMock<UsersRepository>(users),
      };
    };

    describe('service account principal', () => {
      it('uses the service account name', async () => {
        serviceAccounts.findOne.mockResolvedValue(serviceAccount);

        await expect(
          getEditorNameForPrincipal(services(), serviceAccountPrincipal),
        ).resolves.toBe('ot-mcp');
        expect(users.findOne).not.toHaveBeenCalled();
      });

      it('falls back to the id when the account is gone', async () => {
        serviceAccounts.findOne.mockResolvedValue(null);

        await expect(
          getEditorNameForPrincipal(services(), serviceAccountPrincipal),
        ).resolves.toBe(serviceAccountId);
      });
    });

    describe('user principal', () => {
      it('prefers the GitHub username', async () => {
        users.findOne.mockResolvedValue(
          usersFactory.build({
            email: 'octo@example.com',
            githubUsername: 'octocat',
          }),
        );

        await expect(
          getEditorNameForPrincipal(services(), userPrincipal),
        ).resolves.toBe('octocat');
      });

      it('falls back to the stored email when the username is blank', async () => {
        users.findOne.mockResolvedValue(
          usersFactory.build({
            email: 'octo@example.com',
            githubUsername: '  ',
          }),
        );

        await expect(
          getEditorNameForPrincipal(services(), userPrincipal),
        ).resolves.toBe('octo@example.com');
      });

      it('falls back to the token email, then the id, when the user row is gone', async () => {
        users.findOne.mockResolvedValue(null);

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

describe('isCredentialScopeAllowed', () => {
  it('admits an unrestricted credential on any handler', () => {
    expect(isCredentialScopeAllowed(null, [])).toBe(true);
  });

  it('admits a scoped credential when the handler declares one of its scopes', () => {
    expect(
      isCredentialScopeAllowed(['telemetry:ingest'], ['telemetry:ingest']),
    ).toBe(true);
  });

  it('refuses a scoped credential on a handler that declares no scope', () => {
    expect(isCredentialScopeAllowed(['telemetry:ingest'], [])).toBe(false);
  });

  it('refuses a scoped credential on a handler that declares other scopes', () => {
    expect(
      isCredentialScopeAllowed(['telemetry:ingest'], ['plans:write']),
    ).toBe(false);
  });
});
