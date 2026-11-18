import type {
  PlansRepository,
  TasksRepository,
} from '@openthrottle/nestjs-repositories-server';
import {
  createPlansRepositoryMock,
  createTasksRepositoryMock,
  plansFactory,
  tasksFactory,
} from '@openthrottle/nestjs-repositories-server/testing';
import { asMock } from '@openthrottle/nestjs-testing';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { ActivityLoaders } from './loaders.service.ts';

describe('ActivityLoaders', () => {
  const plansRepository = createPlansRepositoryMock();
  const tasksRepository = createTasksRepositoryMock();
  const findPlans = plansRepository.findBy;
  const findTasks = tasksRepository.findBy;

  let loaders: ActivityLoaders;

  beforeEach(() => {
    vi.clearAllMocks();
    loaders = new ActivityLoaders(
      asMock<PlansRepository>(plansRepository),
      asMock<TasksRepository>(tasksRepository),
    );
  });

  test('planLoader batches many load() calls into one find and maps to key order', async () => {
    findPlans.mockResolvedValue([
      plansFactory.build({ id: 'p2', title: 'Two' }),
      plansFactory.build({ id: 'p1', title: 'One' }),
    ]);

    const [a, b, missing] = await Promise.all([
      loaders.planLoader.load('p1'),
      loaders.planLoader.load('p2'),
      loaders.planLoader.load('p3'),
    ]);

    expect(findPlans).toHaveBeenCalledTimes(1);
    expect(a?.id).toBe('p1');
    expect(b?.id).toBe('p2');
    expect(missing).toBeNull();
  });

  test('taskLoader batches many load() calls into one find and maps to key order', async () => {
    findTasks.mockResolvedValue([
      tasksFactory.build({ id: 't1', title: 'One' }),
    ]);

    const [a, missing] = await Promise.all([
      loaders.taskLoader.load('t1'),
      loaders.taskLoader.load('t2'),
    ]);

    expect(findTasks).toHaveBeenCalledTimes(1);
    expect(a?.id).toBe('t1');
    expect(missing).toBeNull();
  });
});
