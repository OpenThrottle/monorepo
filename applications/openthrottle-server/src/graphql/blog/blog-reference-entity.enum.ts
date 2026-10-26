/**
 * @description Which kind of referenced record a {@link BlogReferenceNotFoundError} could not
 * find: the author or tag a write named by slug (the post itself is reported by
 * `BlogPostNotFoundError`).
 */

import { registerEnumType } from '@nestjs/graphql';

export const BLOG_REFERENCE_ENTITY = {
  AUTHOR: 'AUTHOR',
  TAG: 'TAG',
} as const;

export type BlogReferenceEntity =
  (typeof BLOG_REFERENCE_ENTITY)[keyof typeof BLOG_REFERENCE_ENTITY];

registerEnumType(BLOG_REFERENCE_ENTITY, {
  description: `The kind of record a blog write referenced by slug that does not exist.`,
  name: 'BlogReferenceEntity',
});

export { BLOG_REFERENCE_ENTITY as BlogReferenceEntityEnum };
