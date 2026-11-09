import type { BlogPost } from '../blog-post.entity.ts';
import type {
  BLOG_WRITE_ENTITY,
  BLOG_WRITE_RESULT_KIND,
} from './write-result.constants.ts';

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
 * The post would be stored with a cover image URL but no cover alt text. Nothing was written.
 * @public
 */
export interface BlogWriteCoverAltRequired {
  readonly kind: typeof BLOG_WRITE_RESULT_KIND.COVER_ALT_REQUIRED;
}

/**
 * The post changed since the caller read it (`expectedUpdatedAt` did not match), so nothing was
 * written. `currentUpdatedAt` is the post's `updated_at` now, for the caller to re-read against.
 * @public
 */
export interface BlogWriteStaleWrite {
  readonly currentUpdatedAt: Date;
  readonly kind: typeof BLOG_WRITE_RESULT_KIND.STALE_WRITE;
}

/**
 * Outcome of a blog post write. Expected failures are values, not exceptions, so callers
 * branch on `kind` instead of a manual try/catch.
 * @public
 */
export type BlogWriteResult<T> =
  | BlogWriteCoverAltRequired
  | BlogWriteNotFound
  | BlogWriteOk<T>
  | BlogWriteSlugConflict
  | BlogWriteStaleWrite;

/** @public */
export type BlogPostWriteResult = BlogWriteResult<BlogPost>;
