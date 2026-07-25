import { createMock } from '@golevelup/ts-vitest';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Test } from '@nestjs/testing';
import { LoggerService } from '@openthrottle/nestjs-modules';
import { asMock } from '@openthrottle/nestjs-testing';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { RepositoriesService } from './repositories.service';
import { Repository } from './repository.entity';

describe('RepositoriesService', () => {
  const repositoryId = '22222222-2222-4222-8222-222222222222';

  const mockEntity = asMock<Repository>({
    defaultBranch: 'main',
    id: repositoryId,
    name: 'OpenThrottle',
    normalizedRemoteUrl: 'https://github.com/openthrottle/monorepo',
    projectId: null,
  });

  const mockOrmRepository = {
    create: vi.fn((data: Partial<Repository>) => ({ ...mockEntity, ...data })),
    delete: vi.fn(),
    findOne: vi.fn(),
    save: vi.fn((entity: Repository) => Promise.resolve(entity)),
  };

  let service: RepositoriesService;

  beforeAll(async () => {
    const app = await Test.createTestingModule({
      providers: [
        RepositoriesService,
        {
          provide: LoggerService,
          useValue: createMock<LoggerService>(),
        },
        {
          provide: getRepositoryToken(Repository),
          useValue: mockOrmRepository,
        },
      ],
    }).compile();

    service = app.get(RepositoriesService);
  });

  beforeEach(() => {
    vi.mocked(mockOrmRepository.findOne).mockReset();
    vi.mocked(mockOrmRepository.save).mockImplementation(
      async (entity) => entity,
    );
  });

  describe('findOrCreateByRemoteUrl', () => {
    it('returns the existing canonical repository for an equivalent remote', async () => {
      vi.mocked(mockOrmRepository.findOne).mockResolvedValue(mockEntity);

      const result = await service.findOrCreateByRemoteUrl(
        'git@github.com:OpenThrottle/monorepo.git',
        { defaultBranch: null, name: 'ignored', projectId: null },
      );

      expect(result).toBe(mockEntity);
      expect(mockOrmRepository.findOne).toHaveBeenCalledWith({
        where: {
          normalizedRemoteUrl: 'https://github.com/OpenThrottle/monorepo',
        },
      });
    });

    it('creates a canonical repository when the remote is new', async () => {
      vi.mocked(mockOrmRepository.findOne).mockResolvedValue(null);

      const result = await service.findOrCreateByRemoteUrl(
        'https://github.com/org/fresh.git',
        { defaultBranch: 'main', name: 'Fresh', projectId: null },
      );

      expect(result.normalizedRemoteUrl).toBe('https://github.com/org/fresh');
      expect(mockOrmRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Fresh',
          normalizedRemoteUrl: 'https://github.com/org/fresh',
        }),
      );
    });

    it('creates a provisional repository for a null remote', async () => {
      const result = await service.findOrCreateByRemoteUrl(null, {
        defaultBranch: null,
        name: 'Local only',
        projectId: null,
      });

      expect(result.normalizedRemoteUrl).toBeNull();
      expect(mockOrmRepository.findOne).not.toHaveBeenCalled();
    });

    it('creates a provisional repository for an unrecognizable remote', async () => {
      const result = await service.findOrCreateByRemoteUrl('/not/a/remote', {
        defaultBranch: null,
        name: 'Local only',
        projectId: null,
      });

      expect(result.normalizedRemoteUrl).toBeNull();
      expect(mockOrmRepository.findOne).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('returns null when the repository does not exist', async () => {
      vi.mocked(mockOrmRepository.findOne).mockResolvedValue(null);

      await expect(
        service.update(repositoryId, { name: 'Renamed' }),
      ).resolves.toBeNull();
    });

    it('updates only provided fields', async () => {
      vi.mocked(mockOrmRepository.findOne).mockResolvedValue({ ...mockEntity });

      const result = await service.update(repositoryId, {
        projectId: '33333333-3333-4333-8333-333333333333',
      });

      expect(result?.projectId).toBe('33333333-3333-4333-8333-333333333333');
      expect(result?.name).toBe('OpenThrottle');
    });
  });

  describe('delete', () => {
    it('returns true when a row is removed', async () => {
      vi.mocked(mockOrmRepository.delete).mockResolvedValue({ affected: 1 });

      await expect(service.delete(repositoryId)).resolves.toBe(true);
    });

    it('returns false when no row is removed', async () => {
      vi.mocked(mockOrmRepository.delete).mockResolvedValue({ affected: 0 });

      await expect(service.delete(repositoryId)).resolves.toBe(false);
    });
  });
});
