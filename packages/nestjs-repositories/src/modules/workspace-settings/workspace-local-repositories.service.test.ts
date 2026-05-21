import { createMock } from '@golevelup/ts-vitest';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Test } from '@nestjs/testing';
import { LoggerService } from '@openthrottle/nestjs-modules';
import { QueryFailedError } from 'typeorm';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { ProjectsService } from '../projects/projects.service';
import { WorkspaceLocalRepository } from './workspace-local-repository.entity';
import { WorkspaceLocalRepositoriesService } from './workspace-local-repositories.service';

describe('WorkspaceLocalRepositoriesService', () => {
  const userId = '11111111-1111-4111-8111-111111111111';
  const repoId = '22222222-2222-4222-8222-222222222222';

  const mockEntity: WorkspaceLocalRepository = {
    createdAt: new Date('2026-05-18T12:00:00.000Z'),
    displayName: 'OpenThrottle',
    filesystemPath: '/Users/dev/openthrottle',
    gitDefaultBranch: 'main',
    gitRemoteUrl: 'https://github.com/org/repo.git',
    id: repoId,
    projectId: null,
    updatedAt: new Date('2026-05-18T12:00:00.000Z'),
    userId,
  } as WorkspaceLocalRepository;

  const mockRepository = {
    create: vi.fn((data: Partial<WorkspaceLocalRepository>) => ({
      ...mockEntity,
      ...data,
    })),
    delete: vi.fn(),
    find: vi.fn(),
    findOne: vi.fn(),
    save: vi.fn((entity: WorkspaceLocalRepository) => Promise.resolve(entity)),
  };

  const projectId = '33333333-3333-4333-8333-333333333333';

  const mockProjectsService = createMock<ProjectsService>({
    findById: vi.fn(),
  });

  let service: WorkspaceLocalRepositoriesService;

  beforeAll(async () => {
    const app = await Test.createTestingModule({
      providers: [
        WorkspaceLocalRepositoriesService,
        {
          provide: LoggerService,
          useValue: createMock<LoggerService>(),
        },
        {
          provide: getRepositoryToken(WorkspaceLocalRepository),
          useValue: mockRepository,
        },
        {
          provide: ProjectsService,
          useValue: mockProjectsService,
        },
      ],
    }).compile();

    service = app.get(WorkspaceLocalRepositoriesService);
  });

  describe('listByUserId', () => {
    it('returns repositories ordered by the repository query', async () => {
      vi.mocked(mockRepository.find).mockResolvedValue([mockEntity]);

      const result = await service.listByUserId(userId);

      expect(result).toEqual([mockEntity]);
      expect(mockRepository.find).toHaveBeenCalledWith({
        order: { createdAt: 'DESC' },
        where: { userId },
      });
    });
  });

  describe('findByIdForUser', () => {
    it('scopes lookup to user id', async () => {
      vi.mocked(mockRepository.findOne).mockResolvedValue(mockEntity);

      const result = await service.findByIdForUser(repoId, userId);

      expect(result).toBe(mockEntity);
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id: repoId, userId },
      });
    });
  });

  describe('create', () => {
    it('persists a new repository for the user', async () => {
      vi.mocked(mockRepository.save).mockResolvedValue(mockEntity);

      const result = await service.create(userId, {
        displayName: 'OpenThrottle',
        filesystemPath: '/Users/dev/openthrottle',
        gitDefaultBranch: 'main',
        gitRemoteUrl: 'https://github.com/org/repo.git',
        projectId: null,
      });

      expect(result).toBe(mockEntity);
      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ userId }),
      );
    });

    it('throws ConflictException on duplicate filesystem path', async () => {
      const uniqueError = new QueryFailedError(
        'INSERT',
        [],
        Object.assign(new Error('duplicate'), { code: '23505' }),
      );
      vi.mocked(mockRepository.save).mockRejectedValue(uniqueError);

      await expect(
        service.create(userId, {
          displayName: 'OpenThrottle',
          filesystemPath: '/Users/dev/openthrottle',
          gitDefaultBranch: null,
          gitRemoteUrl: null,
          projectId: null,
        }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('throws NotFoundException when projectId does not exist', async () => {
      vi.mocked(mockProjectsService.findById).mockResolvedValue(null);

      await expect(
        service.create(userId, {
          displayName: 'OpenThrottle',
          filesystemPath: '/Users/dev/openthrottle',
          gitDefaultBranch: null,
          gitRemoteUrl: null,
          projectId: '33333333-3333-4333-8333-333333333333',
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('update', () => {
    it('throws NotFoundException when repository is not owned by user', async () => {
      vi.mocked(mockRepository.findOne).mockResolvedValue(null);

      await expect(
        service.update(userId, repoId, { displayName: 'Renamed' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('updates fields on an owned repository', async () => {
      vi.mocked(mockRepository.findOne).mockResolvedValue({ ...mockEntity });
      vi.mocked(mockRepository.save).mockImplementation(
        async (entity) => entity,
      );

      const result = await service.update(userId, repoId, {
        displayName: 'Renamed',
      });

      expect(result.displayName).toBe('Renamed');
    });

    it('assigns a project when projectId exists', async () => {
      vi.mocked(mockProjectsService.findById).mockResolvedValue({
        id: projectId,
      } as never);
      vi.mocked(mockRepository.findOne).mockResolvedValue({ ...mockEntity });
      vi.mocked(mockRepository.save).mockImplementation(
        async (entity) => entity,
      );

      const result = await service.update(userId, repoId, { projectId });

      expect(result.projectId).toBe(projectId);
      expect(mockProjectsService.findById).toHaveBeenCalledWith(projectId);
    });

    it('throws NotFoundException when updating to a missing project', async () => {
      vi.mocked(mockProjectsService.findById).mockResolvedValue(null);
      vi.mocked(mockRepository.findOne).mockResolvedValue({ ...mockEntity });

      await expect(
        service.update(userId, repoId, { projectId }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('setProject', () => {
    it('clears the project link when projectId is null', async () => {
      vi.mocked(mockProjectsService.findById).mockClear();
      vi.mocked(mockRepository.findOne).mockResolvedValue({
        ...mockEntity,
        projectId,
      });
      vi.mocked(mockRepository.save).mockImplementation(
        async (entity) => entity,
      );

      const result = await service.setProject(userId, repoId, null);

      expect(result.projectId).toBeNull();
      expect(mockProjectsService.findById).not.toHaveBeenCalled();
    });

    it('assigns a project when projectId exists', async () => {
      vi.mocked(mockProjectsService.findById).mockResolvedValue({
        id: projectId,
      } as never);
      vi.mocked(mockRepository.findOne).mockResolvedValue({ ...mockEntity });
      vi.mocked(mockRepository.save).mockImplementation(
        async (entity) => entity,
      );

      const result = await service.setProject(userId, repoId, projectId);

      expect(result.projectId).toBe(projectId);
    });
  });

  describe('delete', () => {
    it('returns true when a row is removed', async () => {
      vi.mocked(mockRepository.delete).mockResolvedValue({ affected: 1 });

      await expect(service.delete(userId, repoId)).resolves.toBe(true);
    });

    it('returns false when no row is removed', async () => {
      vi.mocked(mockRepository.delete).mockResolvedValue({ affected: 0 });

      await expect(service.delete(userId, repoId)).resolves.toBe(false);
    });
  });
});
