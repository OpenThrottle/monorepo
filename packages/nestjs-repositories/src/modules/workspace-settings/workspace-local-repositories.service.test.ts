import { createMock } from '@golevelup/ts-vitest';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { LoggerService } from '@openthrottle/nestjs-modules';
import { asMock } from '@openthrottle/nestjs-testing';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Project } from '../projects/project.entity';
import { ProjectsService } from '../projects/projects.service';
import { RepositoriesService } from '../repositories/repositories.service';
import type { Repository } from '../repositories/repository.entity';
import type { RepositoryCheckout } from '../repositories/repository-checkout.entity';
import { RepositoryCheckoutsService } from '../repositories/repository-checkouts.service';
import { WorkspaceLocalRepositoriesService } from './workspace-local-repositories.service';

describe('WorkspaceLocalRepositoriesService', () => {
  const userId = '11111111-1111-4111-8111-111111111111';
  const checkoutId = '44444444-4444-4444-8444-444444444444';
  const repositoryId = '22222222-2222-4222-8222-222222222222';
  const projectId = '33333333-3333-4333-8333-333333333333';

  const mockRepositoryEntity = asMock<Repository>({
    defaultBranch: 'main',
    id: repositoryId,
    name: 'OpenThrottle',
    normalizedRemoteUrl: 'https://github.com/openthrottle/monorepo',
    projectId: null,
  });

  const mockCheckoutEntity = asMock<RepositoryCheckout>({
    createdAt: new Date('2026-05-18T12:00:00.000Z'),
    displayName: 'OpenThrottle',
    filesystemPath: '/Users/dev/openthrottle',
    id: checkoutId,
    kind: 'primary',
    managed: false,
    repository: mockRepositoryEntity,
    repositoryId,
    updatedAt: new Date('2026-05-18T12:00:00.000Z'),
    userId,
  });

  const mockCheckoutsService = createMock<RepositoryCheckoutsService>({
    countByRepositoryId: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
    findByIdForUser: vi.fn(),
    listByUserId: vi.fn(),
    repointRepository: vi.fn(),
    updateDisplayName: vi.fn(),
  });

  const mockRepositoriesService = createMock<RepositoriesService>({
    create: vi.fn(),
    delete: vi.fn(),
    findById: vi.fn(),
    findByNormalizedRemoteUrl: vi.fn(),
    findOrCreateByRemoteUrl: vi.fn(),
    update: vi.fn(),
  });

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
          provide: RepositoryCheckoutsService,
          useValue: mockCheckoutsService,
        },
        {
          provide: RepositoriesService,
          useValue: mockRepositoriesService,
        },
        {
          provide: ProjectsService,
          useValue: mockProjectsService,
        },
      ],
    }).compile();

    service = app.get(WorkspaceLocalRepositoriesService);
  });

  beforeEach(() => {
    vi.mocked(mockCheckoutsService.findByIdForUser).mockReset();
    vi.mocked(mockRepositoriesService.findById).mockReset();
    vi.mocked(mockRepositoriesService.update).mockReset();
    vi.mocked(mockProjectsService.findById).mockReset();
  });

  describe('listByUserId', () => {
    it('maps checkout + repository pairs to the legacy view', async () => {
      vi.mocked(mockCheckoutsService.listByUserId).mockResolvedValue([
        mockCheckoutEntity,
      ]);

      const result = await service.listByUserId(userId);

      expect(result).toEqual([
        {
          createdAt: mockCheckoutEntity.createdAt,
          displayName: 'OpenThrottle',
          filesystemPath: '/Users/dev/openthrottle',
          gitDefaultBranch: 'main',
          gitRemoteUrl: 'https://github.com/openthrottle/monorepo',
          id: checkoutId,
          projectId: null,
          updatedAt: mockCheckoutEntity.updatedAt,
          userId,
        },
      ]);
    });
  });

  describe('findByIdForUser', () => {
    it('returns null when the checkout is not owned by the user', async () => {
      vi.mocked(mockCheckoutsService.findByIdForUser).mockResolvedValue(null);

      await expect(
        service.findByIdForUser(checkoutId, userId),
      ).resolves.toBeNull();
    });

    it('maps an owned checkout to the legacy view', async () => {
      vi.mocked(mockCheckoutsService.findByIdForUser).mockResolvedValue(
        mockCheckoutEntity,
      );

      const result = await service.findByIdForUser(checkoutId, userId);

      expect(result?.id).toBe(checkoutId);
      expect(result?.gitRemoteUrl).toBe(
        'https://github.com/openthrottle/monorepo',
      );
    });
  });

  describe('create', () => {
    it('resolves the repository from the remote and creates the checkout', async () => {
      vi.mocked(
        mockRepositoriesService.findOrCreateByRemoteUrl,
      ).mockResolvedValue({ ...mockRepositoryEntity });
      vi.mocked(mockCheckoutsService.create).mockResolvedValue(
        mockCheckoutEntity,
      );

      const result = await service.create(userId, {
        displayName: 'OpenThrottle',
        filesystemPath: '/Users/dev/openthrottle',
        gitDefaultBranch: 'main',
        gitRemoteUrl: 'git@github.com:openthrottle/monorepo.git',
        projectId: null,
      });

      expect(result.id).toBe(checkoutId);
      expect(
        mockRepositoriesService.findOrCreateByRemoteUrl,
      ).toHaveBeenCalledWith('git@github.com:openthrottle/monorepo.git', {
        defaultBranch: 'main',
        name: 'OpenThrottle',
        projectId: null,
      });
      expect(mockCheckoutsService.create).toHaveBeenCalledWith(userId, {
        displayName: 'OpenThrottle',
        filesystemPath: '/Users/dev/openthrottle',
        repositoryId,
      });
    });

    it('lets an existing repository project link win over the input', async () => {
      vi.mocked(mockProjectsService.findById).mockResolvedValue(
        asMock<Project>({ id: projectId }),
      );
      vi.mocked(
        mockRepositoriesService.findOrCreateByRemoteUrl,
      ).mockResolvedValue({
        ...mockRepositoryEntity,
        projectId: 'existing-project',
      });
      vi.mocked(mockCheckoutsService.create).mockResolvedValue(
        mockCheckoutEntity,
      );

      await service.create(userId, {
        displayName: 'OpenThrottle',
        filesystemPath: '/Users/dev/openthrottle',
        gitDefaultBranch: null,
        gitRemoteUrl: 'https://github.com/openthrottle/monorepo',
        projectId,
      });

      expect(mockRepositoriesService.update).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when projectId does not exist', async () => {
      vi.mocked(mockProjectsService.findById).mockResolvedValue(null);

      await expect(
        service.create(userId, {
          displayName: 'OpenThrottle',
          filesystemPath: '/Users/dev/openthrottle',
          gitDefaultBranch: null,
          gitRemoteUrl: null,
          projectId,
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('cleans up an orphan provisional repository when the checkout conflicts', async () => {
      const provisional = {
        ...mockRepositoryEntity,
        id: 'prov-repo',
        normalizedRemoteUrl: null,
      };
      vi.mocked(
        mockRepositoriesService.findOrCreateByRemoteUrl,
      ).mockResolvedValue(provisional);
      vi.mocked(mockCheckoutsService.create).mockRejectedValue(
        new ConflictException('duplicate'),
      );
      vi.mocked(mockRepositoriesService.findById).mockResolvedValue(
        provisional,
      );
      vi.mocked(mockCheckoutsService.countByRepositoryId).mockResolvedValue(0);

      await expect(
        service.create(userId, {
          displayName: 'Local',
          filesystemPath: '/Users/dev/local',
          gitDefaultBranch: null,
          gitRemoteUrl: null,
          projectId: null,
        }),
      ).rejects.toBeInstanceOf(ConflictException);

      expect(mockRepositoriesService.delete).toHaveBeenCalledWith('prov-repo');
    });
  });

  describe('update', () => {
    it('throws NotFoundException when the checkout is not owned by the user', async () => {
      vi.mocked(mockCheckoutsService.findByIdForUser).mockResolvedValue(null);

      await expect(
        service.update(userId, checkoutId, { displayName: 'Renamed' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('updates the display name on the checkout', async () => {
      vi.mocked(mockCheckoutsService.findByIdForUser).mockResolvedValue(
        mockCheckoutEntity,
      );
      vi.mocked(mockCheckoutsService.updateDisplayName).mockResolvedValue({
        ...mockCheckoutEntity,
        displayName: 'Renamed',
      });

      const result = await service.update(userId, checkoutId, {
        displayName: 'Renamed',
      });

      expect(result.displayName).toBe('Renamed');
    });

    it('assigns a validated project on the repository', async () => {
      vi.mocked(mockProjectsService.findById).mockResolvedValue(
        asMock<Project>({ id: projectId }),
      );
      vi.mocked(mockCheckoutsService.findByIdForUser).mockResolvedValue(
        mockCheckoutEntity,
      );
      vi.mocked(mockRepositoriesService.update).mockResolvedValue({
        ...mockRepositoryEntity,
        projectId,
      });

      const result = await service.update(userId, checkoutId, { projectId });

      expect(result.projectId).toBe(projectId);
      expect(mockRepositoriesService.update).toHaveBeenCalledWith(
        repositoryId,
        { projectId },
      );
    });

    it('throws NotFoundException when updating to a missing project', async () => {
      vi.mocked(mockProjectsService.findById).mockResolvedValue(null);
      vi.mocked(mockCheckoutsService.findByIdForUser).mockResolvedValue(
        mockCheckoutEntity,
      );

      await expect(
        service.update(userId, checkoutId, { projectId }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('setProject', () => {
    it('clears the project link without a project lookup', async () => {
      vi.mocked(mockCheckoutsService.findByIdForUser).mockResolvedValue(
        mockCheckoutEntity,
      );
      vi.mocked(mockRepositoriesService.update).mockResolvedValue({
        ...mockRepositoryEntity,
        projectId: null,
      });

      const result = await service.setProject(userId, checkoutId, null);

      expect(result.projectId).toBeNull();
      expect(mockProjectsService.findById).not.toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('returns false when the checkout is not owned by the user', async () => {
      vi.mocked(mockCheckoutsService.findByIdForUser).mockResolvedValue(null);

      await expect(service.delete(userId, checkoutId)).resolves.toBe(false);
    });

    it('deletes the checkout and removes an orphaned provisional repository', async () => {
      const provisional = {
        ...mockRepositoryEntity,
        normalizedRemoteUrl: null,
      };
      vi.mocked(mockCheckoutsService.findByIdForUser).mockResolvedValue({
        ...mockCheckoutEntity,
        repository: provisional,
      });
      vi.mocked(mockCheckoutsService.delete).mockResolvedValue(true);
      vi.mocked(mockRepositoriesService.findById).mockResolvedValue(
        provisional,
      );
      vi.mocked(mockCheckoutsService.countByRepositoryId).mockResolvedValue(0);

      await expect(service.delete(userId, checkoutId)).resolves.toBe(true);
      expect(mockRepositoriesService.delete).toHaveBeenCalledWith(repositoryId);
    });

    it('keeps a canonical repository when its checkout is deleted', async () => {
      vi.mocked(mockRepositoriesService.delete).mockClear();
      vi.mocked(mockCheckoutsService.findByIdForUser).mockResolvedValue(
        mockCheckoutEntity,
      );
      vi.mocked(mockCheckoutsService.delete).mockResolvedValue(true);
      vi.mocked(mockRepositoriesService.findById).mockResolvedValue(
        mockRepositoryEntity,
      );

      await expect(service.delete(userId, checkoutId)).resolves.toBe(true);
      expect(mockRepositoriesService.delete).not.toHaveBeenCalled();
    });
  });
});
