import {
  ProjectsLoaders,
  ProjectsService,
} from '@openthrottle/nestjs-repositories';
import type { Plan, Project, Task } from '@openthrottle/nestjs-repositories';
import { getDefaultPlanRunConfigStorage } from '@openthrottle/nestjs-repositories';
import { createMock } from '@golevelup/ts-vitest';
import { Test } from '@nestjs/testing';
import { beforeAll, describe, expect, test, vi } from 'vitest';
import { ProjectsResolver } from './projects.resolver';

const buildMockPlan = (projectId: string): Plan => ({
  assignee: null,
  author: 'visormatt',
  category: 'infra',
  commitLinks: [],
  completedAt: null,
  createdAt: new Date('2026-02-03T10:00:00.000Z'),
  description: null,
  id: 'plan-1',
  jobRunHooks: { hooks: [] },
  planEmbeddings: [],
  planOutputChunks: [],
  project: null,
  projectId,
  projectRelation: null,
  runConfig: getDefaultPlanRunConfigStorage(),
  status: 'completed',
  summary: null,
  tasks: [],
  title: 'Plan One',
  updatedAt: new Date('2026-02-03T10:00:00.000Z'),
});

describe('ProjectsResolver', () => {
  let resolver: ProjectsResolver;
  let projectsService: ProjectsService;
  let plansByProjectIdLoader: { load: ReturnType<typeof vi.fn> };
  let tasksByProjectIdLoader: { load: ReturnType<typeof vi.fn> };

  const mockProject: Project = {
    createdAt: new Date('2026-02-02T10:00:00.000Z'),
    description: 'OpenThrottle API application',
    id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    name: 'openthrottle-server',
    nxProjectName: 'applications/openthrottle-server',
    plans: [],
    tasks: [],
    updatedAt: new Date('2026-02-02T10:00:00.000Z'),
  };

  const plansLoad = vi.fn().mockResolvedValue([]);
  const tasksLoad = vi.fn().mockResolvedValue([]);
  const mockProjectsLoaders: ProjectsLoaders = createMock<ProjectsLoaders>({
    plansByProjectIdLoader: { load: plansLoad },
    tasksByProjectIdLoader: { load: tasksLoad },
  });

  beforeAll(async () => {
    plansByProjectIdLoader = { load: plansLoad };
    tasksByProjectIdLoader = { load: tasksLoad };

    const app = await Test.createTestingModule({
      providers: [
        ProjectsResolver,
        { provide: ProjectsLoaders, useValue: mockProjectsLoaders },
        { provide: ProjectsService, useValue: createMock<ProjectsService>() },
      ],
    }).compile();

    resolver = app.get<ProjectsResolver>(ProjectsResolver);
    projectsService = app.get<ProjectsService>(ProjectsService);
  });

  describe('project', () => {
    test('returns ProjectObject when project exists', async () => {
      vi.mocked(projectsService.findById).mockResolvedValue(mockProject);

      const result = await resolver.project(mockProject.id);

      expect(result).not.toBeNull();
      expect(result?.id).toBe(mockProject.id);
      expect(result?.name).toBe(mockProject.name);
      expect(result?.description).toBe(mockProject.description);
      expect(result?.nxProjectName).toBe(mockProject.nxProjectName);
    });

    test('returns null when project does not exist', async () => {
      vi.mocked(projectsService.findById).mockResolvedValue(null);

      const result = await resolver.project('non-existent-id');

      expect(result).toBeNull();
    });
  });

  describe('projects', () => {
    test('returns array of ProjectObjects', async () => {
      vi.mocked(projectsService.findAll).mockResolvedValue([mockProject]);

      const result = await resolver.projects();

      expect(result).toHaveLength(1);
      expect(result[0]?.id).toBe(mockProject.id);
      expect(result[0]?.name).toBe(mockProject.name);
    });

    test('returns empty array when no projects', async () => {
      vi.mocked(projectsService.findAll).mockResolvedValue([]);

      const result = await resolver.projects();

      expect(result).toEqual([]);
    });
  });

  describe('createProject', () => {
    test('returns ProjectObject after create', async () => {
      vi.mocked(projectsService.create).mockResolvedValue(mockProject);

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
      vi.mocked(projectsService.update).mockResolvedValue(mockProject);

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
      vi.mocked(projectsService.update).mockResolvedValue(null);

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
    test('returns true when service removes a row', async () => {
      vi.mocked(projectsService.delete).mockResolvedValue(true);

      const result = await resolver.deleteProject({ id: mockProject.id });

      expect(result).toBe(true);
      expect(projectsService.delete).toHaveBeenCalledWith(mockProject.id);
    });

    test('returns false when project id does not exist', async () => {
      vi.mocked(projectsService.delete).mockResolvedValue(false);

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
          commitLinks: [],
          completedAt: null,
          createdAt: new Date('2026-02-03T10:00:00.000Z'),
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
});
