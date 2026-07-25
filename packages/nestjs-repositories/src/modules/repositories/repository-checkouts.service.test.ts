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
