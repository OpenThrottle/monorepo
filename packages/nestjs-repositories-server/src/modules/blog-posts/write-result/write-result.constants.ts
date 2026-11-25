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

export type BlogWriteResultKindKey = keyof typeof BLOG_WRITE_RESULT_KIND;
export type BlogWriteResultKindValue =
  (typeof BLOG_WRITE_RESULT_KIND)[BlogWriteResultKindKey];

/**
 * @description What a {@link BlogWriteNotFound} could not find.
 * @public
 */
export const BLOG_WRITE_ENTITY = {
  AUTHOR: 'author',
  POST: 'post',
  TAG: 'tag',
} as const;

export type BlogWriteEntityKey = keyof typeof BLOG_WRITE_ENTITY;
export type BlogWriteEntityValue =
  (typeof BLOG_WRITE_ENTITY)[BlogWriteEntityKey];
