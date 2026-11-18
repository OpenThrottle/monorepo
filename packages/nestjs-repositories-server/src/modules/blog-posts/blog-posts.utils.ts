import type { CreateModelInput } from '@openthrottle/nestjs-postgres';
import { createBaseRepositoryMock } from '@openthrottle/nestjs-postgres/testing';
import { vi } from 'vitest';

import type { BlogPost } from './blog-post.entity.ts';
import type { BlogPostsRepositoryMock } from './blog-posts.types.ts';
import { BLOG_WRITE_ENTITY } from './write-result/write-result.constants.ts';
import { blogWriteNotFound } from './write-result/write-result.utils.ts';

/**
 * @description Builds a {@link BlogPostsRepositoryMock} that starts as an empty `blog_posts`
 * table (see `createBaseRepositoryMock`): no posts, an empty feed and admin list, and every
 * write answers `not-found` (the post does not exist) until a test stubs it. Provide it in
 * place of `BlogPostsRepository` and stub per test. Test-only: imports `vitest`.
 * @public
 */
export function createBlogPostsRepositoryMock(): BlogPostsRepositoryMock {
  const emptyPage = { endCursor: null, hasNextPage: false, items: [] };
  const notFound = async (id: string) => {
    return blogWriteNotFound(BLOG_WRITE_ENTITY.POST, id);
  };

  return {
    ...createBaseRepositoryMock<BlogPost, CreateModelInput<BlogPost>>(
      'blog_posts',
    ),
    archivePost: vi.fn(notFound),
    createPost: vi.fn(() => {
      return Promise.reject(
        new Error('blog_posts.createPost is not stubbed in this test'),
      );
    }),
    findAdminPost: vi.fn(async () => {
      return null;
    }),
    findAdminPosts: vi.fn(async () => {
      return emptyPage;
    }),
    findPublished: vi.fn(async () => {
      return emptyPage;
    }),
    findPublishedBySlug: vi.fn(async () => {
      return null;
    }),
    findStatusById: vi.fn(async () => {
      return null;
    }),
    publishPost: vi.fn(notFound),
    setPostTags: vi.fn(notFound),
    unpublishPost: vi.fn(notFound),
    updatePost: vi.fn(notFound),
  };
}
