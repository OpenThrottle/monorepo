import { createMock } from '@golevelup/ts-vitest';
import { ConflictException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { IsNull, QueryFailedError } from 'typeorm';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { RepositoryCheckout } from './repository-checkout.entity.ts';
import { repositoryCheckoutsFactory } from './repository-checkouts.factory.ts';
import { RepositoryCheckoutsRepository } from './repository-checkouts.repository.ts';

const FIXED_NOW = new Date('2026-01-15T12:00:00.000Z');

function buildUniqueViolation(): QueryFailedError {
  return new QueryFailedError(
    'INSERT',
    [],
    Object.assign(new Error('duplicate'), { code: '23505' }),
  );
}

describe('RepositoryCheckoutsRepository', () => {
  const userId = '11111111-1111-4111-8111-111111111111';
  const checkoutId = '44444444-4444-4444-8444-444444444444';
  const repositoryId = '22222222-2222-4222-8222-222222222222';

  const count = vi.fn();
  const create = vi.fn();
  const find = vi.fn();
  const findOne = vi.fn();
  const save = vi.fn();
  const softDelete = vi.fn();
  const update = vi.fn();
  let repository: RepositoryCheckoutsRepository;

  const mockEntity = repositoryCheckoutsFactory.build({
    displayName: 'OpenThrottle',
    filesystemPath: '/Users/dev/openthrottle',
    id: checkoutId,
    kind: 'primary',
    managed: false,
    repositoryId,
    userId,
  });

  beforeEach(async () => {
    vi.clearAllMocks();
    create.mockImplementation((data: Partial<RepositoryCheckout>) => {
      return repositoryCheckoutsFactory.build({ ...mockEntity, ...data });
    });
    save.mockImplementation(async (entity: RepositoryCheckout) => {
      return entity;
    });

    const app = await Test.createTestingModule({
      providers: [
        RepositoryCheckoutsRepository,
        {
          provide: getRepositoryToken(RepositoryCheckout),
          useValue: createMock<Repository<RepositoryCheckout>>({
            count,
            create,
            find,
            findOne,
            save,
            softDelete,
            target: RepositoryCheckout,
            update,
          }),
        },
      ],
    }).compile();

    repository = app.get<RepositoryCheckoutsRepository>(
      RepositoryCheckoutsRepository,
    );
  });

  describe('listByUserId', () => {
    it('loads the repository relation with clamped pagination', async () => {
      find.mockResolvedValue([mockEntity]);

      const result = await repository.listByUserId(userId);

      expect(result).toEqual([mockEntity]);
      expect(find).toHaveBeenCalledWith({
        order: { createdAt: 'DESC' },
        relations: { repository: true },
        skip: 0,
        take: 25,
        where: { userId },
      });
    });

    it('honors a per-call default and max for callers that pin the old page size', async () => {
      find.mockResolvedValue([]);

      await repository.listByUserId(userId, undefined, { defaultLimit: 50 });
      await repository.listByUserId(userId, { limit: 500 }, { max: 200 });

      expect(find).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({ skip: 0, take: 50 }),
      );
      expect(find).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({ skip: 0, take: 200 }),
      );
    });
  });

  describe('findByIdForUser', () => {
    it('scopes the lookup to the owner and loads the repository relation', async () => {
      findOne.mockResolvedValue(mockEntity);

      await expect(
        repository.findByIdForUser(checkoutId, userId),
      ).resolves.toBe(mockEntity);
      expect(findOne).toHaveBeenCalledWith({
        relations: { repository: true },
        where: { id: checkoutId, userId },
      });
    });
  });

  describe('findCheckoutById', () => {
    it('finds a live checkout without a user scope', async () => {
      findOne.mockResolvedValue(mockEntity);

      await expect(repository.findCheckoutById(checkoutId)).resolves.toBe(
        mockEntity,
      );
      expect(findOne).toHaveBeenCalledWith({ where: { id: checkoutId } });
    });

    it('returns null instead of throwing when nothing matches', async () => {
      findOne.mockResolvedValue(null);

      await expect(repository.findCheckoutById('missing')).resolves.toBeNull();
    });
  });

  describe('findAll and findAllWithForeignSkillInjectionEnabled', () => {
    it('lists every live checkout', async () => {
      find.mockResolvedValue([mockEntity]);

      await expect(repository.findAll()).resolves.toEqual([mockEntity]);
    });

    it('lists only the opted-in checkouts', async () => {
      find.mockResolvedValue([mockEntity]);

      await expect(
        repository.findAllWithForeignSkillInjectionEnabled(),
      ).resolves.toEqual([mockEntity]);
      expect(find).toHaveBeenCalledWith({
        where: { foreignSkillInjectionEnabled: true },
      });
    });
  });

  describe('findByRepositoryIdForUser', () => {
    it('lists the user checkouts of a repository, newest first', async () => {
      find.mockResolvedValue([mockEntity]);

      await expect(
        repository.findByRepositoryIdForUser(repositoryId, userId),
      ).resolves.toEqual([mockEntity]);
      expect(find).toHaveBeenCalledWith({
        order: { createdAt: 'DESC' },
        relations: { repository: true },
        where: { repositoryId, userId },
      });
    });
  });

  describe('createForUser', () => {
    it('defaults managed=false and kind=primary', async () => {
      await repository.createForUser(userId, {
        displayName: 'OpenThrottle',
        filesystemPath: '/Users/dev/openthrottle',
        repositoryId,
      });

      expect(create).toHaveBeenCalledWith(
        expect.objectContaining({
          kind: 'primary',
          managed: false,
          repositoryId,
          userId,
        }),
      );
    });

    it('throws ConflictException on duplicate (user, path)', async () => {
      save.mockRejectedValue(buildUniqueViolation());

      await expect(
        repository.createForUser(userId, {
          displayName: 'OpenThrottle',
          filesystemPath: '/Users/dev/openthrottle',
          repositoryId,
        }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('rethrows an error that is not a unique violation', async () => {
      save.mockRejectedValue(new Error('boom'));

      await expect(
        repository.createForUser(userId, {
          displayName: 'OpenThrottle',
          filesystemPath: '/Users/dev/openthrottle',
          repositoryId,
        }),
      ).rejects.toThrow('boom');
    });
  });

  describe('upsertWorktreeCheckout', () => {
    const worktreePath = '/Users/dev/openthrottle-worktrees/feature';

    it('creates a managed worktree checkout when none exists at the path', async () => {
      findOne.mockResolvedValue(null);

      const result = await repository.upsertWorktreeCheckout(userId, {
        displayName: 'feature',
        filesystemPath: worktreePath,
        repositoryId,
      });

      expect(create).toHaveBeenCalledWith(
        expect.objectContaining({
          filesystemPath: worktreePath,
          kind: 'worktree',
          managed: true,
          repositoryId,
          userId,
        }),
      );
      expect(result.kind).toBe('worktree');
      expect(result.managed).toBe(true);
    });

    it('is idempotent: returns the existing row untouched on re-provision', async () => {
      const existing = repositoryCheckoutsFactory.build({
        ...mockEntity,
        filesystemPath: worktreePath,
        kind: 'worktree',
        managed: true,
      });
      findOne.mockResolvedValue(existing);

      const result = await repository.upsertWorktreeCheckout(userId, {
        displayName: 'feature',
        filesystemPath: worktreePath,
        repositoryId,
      });

      expect(result).toBe(existing);
      expect(findOne).toHaveBeenCalledWith({
        where: { filesystemPath: worktreePath, userId },
      });
      expect(create).not.toHaveBeenCalled();
      expect(save).not.toHaveBeenCalled();
    });

    it('normalizes a pre-existing primary row at the path up to a managed worktree', async () => {
      const existing = repositoryCheckoutsFactory.build({
        ...mockEntity,
        filesystemPath: worktreePath,
        kind: 'primary',
        managed: false,
      });
      findOne.mockResolvedValue(existing);

      const result = await repository.upsertWorktreeCheckout(userId, {
        displayName: 'feature',
        filesystemPath: worktreePath,
        repositoryId,
      });

      expect(save).toHaveBeenCalledTimes(1);
      expect(result.kind).toBe('worktree');
      expect(result.managed).toBe(true);
    });

    it('adopts the resolved repository when the existing row drifted', async () => {
      const existing = repositoryCheckoutsFactory.build({
        ...mockEntity,
        filesystemPath: worktreePath,
        kind: 'worktree',
        managed: true,
        repositoryId: 'provisional-repo',
      });
      findOne.mockResolvedValue(existing);

      const result = await repository.upsertWorktreeCheckout(userId, {
        displayName: 'feature',
        filesystemPath: worktreePath,
        repositoryId,
      });

      expect(result.repositoryId).toBe(repositoryId);
      expect(save).toHaveBeenCalledTimes(1);
    });

    it('recovers from a concurrent-insert unique violation by returning the raced row', async () => {
      const raced = repositoryCheckoutsFactory.build({
        ...mockEntity,
        filesystemPath: worktreePath,
        kind: 'worktree',
        managed: true,
      });
      findOne.mockResolvedValueOnce(null).mockResolvedValueOnce(raced);
      save.mockRejectedValueOnce(buildUniqueViolation());

      const result = await repository.upsertWorktreeCheckout(userId, {
        displayName: 'feature',
        filesystemPath: worktreePath,
        repositoryId,
      });

      expect(result).toBe(raced);
    });

    it('rethrows a unique violation when the raced row cannot be found', async () => {
      findOne.mockResolvedValue(null);
      save.mockRejectedValueOnce(buildUniqueViolation());

      await expect(
        repository.upsertWorktreeCheckout(userId, {
          displayName: 'feature',
          filesystemPath: worktreePath,
          repositoryId,
        }),
      ).rejects.toBeInstanceOf(QueryFailedError);
    });
  });

  describe('updateDisplayName', () => {
    it('renames an owned checkout', async () => {
      findOne.mockResolvedValue({ ...mockEntity });

      const result = await repository.updateDisplayName(
        userId,
        checkoutId,
        'Renamed',
      );

      expect(result?.displayName).toBe('Renamed');
    });

    it('returns null when the checkout is not found', async () => {
      findOne.mockResolvedValue(null);

      await expect(
        repository.updateDisplayName(userId, checkoutId, 'Renamed'),
      ).resolves.toBeNull();
      expect(save).not.toHaveBeenCalled();
    });
  });

  describe('updateFilesystemPath', () => {
    it('moves an owned checkout to the new path', async () => {
      findOne.mockResolvedValue({ ...mockEntity });

      const result = await repository.updateFilesystemPath(
        userId,
        checkoutId,
        '/new/path',
      );

      expect(result?.filesystemPath).toBe('/new/path');
    });

    it('returns null when the checkout is not found', async () => {
      findOne.mockResolvedValue(null);

      await expect(
        repository.updateFilesystemPath(userId, checkoutId, '/new/path'),
      ).resolves.toBeNull();
    });

    it('throws ConflictException when the path is already registered', async () => {
      findOne.mockResolvedValue({ ...mockEntity });
      save.mockRejectedValue(buildUniqueViolation());

      await expect(
        repository.updateFilesystemPath(userId, checkoutId, '/taken'),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('repointRepository', () => {
    it('re-points an owned checkout at another repository', async () => {
      findOne.mockResolvedValue({ ...mockEntity });

      const result = await repository.repointRepository(
        userId,
        checkoutId,
        'canonical-repo',
      );

      expect(result?.repositoryId).toBe('canonical-repo');
    });

    it('returns null when the checkout is not found', async () => {
      findOne.mockResolvedValue(null);

      await expect(
        repository.repointRepository(userId, checkoutId, 'canonical-repo'),
      ).resolves.toBeNull();
    });
  });

  describe('countByRepositoryId', () => {
    it('counts live checkouts across users', async () => {
      count.mockResolvedValue(3);

      await expect(repository.countByRepositoryId(repositoryId)).resolves.toBe(
        3,
      );
      expect(count).toHaveBeenCalledWith({
        where: { deletedAt: IsNull(), repositoryId },
      });
    });
  });

  describe('saveInspection', () => {
    it('persists the snapshot with its scan timestamp', async () => {
      findOne.mockResolvedValue({ ...mockEntity });
      const scannedAt = new Date('2026-07-24T12:00:00.000Z');

      const result = await repository.saveInspection(
        checkoutId,
        { git: { isRepo: true } },
        scannedAt,
      );

      expect(result?.inspection).toEqual({ git: { isRepo: true } });
      expect(result?.scannedAt).toBe(scannedAt);
    });

    it('returns null when the checkout does not exist', async () => {
      findOne.mockResolvedValue(null);

      await expect(
        repository.saveInspection(checkoutId, {}, new Date(FIXED_NOW)),
      ).resolves.toBeNull();
    });
  });

  describe('findByUserAndPath', () => {
    it('resolves the checkout by the (userId, filesystemPath) key', async () => {
      findOne.mockResolvedValue(mockEntity);

      const result = await repository.findByUserAndPath(
        userId,
        '/Users/dev/openthrottle',
      );

      expect(result).toEqual(mockEntity);
      expect(findOne).toHaveBeenCalledWith({
        where: { filesystemPath: '/Users/dev/openthrottle', userId },
      });
    });

    it('returns null when the path is not a registered checkout', async () => {
      findOne.mockResolvedValue(null);

      await expect(
        repository.findByUserAndPath(userId, '/nope'),
      ).resolves.toBeNull();
    });
  });

  describe('setForeignSkillInjectionEnabledForRepository', () => {
    it('updates every live checkout of the user and returns the affected count', async () => {
      update.mockResolvedValue({ affected: 2 });

      const result =
        await repository.setForeignSkillInjectionEnabledForRepository(
          userId,
          repositoryId,
          true,
        );

      expect(result).toBe(2);
      expect(update).toHaveBeenCalledWith(
        { deletedAt: IsNull(), repositoryId, userId },
        { foreignSkillInjectionEnabled: true },
      );
    });

    it('returns 0 when the user owns no live checkout of the repository', async () => {
      update.mockResolvedValue({ affected: 0 });

      await expect(
        repository.setForeignSkillInjectionEnabledForRepository(
          userId,
          repositoryId,
          false,
        ),
      ).resolves.toBe(0);
    });
  });

  describe('setWorktreeSkillOverlayEnabledForRepository', () => {
    it('updates every live checkout of the user and returns the affected count', async () => {
      update.mockResolvedValue({ affected: 2 });

      const result =
        await repository.setWorktreeSkillOverlayEnabledForRepository(
          userId,
          repositoryId,
          false,
        );

      expect(result).toBe(2);
      expect(update).toHaveBeenCalledWith(
        { deletedAt: IsNull(), repositoryId, userId },
        { worktreeSkillOverlayEnabled: false },
      );
    });

    it('returns 0 when the user owns no live checkout of the repository', async () => {
      update.mockResolvedValue({ affected: 0 });

      await expect(
        repository.setWorktreeSkillOverlayEnabledForRepository(
          userId,
          repositoryId,
          true,
        ),
      ).resolves.toBe(0);
    });
  });

  describe('setAgentConfigTrustedForRepository', () => {
    it('updates every live checkout of the user and returns the affected count', async () => {
      update.mockResolvedValue({ affected: 2 });

      const result = await repository.setAgentConfigTrustedForRepository(
        userId,
        repositoryId,
        true,
      );

      expect(result).toBe(2);
      expect(update).toHaveBeenCalledWith(
        { deletedAt: IsNull(), repositoryId, userId },
        { agentConfigTrusted: true },
      );
    });

    it('returns 0 when the user owns no live checkout of the repository', async () => {
      update.mockResolvedValue({ affected: 0 });

      await expect(
        repository.setAgentConfigTrustedForRepository(
          userId,
          repositoryId,
          false,
        ),
      ).resolves.toBe(0);
    });
  });

  describe('removeForUser', () => {
    it('soft deletes the live row owned by the user and returns true', async () => {
      softDelete.mockResolvedValue({ affected: 1, raw: [] });

      await expect(repository.removeForUser(userId, checkoutId)).resolves.toBe(
        true,
      );
      expect(softDelete).toHaveBeenCalledWith({
        deletedAt: IsNull(),
        id: checkoutId,
        userId,
      });
    });

    it('returns false when no live row is owned by the user', async () => {
      softDelete.mockResolvedValue({ affected: 0, raw: [] });

      await expect(repository.removeForUser(userId, checkoutId)).resolves.toBe(
        false,
      );
    });
  });

  describe('deleteWorktreeCheckout', () => {
    it('scopes the soft delete to the user and to kind=worktree, so a primary row is never removed', async () => {
      softDelete.mockResolvedValue({ affected: 1, raw: [] });

      await expect(
        repository.deleteWorktreeCheckout(userId, checkoutId),
      ).resolves.toBe(true);
      expect(softDelete).toHaveBeenCalledWith({
        deletedAt: IsNull(),
        id: checkoutId,
        kind: 'worktree',
        userId,
      });
    });

    it('returns false when no worktree row matched', async () => {
      softDelete.mockResolvedValue({ affected: 0, raw: [] });

      await expect(
        repository.deleteWorktreeCheckout(userId, checkoutId),
      ).resolves.toBe(false);
    });
  });
});
