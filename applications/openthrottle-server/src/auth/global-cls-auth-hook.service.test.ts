/**
 * @description Unit tests for {@link GlobalClsAuthHook}: CLS user from DB + RBAC vs JWT/SA fallback.
 */

import { Test } from '@nestjs/testing';
import { ClsService } from 'nestjs-cls';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  AUTH_PRINCIPAL_KIND_SERVICE_ACCOUNT,
  AUTH_PRINCIPAL_KIND_USER,
} from '@openthrottle/nestjs-auth';
import {
  globalClsUserFromJwtLike,
  GlobalClsModule,
  type GlobalClsStore,
} from '@openthrottle/nestjs-modules';
import {
  type ServiceAccount,
  type User,
  RolesService,
  ServiceAccountsService,
  UsersService,
} from '@openthrottle/nestjs-repositories';
import { GlobalClsAuthHook } from './global-cls-auth-hook.service';

const userRow = (
  fields: Pick<User, 'disabledAt' | 'email' | 'githubUsername' | 'id'>,
): User => ({
  createdAt: new Date('2019-01-01T00:00:00.000Z'),
  passwordHash: null,
  roles: [],
  updatedAt: new Date('2019-01-01T00:00:00.000Z'),
  ...fields,
});

const serviceAccountRow = (
  fields: Pick<ServiceAccount, 'disabledAt' | 'description' | 'id' | 'name'>,
): ServiceAccount =>
  ({
    createdAt: new Date('2019-01-01T00:00:00.000Z'),
    credentials: [],
    roles: [],
    ...fields,
  }) as ServiceAccount;

