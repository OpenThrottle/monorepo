import { ConflictException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { createMock } from '@golevelup/ts-vitest';
import {
  AUTH_PRINCIPAL_KIND_SERVICE_ACCOUNT,
  AUTH_PRINCIPAL_KIND_USER,
  type AuthPrincipal,
} from '@openthrottle/nestjs-auth';
import { LoggerService } from '@openthrottle/nestjs-modules';
import { RolesService } from '@openthrottle/nestjs-repositories';
import { asMock } from '@openthrottle/nestjs-testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ROLLOUT_BOOLEAN_DEFAULT_FALLTHROUGH,
  ROLLOUT_BOOLEAN_DEFAULT_VARIATIONS,
  ROLLOUT_FLAG_KIND,
} from './rollout-flag.constants';
import { RolloutFlag } from './rollout-flag.entity';
import { RolloutService } from './rollout.service';

const userId = '11111111-1111-4111-8111-111111111111';
const serviceAccountId = '22222222-2222-4222-8222-222222222222';

const userPrincipal: AuthPrincipal = {
  kind: AUTH_PRINCIPAL_KIND_USER,
  sub: userId,
};
const serviceAccountPrincipal: AuthPrincipal = {
  kind: AUTH_PRINCIPAL_KIND_SERVICE_ACCOUNT,
  sub: serviceAccountId,
};

function flag(overrides: Partial<RolloutFlag> = {}): RolloutFlag {
  return asMock<RolloutFlag>({
    createdAt: new Date(),
    description: null,
    enabled: true,
    fallthrough: ROLLOUT_BOOLEAN_DEFAULT_FALLTHROUGH,
    id: 'flag-1',
    key: 'new-dashboard',
    kind: ROLLOUT_FLAG_KIND.BOOLEAN,
    offVariation: 0,
    targetRoles: [],
    updatedAt: new Date(),
    variations: ROLLOUT_BOOLEAN_DEFAULT_VARIATIONS,
    ...overrides,
  });
}

