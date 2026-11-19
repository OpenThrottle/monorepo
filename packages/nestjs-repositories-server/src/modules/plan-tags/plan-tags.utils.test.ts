import { NotFoundException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';

import { createPlanTagsRepositoryMock } from './plan-tags.utils.ts';

describe('createPlanTagsRepositoryMock', () => {
  it('starts with no plan tags', async () => {
    const repository = createPlanTagsRepositoryMock();

    await expect(repository.findBy()).resolves.toEqual([]);
    await expect(repository.findByPlanAndTag('p', 't')).resolves.toBeNull();
    await expect(
      repository.findByPlanAndDimension('p', 'phase'),
    ).resolves.toBeNull();
    await expect(repository.listByPlanId('p')).resolves.toEqual([]);
  });

  it('names the plan_tags table in inherited not-found errors', async () => {
    const repository = createPlanTagsRepositoryMock();

    await expect(repository.remove('a')).rejects.toThrow(NotFoundException);
    await expect(repository.remove('a')).rejects.toThrow(
      'plan_tags record with ID "a" not found',
    );
  });
});
