import { createMock } from '@golevelup/ts-vitest';
import { ConflictException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Test } from '@nestjs/testing';
import { LoggerService } from '@openthrottle/nestjs-modules';
import { asMock } from '@openthrottle/nestjs-testing';
import { QueryFailedError } from 'typeorm';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { RepositoryCheckout } from './repository-checkout.entity';
import { RepositoryCheckoutsService } from './repository-checkouts.service';

describe('RepositoryCheckoutsService', () => {
  const userId = '11111111-1111-4111-8111-111111111111';
  const checkoutId = '44444444-4444-4444-8444-444444444444';
  const repositoryId = '22222222-2222-4222-8222-222222222222';

  const mockEntity = asMock<RepositoryCheckout>({
    displayName: 'OpenThrottle',
    filesystemPath: '/Users/dev/openthrottle',
    id: checkoutId,
    kind: 'primary',
    managed: false,
    repositoryId,
    userId,
  });

  const mockOrmRepository = {
    count: vi.fn(),
    create: vi.fn((data: Partial<RepositoryCheckout>) => ({
      ...mockEntity,
      ...data,
    })),
    delete: vi.fn(),
    find: vi.fn(),
    findOne: vi.fn(),
    save: vi.fn((entity: RepositoryCheckout) => Promise.resolve(entity)),
    update: vi.fn(),
  };

  let service: RepositoryCheckoutsService;

  beforeAll(async () => {
    const app = await Test.createTestingModule({
      providers: [
        RepositoryCheckoutsService,
        {
          provide: LoggerService,
          useValue: createMock<LoggerService>(),
        },
        {
          provide: getRepositoryToken(RepositoryCheckout),
          useValue: mockOrmRepository,
        },
      ],
    }).compile();

    service = app.get(RepositoryCheckoutsService);
  });

  beforeEach(() => {
    vi.mocked(mockOrmRepository.findOne).mockReset();
    vi.mocked(mockOrmRepository.save).mockImplementation(
      async (entity) => entity,
    );
  });

  describe('listByUserId', () => {
    it('loads the repository relation with clamped pagination', async () => {
      vi.mocked(mockOrmRepository.find).mockResolvedValue([mockEntity]);

      const result = await service.listByUserId(userId);

      expect(result).toEqual([mockEntity]);
      expect(mockOrmRepository.find).toHaveBeenCalledWith({
        order: { createdAt: 'DESC' },
        relations: { repository: true },
        skip: 0,
        take: 50,
        where: { userId },
      });
    });
  });

  describe('create', () => {
    it('defaults managed=false and kind=primary', async () => {
      await service.create(userId, {
        displayName: 'OpenThrottle',
        filesystemPath: '/Users/dev/openthrottle',
        repositoryId,
      });

      expect(mockOrmRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          kind: 'primary',
          managed: false,
          repositoryId,
          userId,
        }),
      );
    });

    it('throws ConflictException on duplicate (user, path)', async () => {
      const uniqueError = new QueryFailedError(
        'INSERT',
        [],
        Object.assign(new Error('duplicate'), { code: '23505' }),
      );
      vi.mocked(mockOrmRepository.save).mockRejectedValue(uniqueError);

      await expect(
        service.create(userId, {
          displayName: 'OpenThrottle',
          filesystemPath: '/Users/dev/openthrottle',
          repositoryId,
        }),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('upsertWorktreeCheckout', () => {
    const worktreePath = '/Users/dev/openthrottle-worktrees/feature';

    // The create/save mocks are module-scoped; clear their call history so the
    // per-test call-count assertions below only see this test's calls.
    beforeEach(() => {
      vi.mocked(mockOrmRepository.create).mockClear();
      vi.mocked(mockOrmRepository.save).mockClear();
    });

    it('creates a managed worktree checkout when none exists at the path', async () => {
      vi.mocked(mockOrmRepository.findOne).mockResolvedValue(null);

      const result = await service.upsertWorktreeCheckout(userId, {
        displayName: 'feature',
        filesystemPath: worktreePath,
        repositoryId,
      });

      expect(mockOrmRepository.create).toHaveBeenCalledWith(
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
      const existing = asMock<RepositoryCheckout>({
        ...mockEntity,
        filesystemPath: worktreePath,
        kind: 'worktree',
        managed: true,
      });
      vi.mocked(mockOrmRepository.findOne).mockResolvedValue(existing);

      const result = await service.upsertWorktreeCheckout(userId, {
        displayName: 'feature',
        filesystemPath: worktreePath,
        repositoryId,
      });

      expect(result).toBe(existing);
      // No duplicate insert and no redundant write when already aligned.
      expect(mockOrmRepository.create).not.toHaveBeenCalled();
      expect(mockOrmRepository.save).not.toHaveBeenCalled();
    });

    it('normalizes a pre-existing primary row at the path up to a managed worktree', async () => {
      const existing = asMock<RepositoryCheckout>({
        ...mockEntity,
        filesystemPath: worktreePath,
        kind: 'primary',
        managed: false,
      });
      vi.mocked(mockOrmRepository.findOne).mockResolvedValue(existing);

      const result = await service.upsertWorktreeCheckout(userId, {
        displayName: 'feature',
        filesystemPath: worktreePath,
        repositoryId,
      });

      expect(mockOrmRepository.save).toHaveBeenCalledTimes(1);
      expect(result.kind).toBe('worktree');
      expect(result.managed).toBe(true);
    });

    it('recovers from a concurrent-insert unique violation by returning the raced row', async () => {
      const raced = asMock<RepositoryCheckout>({
        ...mockEntity,
        filesystemPath: worktreePath,
        kind: 'worktree',
        managed: true,
      });
      vi.mocked(mockOrmRepository.findOne)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(raced);
      vi.mocked(mockOrmRepository.save).mockRejectedValueOnce(
        new QueryFailedError(
          'INSERT',
          [],
          Object.assign(new Error('duplicate'), { code: '23505' }),
        ),
      );

      const result = await service.upsertWorktreeCheckout(userId, {
        displayName: 'feature',
        filesystemPath: worktreePath,
        repositoryId,
      });

      expect(result).toBe(raced);
    });
  });

  describe('countByRepositoryId', () => {
    it('counts checkouts across users', async () => {
      vi.mocked(mockOrmRepository.count).mockResolvedValue(3);

      await expect(service.countByRepositoryId(repositoryId)).resolves.toBe(3);
      expect(mockOrmRepository.count).toHaveBeenCalledWith({
        where: { repositoryId },
      });
    });
  });

  describe('saveInspection', () => {
    it('persists the snapshot with its scan timestamp', async () => {
      vi.mocked(mockOrmRepository.findOne).mockResolvedValue({ ...mockEntity });
      const scannedAt = new Date('2026-07-24T12:00:00.000Z');

      const result = await service.saveInspection(
        checkoutId,
        { git: { isRepo: true } },
        scannedAt,
      );

      expect(result?.inspection).toEqual({ git: { isRepo: true } });
      expect(result?.scannedAt).toBe(scannedAt);
    });

    it('returns null when the checkout does not exist', async () => {
      vi.mocked(mockOrmRepository.findOne).mockResolvedValue(null);

      await expect(
        service.saveInspection(checkoutId, {}, new Date()),
      ).resolves.toBeNull();
    });
  });

  describe('findByUserAndPath', () => {
    it('resolves the checkout by the (userId, filesystemPath) key', async () => {
      vi.mocked(mockOrmRepository.findOne).mockResolvedValue(mockEntity);

      const result = await service.findByUserAndPath(
        userId,
        '/Users/dev/openthrottle',
      );

      expect(result).toEqual(mockEntity);
      expect(mockOrmRepository.findOne).toHaveBeenCalledWith({
        where: { filesystemPath: '/Users/dev/openthrottle', userId },
      });
    });

    it('returns null when the path is not a registered checkout', async () => {
      vi.mocked(mockOrmRepository.findOne).mockResolvedValue(null);

      await expect(
        service.findByUserAndPath(userId, '/nope'),
      ).resolves.toBeNull();
    });
  });

  describe('setForeignSkillInjectionEnabledForRepository', () => {
    it('updates every one of the user checkouts and returns the affected count', async () => {
      vi.mocked(mockOrmRepository.update).mockResolvedValue({ affected: 2 });

      const result = await service.setForeignSkillInjectionEnabledForRepository(
        userId,
        repositoryId,
        true,
      );

      expect(result).toBe(2);
      expect(mockOrmRepository.update).toHaveBeenCalledWith(
        { repositoryId, userId },
        { foreignSkillInjectionEnabled: true },
      );
    });

    it('returns 0 when the user owns no checkout of the repository', async () => {
      vi.mocked(mockOrmRepository.update).mockResolvedValue({ affected: 0 });

      await expect(
        service.setForeignSkillInjectionEnabledForRepository(
          userId,
          repositoryId,
          false,
        ),
      ).resolves.toBe(0);
    });
  });

  describe('delete', () => {
    it('returns true when a row is removed', async () => {
      vi.mocked(mockOrmRepository.delete).mockResolvedValue({ affected: 1 });

      await expect(service.delete(userId, checkoutId)).resolves.toBe(true);
    });

    it('returns false when no row is removed', async () => {
      vi.mocked(mockOrmRepository.delete).mockResolvedValue({ affected: 0 });

      await expect(service.delete(userId, checkoutId)).resolves.toBe(false);
    });
  });
});
