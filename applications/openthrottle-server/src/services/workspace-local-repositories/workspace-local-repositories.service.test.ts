import { createMock } from '@golevelup/ts-vitest';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { LoggerService } from '@openthrottle/nestjs-modules';
import type { Project } from '@openthrottle/nestjs-repositories-server';
import type {
  Repository,
  RepositoryCheckout,
} from '@openthrottle/nestjs-repositories-server';
import { ProjectsRepository } from '@openthrottle/nestjs-repositories-server';
import {
  RepositoriesRepository,
  RepositoryCheckoutsRepository,
} from '@openthrottle/nestjs-repositories-server';
import {
  createProjectsRepositoryMock,
  createRepositoriesRepositoryMock,
  createRepositoryCheckoutsRepositoryMock,
} from '@openthrottle/nestjs-repositories-server/testing';
import { asMock } from '@openthrottle/nestjs-testing';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { WorkspaceLocalRepositoriesService } from './workspace-local-repositories.service.ts';

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

  const mockCheckoutsService = createRepositoryCheckoutsRepositoryMock();

  const mockRepositoriesRepository = createRepositoriesRepositoryMock();

  const mockProjectsRepository = createProjectsRepositoryMock();

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
          provide: RepositoryCheckoutsRepository,
          useValue: mockCheckoutsService,
        },
        {
          provide: RepositoriesRepository,
          useValue: mockRepositoriesRepository,
        },
        {
          provide: ProjectsRepository,
          useValue: mockProjectsRepository,
        },
      ],
    }).compile();

    service = app.get(WorkspaceLocalRepositoriesService);
  });

  beforeEach(() => {
    vi.mocked(mockCheckoutsService.findByIdForUser).mockReset();
    vi.mocked(mockRepositoriesRepository.findRepositoryById).mockReset();
    vi.mocked(mockRepositoriesRepository.updateRepository).mockReset();
    vi.mocked(mockProjectsRepository.findOne).mockReset();
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
          gitCurrentBranch: null,
          gitDefaultBranch: 'main',
          gitRemoteUrl: 'https://github.com/openthrottle/monorepo',
          id: checkoutId,
          kind: 'primary',
          projectId: null,
          updatedAt: mockCheckoutEntity.updatedAt,
          userId,
        },
      ]);
    });
  });

  describe('listByUserId with an inspected worktree', () => {
    it('carries the kind and the inspected current branch', async () => {
      vi.mocked(mockCheckoutsService.listByUserId).mockResolvedValue([
        asMock<RepositoryCheckout>({
          ...mockCheckoutEntity,
          inspection: { git: { currentBranch: 'openthrottle/plan-1234' } },
          kind: 'worktree',
        }),
      ]);

      const [view] = await service.listByUserId(userId);

      expect(view?.kind).toBe('worktree');
      expect(view?.gitCurrentBranch).toBe('openthrottle/plan-1234');
    });

    it('reads a malformed inspection snapshot as not scanned', async () => {
      vi.mocked(mockCheckoutsService.listByUserId).mockResolvedValue([
        asMock<RepositoryCheckout>({
          ...mockCheckoutEntity,
          inspection: { git: { currentBranch: 42 } },
        }),
      ]);

      const [view] = await service.listByUserId(userId);

      expect(view?.gitCurrentBranch).toBeNull();
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
        mockRepositoriesRepository.findOrCreateByRemoteUrl,
      ).mockResolvedValue({ ...mockRepositoryEntity });
      vi.mocked(mockCheckoutsService.createForUser).mockResolvedValue(
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
        mockRepositoriesRepository.findOrCreateByRemoteUrl,
      ).toHaveBeenCalledWith('git@github.com:openthrottle/monorepo.git', {
        defaultBranch: 'main',
        name: 'OpenThrottle',
        projectId: null,
      });
      expect(mockCheckoutsService.createForUser).toHaveBeenCalledWith(userId, {
        displayName: 'OpenThrottle',
        filesystemPath: '/Users/dev/openthrottle',
        repositoryId,
      });
    });

    it('lets an existing repository project link win over the input', async () => {
      vi.mocked(mockProjectsRepository.findOne).mockResolvedValue(
        asMock<Project>({ id: projectId }),
      );
      vi.mocked(
        mockRepositoriesRepository.findOrCreateByRemoteUrl,
      ).mockResolvedValue({
        ...mockRepositoryEntity,
        projectId: 'existing-project',
      });
      vi.mocked(mockCheckoutsService.createForUser).mockResolvedValue(
        mockCheckoutEntity,
      );

      await service.create(userId, {
        displayName: 'OpenThrottle',
        filesystemPath: '/Users/dev/openthrottle',
        gitDefaultBranch: null,
        gitRemoteUrl: 'https://github.com/openthrottle/monorepo',
        projectId,
      });

      expect(
        mockRepositoriesRepository.updateRepository,
      ).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when projectId does not exist', async () => {
      vi.mocked(mockProjectsRepository.findOne).mockResolvedValue(null);

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
        mockRepositoriesRepository.findOrCreateByRemoteUrl,
      ).mockResolvedValue(provisional);
      vi.mocked(mockCheckoutsService.createForUser).mockRejectedValue(
        new ConflictException('duplicate'),
      );
      vi.mocked(
        mockRepositoriesRepository.findRepositoryById,
      ).mockResolvedValue(provisional);
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

      expect(mockRepositoriesRepository.removeRepository).toHaveBeenCalledWith(
        'prov-repo',
      );
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
      vi.mocked(mockProjectsRepository.findOne).mockResolvedValue(
        asMock<Project>({ id: projectId }),
      );
      vi.mocked(mockCheckoutsService.findByIdForUser).mockResolvedValue(
        mockCheckoutEntity,
      );
      vi.mocked(mockRepositoriesRepository.updateRepository).mockResolvedValue({
        ...mockRepositoryEntity,
        projectId,
      });

      const result = await service.update(userId, checkoutId, { projectId });

      expect(result.projectId).toBe(projectId);
      expect(mockRepositoriesRepository.updateRepository).toHaveBeenCalledWith(
        repositoryId,
        { projectId },
      );
    });

    it('throws NotFoundException when updating to a missing project', async () => {
      vi.mocked(mockProjectsRepository.findOne).mockResolvedValue(null);
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
      vi.mocked(mockRepositoriesRepository.updateRepository).mockResolvedValue({
        ...mockRepositoryEntity,
        projectId: null,
      });

      const result = await service.setProject(userId, checkoutId, null);

      expect(result.projectId).toBeNull();
      expect(mockProjectsRepository.findOne).not.toHaveBeenCalled();
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
      vi.mocked(mockCheckoutsService.removeForUser).mockResolvedValue(true);
      vi.mocked(
        mockRepositoriesRepository.findRepositoryById,
      ).mockResolvedValue(provisional);
      vi.mocked(mockCheckoutsService.countByRepositoryId).mockResolvedValue(0);

      await expect(service.delete(userId, checkoutId)).resolves.toBe(true);
      expect(mockRepositoriesRepository.removeRepository).toHaveBeenCalledWith(
        repositoryId,
      );
    });

    it('keeps a canonical repository when its checkout is deleted', async () => {
      vi.mocked(mockRepositoriesRepository.removeRepository).mockClear();
      vi.mocked(mockCheckoutsService.findByIdForUser).mockResolvedValue(
        mockCheckoutEntity,
      );
      vi.mocked(mockCheckoutsService.removeForUser).mockResolvedValue(true);
      vi.mocked(
        mockRepositoriesRepository.findRepositoryById,
      ).mockResolvedValue(mockRepositoryEntity);

      await expect(service.delete(userId, checkoutId)).resolves.toBe(true);
      expect(
        mockRepositoriesRepository.removeRepository,
      ).not.toHaveBeenCalled();
    });
  });
});
