import type { CreateModelInput } from '@openthrottle/nestjs-postgres';
import type { BaseRepositoryMock } from '@openthrottle/nestjs-postgres/testing';
import type { Mock } from 'vitest';

import type { BlogAuthor } from './blog-author.entity.ts';
import type { BlogAuthorsRepository } from './blog-authors.repository.ts';

/**
 * Scalar/column fields of {@link BlogAuthor} (no relations).
 * @public
 */
export type BlogAuthorData = Pick<
  BlogAuthor,
  | 'avatarUrl'
  | 'bio'
  | 'createdAt'
  | 'deletedAt'
  | 'displayName'
  | 'id'
  | 'slug'
  | 'updatedAt'
  | 'userId'
>;

/**
 * Input for {@link BlogAuthorsRepository.upsertAuthor}. The write replaces the author's fields:
 * an omitted or `null` bio / avatar clears the column. `userId` is deliberately not settable.
 * @public
 */
export interface BlogAuthorUpsertInput {
  readonly avatarUrl?: string | null;
  readonly bio?: string | null;
  readonly displayName: string;
  readonly slug: string;
}

/**
 * @description A {@link BlogAuthorsRepository} mock: every inherited `BaseRepository` method
 * plus the blog author ones.
 * @public
 */
export interface BlogAuthorsRepositoryMock extends BaseRepositoryMock<
  BlogAuthor,
  CreateModelInput<BlogAuthor>
> {
  readonly findAllAuthors: Mock<BlogAuthorsRepository['findAllAuthors']>;
  readonly upsertAuthor: Mock<BlogAuthorsRepository['upsertAuthor']>;
}
