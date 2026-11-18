import { NotFoundException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';

import { createWorkArtifactsRepositoryMock } from './work-artifacts.utils.ts';

describe('createWorkArtifactsRepositoryMock', () => {
  it('starts as an empty work_artifacts table', async () => {
    const repository = createWorkArtifactsRepositoryMock();

    await expect(repository.listPlanCompleteness()).resolves.toEqual([]);
    await expect(repository.findBy()).resolves.toEqual([]);
  });

  it('names the work_artifacts table in inherited not-found errors', async () => {
    const repository = createWorkArtifactsRepositoryMock();

    await expect(repository.findById('a')).rejects.toThrow(NotFoundException);
    await expect(repository.findById('a')).rejects.toThrow(
      'work_artifacts record with ID "a" not found',
    );
  });
});
