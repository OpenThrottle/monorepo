import { NotFoundException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';

import { createPlanEmbeddingsRepositoryMock } from './plan-embeddings.utils.ts';

describe('createPlanEmbeddingsRepositoryMock', () => {
  it('starts with no embeddings', async () => {
    const repository = createPlanEmbeddingsRepositoryMock();

    await expect(repository.findBy()).resolves.toEqual([]);
    await expect(repository.findOne({ where: {} })).resolves.toBeNull();
  });

  it('names the plan_embeddings table in inherited not-found errors', async () => {
    const repository = createPlanEmbeddingsRepositoryMock();

    await expect(repository.findById('a')).rejects.toThrow(NotFoundException);
    await expect(repository.findById('a')).rejects.toThrow(
      'plan_embeddings record with ID "a" not found',
    );
  });
});
