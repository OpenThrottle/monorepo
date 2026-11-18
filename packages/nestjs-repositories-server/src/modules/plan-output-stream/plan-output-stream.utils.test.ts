import { NotFoundException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';

import { createPlanOutputStreamRepositoryMock } from './plan-output-stream.utils.ts';

describe('createPlanOutputStreamRepositoryMock', () => {
  it('starts with no chunks', async () => {
    const repository = createPlanOutputStreamRepositoryMock();

    await expect(
      repository.listChunks({ planId: 'p', skip: 0, take: 10 }),
    ).resolves.toEqual([]);
    await expect(repository.findOne({ where: {} })).resolves.toBeNull();
  });

  it('names the plan_output_stream table in inherited not-found errors', async () => {
    const repository = createPlanOutputStreamRepositoryMock();

    await expect(repository.findById('a')).rejects.toThrow(NotFoundException);
    await expect(repository.findById('a')).rejects.toThrow(
      'plan_output_stream record with ID "a" not found',
    );
  });
});
