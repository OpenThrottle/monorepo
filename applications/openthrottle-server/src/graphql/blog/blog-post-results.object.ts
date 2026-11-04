/**
 * @description One result union per blog post mutation / admin query, each holding ONLY the
 * members that operation can produce, so a client's `__typename` switch is exhaustive without
 * dead branches (publish has no slug conflict, create has no stale write). Expected failures
 * are data, not GraphQL errors. All unions share {@link resolveBlogPostResultType}.
 */

import { createUnionType } from '@nestjs/graphql';

import { BlogCoverAltRequiredError } from './blog-cover-alt-required-error.object.ts';
import { BlogPostAdminObject } from './blog-post-admin.object.ts';
import { BlogPostNotFoundError } from './blog-post-not-found-error.object.ts';
import { BlogPostPublishPermissionRequiredError } from './blog-post-publish-permission-required-error.object.ts';
import { BlogPostStaleWriteError } from './blog-post-stale-write-error.object.ts';
import { BlogReferenceNotFoundError } from './blog-reference-not-found-error.object.ts';
import { BlogSlugConflictError } from './blog-slug-conflict-error.object.ts';

/** Every concrete type any of the unions can hold. */
type BlogPostResultMember =
  | typeof BlogCoverAltRequiredError
  | typeof BlogPostAdminObject
  | typeof BlogPostNotFoundError
  | typeof BlogPostPublishPermissionRequiredError
  | typeof BlogPostStaleWriteError
  | typeof BlogReferenceNotFoundError
  | typeof BlogSlugConflictError;

/**
 * @description Picks the concrete GraphQL type for a value of any blog post result union.
 * Errors are class instances; a post is the plain admin object, so it is the fallback.
 */
export const resolveBlogPostResultType = (
  value: unknown,
): BlogPostResultMember => {
  if (value instanceof BlogCoverAltRequiredError) {
    return BlogCoverAltRequiredError;
  }
  if (value instanceof BlogPostNotFoundError) return BlogPostNotFoundError;
  if (value instanceof BlogPostPublishPermissionRequiredError) {
    return BlogPostPublishPermissionRequiredError;
  }
  if (value instanceof BlogPostStaleWriteError) return BlogPostStaleWriteError;
  if (value instanceof BlogReferenceNotFoundError) {
    return BlogReferenceNotFoundError;
  }
  if (value instanceof BlogSlugConflictError) return BlogSlugConflictError;
  return BlogPostAdminObject;
};

export const CreateBlogPostResult = createUnionType({
  description: `The new DRAFT post, or why it was not created: the slug is taken, a cover image has no alt text, or the author slug is unknown.`,
  name: 'CreateBlogPostResult',
  resolveType: resolveBlogPostResultType,
  types: () =>
    [
      BlogPostAdminObject,
      BlogCoverAltRequiredError,
      BlogReferenceNotFoundError,
      BlogSlugConflictError,
    ] as const,
});

export const UpdateBlogPostResult = createUnionType({
  description: `The updated post, or why nothing was written: the post or author does not exist, the slug is taken, a cover image would have no alt text, the post changed since expectedUpdatedAt, or the post is no longer a DRAFT and the caller lacks blog:write.`,
  name: 'UpdateBlogPostResult',
  resolveType: resolveBlogPostResultType,
  types: () =>
    [
      BlogPostAdminObject,
      BlogCoverAltRequiredError,
      BlogPostNotFoundError,
      BlogPostPublishPermissionRequiredError,
      BlogPostStaleWriteError,
      BlogReferenceNotFoundError,
      BlogSlugConflictError,
    ] as const,
});

export const PublishBlogPostResult = createUnionType({
  description: `The published (or scheduled) post, or BlogPostNotFoundError.`,
  name: 'PublishBlogPostResult',
  resolveType: resolveBlogPostResultType,
  types: () => [BlogPostAdminObject, BlogPostNotFoundError] as const,
});

export const UnpublishBlogPostResult = createUnionType({
  description: `The post returned to DRAFT, or BlogPostNotFoundError.`,
  name: 'UnpublishBlogPostResult',
  resolveType: resolveBlogPostResultType,
  types: () => [BlogPostAdminObject, BlogPostNotFoundError] as const,
});

export const ArchiveBlogPostResult = createUnionType({
  description: `The archived post, or BlogPostNotFoundError.`,
  name: 'ArchiveBlogPostResult',
  resolveType: resolveBlogPostResultType,
  types: () => [BlogPostAdminObject, BlogPostNotFoundError] as const,
});

export const SetBlogPostTagsResult = createUnionType({
  description: `The post with its new tag set, or why nothing was written: the post does not exist, a tag slug is unknown, or the post is no longer a DRAFT and the caller lacks blog:write.`,
  name: 'SetBlogPostTagsResult',
  resolveType: resolveBlogPostResultType,
  types: () =>
    [
      BlogPostAdminObject,
      BlogPostNotFoundError,
      BlogPostPublishPermissionRequiredError,
      BlogReferenceNotFoundError,
    ] as const,
});

export const BlogAdminPostResult = createUnionType({
  description: `The post in any state, or BlogPostNotFoundError.`,
  name: 'BlogAdminPostResult',
  resolveType: resolveBlogPostResultType,
  types: () => [BlogPostAdminObject, BlogPostNotFoundError] as const,
});
