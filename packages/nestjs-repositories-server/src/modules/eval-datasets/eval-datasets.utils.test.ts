import { NotFoundException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';

import { EVAL_DATASET_TARGET } from './eval-datasets.constants.ts';
import { createEvalDatasetsRepositoryMock } from './eval-datasets.utils.ts';

describe('createEvalDatasetsRepositoryMock', () => {
  it('starts with no datasets', async () => {
    const repository = createEvalDatasetsRepositoryMock();

    await expect(repository.findBy()).resolves.toEqual([]);
    await expect(repository.findByRepository('r')).resolves.toEqual([]);
    await expect(repository.findDatasetById('a')).resolves.toBeNull();
  });

  it('creates a dataset carrying the input', async () => {
    const repository = createEvalDatasetsRepositoryMock();

    await expect(
      repository.createDataset({
        cases: [],
        createdBy: 'visormatt',
        description: null,
        name: 'failures',
        repositoryId: 'r',
        target: EVAL_DATASET_TARGET.SKILL,
      }),
    ).resolves.toMatchObject({ name: 'failures', target: 'skill' });
  });

  it('names the eval_datasets table in inherited not-found errors', async () => {
    const repository = createEvalDatasetsRepositoryMock();

    await expect(repository.findById('a')).rejects.toThrow(NotFoundException);
    await expect(repository.findById('a')).rejects.toThrow(
      'eval_datasets record with ID "a" not found',
    );
  });
});
