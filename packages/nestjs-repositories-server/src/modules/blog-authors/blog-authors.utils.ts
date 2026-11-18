import type { CreateModelInput } from '@openthrottle/nestjs-postgres';
import { createBaseRepositoryMock } from '@openthrottle/nestjs-postgres/testing';
import { vi } from 'vitest';

import type { BlogAuthor } from './blog-author.entity.ts';
import type { BlogAuthorsRepositoryMock } from './blog-authors.types.ts';

/**
 * @description Builds a {@link BlogAuthorsRepositoryMock} that starts as an empty
 * `blog_authors` table (see `createBaseRepositoryMock`): no authors, and `upsertAuthor`
 * rejects until a test stubs it, since an invented row would hide a missing stub. Provide it
 * in place of `BlogAuthorsRepository` and stub per test. Test-only: imports `vitest`.
 * @public
 */
export function createBlogAuthorsRepositoryMock(): BlogAuthorsRepositoryMock {
  return {
    ...createBaseRepositoryMock<BlogAuthor, CreateModelInput<BlogAuthor>>(
      'blog_authors',
    ),
    findAllAuthors: vi.fn(async () => {
      return [];
    }),
    upsertAuthor: vi.fn(() => {
      return Promise.reject(
        new Error('blog_authors.upsertAuthor is not stubbed in this test'),
      );
    }),
  };
}
