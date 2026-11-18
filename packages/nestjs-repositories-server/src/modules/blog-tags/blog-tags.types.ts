import type { CreateModelInput } from '@openthrottle/nestjs-postgres';
import type { BaseRepositoryMock } from '@openthrottle/nestjs-postgres/testing';
import type { Mock } from 'vitest';

import type { BlogTag } from './blog-tag.entity.ts';
import type { BlogTagsRepository } from './blog-tags.repository.ts';

/**
 * Scalar/column fields of {@link BlogTag} (no relations).
 * @public
 */
export type BlogTagData = Pick<
  BlogTag,
  | 'createdAt'
  | 'deletedAt'
  | 'description'
  | 'id'
  | 'name'
  | 'slug'
  | 'updatedAt'
>;

/**
 * Input for {@link BlogTagsRepository.upsertTag}. The write replaces the tag's fields: an omitted
 * or `null` description clears the column.
 * @public
 */
export interface BlogTagUpsertInput {
  readonly description?: string | null;
  readonly name: string;
  readonly slug: string;
}

/**
 * @description A {@link BlogTagsRepository} mock: every inherited `BaseRepository` method
 * plus the blog tag ones.
 * @public
 */
export interface BlogTagsRepositoryMock extends BaseRepositoryMock<
  BlogTag,
  CreateModelInput<BlogTag>
> {
  readonly findAllTags: Mock<BlogTagsRepository['findAllTags']>;
  readonly findVisibleTags: Mock<BlogTagsRepository['findVisibleTags']>;
  readonly upsertTag: Mock<BlogTagsRepository['upsertTag']>;
}
