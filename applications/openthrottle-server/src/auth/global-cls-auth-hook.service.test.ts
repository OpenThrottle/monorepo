/**
 * @description Unit tests for {@link GlobalClsAuthHook}: CLS user from DB + RBAC vs JWT fallback.
 */

import { Test } from '@nestjs/testing';
import { ClsService } from 'nestjs-cls';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  globalClsUserFromJwtLike,
  GlobalClsModule,
  type GlobalClsStore,
} from '@openthrottle/nestjs-modules';
import {
  type User,
  RolesService,
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

describe('GlobalClsAuthHook', () => {
  let hook: GlobalClsAuthHook;
  /** Same CLS instance {@link GlobalClsModule} augments with `setUser` for {@link GlobalClsAuthHook}. */
  let cls: ClsService<GlobalClsStore>;
  const mockUsersService = { findById: vi.fn() };
  const mockRolesService = {
    findRoleNamesByUserId: vi.fn(),
    getPermissionsForUser: vi.fn(),
  };

  beforeEach(async () => {
    vi.mocked(mockUsersService.findById).mockReset();
    vi.mocked(mockRolesService.findRoleNamesByUserId).mockReset();
    vi.mocked(mockRolesService.getPermissionsForUser).mockReset();

    const moduleRef = await Test.createTestingModule({
      imports: [GlobalClsModule],
      providers: [
        GlobalClsAuthHook,
        { provide: UsersService, useValue: mockUsersService },
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
      await hook.populateFromJwtPayload({
        email: 'token@example.com',
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
});
