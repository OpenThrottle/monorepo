/**
 * @description Turns a repository `BlogWriteResult` into what a mutation returns. A slug
 * conflict becomes the typed `BlogSlugConflictError` (data); a missing post / author / tag is a
 * caller error and surfaces as a `NotFoundException` (a GraphQL error).
 */

import { ConflictException, NotFoundException } from '@nestjs/common';
import type { BlogPostWriteResult } from '@openthrottle/nestjs-repositories';
import { BLOG_WRITE_RESULT_KIND } from '@openthrottle/nestjs-repositories';

import type { BlogPostAdminObject } from './blog-post-admin.object.ts';
import { BlogSlugConflictError } from './blog-slug-conflict-error.object.ts';
import { toBlogPostAdminObject } from './to-blog-post-admin-object.ts';

const notFound = (entity: string, key: string): NotFoundException =>
  new NotFoundException(`Blog ${entity} "${key}" was not found.`);

/** Post mutations that can collide on slug: success object or the typed error. */
export const toBlogPostMutationResult = (
  result: BlogPostWriteResult,
): BlogPostAdminObject | BlogSlugConflictError => {
  switch (result.kind) {
    case BLOG_WRITE_RESULT_KIND.OK:
      return toBlogPostAdminObject(result.value);
    case BLOG_WRITE_RESULT_KIND.SLUG_CONFLICT:
      return Object.assign(new BlogSlugConflictError(), {
        message: `A blog post with the slug "${result.slug}" already exists.`,
        slug: result.slug,
      });
    case BLOG_WRITE_RESULT_KIND.NOT_FOUND:
      throw notFound(result.entity, result.key);
  }
};

/** Post mutations that never change a slug (publish, archive, tags): a clash cannot happen. */
export const toBlogPostOrThrow = (
  result: BlogPostWriteResult,
): BlogPostAdminObject => {
  const outcome = toBlogPostMutationResult(result);
  if (outcome instanceof BlogSlugConflictError) {
    throw new ConflictException(outcome.message);
  }
  return outcome;
};