describe('GlobalClsAuthHook', () => {
  let hook: GlobalClsAuthHook;
  /** Same CLS instance {@link GlobalClsModule} augments with `setUser` for {@link GlobalClsAuthHook}. */
  let cls: ClsService<GlobalClsStore>;
  const mockUsersService = { findById: vi.fn() };
  const mockServiceAccountsService = { findById: vi.fn() };
  const mockRolesService = {
    findRoleNamesByServiceAccountId: vi.fn(),
    findRoleNamesByUserId: vi.fn(),
    getPermissionsForServiceAccount: vi.fn(),
    getPermissionsForUser: vi.fn(),
  };

  beforeEach(async () => {
    vi.mocked(mockUsersService.findById).mockReset();
    vi.mocked(mockServiceAccountsService.findById).mockReset();
    vi.mocked(mockRolesService.findRoleNamesByUserId).mockReset();
    vi.mocked(mockRolesService.getPermissionsForUser).mockReset();
    vi.mocked(mockRolesService.findRoleNamesByServiceAccountId).mockReset();
    vi.mocked(mockRolesService.getPermissionsForServiceAccount).mockReset();

    const moduleRef = await Test.createTestingModule({
      imports: [GlobalClsModule],
      providers: [
        GlobalClsAuthHook,
        { provide: UsersService, useValue: mockUsersService },
        {
          provide: ServiceAccountsService,
          useValue: mockServiceAccountsService,
        },
        { provide: RolesService, useValue: mockRolesService },
      ],
    }).compile();

    hook = moduleRef.get(GlobalClsAuthHook);
    cls = moduleRef.get(ClsService<GlobalClsStore>);
  });

  it('sets JWT-only user when no DB row', async () => {
    vi.mocked(mockUsersService.findById).mockResolvedValue(null);
    const payload = { email: 'ghost@example.com', sub: 'missing-id' };

    await cls.run(async () => {
      await hook.populateFromJwtPayload(payload);
      expect(cls.get('user')).toEqual(globalClsUserFromJwtLike(payload));
    });

    expect(mockRolesService.getPermissionsForUser).not.toHaveBeenCalled();
    expect(mockRolesService.findRoleNamesByUserId).not.toHaveBeenCalled();
  });

  it('loads displayName, permissions, roles, and isDeleted from DB when row exists', async () => {
    const userId = '550e8400-e29b-41d4-a716-446655440000';
    vi.mocked(mockUsersService.findById).mockResolvedValue(
      userRow({
        disabledAt: new Date('2020-01-01T00:00:00.000Z'),
        email: 'u@example.com',
        githubUsername: 'octocat',
        id: userId,
      }),
    );
    vi.mocked(mockRolesService.getPermissionsForUser).mockResolvedValue([
      'plans:read',
    ]);
    vi.mocked(mockRolesService.findRoleNamesByUserId).mockResolvedValue([
      'admin',
    ]);

    await cls.run(async () => {
      await hook.populateFromPrincipal({
        email: 'token@example.com',
        kind: AUTH_PRINCIPAL_KIND_USER,
        sub: userId,
      });

      expect(cls.get('user')).toEqual({
        displayName: 'octocat',
        email: 'u@example.com',
        isDeleted: true,
        permissions: ['plans:read'],
        roles: ['admin'],
        uuid: userId,
      });
    });

    expect(mockRolesService.getPermissionsForUser).toHaveBeenCalledWith(userId);
    expect(mockRolesService.findRoleNamesByUserId).toHaveBeenCalledWith(userId);
  });

  it('uses JWT email when DB email is null', async () => {
    const userId = '660e8400-e29b-41d4-a716-446655440001';
    vi.mocked(mockUsersService.findById).mockResolvedValue(
      userRow({
        disabledAt: null,
        email: null,
        githubUsername: 'nobody',
        id: userId,
      }),
    );
    vi.mocked(mockRolesService.getPermissionsForUser).mockResolvedValue([]);
    vi.mocked(mockRolesService.findRoleNamesByUserId).mockResolvedValue([]);

    await cls.run(async () => {
      await hook.populateFromJwtPayload({
        email: 'from-jwt@example.com',
        sub: userId,
      });

      expect(cls.get('user')?.email).toBe('from-jwt@example.com');
    });
  });

  it('sets minimal CLS user when service account row is missing', async () => {
    const saId = '770e8400-e29b-41d4-a716-446655440002';
    vi.mocked(mockServiceAccountsService.findById).mockResolvedValue(null);

    await cls.run(async () => {
      await hook.populateFromPrincipal({
        kind: AUTH_PRINCIPAL_KIND_SERVICE_ACCOUNT,
        sub: saId,
      });

      expect(cls.get('user')).toEqual({
        displayName: saId,
        email: '',
        isDeleted: false,
        permissions: undefined,
        roles: [],
        uuid: saId,
      });
    });

    expect(
      mockRolesService.getPermissionsForServiceAccount,
    ).not.toHaveBeenCalled();
    expect(
      mockRolesService.findRoleNamesByServiceAccountId,
    ).not.toHaveBeenCalled();
  });

  it('loads service account name, permissions, roles, and isDeleted from DB', async () => {
    const saId = '880e8400-e29b-41d4-a716-446655440003';
    vi.mocked(mockServiceAccountsService.findById).mockResolvedValue(
      serviceAccountRow({
        description: 'MCP automation',
        disabledAt: null,
        id: saId,
        name: 'openthrottle-mcp',
      }),
    );
    vi.mocked(
      mockRolesService.getPermissionsForServiceAccount,
    ).mockResolvedValue(['plans:write']);
    vi.mocked(
      mockRolesService.findRoleNamesByServiceAccountId,
    ).mockResolvedValue(['mcp']);

    await cls.run(async () => {
      await hook.populateFromPrincipal({
        kind: AUTH_PRINCIPAL_KIND_SERVICE_ACCOUNT,
        sub: saId,
      });

      expect(cls.get('user')).toEqual({
        displayName: 'openthrottle-mcp',
        email: '',
        isDeleted: false,
        permissions: ['plans:write'],
        roles: ['mcp'],
        uuid: saId,
      });
    });

    expect(
      mockRolesService.getPermissionsForServiceAccount,
    ).toHaveBeenCalledWith(saId);
    expect(
      mockRolesService.findRoleNamesByServiceAccountId,
    ).toHaveBeenCalledWith(saId);
  });
});
