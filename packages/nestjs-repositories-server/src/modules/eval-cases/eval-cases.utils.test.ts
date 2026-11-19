import { NotFoundException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';

import { createEvalCasesRepositoryMock } from './eval-cases.utils.ts';

describe('createEvalCasesRepositoryMock', () => {
  it('starts with no cases', async () => {
    const repository = createEvalCasesRepositoryMock();

    await expect(repository.findBy()).resolves.toEqual([]);
    await expect(repository.findByDataset('d')).resolves.toEqual([]);
  });

  it('names the eval_cases table in inherited not-found errors', async () => {
    const repository = createEvalCasesRepositoryMock();

    await expect(repository.findById('a')).rejects.toThrow(NotFoundException);
    await expect(repository.findById('a')).rejects.toThrow(
      'eval_cases record with ID "a" not found',
    );
  });
});
