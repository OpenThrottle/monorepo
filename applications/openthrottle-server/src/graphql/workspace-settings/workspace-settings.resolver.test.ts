import type {
  Project,
  WorkspaceLocalRepository,
} from '@openthrottle/nestjs-repositories';
import {
  ProjectsService,
  RolesService,
  WorkspaceLocalRepositoriesService,
} from '@openthrottle/nestjs-repositories';
import { createMock } from '@golevelup/ts-vitest';
import { Test } from '@nestjs/testing';
import { mkdtempSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { beforeAll, describe, expect, test, vi } from 'vitest';
import { GqlPermissionsGuard } from '../../guards/gql-permissions.guard';
import { WorkspaceSettingsResolver } from './workspace-settings.resolver';

describe('WorkspaceSettingsResolver', () => {
  const userId = '11111111-1111-4111-8111-111111111111';

  const mockRepo: WorkspaceLocalRepository = {
    createdAt: new Date('2026-05-18T12:00:00.000Z'),
    displayName: 'OpenThrottle',
    filesystemPath: '/Users/dev/openthrottle',
    gitDefaultBranch: 'main',
    gitRemoteUrl: 'https://github.com/org/repo.git',
    id: '22222222-2222-4222-8222-222222222222',
    projectId: null,
    updatedAt: new Date('2026-05-18T12:00:00.000Z'),
    userId,
  } as WorkspaceLocalRepository;

  const projectId = '33333333-3333-4333-8333-333333333333';

  const mockWorkspaceLocalRepositoriesService =
    createMock<WorkspaceLocalRepositoriesService>({
      create: vi.fn(),
      delete: vi.fn(),
      findByIdForUser: vi.fn(),
      listByUserId: vi.fn(),
      setProject: vi.fn(),
      update: vi.fn(),
    });

  const mockProjectsService = createMock<ProjectsService>({
    findById: vi.fn(),
  });

  let resolver: WorkspaceSettingsResolver;

  beforeAll(async () => {
    const app = await Test.createTestingModule({
      providers: [
        WorkspaceSettingsResolver,
        GqlPermissionsGuard,
        {
          provide: WorkspaceLocalRepositoriesService,
          useValue: mockWorkspaceLocalRepositoriesService,
        },
        {
          provide: ProjectsService,
          useValue: mockProjectsService,
        },
        {
          provide: RolesService,
          useValue: createMock<RolesService>({
            getPermissionsForUser: vi.fn().mockResolvedValue([]),
          }),
        },
      ],
    }).compile();

    resolver = app.get(WorkspaceSettingsResolver);
  });

  describe('workspaceLocalRepositories', () => {
    test('returns repositories for the current user', async () => {
      vi.mocked(
        mockWorkspaceLocalRepositoriesService.listByUserId,
      ).mockResolvedValue([mockRepo]);

      const result = await resolver.workspaceLocalRepositories(userId);

      expect(result).toEqual([mockRepo]);
      expect(
        mockWorkspaceLocalRepositoriesService.listByUserId,
      ).toHaveBeenCalledWith(userId);
    });
  });

  describe('workspaceLocalRepository', () => {
    test('returns a repository when owned by the user', async () => {
      vi.mocked(
        mockWorkspaceLocalRepositoriesService.findByIdForUser,
      ).mockResolvedValue(mockRepo);

      const result = await resolver.workspaceLocalRepository(
        userId,
        mockRepo.id,
      );

      expect(result).toBe(mockRepo);
    });
  });

  describe('createWorkspaceLocalRepository', () => {
    test('validates path and delegates to the service', async () => {
      const tempDir = mkdtempSync(join(tmpdir(), 'ot-ws-resolver-'));
      vi.mocked(mockWorkspaceLocalRepositoriesService.create).mockResolvedValue(
        mockRepo,
      );

      const result = await resolver.createWorkspaceLocalRepository(userId, {
        displayName: '  My Repo ',
        filesystemPath: tempDir,
        gitDefaultBranch: ' main ',
        gitRemoteUrl: 'https://github.com/org/repo.git',
        projectId: null,
      });

      expect(result).toBe(mockRepo);
      expect(mockWorkspaceLocalRepositoriesService.create).toHaveBeenCalledWith(
        userId,
        expect.objectContaining({
          displayName: 'My Repo',
          filesystemPath: join(tempDir),
          gitDefaultBranch: 'main',
          gitRemoteUrl: 'https://github.com/org/repo.git',
        }),
      );
    });
  });

  describe('updateWorkspaceLocalRepository', () => {
    test('delegates validated fields to the service', async () => {
      vi.mocked(mockWorkspaceLocalRepositoriesService.update).mockResolvedValue(
        mockRepo,
      );

      const result = await resolver.updateWorkspaceLocalRepository(userId, {
        displayName: 'Renamed',
        gitDefaultBranch: null,
        gitRemoteUrl: null,
        id: mockRepo.id,
        projectId: null,
      });

      expect(result).toBe(mockRepo);
      expect(mockWorkspaceLocalRepositoriesService.update).toHaveBeenCalledWith(
        userId,
        mockRepo.id,
        expect.objectContaining({ displayName: 'Renamed' }),
      );
    });
  });

  describe('setWorkspaceLocalRepositoryProject', () => {
    test('delegates project link changes to the service', async () => {
      const linked = { ...mockRepo, projectId };
      vi.mocked(
        mockWorkspaceLocalRepositoriesService.setProject,
      ).mockResolvedValue(linked);

      const result = await resolver.setWorkspaceLocalRepositoryProject(userId, {
        id: mockRepo.id,
        projectId,
      });

      expect(result).toBe(linked);
      expect(
        mockWorkspaceLocalRepositoriesService.setProject,
      ).toHaveBeenCalledWith(userId, mockRepo.id, projectId);
    });

    test('passes null to clear the project link', async () => {
      vi.mocked(
        mockWorkspaceLocalRepositoriesService.setProject,
      ).mockResolvedValue(mockRepo);

      await resolver.setWorkspaceLocalRepositoryProject(userId, {
        id: mockRepo.id,
        projectId: null,
      });

      expect(
        mockWorkspaceLocalRepositoriesService.setProject,
      ).toHaveBeenCalledWith(userId, mockRepo.id, null);
    });
  });

  describe('deleteWorkspaceLocalRepository', () => {
    test('delegates delete to the service', async () => {
      vi.mocked(mockWorkspaceLocalRepositoriesService.delete).mockResolvedValue(
        true,
      );

      const result = await resolver.deleteWorkspaceLocalRepository(
        userId,
        mockRepo.id,
      );

      expect(result).toBe(true);
    });
  });

  describe('project', () => {
    test('returns null when projectId is unset', async () => {
      const result = await resolver.project({
        ...mockRepo,
        projectId: null,
      });

      expect(result).toBeNull();
    });

    test('loads project when projectId is set', async () => {
      const project = { id: 'p1', name: 'openthrottle' } as Project;
      vi.mocked(mockProjectsService.findById).mockResolvedValue(project);

      const result = await resolver.project({
        ...mockRepo,
        projectId: project.id,
      });

      expect(result).toBe(project);
    });
  });
});
