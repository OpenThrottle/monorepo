import type {
  Role,
  ServiceAccount,
  ServiceAccountCredential,
} from '@openthrottle/nestjs-repositories';
import {
  RolesService,
  ServiceAccountsService,
} from '@openthrottle/nestjs-repositories';
import {
  AUTH_PRINCIPAL_KIND_SERVICE_ACCOUNT,
  AUTH_PRINCIPAL_KIND_USER,
  type AuthPrincipal,
} from '@openthrottle/nestjs-auth';
import { createMock } from '@golevelup/ts-vitest';
import { ForbiddenException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { beforeAll, describe, expect, test, vi } from 'vitest';
import { GqlPermissionsGuard } from '../../guards/gql-permissions.guard';
import { ServiceAccountsResolver } from './service-accounts.resolver';

describe('ServiceAccountsResolver', () => {
  let resolver: ServiceAccountsResolver;
  let serviceAccountsService: ServiceAccountsService;

  const humanPrincipal: AuthPrincipal = {
    kind: AUTH_PRINCIPAL_KIND_USER,
    sub: 'user-id',
  };

  const serviceAccountPrincipal: AuthPrincipal = {
    kind: AUTH_PRINCIPAL_KIND_SERVICE_ACCOUNT,
    sub: 'sa-id',
  };

  const mockServiceAccount: ServiceAccount = {
    createdAt: new Date('2026-02-02T10:00:00.000Z'),
    description: 'MCP automation',
    disabledAt: null,
    id: '11111111-1111-4111-8111-111111111111',
    name: 'openthrottle-mcp',
  } as ServiceAccount;

  const mockCredential: ServiceAccountCredential = {
    createdAt: new Date('2026-02-02T10:00:00.000Z'),
    expiresAt: null,
    id: '22222222-2222-4222-8222-222222222222',
    label: 'default',
    lastUsedAt: null,
    prefix: 'abcdefghijkl',
    revokedAt: null,
    secretHash: 'hashed',
    serviceAccountId: mockServiceAccount.id,
  } as ServiceAccountCredential;

  const mockServiceAccountsService = createMock<ServiceAccountsService>();
  const mockRolesService = createMock<RolesService>({
    getPermissionsForUser: vi
      .fn()
      .mockResolvedValue(['users:read', 'users:write']),
  });

  beforeAll(async () => {
    const app = await Test.createTestingModule({
      providers: [
        ServiceAccountsResolver,
        {
          provide: ServiceAccountsService,
          useValue: mockServiceAccountsService,
        },
        { provide: RolesService, useValue: mockRolesService },
        GqlPermissionsGuard,
      ],
    }).compile();

    resolver = app.get<ServiceAccountsResolver>(ServiceAccountsResolver);
    serviceAccountsService = app.get<ServiceAccountsService>(
      ServiceAccountsService,
    );
  });

  describe('serviceAccounts', () => {
    test('returns service accounts for human principal', async () => {
      vi.mocked(serviceAccountsService.findAll).mockResolvedValue([
        mockServiceAccount,
      ]);

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
      vi.mocked(serviceAccountsService.createCredential).mockResolvedValue({
        credential: mockCredential,
        token: 'ot_sa_abcdefghijkl_secretvalue',
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
      expect(result?.token).toBe('ot_sa_abcdefghijkl_secretvalue');
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
    test('delegates to service', async () => {
      vi.mocked(serviceAccountsService.revokeCredential).mockResolvedValue(
        true,
      );

      const result = await resolver.revokeServiceAccountCredential(
        humanPrincipal,
        mockCredential.id,
      );

      expect(result).toBe(true);
    });
  });

  describe('rolesForServiceAccount', () => {
    test('returns roles from RolesService', async () => {
      const mockRole = { id: 'role-id', name: 'mcp' } as Role;
      vi.mocked(mockRolesService.findRolesForServiceAccount).mockResolvedValue([
        mockRole,
      ]);

      const result = await resolver.rolesForServiceAccount(
        humanPrincipal,
        mockServiceAccount.id,
      );

      expect(result).toHaveLength(1);
      expect(result[0]?.name).toBe('mcp');
    });
  });
});
