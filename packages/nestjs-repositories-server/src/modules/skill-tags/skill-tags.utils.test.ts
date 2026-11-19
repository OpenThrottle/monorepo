import { NotFoundException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';

import { createSkillTagsRepositoryMock } from './skill-tags.utils.ts';

const userId = '11111111-1111-4111-8111-111111111111';

describe('createSkillTagsRepositoryMock', () => {
  it('starts as an empty vocabulary', async () => {
    const repository = createSkillTagsRepositoryMock();

    await expect(repository.listForUser(userId)).resolves.toEqual([]);
    await expect(repository.removeTag(userId, 'backend')).resolves.toBe(false);
  });

  it('echoes added and renamed tags back as rows', async () => {
    const repository = createSkillTagsRepositoryMock();

    await expect(
      repository.addTag(userId, 'backend', 'phase'),
    ).resolves.toMatchObject({
      kind: 'ok',
      value: { dimension: 'phase', tag: 'backend', userId },
    });
    await expect(
      repository.renameTag(userId, 'backend', 'server'),
    ).resolves.toMatchObject({ kind: 'ok', value: { tag: 'server', userId } });
  });

  it('names the user_skill_tags table in inherited not-found errors', async () => {
    const repository = createSkillTagsRepositoryMock();

    await expect(repository.findById('a')).rejects.toThrow(NotFoundException);
    await expect(repository.findById('a')).rejects.toThrow(
      'user_skill_tags record with ID "a" not found',
    );
  });
});
