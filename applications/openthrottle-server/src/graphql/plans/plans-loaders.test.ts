import { createMock } from '@golevelup/ts-vitest';
import {
  type Project,
  ProjectsService,
  type Task,
  TasksService,
} from '@openthrottle/nestjs-repositories';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { PlansLoaders } from './plans-loaders';

describe('PlansLoaders', () => {
  const findProjects = vi.fn();
  const getRawMany = vi.fn();
  const taskQueryBuilder = {
    addSelect: vi.fn().mockReturnThis(),
    andWhere: vi.fn().mockReturnThis(),
    getRawMany,
    groupBy: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
  };
  const createQueryBuilder = vi.fn().mockReturnValue(taskQueryBuilder);

  const projectsService = createMock<ProjectsService>({
    getRepository: vi.fn().mockReturnValue({ find: findProjects }),
  });
  const getPlanHooksForPlans = vi.fn();
  const tasksService = createMock<TasksService>({
    getPlanHooksForPlans,
    getRepository: vi.fn().mockReturnValue({ createQueryBuilder }),
  });

  let loaders: PlansLoaders;

  beforeEach(() => {
    vi.clearAllMocks();
    taskQueryBuilder.addSelect.mockReturnThis();
    taskQueryBuilder.andWhere.mockReturnThis();
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
      expect(taskQueryBuilder.andWhere).not.toHaveBeenCalled();
      // plan-a => 3, plan-b absent => 0, plan-c => 1
      expect(counts).toEqual([3, 0, 1]);
    });
  });

  describe('tasksCompletedCountByPlanIdLoader', () => {
    test('filters to COMPLETED/SKIPPED and maps counts in key order', async () => {
      getRawMany.mockResolvedValue([
        { count: '2', key: 'plan-a' },
        { count: '1', key: 'plan-c' },
      ]);

      const counts = await Promise.all([
        loaders.tasksCompletedCountByPlanIdLoader.load('plan-a'),
        loaders.tasksCompletedCountByPlanIdLoader.load('plan-b'),
        loaders.tasksCompletedCountByPlanIdLoader.load('plan-c'),
      ]);

      expect(createQueryBuilder).toHaveBeenCalledTimes(1);
      expect(taskQueryBuilder.andWhere).toHaveBeenCalledWith(
        'entity.status IN (:...filterValues)',
        { filterValues: ['COMPLETED', 'SKIPPED'] },
      );
      expect(counts).toEqual([2, 0, 1]);
    });
  });

  describe('planHooksByPlanIdLoader', () => {
    test('resolves beforeHooks and afterHooks for one plan with a single query', async () => {
      const before = [createMock<Task>({ hookRole: 'before', id: 'h1' })];
      const after = [createMock<Task>({ hookRole: 'after', id: 'h2' })];
      getPlanHooksForPlans.mockResolvedValue(
        new Map([['plan-a', { after, before }]]),
      );

      // Exactly what selecting both fields on one plan does.
      const [forBeforeField, forAfterField] = await Promise.all([
        loaders.planHooksByPlanIdLoader.load('plan-a'),
        loaders.planHooksByPlanIdLoader.load('plan-a'),
      ]);

      expect(getPlanHooksForPlans).toHaveBeenCalledTimes(1);
      expect(forBeforeField.before).toEqual(before);
      expect(forAfterField.after).toEqual(after);
    });

    test('batches N planIds into one call and maps groups back in key order', async () => {
      getPlanHooksForPlans.mockResolvedValue(
        new Map([
          ['plan-a', { after: [], before: [createMock<Task>({ id: 'h1' })] }],
          ['plan-c', { after: [createMock<Task>({ id: 'h3' })], before: [] }],
        ]),
      );

      const grouped = await Promise.all([
        loaders.planHooksByPlanIdLoader.load('plan-a'),
        loaders.planHooksByPlanIdLoader.load('plan-b'),
        loaders.planHooksByPlanIdLoader.load('plan-c'),
      ]);

      expect(getPlanHooksForPlans).toHaveBeenCalledTimes(1);
      expect(grouped[0].before).toHaveLength(1);
      // plan-b has no hooks -> empty groups, not undefined
      expect(grouped[1]).toEqual({ after: [], before: [] });
      expect(grouped[2].after).toHaveLength(1);
    });
  });
});
