import type { CreateModelInput } from '@openthrottle/nestjs-postgres';
import type { BaseRepositoryMock } from '@openthrottle/nestjs-postgres/testing';
import type { Mock } from 'vitest';

import type { SkillTagsRepository } from './skill-tags.repository.ts';
import type { UserSkillTag } from './user-skill-tag.entity.ts';

/**
 * Scalar/column fields of {@link UserSkillTag} (no relations).
 * @public
 */
export type UserSkillTagData = Pick<
  UserSkillTag,
  'createdAt' | 'dimension' | 'id' | 'tag' | 'updatedAt' | 'userId'
>;

/**
 * @description A {@link SkillTagsRepository} mock: every inherited `BaseRepository` method plus
 * the vocabulary ones.
 * @public
 */
export interface SkillTagsRepositoryMock extends BaseRepositoryMock<
  UserSkillTag,
  CreateModelInput<UserSkillTag>
> {
  readonly addTag: Mock<SkillTagsRepository['addTag']>;
  readonly listForUser: Mock<SkillTagsRepository['listForUser']>;
  readonly removeTag: Mock<SkillTagsRepository['removeTag']>;
  readonly renameTag: Mock<SkillTagsRepository['renameTag']>;
}
