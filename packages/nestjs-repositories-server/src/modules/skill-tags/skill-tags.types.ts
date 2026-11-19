import type { CreateModelInput } from '@openthrottle/nestjs-postgres';
import type { BaseRepositoryMock } from '@openthrottle/nestjs-postgres/testing';
import type { Mock } from 'vitest';

import type { SKILL_TAG_WRITE_RESULT_KIND } from './skill-tags.constants.ts';
import type { SkillTagsRepository } from './skill-tags.repository.ts';
import type { UserSkillTag } from './user-skill-tag.entity.ts';

/**
 * The add or rename was written; `value` is the stored row.
 * @public
 */
export interface SkillTagWriteOk {
  readonly kind: typeof SKILL_TAG_WRITE_RESULT_KIND.OK;
  readonly value: UserSkillTag;
}

/**
 * The user already has `tag` (unique on `user_id, tag`), so nothing was written.
 * @public
 */
export interface SkillTagWriteConflict {
  readonly kind: typeof SKILL_TAG_WRITE_RESULT_KIND.CONFLICT;
  readonly tag: string;
}

/**
 * Outcome of a skill-tag add or rename. A duplicate is a value rather than an exception, so the
 * caller decides how to surface it (the GraphQL resolver turns it into a coded error).
 * @public
 */
export type SkillTagWriteResult = SkillTagWriteConflict | SkillTagWriteOk;

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
