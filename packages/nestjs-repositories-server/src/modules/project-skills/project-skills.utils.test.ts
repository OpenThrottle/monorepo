import { NotFoundException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';

import { createProjectSkillsRepositoryMock } from './project-skills.utils.ts';

describe('createProjectSkillsRepositoryMock', () => {
  it('starts with no project skills', async () => {
    const repository = createProjectSkillsRepositoryMock();

    await expect(repository.findBy()).resolves.toEqual([]);
    await expect(repository.listForProject('p')).resolves.toEqual([]);
    await expect(repository.findByProjectAndSlug('p', 's')).resolves.toBeNull();
    await expect(repository.reconcile('p', [])).resolves.toEqual({
      staleSlugs: [],
      upserted: 0,
    });
    await expect(repository.removeBySlug('p', 's')).resolves.toBe(false);
  });

  it('names the project_skills table in inherited not-found errors', async () => {
    const repository = createProjectSkillsRepositoryMock();

    await expect(repository.remove('a')).rejects.toThrow(NotFoundException);
    await expect(repository.remove('a')).rejects.toThrow(
      'project_skills record with ID "a" not found',
    );
  });
});
