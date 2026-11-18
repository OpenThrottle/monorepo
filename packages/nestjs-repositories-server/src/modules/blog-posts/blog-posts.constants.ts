import type { BlogPostStatus } from './blog-posts.types.ts';

/**
 * @description Vocabulary of `blog_posts.status`. Mirrors the
 * `chk_blog_posts_status` CHECK constraint in databases/openthrottle/migrations/131 (a CHECK, not a
 * Postgres enum type).
 * @public
 */
export const BLOG_POST_STATUS = {
  ARCHIVED: 'ARCHIVED',
  DRAFT: 'DRAFT',
  PUBLISHED: 'PUBLISHED',
} as const;
/**
 * @description Every `blog_posts.status` value, alphabetized.
 * @public
 */
export const BLOG_POST_STATUS_VALUES: readonly BlogPostStatus[] =
  Object.values(BLOG_POST_STATUS);
