import type { BlogPost } from './blog-post.entity.ts';

/**
 * @description Discriminants of {@link BlogWriteResult}.
 * @public
 */
export const BLOG_WRITE_RESULT_KIND = {
  NOT_FOUND: 'not-found',
  OK: 'ok',
  SLUG_CONFLICT: 'slug-conflict',
} as const;

/**
 * @description What a {@link BlogWriteNotFound} could not find.
 * @public
 */
export const BLOG_WRITE_ENTITY = {
  AUTHOR: 'author',
  POST: 'post',
  TAG: 'tag',
} as const;

/** @public */
export type BlogWriteEntity =
  (typeof BLOG_WRITE_ENTITY)[keyof typeof BLOG_WRITE_ENTITY];

/** @public */
export interface BlogWriteOk<T> {
  readonly kind: typeof BLOG_WRITE_RESULT_KIND.OK;
  readonly value: T;
}

/**
 * A post, author or tag referenced by the write does not exist. `key` is the id (post) or
 * slug (author, tag) that was looked up.
 * @public
 */
export interface BlogWriteNotFound {
  readonly entity: BlogWriteEntity;
  readonly key: string;
  readonly kind: typeof BLOG_WRITE_RESULT_KIND.NOT_FOUND;
}

/**
 * Another post already uses `slug` (unique index `idx_blog_posts_slug`).
 * @public
 */
export interface BlogWriteSlugConflict {
  readonly kind: typeof BLOG_WRITE_RESULT_KIND.SLUG_CONFLICT;
  readonly slug: string;
}

/**
 * Outcome of a blog post write. Expected failures are values, not exceptions, so callers
 * branch on `kind` instead of a manual try/catch.
 * @public
 */
export type BlogWriteResult<T> =
  BlogWriteNotFound | BlogWriteOk<T> | BlogWriteSlugConflict;

/** @public */
export type BlogPostWriteResult = BlogWriteResult<BlogPost>;

export const blogWriteOk = <T>(value: T): BlogWriteOk<T> => ({
  kind: BLOG_WRITE_RESULT_KIND.OK,
  value,
});

export const blogWriteNotFound = (
  entity: BlogWriteEntity,
  key: string,
): BlogWriteNotFound => ({
  entity,
  key,
  kind: BLOG_WRITE_RESULT_KIND.NOT_FOUND,
});

export const blogWriteSlugConflict = (slug: string): BlogWriteSlugConflict => ({
  kind: BLOG_WRITE_RESULT_KIND.SLUG_CONFLICT,
  slug,
});
