import { NotFoundException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';

import { createPlansRepositoryMock } from './plans.utils.ts';

describe('createPlansRepositoryMock', () => {
  it('starts with no plans', async () => {
    const repository = createPlansRepositoryMock();

    await expect(repository.findBy()).resolves.toEqual([]);
    await expect(repository.findOne({ where: {} })).resolves.toBeNull();
  });

  it('names the plans table in inherited not-found errors', async () => {
    const repository = createPlansRepositoryMock();

    await expect(repository.remove('a')).rejects.toThrow(NotFoundException);
    await expect(repository.remove('a')).rejects.toThrow(
      'plans record with ID "a" not found',
    );
  });
});
