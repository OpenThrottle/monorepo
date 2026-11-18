import type { CreateModelInput } from '@openthrottle/nestjs-postgres';
import { createBaseRepositoryMock } from '@openthrottle/nestjs-postgres/testing';
import { vi } from 'vitest';

import type { BlogTag } from './blog-tag.entity.ts';
import type { BlogTagsRepositoryMock } from './blog-tags.types.ts';

/**
 * @description Builds a {@link BlogTagsRepositoryMock} that starts as an empty `blog_tags`
 * table (see `createBaseRepositoryMock`): no tags, and `upsertTag` rejects until a test stubs
 * it, since an invented row would hide a missing stub. Provide it in place of
 * `BlogTagsRepository` and stub per test. Test-only: imports `vitest`.
 * @public
 */
export function createBlogTagsRepositoryMock(): BlogTagsRepositoryMock {
  return {
    ...createBaseRepositoryMock<BlogTag, CreateModelInput<BlogTag>>(
      'blog_tags',
    ),
    findAllTags: vi.fn(async () => {
      return [];
    }),
    findVisibleTags: vi.fn(async () => {
      return [];
    }),
    upsertTag: vi.fn(() => {
      return Promise.reject(
        new Error('blog_tags.upsertTag is not stubbed in this test'),
      );
    }),
  };
}
