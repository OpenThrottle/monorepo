import { NotFoundException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';

import { createTaskTagsRepositoryMock } from './task-tags.utils.ts';

describe('createTaskTagsRepositoryMock', () => {
  it('starts with no task tags', async () => {
    const repository = createTaskTagsRepositoryMock();

    await expect(repository.findBy()).resolves.toEqual([]);
    await expect(repository.findByTaskAndTag('t', 'tag')).resolves.toBeNull();
    await expect(repository.listForPlan('p')).resolves.toEqual([]);
    await expect(
      repository.listTaskIdsByPlanAndTags('p', ['t']),
    ).resolves.toEqual([]);
  });

  it('names the task_tags table in inherited not-found errors', async () => {
    const repository = createTaskTagsRepositoryMock();

    await expect(repository.remove('a')).rejects.toThrow(NotFoundException);
    await expect(repository.remove('a')).rejects.toThrow(
      'task_tags record with ID "a" not found',
    );
  });
});
