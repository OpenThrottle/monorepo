import { createMock } from '@golevelup/ts-vitest';
import type { TasksService } from '@openthrottle/nestjs-repositories';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { TaskEmbeddingsLoaders } from './task-embeddings-loaders';

describe('TaskEmbeddingsLoaders', () => {
  const findTasks = vi.fn();
  const tasksService = createMock<TasksService>({
    getRepository: vi.fn().mockReturnValue({ find: findTasks }),
  });

  let loaders: TaskEmbeddingsLoaders;

  beforeEach(() => {
    vi.clearAllMocks();
    loaders = new TaskEmbeddingsLoaders(tasksService);
  });

  test('taskLoader batches many load() calls into one find and maps to key order', async () => {
    findTasks.mockResolvedValue([
      { id: 't2', title: 'Two' },
      { id: 't1', title: 'One' },
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
