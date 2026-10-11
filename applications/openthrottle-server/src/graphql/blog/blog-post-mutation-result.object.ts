/**
 * @description Result union for the blog post mutations that can collide on slug
 * (`createBlogPost`, `updateBlogPost`): the saved post, or a typed `BlogSlugConflictError`.
 */

import { createUnionType } from '@nestjs/graphql';

import { BlogPostAdminObject } from './blog-post-admin.object.ts';
import {
  BlogSlugConflictError,
  isBlogSlugConflictError,
} from './blog-slug-conflict-error.object.ts';

/** @description Picks the concrete GraphQL type for a value of the union. */
export const resolveBlogPostMutationType = (
  value: unknown,
): typeof BlogPostAdminObject | typeof BlogSlugConflictError =>
  isBlogSlugConflictError(value) ? BlogSlugConflictError : BlogPostAdminObject;

export const BlogPostMutationResult = createUnionType({
  description: `The saved post, or a BlogSlugConflictError when the slug is already used by another post.`,
  name: 'BlogPostMutationResult',
  resolveType: resolveBlogPostMutationType,
  types: () => [BlogPostAdminObject, BlogSlugConflictError] as const,
});
