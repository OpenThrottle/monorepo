import { createMock } from '@golevelup/ts-vitest';
import {
  type Project,
  ProjectsService,
  TasksService,
} from '@openthrottle/nestjs-repositories';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { PlansLoaders } from './plans-loaders';

describe('PlansLoaders', () => {
  const findProjects = vi.fn();
  const getRawMany = vi.fn();
  const taskQueryBuilder = {
    addSelect: vi.fn().mockReturnThis(),
    getRawMany,
    groupBy: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
  };
  const createQueryBuilder = vi.fn().mockReturnValue(taskQueryBuilder);

  const projectsService = createMock<ProjectsService>({
    getRepository: vi.fn().mockReturnValue({ find: findProjects }),
  });
  const tasksService = createMock<TasksService>({
    getRepository: vi.fn().mockReturnValue({ createQueryBuilder }),
  });

  let loaders: PlansLoaders;

  beforeEach(() => {
    vi.clearAllMocks();
    taskQueryBuilder.addSelect.mockReturnThis();
    taskQueryBuilder.groupBy.mockReturnThis();
    taskQueryBuilder.select.mockReturnThis();
    taskQueryBuilder.where.mockReturnThis();
    createQueryBuilder.mockReturnValue(taskQueryBuilder);
    loaders = new PlansLoaders(projectsService, tasksService);
  });

  describe('projectLoader', () => {
    test('batches many load() calls into one find and maps to key order', async () => {
      const projects: Project[] = [
        createMock<Project>({ id: 'p2', name: 'Two' }),
        createMock<Project>({ id: 'p1', name: 'One' }),
      ];
      findProjects.mockResolvedValue(projects);

      const [a, b, missing] = await Promise.all([
        loaders.projectLoader.load('p1'),
        loaders.projectLoader.load('p2'),
        loaders.projectLoader.load('p3'),
      ]);

      expect(findProjects).toHaveBeenCalledTimes(1);
      expect(a?.id).toBe('p1');
      expect(b?.id).toBe('p2');
      expect(missing).toBeNull();
    });
  });

  describe('taskCountByPlanIdLoader', () => {
    test('issues one grouped count query for N planIds and maps counts in key order', async () => {
      getRawMany.mockResolvedValue([
        { count: '3', key: 'plan-a' },
        { count: '1', key: 'plan-c' },
      ]);

      const counts = await Promise.all([
        loaders.taskCountByPlanIdLoader.load('plan-a'),
        loaders.taskCountByPlanIdLoader.load('plan-b'),
        loaders.taskCountByPlanIdLoader.load('plan-c'),
      ]);

      expect(createQueryBuilder).toHaveBeenCalledTimes(1);
      expect(getRawMany).toHaveBeenCalledTimes(1);
      // plan-a => 3, plan-b absent => 0, plan-c => 1
      expect(counts).toEqual([3, 0, 1]);
    });
  });
});
