import { BadRequestException } from '@nestjs/common';

/**
 * @description Shape of a blog slug (lowercase kebab-case). MUST equal the regex in the
 * `chk_blog_posts_slug`, `chk_blog_tags_slug` and `chk_blog_authors_slug` CHECK constraints of
 * databases/migrations/131 — a test pins the two together — so a bad slug is rejected here as a
 * `BadRequestException` (a GraphQL error) instead of surfacing as a constraint violation.
 * @public
 */
export const BLOG_SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/**
 * @description Throws `BadRequestException` unless `slug` is lowercase kebab-case.
 * @public
 */
export function assertBlogSlug(slug: string, field = 'slug'): void {
  if (!BLOG_SLUG_PATTERN.test(slug)) {
    throw new BadRequestException(
      `${field} "${slug}" is invalid: use lowercase letters, digits and single hyphens (e.g. "my-first-post").`,
    );
  }
}

/**
 * @description Throws `BadRequestException` when `value` is empty or whitespace-only. Mirrors
 * the `length(btrim(...)) > 0` CHECKs on blog titles, tag names and author display names.
 * @public
 */
export function assertNotBlank(value: string, field: string): void {
  if (value.trim().length === 0) {
    throw new BadRequestException(`${field} must not be blank.`);
  }
}

/**
 * @description True when a post would have a cover image but no alt text for it: a non-blank
 * `coverImageUrl` with a null or blank `coverImageAlt`. Pass the post as it will be stored (for a
 * partial update, the stored row with the patch merged on top).
 * @public
 */
export function isCoverAltMissing(cover: {
  readonly coverImageAlt?: string | null;
  readonly coverImageUrl?: string | null;
}): boolean {
  const hasCover = (cover.coverImageUrl ?? '').trim().length > 0;
  const hasAlt = (cover.coverImageAlt ?? '').trim().length > 0;
  return hasCover && !hasAlt;
}
