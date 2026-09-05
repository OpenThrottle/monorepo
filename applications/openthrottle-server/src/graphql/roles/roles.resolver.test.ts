/**
 * @description Unit tests for RolesResolver. Guards are mocked so permission checks are not exercised here.
 */

import {
  PermissionsService,
  RolesService,
} from '@openthrottle/nestjs-repositories';
import type { Permission, Role } from '@openthrottle/nestjs-repositories';
import { createMock } from '@golevelup/ts-vitest';
import { Test } from '@nestjs/testing';
import { beforeAll, describe, expect, test, vi } from 'vitest';
import { GqlPermissionsGuard } from '../../guards/gql-permissions.guard';
import type {
  // AddPermissionToRoleInput,
  AssignRoleToUserInput,
  CreateRoleInput,
  // RemovePermissionFromRoleInput,
  // RemoveRoleFromUserInput,
  // UpdateRoleInput,
} from './role.input';
import { RolesResolver } from './roles.resolver';

describe('RolesResolver', () => {
  let resolver: RolesResolver;
  let rolesService: RolesService;
  let permissionsService: PermissionsService;

  const mockRole: Role = {
    createdAt: new Date(),
    description: 'Full access',
    id: 'role-uuid',
    name: 'admin',
    permissions: [],
    serviceAccounts: [],
    updatedAt: new Date(),
    users: [],
  };

  const mockPermission: Permission = {
    createdAt: new Date(),
    description: 'Read users',
    id: 'perm-uuid',
    name: 'users:read',
    roles: [],
  };

  const mockRolesService = createMock<RolesService>({
    addPermissionToRole: vi.fn().mockResolvedValue(true),
    assignRoleToUser: vi.fn().mockResolvedValue(true),
    create: vi.fn().mockResolvedValue(mockRole),
    delete: vi.fn().mockResolvedValue(true),
    findAll: vi.fn().mockResolvedValue([mockRole]),
    findById: vi.fn().mockResolvedValue(mockRole),
    findRolesForUser: vi.fn().mockResolvedValue([mockRole]),
    getPermissionsForUser: vi.fn().mockResolvedValue(['users:read']),
    removePermissionFromRole: vi.fn().mockResolvedValue(true),
    removeRoleFromUser: vi.fn().mockResolvedValue(true),
    update: vi.fn().mockResolvedValue(mockRole),
  });

  const mockPermissionsService = createMock<PermissionsService>({
    findAll: vi.fn().mockResolvedValue([mockPermission]),
  });

  beforeAll(async () => {
    const app = await Test.createTestingModule({
      providers: [
        RolesResolver,
        { provide: RolesService, useValue: mockRolesService },
        { provide: PermissionsService, useValue: mockPermissionsService },
        GqlPermissionsGuard,
      ],
    }).compile();

    resolver = app.get<RolesResolver>(RolesResolver);
    rolesService = app.get<RolesService>(RolesService);
    permissionsService = app.get<PermissionsService>(PermissionsService);
  });

  describe('roles', () => {
    test('returns array of roles', async () => {
      const result = await resolver.roles();
      expect(result).toHaveLength(1);
      expect(result[0]?.name).toBe('admin');
      expect(rolesService.findAll).toHaveBeenCalled();
    });
  });

  describe('role', () => {
    test('returns role when found', async () => {
      const result = await resolver.role(mockRole.id);
      expect(result).not.toBeNull();
      expect(result?.id).toBe(mockRole.id);
      expect(rolesService.findById).toHaveBeenCalledWith(mockRole.id);
    });

    test('returns null when not found', async () => {
      vi.mocked(rolesService.findById).mockResolvedValueOnce(null);
      const result = await resolver.role('non-existent');
      expect(result).toBeNull();
    });
  });

  describe('permissions', () => {
    test('returns array of permissions', async () => {
      const result = await resolver.permissions();
      expect(result).toHaveLength(1);
      expect(result[0]?.name).toBe('users:read');
      expect(permissionsService.findAll).toHaveBeenCalled();
    });
  });

  describe('myPermissions', () => {
    test('returns permission names for current user', async () => {
      const result = await resolver.myPermissions('user-uuid');
      expect(result).toContain('users:read');
      expect(rolesService.getPermissionsForUser).toHaveBeenCalledWith(
        'user-uuid',
      );
    });
  });

  describe('createRole', () => {
    test('returns created role', async () => {
      const input: CreateRoleInput = { description: null, name: 'editor' };
      const result = await resolver.createRole(input);
      expect(result.name).toBe(mockRole.name);
      expect(rolesService.create).toHaveBeenCalledWith({
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
      expect(rolesService.assignRoleToUser).toHaveBeenCalledWith(
        'user-uuid',
        'role-uuid',
      );
    });
  });
});
