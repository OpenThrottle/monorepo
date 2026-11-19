import { NotFoundException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';

import { createProjectTagsRepositoryMock } from './project-tags.utils.ts';

describe('createProjectTagsRepositoryMock', () => {
  it('starts with no project tags', async () => {
    const repository = createProjectTagsRepositoryMock();

    await expect(repository.findBy()).resolves.toEqual([]);
    await expect(
      repository.findByProjectAndTag('p', 'tag'),
    ).resolves.toBeNull();
    await expect(repository.listForPlanProject('p')).resolves.toEqual([]);
  });

  it('names the project_tags table in inherited not-found errors', async () => {
    const repository = createProjectTagsRepositoryMock();

    await expect(repository.remove('a')).rejects.toThrow(NotFoundException);
    await expect(repository.remove('a')).rejects.toThrow(
      'project_tags record with ID "a" not found',
    );
  });
});
