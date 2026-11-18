import type { TasksRepository } from '@openthrottle/nestjs-repositories-server';
import {
  createTasksRepositoryMock,
  tasksFactory,
} from '@openthrottle/nestjs-repositories-server/testing';
import { asMock } from '@openthrottle/nestjs-testing';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { TaskEmbeddingsLoaders } from './loaders.service.ts';

describe('TaskEmbeddingsLoaders', () => {
  const tasksRepository = createTasksRepositoryMock();
  const findTasks = tasksRepository.findBy;

  let loaders: TaskEmbeddingsLoaders;

  beforeEach(() => {
    vi.clearAllMocks();
    loaders = new TaskEmbeddingsLoaders(
      asMock<TasksRepository>(tasksRepository),
    );
  });

  test('taskLoader batches many load() calls into one find and maps to key order', async () => {
    findTasks.mockResolvedValue([
      tasksFactory.build({ id: 't2', title: 'Two' }),
      tasksFactory.build({ id: 't1', title: 'One' }),
    ]);

    const [a, b, missing] = await Promise.all([
      loaders.taskLoader.load('t1'),
      loaders.taskLoader.load('t2'),
      loaders.taskLoader.load('t3'),
    ]);

    expect(findTasks).toHaveBeenCalledTimes(1);
    expect(a?.id).toBe('t1');
    expect(b?.id).toBe('t2');
    expect(missing).toBeNull();
  });
});
