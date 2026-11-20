/**
 * @description Unit tests for RolesResolver. Guards are mocked so permission checks are not exercised here.
 */

import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import {
  PermissionsRepository,
  RolesRepository,
} from '@openthrottle/nestjs-repositories-server';
import type {
  PermissionsRepositoryMock,
  RolesRepositoryMock,
} from '@openthrottle/nestjs-repositories-server/testing';
import {
  createPermissionsRepositoryMock,
  createRolesRepositoryMock,
  permissionsFactory,
  rolesFactory,
} from '@openthrottle/nestjs-repositories-server/testing';
import { beforeEach, describe, expect, test } from 'vitest';

import { GqlPermissionsGuard } from '../../guards/gql-permissions.guard.ts';
import type {
  // AddPermissionToRoleInput,
  AssignRoleToUserInput,
  CreateRoleInput,
  // RemovePermissionFromRoleInput,
  // RemoveRoleFromUserInput,
  // UpdateRoleInput,
} from './role.input.ts';
import { RolesResolver } from './roles.resolver.ts';

const FIXED_NOW = new Date('2026-01-15T12:00:00.000Z');

describe('RolesResolver', () => {
  let resolver: RolesResolver;
  let roles: RolesRepositoryMock;
  let permissions: PermissionsRepositoryMock;

  const mockRole = rolesFactory.build({
    createdAt: new Date(FIXED_NOW),
    description: 'Full access',
    id: 'role-uuid',
    name: 'admin',
    updatedAt: new Date(FIXED_NOW),
  });

  const mockPermission = permissionsFactory.build({
    createdAt: new Date(FIXED_NOW),
    description: 'Read users',
    id: 'perm-uuid',
    name: 'users:read',
  });

  beforeEach(async () => {
    roles = createRolesRepositoryMock();
    permissions = createPermissionsRepositoryMock();
    roles.addPermissionToRole.mockResolvedValue(true);
    roles.assignRoleToUser.mockResolvedValue(true);
    roles.create.mockResolvedValue(mockRole);
    roles.findAll.mockResolvedValue([mockRole]);
    roles.findOne.mockResolvedValue(mockRole);
    roles.getPermissionsForUser.mockResolvedValue(['users:read']);
    roles.remove.mockResolvedValue(mockRole);
    roles.update.mockResolvedValue(mockRole);
    permissions.findAll.mockResolvedValue([mockPermission]);

    const app = await Test.createTestingModule({
      providers: [
        RolesResolver,
        { provide: RolesRepository, useValue: roles },
        { provide: PermissionsRepository, useValue: permissions },
        GqlPermissionsGuard,
      ],
    }).compile();

    resolver = app.get<RolesResolver>(RolesResolver);
  });

  describe('roles', () => {
    test('returns array of roles', async () => {
      const result = await resolver.roles();
      expect(result).toHaveLength(1);
      expect(result[0]?.name).toBe('admin');
      expect(roles.findAll).toHaveBeenCalled();
    });
  });

  describe('role', () => {
    test('returns role when found', async () => {
      const result = await resolver.role(mockRole.id);
      expect(result).not.toBeNull();
      expect(result?.id).toBe(mockRole.id);
      expect(roles.findOne).toHaveBeenCalledWith({
        relations: { permissions: true },
        where: { id: mockRole.id },
      });
    });

    test('returns null when not found', async () => {
      roles.findOne.mockResolvedValueOnce(null);
      const result = await resolver.role('non-existent');
      expect(result).toBeNull();
    });
  });

  describe('permissions', () => {
    test('returns array of permissions', async () => {
      const result = await resolver.permissions();
      expect(result).toHaveLength(1);
      expect(result[0]?.name).toBe('users:read');
      expect(permissions.findAll).toHaveBeenCalled();
    });
  });

  describe('myPermissions', () => {
    test('returns permission names for current user', async () => {
      const result = await resolver.myPermissions('user-uuid');
      expect(result).toContain('users:read');
      expect(roles.getPermissionsForUser).toHaveBeenCalledWith('user-uuid');
    });
  });

  describe('createRole', () => {
    test('returns created role', async () => {
      const input: CreateRoleInput = { description: null, name: 'editor' };
      const result = await resolver.createRole(input);
      expect(result.name).toBe(mockRole.name);
      expect(roles.create).toHaveBeenCalledWith({
        description: null,
        name: 'editor',
      });
    });
  });

  describe('assignRoleToUser', () => {
    test('returns true when assigned', async () => {
      const input: AssignRoleToUserInput = {
        roleId: 'role-uuid',
        userId: 'user-uuid',
      };
      const result = await resolver.assignRoleToUser(input);
      expect(result).toBe(true);
      expect(roles.assignRoleToUser).toHaveBeenCalledWith(
        'user-uuid',
        'role-uuid',
      );
    });
  });

  describe('updateRole', () => {
    test('returns the updated role', async () => {
      const result = await resolver.updateRole({
        description: null,
        id: mockRole.id,
        name: 'renamed',
      });

      expect(result?.id).toBe(mockRole.id);
      expect(roles.update).toHaveBeenCalledWith(mockRole.id, {
        description: null,
        name: 'renamed',
      });
    });

    test('returns null when the role does not exist', async () => {
      roles.update.mockRejectedValue(new NotFoundException('role not found'));

      const result = await resolver.updateRole({
        description: null,
        id: 'non-existent',
        name: 'renamed',
      });

      expect(result).toBeNull();
    });
  });

  describe('deleteRole', () => {
    test('returns true when the role is removed', async () => {
      await expect(resolver.deleteRole(mockRole.id)).resolves.toBe(true);
      expect(roles.remove).toHaveBeenCalledWith(mockRole.id);
    });

    test('returns false when the role does not exist', async () => {
      roles.remove.mockRejectedValue(new NotFoundException('role not found'));

      await expect(resolver.deleteRole('non-existent')).resolves.toBe(false);
    });
  });
});
