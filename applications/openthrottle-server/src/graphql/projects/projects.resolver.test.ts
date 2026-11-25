import { createMock } from '@golevelup/ts-vitest';
import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { AuthPrincipal } from '@openthrottle/nestjs-auth';
import { AUTH_PRINCIPAL_KIND_USER } from '@openthrottle/nestjs-auth';
import type {
  Plan,
  PlansRepository,
  Project,
  Task,
  TasksRepository,
} from '@openthrottle/nestjs-repositories-server';
import {
  ProjectRepositoriesRepository,
  ProjectsRepository,
  RepositoriesRepository,
  UserFavoriteProjectsRepository,
} from '@openthrottle/nestjs-repositories-server';
import type {
  ProjectRepositoriesRepositoryMock,
  ProjectsRepositoryMock,
  RepositoriesRepositoryMock,
} from '@openthrottle/nestjs-repositories-server/testing';
import {
  createPlansRepositoryMock,
  createProjectRepositoriesRepositoryMock,
  createProjectsRepositoryMock,
  createRepositoriesRepositoryMock,
  createTasksRepositoryMock,
  createUserFavoriteProjectsRepositoryMock,
  projectRepositoriesFactory,
  repositoriesFactory,
} from '@openthrottle/nestjs-repositories-server/testing';
import { asMock } from '@openthrottle/nestjs-testing';
import { getDefaultPlanRunConfigStorage } from '@openthrottle/openthrottle-plan-config';
import { beforeAll, describe, expect, test, vi } from 'vitest';

import { GqlPermissionsGuard } from '../../guards/gql-permissions.guard.ts';
import { PlanProjectMembershipService } from '../../services/plan-project-membership/plan-project-membership.service.ts';
import { ProjectsLoaders } from './loaders/loaders.service.ts';
import { ProjectsResolver } from './projects.resolver.ts';

const buildMockPlan = (projectId: string): Plan => {
  return {
    assignee: null,
    author: 'visormatt',
    category: 'infra',
    completedAt: null,
    createdAt: new Date('2026-02-03T10:00:00.000Z'),
    deletedAt: null,
    description: null,
    id: 'plan-1',
    jobRunHooks: { hooks: [] },
    planEmbeddings: [],
    planOutputChunks: [],
    project: null,
    projectId,
    projectRelation: null,
    projectSortOrder: 1000,
    repositoryId: null,
    runConfig: getDefaultPlanRunConfigStorage(),
    status: 'completed',
    summary: null,
    tasks: [],
    title: 'Plan One',
    updatedAt: new Date('2026-02-03T10:00:00.000Z'),
  };
};