describe('RolloutService', () => {
  type FlagRepo = {
    create: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
    find: ReturnType<typeof vi.fn>;
    findOne: ReturnType<typeof vi.fn>;
    merge: ReturnType<typeof vi.fn>;
    save: ReturnType<typeof vi.fn>;
  };

  let service: RolloutService;
  let repo: FlagRepo;
  let rolesService: {
    findRoleNamesByServiceAccountId: ReturnType<typeof vi.fn>;
    findRoleNamesByUserId: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    repo = {
      create: vi.fn(),
      delete: vi.fn(),
      find: vi.fn(),
      findOne: vi.fn(),
      merge: vi.fn(),
      save: vi.fn(),
    };
    rolesService = {
      findRoleNamesByServiceAccountId: vi.fn(),
      findRoleNamesByUserId: vi.fn(),
    };

    const app = await Test.createTestingModule({
      providers: [
        RolloutService,
        { provide: LoggerService, useValue: createMock<LoggerService>() },
        { provide: getRepositoryToken(RolloutFlag), useValue: repo },
        {
          provide: RolesService,
          useValue: {
            ...createMock<RolesService>(),
            findRoleNamesByServiceAccountId:
              rolesService.findRoleNamesByServiceAccountId,
            findRoleNamesByUserId: rolesService.findRoleNamesByUserId,
          },
        },
      ],
    }).compile();

    service = app.get(RolloutService);
  });

  describe('create', () => {
    it('creates a flag when the key is available', async () => {
      const created = flag({ enabled: false, key: 'billing' });
      repo.findOne.mockResolvedValue(null);
      repo.create.mockReturnValue(created);
      repo.save.mockResolvedValue(created);

      const result = await service.create({ key: 'billing' });

      expect(result).toBe(created);
      expect(repo.create).toHaveBeenCalledWith({
        description: null,
        enabled: false,
        key: 'billing',
        targetRoles: [],
      });
    });

    it('throws ConflictException when the key already exists', async () => {
      repo.findOne.mockResolvedValue(flag({ key: 'billing' }));

      await expect(service.create({ key: 'billing' })).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(repo.save).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('returns null when the flag is missing', async () => {
      repo.findOne.mockResolvedValue(null);

      expect(await service.update('missing', { enabled: true })).toBeNull();
    });

    it('merges and saves a patch', async () => {
      const existing = flag({ enabled: false, key: 'new-dashboard' });
      repo.findOne.mockResolvedValue(existing);
      repo.save.mockImplementation(async (entity: RolloutFlag) => entity);

      await service.update('flag-1', { enabled: true, targetRoles: ['admin'] });

      expect(repo.merge).toHaveBeenCalledWith(existing, {
        enabled: true,
        targetRoles: ['admin'],
      });
      expect(repo.save).toHaveBeenCalledWith(existing);
    });

    it('rejects a rename to a key already in use', async () => {
      const existing = flag({ id: 'flag-1', key: 'old-key' });
      repo.findOne
        .mockResolvedValueOnce(existing) // findById
        .mockResolvedValueOnce(flag({ id: 'flag-2', key: 'taken' })); // assertKeyAvailable

      await expect(
        service.update('flag-1', { key: 'taken' }),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('remove', () => {
    it('returns true when a row was deleted', async () => {
      repo.delete.mockResolvedValue({ affected: 1 });
      expect(await service.remove('flag-1')).toBe(true);
    });

    it('returns false when nothing was deleted', async () => {
      repo.delete.mockResolvedValue({ affected: 0 });
      expect(await service.remove('flag-1')).toBe(false);
    });
  });

  describe('isEnabled', () => {
    it('returns false for an unknown key', async () => {
      repo.findOne.mockResolvedValue(null);
      expect(await service.isEnabled('nope', userPrincipal)).toBe(false);
      expect(rolesService.findRoleNamesByUserId).not.toHaveBeenCalled();
    });

    it('returns false when the flag is disabled', async () => {
      repo.findOne.mockResolvedValue(flag({ enabled: false }));
      expect(await service.isEnabled('new-dashboard', userPrincipal)).toBe(
        false,
      );
      expect(rolesService.findRoleNamesByUserId).not.toHaveBeenCalled();
    });

    it('returns true when enabled with empty targetRoles (global on)', async () => {
      repo.findOne.mockResolvedValue(flag({ enabled: true, targetRoles: [] }));
      expect(await service.isEnabled('new-dashboard', userPrincipal)).toBe(
        true,
      );
      expect(rolesService.findRoleNamesByUserId).not.toHaveBeenCalled();
    });

    it('returns true when the actor holds a targeted role (user branch)', async () => {
      repo.findOne.mockResolvedValue(flag({ targetRoles: ['admin'] }));
      rolesService.findRoleNamesByUserId.mockResolvedValue(['admin', 'user']);

      expect(await service.isEnabled('new-dashboard', userPrincipal)).toBe(
        true,
      );
      expect(rolesService.findRoleNamesByUserId).toHaveBeenCalledWith(userId);
    });

    it('returns false when the actor lacks every targeted role', async () => {
      repo.findOne.mockResolvedValue(flag({ targetRoles: ['admin'] }));
      rolesService.findRoleNamesByUserId.mockResolvedValue(['viewer']);

      expect(await service.isEnabled('new-dashboard', userPrincipal)).toBe(
        false,
      );
    });

    it('resolves roles via the service-account branch', async () => {
      repo.findOne.mockResolvedValue(flag({ targetRoles: ['mcp'] }));
      rolesService.findRoleNamesByServiceAccountId.mockResolvedValue(['mcp']);

      expect(
        await service.isEnabled('new-dashboard', serviceAccountPrincipal),
      ).toBe(true);
      expect(rolesService.findRoleNamesByServiceAccountId).toHaveBeenCalledWith(
        serviceAccountId,
      );
      expect(rolesService.findRoleNamesByUserId).not.toHaveBeenCalled();
    });
  });

  describe('evaluateAll', () => {
    it('evaluates each flag and resolves roles at most once', async () => {
      repo.find.mockResolvedValue([
        flag({ id: '1', key: 'global-on', targetRoles: [] }),
        flag({ id: '2', key: 'admin-only', targetRoles: ['admin'] }),
        flag({ enabled: false, id: '3', key: 'off', targetRoles: ['admin'] }),
        flag({ id: '4', key: 'viewer-only', targetRoles: ['viewer'] }),
      ]);
      rolesService.findRoleNamesByUserId.mockResolvedValue(['admin']);

      const result = await service.evaluateAll(userPrincipal);

      expect(result).toEqual([
        { enabled: true, key: 'global-on' },
        { enabled: true, key: 'admin-only' },
        { enabled: false, key: 'off' },
        { enabled: false, key: 'viewer-only' },
      ]);
      expect(rolesService.findRoleNamesByUserId).toHaveBeenCalledTimes(1);
    });

    it('skips role resolution when no enabled flag targets roles', async () => {
      repo.find.mockResolvedValue([
        flag({ id: '1', key: 'global-on', targetRoles: [] }),
        flag({ enabled: false, id: '2', key: 'off', targetRoles: ['admin'] }),
      ]);

      const result = await service.evaluateAll(userPrincipal);

      expect(result).toEqual([
        { enabled: true, key: 'global-on' },
        { enabled: false, key: 'off' },
      ]);
      expect(rolesService.findRoleNamesByUserId).not.toHaveBeenCalled();
    });
  });
});
