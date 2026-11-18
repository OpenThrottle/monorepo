import { NotFoundException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';

import { createTaskEmbeddingsRepositoryMock } from './task-embeddings.utils.ts';

describe('createTaskEmbeddingsRepositoryMock', () => {
  it('starts with no embeddings', async () => {
    const repository = createTaskEmbeddingsRepositoryMock();

    await expect(repository.findBy()).resolves.toEqual([]);
    await expect(repository.findOne({ where: {} })).resolves.toBeNull();
  });

  it('names the task_embeddings table in inherited not-found errors', async () => {
    const repository = createTaskEmbeddingsRepositoryMock();

    await expect(repository.findById('a')).rejects.toThrow(NotFoundException);
    await expect(repository.findById('a')).rejects.toThrow(
      'task_embeddings record with ID "a" not found',
    );
  });
});
