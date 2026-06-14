import { createMock } from '@golevelup/ts-vitest';
import {
  type Plan,
  type Task,
  PlansService,
  TasksService,
} from '@openthrottle/nestjs-repositories';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { ActivityLoaders } from './activity-loaders';

describe('ActivityLoaders', () => {
  const findPlans = vi.fn();
  const findTasks = vi.fn();

  const plansService = createMock<PlansService>({
    getRepository: vi.fn().mockReturnValue({ find: findPlans }),
  });
  const tasksService = createMock<TasksService>({
    getRepository: vi.fn().mockReturnValue({ find: findTasks }),
  });

  let loaders: ActivityLoaders;

  beforeEach(() => {
    vi.clearAllMocks();
    loaders = new ActivityLoaders(plansService, tasksService);
  });

  test('planLoader batches many load() calls into one find and maps to key order', async () => {
    findPlans.mockResolvedValue([
      { id: 'p2', title: 'Two' },
      { id: 'p1', title: 'One' },
    ] as Plan[]);

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
    findTasks.mockResolvedValue([{ id: 't1', title: 'One' }] as Task[]);

    const [a, missing] = await Promise.all([
      loaders.taskLoader.load('t1'),
      loaders.taskLoader.load('t2'),
    ]);

    expect(findTasks).toHaveBeenCalledTimes(1);
    expect(a?.id).toBe('t1');
    expect(missing).toBeNull();
  });
});
