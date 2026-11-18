import { createMock } from '@golevelup/ts-vitest';
import type { PlanRunsService } from '@openthrottle/nestjs-repositories';
import type {
  ProjectsRepository,
  TasksRepository,
} from '@openthrottle/nestjs-repositories-server';
import {
  createProjectsRepositoryMock,
  createTasksRepositoryMock,
  projectsFactory,
  tasksFactory,
} from '@openthrottle/nestjs-repositories-server/testing';
import { asMock } from '@openthrottle/nestjs-testing';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { PlansLoaders } from './loaders.service.ts';

describe('PlansLoaders', () => {
  const projectsRepository = createProjectsRepositoryMock();
  const tasksRepository = createTasksRepositoryMock();
  const findProjects = projectsRepository.findBy;
  const countByPlanIds = tasksRepository.countByPlanIds;
  const getPlanHooksForPlans = tasksRepository.getPlanHooksForPlans;

  const findEarliestScheduledForByPlanIds = vi.fn();
  const planRunsService = createMock<PlanRunsService>({
    findEarliestScheduledForByPlanIds,
  });

  let loaders: PlansLoaders;

  beforeEach(() => {
    vi.clearAllMocks();
    loaders = new PlansLoaders(
      planRunsService,
      asMock<ProjectsRepository>(projectsRepository),
      asMock<TasksRepository>(tasksRepository),
    );
  });

  describe('projectLoader', () => {
    test('batches many load() calls into one find and maps to key order', async () => {
      findProjects.mockResolvedValue([
        {
          ...projectsFactory.build({ id: 'p2', name: 'Two' }),
          plans: [],
          tasks: [],
        },
        {
          ...projectsFactory.build({ id: 'p1', name: 'One' }),
          plans: [],
          tasks: [],
        },
      ]);

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
    test('issues one grouped count for N planIds and maps counts in key order, 0 when absent', async () => {
      countByPlanIds.mockResolvedValue(
        new Map([
          ['plan-a', 3],
          ['plan-c', 1],
        ]),
      );

      const counts = await Promise.all([
        loaders.taskCountByPlanIdLoader.load('plan-a'),
        loaders.taskCountByPlanIdLoader.load('plan-b'),
        loaders.taskCountByPlanIdLoader.load('plan-c'),
      ]);

      expect(countByPlanIds).toHaveBeenCalledTimes(1);
      expect(countByPlanIds).toHaveBeenCalledWith(
        ['plan-a', 'plan-b', 'plan-c'],
        undefined,
      );
      expect(counts).toEqual([3, 0, 1]);
    });
  });

  describe('tasksCompletedCountByPlanIdLoader', () => {
    test('counts COMPLETED/PROMOTED/SKIPPED and maps counts in key order', async () => {
      countByPlanIds.mockResolvedValue(
        new Map([
          ['plan-a', 2],
          ['plan-c', 1],
        ]),
      );

      const counts = await Promise.all([
        loaders.tasksCompletedCountByPlanIdLoader.load('plan-a'),
        loaders.tasksCompletedCountByPlanIdLoader.load('plan-b'),
        loaders.tasksCompletedCountByPlanIdLoader.load('plan-c'),
      ]);

      expect(countByPlanIds).toHaveBeenCalledTimes(1);
      expect(countByPlanIds).toHaveBeenCalledWith(
        ['plan-a', 'plan-b', 'plan-c'],
        ['COMPLETED', 'PROMOTED', 'SKIPPED'],
      );
      expect(counts).toEqual([2, 0, 1]);
    });
  });

  describe('runnableTaskCountByPlanIdLoader', () => {
    test('counts the runnable statuses and maps counts in key order', async () => {
      countByPlanIds.mockResolvedValue(new Map([['plan-a', 2]]));

      const counts = await Promise.all([
        loaders.runnableTaskCountByPlanIdLoader.load('plan-a'),
        loaders.runnableTaskCountByPlanIdLoader.load('plan-b'),
      ]);

      expect(countByPlanIds).toHaveBeenCalledWith(
        ['plan-a', 'plan-b'],
        [
          'PENDING',
          'IN_PROGRESS',
          'BLOCKED',
          'BACKLOG',
          'SKIPPED',
          'CANCELED',
          'QUEUED',
        ],
      );
      expect(counts).toEqual([2, 0]);
    });
  });

  describe('planHooksByPlanIdLoader', () => {
    test('resolves beforeHooks and afterHooks for one plan with a single query', async () => {
      const before = [tasksFactory.build({ hookRole: 'before', id: 'h1' })];
      const after = [tasksFactory.build({ hookRole: 'after', id: 'h2' })];
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
          ['plan-a', { after: [], before: [tasksFactory.build({ id: 'h1' })] }],
          ['plan-c', { after: [tasksFactory.build({ id: 'h3' })], before: [] }],
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

  describe('scheduledRunByPlanIdLoader', () => {
    test('batches N planIds into one query and maps runs back in key order, null when none', async () => {
      const soonest = {
        id: 'run-a',
        scheduledFor: new Date('2026-08-01T09:00:00Z'),
      };
      findEarliestScheduledForByPlanIds.mockResolvedValue(
        new Map([['plan-a', soonest]]),
      );

      const result = await Promise.all([
        loaders.scheduledRunByPlanIdLoader.load('plan-a'),
        loaders.scheduledRunByPlanIdLoader.load('plan-b'),
      ]);

      expect(findEarliestScheduledForByPlanIds).toHaveBeenCalledTimes(1);
      expect(findEarliestScheduledForByPlanIds).toHaveBeenCalledWith([
        'plan-a',
        'plan-b',
      ]);
      expect(result).toEqual([soonest, null]);
    });

    test('serves scheduledRunAt and scheduledRunId for one plan from a single query', async () => {
      findEarliestScheduledForByPlanIds.mockClear();
      findEarliestScheduledForByPlanIds.mockResolvedValue(
        new Map([
          [
            'plan-a',
            { id: 'run-a', scheduledFor: new Date('2026-08-01T09:00:00Z') },
          ],
        ]),
      );

      // The two ResolveFields load the same key, so DataLoader dedupes them into one batch.
      await Promise.all([
        loaders.scheduledRunByPlanIdLoader.load('plan-a'),
        loaders.scheduledRunByPlanIdLoader.load('plan-a'),
      ]);

      expect(findEarliestScheduledForByPlanIds).toHaveBeenCalledTimes(1);
      expect(findEarliestScheduledForByPlanIds).toHaveBeenCalledWith([
        'plan-a',
      ]);
    });
  });
});