describe('ProjectsResolver', () => {
  let resolver: ProjectsResolver;
  let projectsRepository: ProjectsRepositoryMock;
  let projectRepositoriesRepository: ProjectRepositoriesRepositoryMock;
  let repositoriesRepository: RepositoriesRepositoryMock;
  let plansByProjectIdLoader: { load: ReturnType<typeof vi.fn> };
  let tasksByProjectIdLoader: { load: ReturnType<typeof vi.fn> };

  const mockProject: Project = {
    createdAt: new Date('2026-02-02T10:00:00.000Z'),
    deletedAt: null,
    description: 'OpenThrottle API application',
    id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    name: 'openthrottle-server',
    nxProjectName: 'applications/openthrottle-server',
    plans: [],
    tasks: [],
    updatedAt: new Date('2026-02-02T10:00:00.000Z'),
  };

  const membership = {
    addPlan: vi.fn(),
    listPlans: vi.fn(),
    movePlan: vi.fn(),
    pagePlans: vi.fn(),
    removePlan: vi.fn(),
    reorderPlans: vi.fn(),
  };

  const plansLoad = vi.fn().mockResolvedValue([]);
  const tasksLoad = vi.fn().mockResolvedValue([]);
  const repositoriesLoad = vi.fn().mockResolvedValue([]);
  const mockProjectsLoaders: ProjectsLoaders = createMock<ProjectsLoaders>({
    plansByProjectIdLoader: { load: plansLoad },
    repositoriesByProjectIdLoader: { load: repositoriesLoad },
    tasksByProjectIdLoader: { load: tasksLoad },
  });

  beforeAll(async () => {
    projectsRepository = createProjectsRepositoryMock();
    projectRepositoriesRepository = createProjectRepositoriesRepositoryMock();
    repositoriesRepository = createRepositoriesRepositoryMock();
    plansByProjectIdLoader = { load: plansLoad };
    tasksByProjectIdLoader = { load: tasksLoad };

    const app = await Test.createTestingModule({
      providers: [
        ProjectsResolver,
        {
          provide: ProjectsLoaders,
          useValue: mockProjectsLoaders,
        },
        { provide: PlanProjectMembershipService, useValue: membership },
        { provide: ProjectsRepository, useValue: projectsRepository },
        {
          provide: ProjectRepositoriesRepository,
          useValue: projectRepositoriesRepository,
        },
        { provide: RepositoriesRepository, useValue: repositoriesRepository },
        {
          provide: UserFavoriteProjectsRepository,
          useValue: createUserFavoriteProjectsRepositoryMock(),
        },
      ],
    })
      .overrideGuard(GqlPermissionsGuard)
      .useValue({ canActivate: () => true })
      .compile();

    resolver = app.get<ProjectsResolver>(ProjectsResolver);
  });

  describe('project', () => {
    test('returns ProjectObject when project exists', async () => {
      projectsRepository.findOne.mockResolvedValue(mockProject);

      const result = await resolver.project(mockProject.id);

      expect(result).not.toBeNull();
      expect(result?.id).toBe(mockProject.id);
      expect(result?.name).toBe(mockProject.name);
      expect(result?.description).toBe(mockProject.description);
      expect(result?.nxProjectName).toBe(mockProject.nxProjectName);
    });

    test('returns null when project does not exist', async () => {
      projectsRepository.findOne.mockResolvedValue(null);

      const result = await resolver.project('non-existent-id');

      expect(result).toBeNull();
    });
  });

  describe('projects', () => {
    test('returns array of ProjectObjects', async () => {
      projectsRepository.findAll.mockResolvedValue([mockProject]);

      const result = await resolver.projects();

      expect(result).toHaveLength(1);
      expect(result[0]?.id).toBe(mockProject.id);
      expect(result[0]?.name).toBe(mockProject.name);
    });

    test('returns empty array when no projects', async () => {
      projectsRepository.findAll.mockResolvedValue([]);

      const result = await resolver.projects();

      expect(result).toEqual([]);
    });
  });

  describe('createProject', () => {
    test('returns ProjectObject after create', async () => {
      projectsRepository.create.mockResolvedValue(mockProject);

      const result = await resolver.createProject({
        description: mockProject.description,
        name: mockProject.name,
        nxProjectName: mockProject.nxProjectName,
      });

      expect(result.id).toBe(mockProject.id);
      expect(result.name).toBe(mockProject.name);
    });
  });

  describe('updateProject', () => {
    test('returns ProjectObject when project exists', async () => {
      projectsRepository.update.mockResolvedValue(mockProject);

      const result = await resolver.updateProject({
        description: null,
        id: mockProject.id,
        name: 'new-name',
        nxProjectName: null,
      });

      expect(result).not.toBeNull();
      expect(result?.id).toBe(mockProject.id);
    });

    test('returns null when project does not exist', async () => {
      projectsRepository.update.mockRejectedValue(new NotFoundException());

      const result = await resolver.updateProject({
        description: null,
        id: 'non-existent-id',
        name: 'new-name',
        nxProjectName: null,
      });

      expect(result).toBeNull();
    });
  });

  describe('deleteProject', () => {
    test('returns true when the repository removes a row', async () => {
      projectsRepository.remove.mockResolvedValue(mockProject);

      const result = await resolver.deleteProject({ id: mockProject.id });

      expect(result).toBe(true);
      expect(projectsRepository.remove).toHaveBeenCalledWith(mockProject.id);
    });

    test('returns false when project id does not exist', async () => {
      projectsRepository.remove.mockRejectedValue(new NotFoundException());

      const result = await resolver.deleteProject({
        id: '00000000-0000-0000-0000-000000000000',
      });

      expect(result).toBe(false);
    });
  });

  describe('plans (ResolveField)', () => {
    test('returns plans from plansByProjectIdLoader.load(projectId)', async () => {
      const mockPlans: Plan[] = [buildMockPlan(mockProject.id)];
      vi.mocked(plansByProjectIdLoader.load).mockResolvedValue(mockPlans);

      const result = await resolver.plans(mockProject);

      expect(result).toEqual(mockPlans);
      expect(plansByProjectIdLoader.load).toHaveBeenCalledWith(mockProject.id);
    });

    test('returns empty array when project has no plans', async () => {
      vi.mocked(plansByProjectIdLoader.load).mockResolvedValue([]);

      const result = await resolver.plans(mockProject);

      expect(result).toEqual([]);
    });
  });

  describe('tasks (ResolveField)', () => {
    test('returns tasks from tasksByProjectIdLoader.load(projectId)', async () => {
      const mockTasks: Task[] = [
        {
          assignee: null,
          category: null,
          completedAt: null,
          createdAt: new Date('2026-02-03T10:00:00.000Z'),
          deletedAt: null,
          description: null,
          hookChildren: [],
          hookRole: null,
          hookScope: null,
          hookSource: null,
          id: 'task-1',
          parentTask: null,
          parentTaskId: null,
          plan: buildMockPlan(mockProject.id),
          planId: 'plan-1',
          project: null,
          projectId: mockProject.id,
          projectRelation: null,
          requirements: [],
          skillSlug: null,
          sortOrder: 1000,
          status: 'pending',
          summary: null,
          taskEmbeddings: [],
          title: 'Task One',
          updatedAt: new Date('2026-02-03T10:00:00.000Z'),
          wave: null,
        },
      ];
      vi.mocked(tasksByProjectIdLoader.load).mockResolvedValue(mockTasks);

      const result = await resolver.tasks(mockProject);

      expect(result).toEqual(mockTasks);
      expect(tasksByProjectIdLoader.load).toHaveBeenCalledWith(mockProject.id);
    });

    test('returns empty array when project has no tasks', async () => {
      vi.mocked(tasksByProjectIdLoader.load).mockResolvedValue([]);

      const result = await resolver.tasks(mockProject);

      expect(result).toEqual([]);
    });
  });

  describe('repositories', () => {
    test('resolves the linked repositories through the batched loader', async () => {
      const linked = [repositoriesFactory.build()];
      repositoriesLoad.mockResolvedValue(linked);

      const result = await resolver.repositories(mockProject);

      expect(result).toBe(linked);
      expect(repositoriesLoad).toHaveBeenCalledWith(mockProject.id);
    });
  });

  describe('linkProjectRepository', () => {
    const repository = repositoriesFactory.build();
    const input = { projectId: mockProject.id, repositoryId: repository.id };

    test('links the pair when both exist', async () => {
      const link = {
        ...projectRepositoriesFactory.build(input),
        project: undefined,
        repository: undefined,
      };
      projectsRepository.findOne.mockResolvedValue(mockProject);
      repositoriesRepository.findRepositoryById.mockResolvedValue(repository);
      projectRepositoriesRepository.link.mockResolvedValue(link);

      const result = await resolver.linkProjectRepository(input);

      expect(result).toBe(link);
      expect(projectRepositoriesRepository.link).toHaveBeenCalledWith(
        mockProject.id,
        repository.id,
      );
    });

    test('rejects with NotFoundException when the project is missing', async () => {
      projectsRepository.findOne.mockResolvedValue(null);
      repositoriesRepository.findRepositoryById.mockResolvedValue(repository);
      projectRepositoriesRepository.link.mockClear();

      await expect(resolver.linkProjectRepository(input)).rejects.toThrow(
        NotFoundException,
      );
      expect(projectRepositoriesRepository.link).not.toHaveBeenCalled();
    });

    test('rejects with NotFoundException when the repository is missing', async () => {
      projectsRepository.findOne.mockResolvedValue(mockProject);
      repositoriesRepository.findRepositoryById.mockResolvedValue(null);
      projectRepositoriesRepository.link.mockClear();

      await expect(resolver.linkProjectRepository(input)).rejects.toThrow(
        /Repository not found/,
      );
      expect(projectRepositoriesRepository.link).not.toHaveBeenCalled();
    });
  });

  describe('unlinkProjectRepository', () => {
    const input = { projectId: mockProject.id, repositoryId: 'repo-1' };

    test('returns true when a link was removed', async () => {
      projectRepositoriesRepository.unlink.mockResolvedValue(true);

      await expect(resolver.unlinkProjectRepository(input)).resolves.toBe(true);
      expect(projectRepositoriesRepository.unlink).toHaveBeenCalledWith(
        mockProject.id,
        'repo-1',
      );
    });

    test('returns false when the pair was not linked', async () => {
      projectRepositoriesRepository.unlink.mockResolvedValue(false);

      await expect(resolver.unlinkProjectRepository(input)).resolves.toBe(
        false,
      );
    });
  });

  describe('plan membership', () => {
    const plan = buildMockPlan(mockProject.id);

    test('projectPlans lists the project plans in project order', async () => {
      membership.listPlans.mockResolvedValue([plan]);

      await expect(resolver.projectPlans(mockProject.id)).resolves.toEqual([
        plan,
      ]);
      expect(membership.listPlans).toHaveBeenCalledWith(mockProject.id);
    });

    test('projectPlansPage reads one page through the membership service', async () => {
      membership.pagePlans.mockResolvedValue({ items: [plan], totalCount: 94 });

      await expect(
        resolver.projectPlansPage({
          limit: 50,
          offset: 50,
          projectId: mockProject.id,
        }),
      ).resolves.toEqual({
        hasNextPage: true,
        items: [plan],
        totalCount: 94,
      });
      expect(membership.pagePlans).toHaveBeenCalledWith(mockProject.id, {
        limit: 50,
        offset: 50,
      });
    });

    test('projectPlansPage rejects a limit out of range', async () => {
      await expect(
        resolver.projectPlansPage({
          limit: 0,
          offset: 0,
          projectId: mockProject.id,
        }),
      ).rejects.toThrow('limit must be between 1 and 100');
      await expect(
        resolver.projectPlansPage({
          limit: 101,
          offset: 0,
          projectId: mockProject.id,
        }),
      ).rejects.toThrow('limit must be between 1 and 100');
      expect(membership.pagePlans).not.toHaveBeenCalled();
    });

    test('projectPlansPage rejects a negative offset', async () => {
      await expect(
        resolver.projectPlansPage({
          limit: 50,
          offset: -1,
          projectId: mockProject.id,
        }),
      ).rejects.toThrow('offset must be 0 or more');
    });

    test('moveProjectPlan moves through the membership service', async () => {
      membership.movePlan.mockResolvedValue([plan]);

      await expect(
        resolver.moveProjectPlan({ direction: 'UP', planId: plan.id }),
      ).resolves.toEqual([plan]);
      expect(membership.movePlan).toHaveBeenCalledWith(plan.id, 'UP');
    });

    test('addPlanToProject adds through the membership service', async () => {
      membership.addPlan.mockResolvedValue(plan);

      await expect(
        resolver.addPlanToProject({
          planId: plan.id,
          projectId: mockProject.id,
        }),
      ).resolves.toBe(plan);
      expect(membership.addPlan).toHaveBeenCalledWith(plan.id, mockProject.id);
    });

    test('removePlanFromProject removes through the membership service', async () => {
      membership.removePlan.mockResolvedValue({
        ...plan,
        projectId: null,
        projectSortOrder: null,
      });

      const result = await resolver.removePlanFromProject({ planId: plan.id });

      expect(result.projectSortOrder).toBeNull();
      expect(membership.removePlan).toHaveBeenCalledWith(plan.id);
    });

    test('reorderProjectPlans passes the project and the ordered ids through', async () => {
      membership.reorderPlans.mockResolvedValue([plan]);

      await resolver.reorderProjectPlans({
        planIds: ['b', 'a'],
        projectId: mockProject.id,
      });

      expect(membership.reorderPlans).toHaveBeenCalledWith(mockProject.id, [
        'b',
        'a',
      ]);
    });
  });

  describe('project favorites', () => {
    const principal: AuthPrincipal = {
      kind: AUTH_PRINCIPAL_KIND_USER,
      sub: 'user-1',
    };

    const buildFavoriteResolver = () => {
      const favorites = createUserFavoriteProjectsRepositoryMock();
      const projects = createProjectsRepositoryMock();
      const loaders = new ProjectsLoaders(
        asMock<PlansRepository>(createPlansRepositoryMock()),
        asMock<ProjectRepositoriesRepository>(
          createProjectRepositoriesRepositoryMock(),
        ),
        asMock<TasksRepository>(createTasksRepositoryMock()),
        asMock<UserFavoriteProjectsRepository>(favorites),
      );
      const favoriteResolver = new ProjectsResolver(
        asMock<PlanProjectMembershipService>(membership),
        loaders,
        asMock<ProjectRepositoriesRepository>(
          createProjectRepositoriesRepositoryMock(),
        ),
        asMock<ProjectsRepository>(projects),
        asMock<RepositoriesRepository>(createRepositoriesRepositoryMock()),
        asMock<UserFavoriteProjectsRepository>(favorites),
      );
      return { favoriteResolver, favorites, projects };
    };

    describe('isFavorite', () => {
      test('is true for a starred project and false for an unstarred one', async () => {
        const { favorites, favoriteResolver } = buildFavoriteResolver();
        favorites.listFavoriteProjectIds.mockResolvedValue(['starred']);

        const starred = await favoriteResolver.isFavorite(
          { ...mockProject, id: 'starred' },
          principal,
        );
        const plain = await favoriteResolver.isFavorite(
          { ...mockProject, id: 'plain' },
          principal,
        );

        expect(starred).toBe(true);
        expect(plain).toBe(false);
      });

      test('reads the favorites once for several projects in one request', async () => {
        const { favorites, favoriteResolver } = buildFavoriteResolver();
        favorites.listFavoriteProjectIds.mockResolvedValue(['a']);

        const results = await Promise.all(
          ['a', 'b', 'c'].map((id) => {
            return favoriteResolver.isFavorite(
              { ...mockProject, id },
              principal,
            );
          }),
        );

        expect(results).toEqual([true, false, false]);
        expect(favorites.listFavoriteProjectIds).toHaveBeenCalledTimes(1);
        expect(favorites.listFavoriteProjectIds).toHaveBeenCalledWith('user-1');
      });

      test('is false without querying when there is no authenticated user', async () => {
        const { favorites, favoriteResolver } = buildFavoriteResolver();

        const result = await favoriteResolver.isFavorite(
          mockProject,
          undefined,
        );

        expect(result).toBe(false);
        expect(favorites.listFavoriteProjectIds).not.toHaveBeenCalled();
      });
    });

    describe('setProjectFavorite', () => {
      test('stars a project', async () => {
        const { favorites, favoriteResolver, projects } =
          buildFavoriteResolver();
        projects.findOne.mockResolvedValue(mockProject);

        const result = await favoriteResolver.setProjectFavorite(
          principal,
          mockProject.id,
          true,
        );

        expect(result).toEqual({ favorite: true, projectId: mockProject.id });
        expect(favorites.setProjectFavorite).toHaveBeenCalledWith(
          'user-1',
          mockProject.id,
          true,
        );
      });

      test('unstars a project', async () => {
        const { favorites, favoriteResolver, projects } =
          buildFavoriteResolver();
        projects.findOne.mockResolvedValue(mockProject);

        const result = await favoriteResolver.setProjectFavorite(
          principal,
          mockProject.id,
          false,
        );

        expect(result).toEqual({ favorite: false, projectId: mockProject.id });
        expect(favorites.setProjectFavorite).toHaveBeenCalledWith(
          'user-1',
          mockProject.id,
          false,
        );
      });

      test('is idempotent: a repeated star succeeds with the same result', async () => {
        const { favoriteResolver, projects } = buildFavoriteResolver();
        projects.findOne.mockResolvedValue(mockProject);

        const first = await favoriteResolver.setProjectFavorite(
          principal,
          mockProject.id,
          true,
        );
        const second = await favoriteResolver.setProjectFavorite(
          principal,
          mockProject.id,
          true,
        );

        expect(second).toEqual(first);
      });

      test('rejects an unknown project with a NOT_FOUND code and writes nothing', async () => {
        const { favorites, favoriteResolver, projects } =
          buildFavoriteResolver();
        projects.findOne.mockResolvedValue(null);

        await expect(
          favoriteResolver.setProjectFavorite(principal, 'missing', true),
        ).rejects.toMatchObject({ extensions: { code: 'NOT_FOUND' } });
        expect(favorites.setProjectFavorite).not.toHaveBeenCalled();
      });

      test('rejects an unauthenticated caller with a FORBIDDEN code and writes nothing', async () => {
        const { favorites, favoriteResolver } = buildFavoriteResolver();

        await expect(
          favoriteResolver.setProjectFavorite(undefined, mockProject.id, true),
        ).rejects.toMatchObject({ extensions: { code: 'FORBIDDEN' } });
        expect(favorites.setProjectFavorite).not.toHaveBeenCalled();
      });
    });
  });
});
