import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import { createMock } from '@golevelup/ts-vitest';
import { getRepositoryToken } from '@nestjs/typeorm';
import { LoggerService } from '@openthrottle/nestjs-modules';
import { ServiceAccount } from '../service-accounts/service-account.entity';
import { User } from '../users/user.entity';
import { Permission } from './permission.entity';
import { Role } from './role.entity';
import { RolesService } from './roles.service';

const serviceAccountId = '11111111-1111-4111-8111-111111111111';
const roleAId = '22222222-2222-4222-8222-222222222222';
const roleBId = '33333333-3333-4333-8333-333333333333';

function permission(name: string): Permission {
  return {
    createdAt: new Date(),
    description: null,
    id: `perm-${name}`,
    name,
    roles: [],
  };
}

function role(id: string, name: string, permissions: Permission[]): Role {
  return {
    createdAt: new Date(),
    description: null,
    id,
    name,
    permissions,
    serviceAccounts: [],
    updatedAt: new Date(),
    users: [],
  };
}

describe('RolesService (service accounts)', () => {
  type UserRepo = {
    findOne: ReturnType<typeof vi.fn>;
    save: ReturnType<typeof vi.fn>;
  };
  type ServiceAccountRepo = {
    findOne: ReturnType<typeof vi.fn>;
    save: ReturnType<typeof vi.fn>;
  };

  let service: RolesService;
  let userRepository: UserRepo;
  let serviceAccountRepository: ServiceAccountRepo;
  let roleRepository: { findOne: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    userRepository = {
      ...createMock(),
      findOne: vi.fn(),
      save: vi.fn(),
    };
    serviceAccountRepository = {
      findOne: vi.fn(),
      save: vi.fn(),
    };
    roleRepository = {
      findOne: vi.fn(),
    };

    const app = await Test.createTestingModule({
      providers: [
        RolesService,
        {
          provide: LoggerService,
          useValue: createMock<LoggerService>(),
        },
        {
          provide: getRepositoryToken(Role),
          useValue: {
            ...createMock(),
            findOne: roleRepository.findOne,
          },
        },
        {
          provide: getRepositoryToken(User),
          useValue: userRepository,
        },
        {
          provide: getRepositoryToken(ServiceAccount),
          useValue: serviceAccountRepository,
        },
      ],
    }).compile();

    service = app.get(RolesService);
  });

  describe('getPermissionsForServiceAccount', () => {
    it('returns empty array when service account is not found', async () => {
      vi.mocked(serviceAccountRepository.findOne).mockResolvedValue(null);

      const permissions =
        await service.getPermissionsForServiceAccount(serviceAccountId);

      expect(permissions).toEqual([]);
    });

    it('returns empty array when service account has no roles', async () => {
      vi.mocked(serviceAccountRepository.findOne).mockResolvedValue({
        id: serviceAccountId,
        name: 'mcp-developer',
        roles: [],
      });

      const permissions =
        await service.getPermissionsForServiceAccount(serviceAccountId);

      expect(permissions).toEqual([]);
    });

    it('returns union of permission names across multiple roles', async () => {
      const adminRole = role(roleAId, 'admin', [
        permission('users:read'),
        permission('users:write'),
      ]);
      const viewerRole = role(roleBId, 'viewer', [
        permission('users:read'),
        permission('settings:read'),
      ]);

      vi.mocked(serviceAccountRepository.findOne).mockResolvedValue({
        id: serviceAccountId,
        name: 'mcp-developer',
        roles: [adminRole, viewerRole],
      } as ServiceAccount);

      const permissions =
        await service.getPermissionsForServiceAccount(serviceAccountId);

      expect(permissions.sort()).toEqual(
        ['settings:read', 'users:read', 'users:write'].sort(),
      );
    });
  });

  describe('findRoleNamesByServiceAccountId', () => {
    it('returns role names for the service account', async () => {
      vi.mocked(serviceAccountRepository.findOne).mockResolvedValue({
        id: serviceAccountId,
        roles: [role(roleAId, 'admin', []), role(roleBId, 'viewer', [])],
      } as ServiceAccount);

      const names =
        await service.findRoleNamesByServiceAccountId(serviceAccountId);

      expect(names).toEqual(['admin', 'viewer']);
    });

    it('returns empty array when service account has no roles', async () => {
      vi.mocked(serviceAccountRepository.findOne).mockResolvedValue({
        id: serviceAccountId,
        roles: [],
      });

      const names =
        await service.findRoleNamesByServiceAccountId(serviceAccountId);

      expect(names).toEqual([]);
    });
  });

  describe('findRolesForServiceAccount', () => {
    it('loads roles with permissions relation', async () => {
      const adminRole = role(roleAId, 'admin', [permission('users:read')]);
      vi.mocked(serviceAccountRepository.findOne).mockResolvedValue({
        id: serviceAccountId,
        roles: [adminRole],
      } as ServiceAccount);

      const roles = await service.findRolesForServiceAccount(serviceAccountId);

      expect(roles).toHaveLength(1);
      expect(roles[0]?.permissions).toHaveLength(1);
      expect(serviceAccountRepository.findOne).toHaveBeenCalledWith({
        relations: ['roles', 'roles.permissions'],
        where: { id: serviceAccountId },
      });
    });
  });

  describe('assignRoleToServiceAccount', () => {
    it('returns false when service account or role is missing', async () => {
      vi.mocked(serviceAccountRepository.findOne).mockResolvedValue(null);
      vi.mocked(roleRepository.findOne).mockResolvedValue(
        role(roleAId, 'admin', []),
      );

      expect(
        await service.assignRoleToServiceAccount(serviceAccountId, roleAId),
      ).toBe(false);
    });

    it('appends role and saves when not already assigned', async () => {
      const existing = {
        id: serviceAccountId,
        roles: [] as Role[],
      } as ServiceAccount;
      const adminRole = role(roleAId, 'admin', []);

      vi.mocked(serviceAccountRepository.findOne).mockResolvedValue(existing);
      vi.mocked(roleRepository.findOne).mockResolvedValue(adminRole);
      vi.mocked(serviceAccountRepository.save).mockImplementation(
        async (entity) => entity as ServiceAccount,
      );

      const result = await service.assignRoleToServiceAccount(
        serviceAccountId,
        roleAId,
      );

      expect(result).toBe(true);
      expect(existing.roles).toHaveLength(1);
      expect(existing.roles[0]?.id).toBe(roleAId);
      expect(serviceAccountRepository.save).toHaveBeenCalledWith(existing);
    });

    it('is idempotent when role is already assigned', async () => {
      const adminRole = role(roleAId, 'admin', []);
      const existing = {
        id: serviceAccountId,
        roles: [adminRole],
      } as ServiceAccount;

      vi.mocked(serviceAccountRepository.findOne).mockResolvedValue(existing);
      vi.mocked(roleRepository.findOne).mockResolvedValue(adminRole);

      const result = await service.assignRoleToServiceAccount(
        serviceAccountId,
        roleAId,
      );

      expect(result).toBe(true);
      expect(serviceAccountRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('removeRoleFromServiceAccount', () => {
    it('returns false when service account is missing', async () => {
      vi.mocked(serviceAccountRepository.findOne).mockResolvedValue(null);

      expect(
        await service.removeRoleFromServiceAccount(serviceAccountId, roleAId),
      ).toBe(false);
    });

    it('removes the role and saves', async () => {
      const adminRole = role(roleAId, 'admin', []);
      const viewerRole = role(roleBId, 'viewer', []);
      const existing = {
        id: serviceAccountId,
        roles: [adminRole, viewerRole],
      } as ServiceAccount;

      vi.mocked(serviceAccountRepository.findOne).mockResolvedValue(existing);
      vi.mocked(serviceAccountRepository.save).mockImplementation(
        async (entity) => entity as ServiceAccount,
      );

      const result = await service.removeRoleFromServiceAccount(
        serviceAccountId,
        roleAId,
      );

      expect(result).toBe(true);
      expect(existing.roles).toHaveLength(1);
      expect(existing.roles[0]?.id).toBe(roleBId);
      expect(serviceAccountRepository.save).toHaveBeenCalledWith(existing);
    });
  });
});
