import type { CreateModelInput } from '@openthrottle/nestjs-postgres';
import { createBaseRepositoryMock } from '@openthrottle/nestjs-postgres/testing';
import { vi } from 'vitest';

import { skillTagsFactory } from './skill-tags.factory.ts';
import type { SkillTagsRepositoryMock } from './skill-tags.types.ts';
import type { UserSkillTag } from './user-skill-tag.entity.ts';

/**
 * @description Builds a {@link SkillTagsRepositoryMock} that starts as an empty
 * `user_skill_tags` table (see `createBaseRepositoryMock`): `listForUser` returns no tags,
 * `addTag` and `renameTag` echo the requested tag back as a row, and `removeTag` reports
 * nothing removed. Provide it in place of `SkillTagsRepository` and stub per test. Test-only:
 * imports `vitest`.
 * @public
 */
export function createSkillTagsRepositoryMock(): SkillTagsRepositoryMock {
  return {
    ...createBaseRepositoryMock<UserSkillTag, CreateModelInput<UserSkillTag>>(
      'user_skill_tags',
    ),
    addTag: vi.fn(async (userId: string, tag: string, dimension = 'domain') => {
      return skillTagsFactory.build({ dimension, tag, userId });
    }),
    listForUser: vi.fn(async () => {
      return [];
    }),
    removeTag: vi.fn(async () => {
      return false;
    }),
    renameTag: vi.fn(async (userId: string, _from: string, to: string) => {
      return skillTagsFactory.build({ tag: to, userId });
    }),
  };
}
