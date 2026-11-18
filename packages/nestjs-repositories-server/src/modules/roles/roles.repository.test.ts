import { createMock } from '@golevelup/ts-vitest';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { permissionsFactory } from '../permissions/permissions.factory.ts';
import { ServiceAccount } from '../service-accounts/service-account.entity.ts';
import { serviceAccountsFactory } from '../service-accounts/service-accounts.factory.ts';
import { User } from '../users/user.entity.ts';
import { usersFactory } from '../users/users.factory.ts';
import { Role } from './role.entity.ts';
import { rolesFactory } from './roles.factory.ts';
import { RolesRepository } from './roles.repository.ts';

const serviceAccountId = '11111111-1111-4111-8111-111111111111';
const userId = '44444444-4444-4444-8444-444444444444';
const roleAId = '22222222-2222-4222-8222-222222222222';
const roleBId = '33333333-3333-4333-8333-333333333333';

describe('RolesRepository', () => {
  const roleFind = vi.fn();
  const roleFindOne = vi.fn();
  const roleSave = vi.fn();
  const permissionFindOne = vi.fn();
  const userFindOne = vi.fn();
  const userSave = vi.fn();
  const serviceAccountFindOne = vi.fn();
  const serviceAccountSave = vi.fn();
  let repository: RolesRepository;

  const adminRole = rolesFactory.build({
    id: roleAId,
    name: 'admin',
    permissions: [
      permissionsFactory.build({ name: 'users:read' }),
      permissionsFactory.build({ name: 'users:write' }),
    ],
  });
  const viewerRole = rolesFactory.build({
    id: roleBId,
    name: 'viewer',
    permissions: [
      permissionsFactory.build({ name: 'users:read' }),
      permissionsFactory.build({ name: 'settings:read' }),
    ],
  });

  beforeEach(async () => {
    vi.clearAllMocks();
    roleSave.mockImplementation(async (entity: Role) => {
      return entity;
    });
    userSave.mockImplementation(async (entity: User) => {
      return entity;
    });
    serviceAccountSave.mockImplementation(async (entity: ServiceAccount) => {
      return entity;
    });

    const app = await Test.createTestingModule({
      providers: [
        RolesRepository,
        {
          provide: getRepositoryToken(Role),
          useValue: createMock<Repository<Role>>({
            find: roleFind,
            findOne: roleFindOne,
            manager: {
              getRepository: () => {
                return { findOne: permissionFindOne };
              },
            },
            save: roleSave,
            target: Role,
          }),
        },
        {
          provide: getRepositoryToken(User),
          useValue: createMock<Repository<User>>({
            findOne: userFindOne,
            save: userSave,
          }),
        },
        {
          provide: getRepositoryToken(ServiceAccount),
          useValue: createMock<Repository<ServiceAccount>>({
            findOne: serviceAccountFindOne,
            save: serviceAccountSave,
          }),
        },
      ],
    }).compile();

    repository = app.get<RolesRepository>(RolesRepository);
  });

  describe('findAll', () => {
    it('returns live roles with permissions ordered by name', async () => {
      roleFind.mockResolvedValue([adminRole]);

      await expect(repository.findAll()).resolves.toEqual([adminRole]);
      expect(roleFind).toHaveBeenCalledWith({
        order: { name: 'ASC' },
        relations: ['permissions'],
      });
    });
  });

  describe('findByName', () => {
    it('loads the role with its permissions', async () => {
      roleFindOne.mockResolvedValue(adminRole);

      await expect(repository.findByName('admin')).resolves.toBe(adminRole);
      expect(roleFindOne).toHaveBeenCalledWith({
        relations: ['permissions'],
        where: { name: 'admin' },
      });
    });

    it('returns null when no role has that name', async () => {
      roleFindOne.mockResolvedValue(null);

      await expect(repository.findByName('nope')).resolves.toBeNull();
    });
  });

  describe('findRoleNamesByUserId', () => {
    it('returns the role names of the user', async () => {
      userFindOne.mockResolvedValue(
        usersFactory.build({ roles: [adminRole, viewerRole] }),
      );

      await expect(repository.findRoleNamesByUserId(userId)).resolves.toEqual([
        'admin',
        'viewer',
      ]);
      expect(userFindOne).toHaveBeenCalledWith({
        relations: ['roles'],
        where: { id: userId },
      });
    });

    it('returns an empty array when the user is missing', async () => {
      userFindOne.mockResolvedValue(null);

      await expect(repository.findRoleNamesByUserId(userId)).resolves.toEqual(
        [],
      );
    });
  });

  describe('getPermissionsForUser', () => {
    it('returns the union of permission names across the roles', async () => {
      userFindOne.mockResolvedValue(
        usersFactory.build({ roles: [adminRole, viewerRole] }),
      );

      const permissions = await repository.getPermissionsForUser(userId);

      expect(permissions.sort()).toEqual(
        ['settings:read', 'users:read', 'users:write'].sort(),
      );
    });

    it('returns an empty array when the user is missing', async () => {
      userFindOne.mockResolvedValue(null);

      await expect(repository.getPermissionsForUser(userId)).resolves.toEqual(
        [],
      );
    });
  });

  describe('getRoleToPermissionsMapping', () => {
    it('maps role name to permission names', async () => {
      roleFind.mockResolvedValue([adminRole, viewerRole]);

      await expect(repository.getRoleToPermissionsMapping()).resolves.toEqual({
        admin: ['users:read', 'users:write'],
        viewer: ['users:read', 'settings:read'],
      });
    });
  });

  describe('findRolesForUser', () => {
    it('returns the roles loaded with their permissions', async () => {
      userFindOne.mockResolvedValue(usersFactory.build({ roles: [adminRole] }));

      await expect(repository.findRolesForUser(userId)).resolves.toEqual([
        adminRole,
      ]);
      expect(userFindOne).toHaveBeenCalledWith({
        relations: ['roles', 'roles.permissions'],
        where: { id: userId },
      });
    });
  });

  describe('assignRoleToUser', () => {
    it('returns false when the user or role is missing', async () => {
      userFindOne.mockResolvedValue(null);
      roleFindOne.mockResolvedValue(adminRole);

      await expect(repository.assignRoleToUser(userId, roleAId)).resolves.toBe(
        false,
      );
    });

    it('appends the role and saves when not already assigned', async () => {
      const user = usersFactory.build({ roles: [] });
      userFindOne.mockResolvedValue(user);
      roleFindOne.mockResolvedValue(adminRole);

      await expect(repository.assignRoleToUser(userId, roleAId)).resolves.toBe(
        true,
      );
      expect(user.roles.map((role) => role.id)).toEqual([roleAId]);
      expect(userSave).toHaveBeenCalledWith(user);
    });

    it('is idempotent when the role is already assigned', async () => {
      userFindOne.mockResolvedValue(usersFactory.build({ roles: [adminRole] }));
      roleFindOne.mockResolvedValue(adminRole);

      await expect(repository.assignRoleToUser(userId, roleAId)).resolves.toBe(
        true,
      );
      expect(userSave).not.toHaveBeenCalled();
    });
  });

  describe('removeRoleFromUser', () => {
    it('returns false when the user is missing', async () => {
      userFindOne.mockResolvedValue(null);

      await expect(
        repository.removeRoleFromUser(userId, roleAId),
      ).resolves.toBe(false);
    });

    it('removes the role and saves', async () => {
      const user = usersFactory.build({ roles: [adminRole, viewerRole] });
      userFindOne.mockResolvedValue(user);

      await expect(
        repository.removeRoleFromUser(userId, roleAId),
      ).resolves.toBe(true);
      expect(user.roles.map((role) => role.id)).toEqual([roleBId]);
      expect(userSave).toHaveBeenCalledWith(user);
    });
  });

  describe('addPermissionToRole', () => {
    it('returns false when the role is missing', async () => {
      roleFindOne.mockResolvedValue(null);

      await expect(repository.addPermissionToRole(roleAId, 'p')).resolves.toBe(
        false,
      );
    });

    it('returns false when the permission is missing', async () => {
      roleFindOne.mockResolvedValue(rolesFactory.build({ permissions: [] }));
      permissionFindOne.mockResolvedValue(null);

      await expect(repository.addPermissionToRole(roleAId, 'p')).resolves.toBe(
        false,
      );
    });

    it('appends the permission and saves', async () => {
      const role = rolesFactory.build({ permissions: [] });
      const permission = permissionsFactory.build();
      roleFindOne.mockResolvedValue(role);
      permissionFindOne.mockResolvedValue(permission);

      await expect(
        repository.addPermissionToRole(role.id, permission.id),
      ).resolves.toBe(true);
      expect(role.permissions).toEqual([permission]);
      expect(roleSave).toHaveBeenCalledWith(role);
    });

    it('is idempotent when the permission is already on the role', async () => {
      const permission = permissionsFactory.build();
      const role = rolesFactory.build({ permissions: [permission] });
      roleFindOne.mockResolvedValue(role);
      permissionFindOne.mockResolvedValue(permission);

      await expect(
        repository.addPermissionToRole(role.id, permission.id),
      ).resolves.toBe(true);
      expect(roleSave).not.toHaveBeenCalled();
    });
  });

  describe('removePermissionFromRole', () => {
    it('returns false when the role is missing', async () => {
      roleFindOne.mockResolvedValue(null);

      await expect(
        repository.removePermissionFromRole(roleAId, 'p'),
      ).resolves.toBe(false);
    });

    it('removes the permission and saves', async () => {
      const keep = permissionsFactory.build();
      const drop = permissionsFactory.build();
      const role = rolesFactory.build({ permissions: [keep, drop] });
      roleFindOne.mockResolvedValue(role);

      await expect(
        repository.removePermissionFromRole(role.id, drop.id),
      ).resolves.toBe(true);
      expect(role.permissions).toEqual([keep]);
      expect(roleSave).toHaveBeenCalledWith(role);
    });
  });

  describe('getPermissionsForServiceAccount', () => {
    it('returns empty array when service account is not found', async () => {
      serviceAccountFindOne.mockResolvedValue(null);

      await expect(
        repository.getPermissionsForServiceAccount(serviceAccountId),
      ).resolves.toEqual([]);
    });

    it('returns empty array when service account has no roles', async () => {
      serviceAccountFindOne.mockResolvedValue(
        serviceAccountsFactory.build({ roles: [] }),
      );

      await expect(
        repository.getPermissionsForServiceAccount(serviceAccountId),
      ).resolves.toEqual([]);
    });

    it('returns union of permission names across multiple roles', async () => {
      serviceAccountFindOne.mockResolvedValue(
        serviceAccountsFactory.build({ roles: [adminRole, viewerRole] }),
      );

      const permissions =
        await repository.getPermissionsForServiceAccount(serviceAccountId);

      expect(permissions.sort()).toEqual(
        ['settings:read', 'users:read', 'users:write'].sort(),
      );
    });
  });

  describe('findRoleNamesByServiceAccountId', () => {
    it('returns role names for the service account', async () => {
      serviceAccountFindOne.mockResolvedValue(
        serviceAccountsFactory.build({ roles: [adminRole, viewerRole] }),
      );

      await expect(
        repository.findRoleNamesByServiceAccountId(serviceAccountId),
      ).resolves.toEqual(['admin', 'viewer']);
    });

    it('returns empty array when service account has no roles', async () => {
      serviceAccountFindOne.mockResolvedValue(
        serviceAccountsFactory.build({ roles: [] }),
      );

      await expect(
        repository.findRoleNamesByServiceAccountId(serviceAccountId),
      ).resolves.toEqual([]);
    });
  });

  describe('findRolesForServiceAccount', () => {
    it('loads roles with permissions relation', async () => {
      serviceAccountFindOne.mockResolvedValue(
        serviceAccountsFactory.build({ roles: [adminRole] }),
      );

      const roles =
        await repository.findRolesForServiceAccount(serviceAccountId);

      expect(roles).toHaveLength(1);
      expect(roles[0]?.permissions).toHaveLength(2);
      expect(serviceAccountFindOne).toHaveBeenCalledWith({
        relations: ['roles', 'roles.permissions'],
        where: { id: serviceAccountId },
      });
    });
  });

  describe('assignRoleToServiceAccount', () => {
    it('returns false when service account or role is missing', async () => {
      serviceAccountFindOne.mockResolvedValue(null);
      roleFindOne.mockResolvedValue(adminRole);

      await expect(
        repository.assignRoleToServiceAccount(serviceAccountId, roleAId),
      ).resolves.toBe(false);
    });

    it('appends role and saves when not already assigned', async () => {
      const account = serviceAccountsFactory.build({ roles: [] });
      serviceAccountFindOne.mockResolvedValue(account);
      roleFindOne.mockResolvedValue(adminRole);

      await expect(
        repository.assignRoleToServiceAccount(serviceAccountId, roleAId),
      ).resolves.toBe(true);
      expect(account.roles.map((role) => role.id)).toEqual([roleAId]);
      expect(serviceAccountSave).toHaveBeenCalledWith(account);
    });

    it('is idempotent when role is already assigned', async () => {
      serviceAccountFindOne.mockResolvedValue(
        serviceAccountsFactory.build({ roles: [adminRole] }),
      );
      roleFindOne.mockResolvedValue(adminRole);

      await expect(
        repository.assignRoleToServiceAccount(serviceAccountId, roleAId),
      ).resolves.toBe(true);
      expect(serviceAccountSave).not.toHaveBeenCalled();
    });
  });

  describe('removeRoleFromServiceAccount', () => {
    it('returns false when service account is missing', async () => {
      serviceAccountFindOne.mockResolvedValue(null);

      await expect(
        repository.removeRoleFromServiceAccount(serviceAccountId, roleAId),
      ).resolves.toBe(false);
    });

    it('removes the role and saves', async () => {
      const account = serviceAccountsFactory.build({
        roles: [adminRole, viewerRole],
      });
      serviceAccountFindOne.mockResolvedValue(account);

      await expect(
        repository.removeRoleFromServiceAccount(serviceAccountId, roleAId),
      ).resolves.toBe(true);
      expect(account.roles.map((role) => role.id)).toEqual([roleBId]);
      expect(serviceAccountSave).toHaveBeenCalledWith(account);
    });
  });
});
