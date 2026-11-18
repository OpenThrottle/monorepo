import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import {
  AUTH_PRINCIPAL_KIND_SERVICE_ACCOUNT,
  AUTH_PRINCIPAL_KIND_USER,
  type AuthPrincipal,
} from '@openthrottle/nestjs-auth';
import {
  RolesRepository,
  ServiceAccountCredentialsRepository,
  ServiceAccountsRepository,
} from '@openthrottle/nestjs-repositories-server';
import type {
  RolesRepositoryMock,
  ServiceAccountCredentialsRepositoryMock,
  ServiceAccountsRepositoryMock,
} from '@openthrottle/nestjs-repositories-server/testing';
import {
  createRolesRepositoryMock,
  createServiceAccountCredentialsRepositoryMock,
  createServiceAccountsRepositoryMock,
  rolesFactory,
  serviceAccountCredentialsFactory,
  serviceAccountsFactory,
} from '@openthrottle/nestjs-repositories-server/testing';
import { beforeEach, describe, expect, test } from 'vitest';

import { GqlPermissionsGuard } from '../../guards/gql-permissions.guard.ts';
import { ServiceAccountsResolver } from './service-accounts.resolver.ts';

describe('ServiceAccountsResolver', () => {
  let resolver: ServiceAccountsResolver;
  let credentials: ServiceAccountCredentialsRepositoryMock;
  let roles: RolesRepositoryMock;
  let serviceAccounts: ServiceAccountsRepositoryMock;

  const humanPrincipal: AuthPrincipal = {
    kind: AUTH_PRINCIPAL_KIND_USER,
    sub: 'user-id',
  };

  const serviceAccountPrincipal: AuthPrincipal = {
    kind: AUTH_PRINCIPAL_KIND_SERVICE_ACCOUNT,
    sub: 'sa-id',
  };

  const mockServiceAccount = serviceAccountsFactory.build({
    createdAt: new Date('2026-02-02T10:00:00.000Z'),
    description: 'MCP automation',
    disabledAt: null,
    id: '11111111-1111-4111-8111-111111111111',
    name: 'openthrottle-mcp',
  });

  const mockCredential = {
    ...serviceAccountCredentialsFactory.build({
      createdAt: new Date('2026-02-02T10:00:00.000Z'),
      expiresAt: null,
      id: '22222222-2222-4222-8222-222222222222',
      label: 'default',
      lastUsedAt: null,
      prefix: 'abcdefghijkl',
      revokedAt: null,
      secretHash: 'hashed',
      serviceAccountId: mockServiceAccount.id,
    }),
    serviceAccount: mockServiceAccount,
  };

  const notFound = new NotFoundException('service_accounts record not found');

  beforeEach(async () => {
    credentials = createServiceAccountCredentialsRepositoryMock();
    roles = createRolesRepositoryMock();
    serviceAccounts = createServiceAccountsRepositoryMock();

    const app = await Test.createTestingModule({
      providers: [
        ServiceAccountsResolver,
        { provide: ServiceAccountCredentialsRepository, useValue: credentials },
        { provide: ServiceAccountsRepository, useValue: serviceAccounts },
        { provide: RolesRepository, useValue: roles },
        GqlPermissionsGuard,
      ],
    }).compile();

    resolver = app.get<ServiceAccountsResolver>(ServiceAccountsResolver);
  });

  describe('serviceAccounts', () => {
    test('returns service accounts for human principal', async () => {
      serviceAccounts.findAll.mockResolvedValue([mockServiceAccount]);

      const result = await resolver.serviceAccounts(humanPrincipal);

      expect(result).toHaveLength(1);
      expect(result[0]?.name).toBe('openthrottle-mcp');
    });

    test('rejects service account principal', async () => {
      await expect(
        resolver.serviceAccounts(serviceAccountPrincipal),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('createServiceAccountCredential', () => {
    test('returns token and credential metadata once', async () => {
      credentials.createCredential.mockResolvedValue({
        credential: mockCredential,
        token: '***REMOVED-OT-TOKEN***',
      });

      const result = await resolver.createServiceAccountCredential(
        humanPrincipal,
        {
          expiresAt: null,
          label: 'default',
          serviceAccountId: mockServiceAccount.id,
        },
      );

      expect(result).not.toBeNull();
      expect(result?.token).toBe('***REMOVED-OT-TOKEN***');
      expect(result?.credential.id).toBe(mockCredential.id);
      expect(result?.credential).not.toHaveProperty('secretHash');
    });

    test('rejects service account principal', async () => {
      await expect(
        resolver.createServiceAccountCredential(serviceAccountPrincipal, {
          expiresAt: null,
          label: null,
          serviceAccountId: mockServiceAccount.id,
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('revokeServiceAccountCredential', () => {
    test('delegates to the credentials repository', async () => {
      credentials.revokeCredential.mockResolvedValue(true);

      const result = await resolver.revokeServiceAccountCredential(
        humanPrincipal,
        mockCredential.id,
      );

      expect(result).toBe(true);
    });
  });

  describe('rolesForServiceAccount', () => {
    test('returns roles from RolesRepository', async () => {
      const mockRole = rolesFactory.build({
        createdAt: new Date('2026-02-02T10:00:00.000Z'),
        description: null,
        id: 'role-id',
        name: 'mcp',
        updatedAt: new Date('2026-02-02T10:00:00.000Z'),
      });
      roles.findRolesForServiceAccount.mockResolvedValue([mockRole]);

      const result = await resolver.rolesForServiceAccount(
        humanPrincipal,
        mockServiceAccount.id,
      );

      expect(result).toHaveLength(1);
      expect(result[0]?.name).toBe('mcp');
    });
  });

  describe('updateServiceAccount', () => {
    test('returns null when the service account does not exist', async () => {
      serviceAccounts.update.mockRejectedValue(notFound);

      const result = await resolver.updateServiceAccount(humanPrincipal, {
        description: null,
        id: 'non-existent-id',
        name: 'renamed',
      });

      expect(result).toBeNull();
    });
  });

  describe('disableServiceAccount', () => {
    test('returns null when the service account does not exist', async () => {
      serviceAccounts.disable.mockRejectedValue(notFound);

      const result = await resolver.disableServiceAccount(
        humanPrincipal,
        'non-existent-id',
      );

      expect(result).toBeNull();
    });
  });

  describe('enableServiceAccount', () => {
    test('returns null when the service account does not exist', async () => {
      serviceAccounts.enable.mockRejectedValue(notFound);

      const result = await resolver.enableServiceAccount(
        humanPrincipal,
        'non-existent-id',
      );

      expect(result).toBeNull();
    });
  });
});
