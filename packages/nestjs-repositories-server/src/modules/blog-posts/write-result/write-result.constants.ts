/**
 * @description Discriminants of {@link BlogWriteResult}.
 * @public
 */
export const BLOG_WRITE_RESULT_KIND = {
  COVER_ALT_REQUIRED: 'cover-alt-required',
  NOT_FOUND: 'not-found',
  OK: 'ok',
  SLUG_CONFLICT: 'slug-conflict',
  STALE_WRITE: 'stale-write',
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
