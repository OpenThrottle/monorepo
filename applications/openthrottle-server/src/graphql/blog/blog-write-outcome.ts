/**
 * @description Turns a repository `BlogPostWriteResult` into what each mutation returns. One
 * mapper per mutation, each returning exactly that mutation's union members (see
 * `blog-post-results.object.ts`): expected failures become typed error objects (data the caller
 * branches on). A result kind a mutation cannot produce is an invariant violation, not a client
 * error, and surfaces as an `InternalServerErrorException`.
 */

import { InternalServerErrorException } from '@nestjs/common';
import type {
  BlogPostWriteResult,
  BlogWriteNotFound,
} from '@openthrottle/nestjs-repositories';
import {
  BLOG_WRITE_ENTITY,
  BLOG_WRITE_RESULT_KIND,
} from '@openthrottle/nestjs-repositories';

import { BlogCoverAltRequiredError } from './blog-cover-alt-required-error.object.ts';
import type { BlogPostAdminObject } from './blog-post-admin.object.ts';
import { BlogPostNotFoundError } from './blog-post-not-found-error.object.ts';
import { BlogPostPublishPermissionRequiredError } from './blog-post-publish-permission-required-error.object.ts';
import { BlogPostStaleWriteError } from './blog-post-stale-write-error.object.ts';
import { BLOG_REFERENCE_ENTITY } from './blog-reference-entity.enum.ts';
import { BlogReferenceNotFoundError } from './blog-reference-not-found-error.object.ts';
import { BlogSlugConflictError } from './blog-slug-conflict-error.object.ts';
import { toBlogPostAdminObject } from './to-blog-post-admin-object.ts';

export type CreateBlogPostOutcome =
  | BlogCoverAltRequiredError
  | BlogPostAdminObject
  | BlogReferenceNotFoundError
  | BlogSlugConflictError;

export type UpdateBlogPostOutcome =
  | BlogCoverAltRequiredError
  | BlogPostAdminObject
  | BlogPostNotFoundError
  | BlogPostPublishPermissionRequiredError
  | BlogPostStaleWriteError
  | BlogReferenceNotFoundError
  | BlogSlugConflictError;

export type BlogPostTransitionOutcome =
  BlogPostAdminObject | BlogPostNotFoundError;

export type SetBlogPostTagsOutcome =
  | BlogPostAdminObject
  | BlogPostNotFoundError
  | BlogPostPublishPermissionRequiredError
  | BlogReferenceNotFoundError;

const unexpected = (
  operation: string,
  result: BlogPostWriteResult,
): InternalServerErrorException =>
  new InternalServerErrorException(
    `${operation} cannot produce a "${result.kind}" write result.`,
  );

/** The error object for a post that does not exist; `key` is the id or slug looked up. */
export const blogPostNotFoundError = (key: string): BlogPostNotFoundError =>
  Object.assign(new BlogPostNotFoundError(), {
    message: `Blog post "${key}" was not found.`,
  });

/** The error for a non-DRAFT post edited by a caller that holds only `blog:draft`. */
export const blogPostPublishPermissionRequiredError =
  (): BlogPostPublishPermissionRequiredError =>
    Object.assign(new BlogPostPublishPermissionRequiredError(), {
      message: `This post is no longer a draft. Editing a published, scheduled or archived post requires the blog:write permission.`,
    });

const blogCoverAltRequiredError = (): BlogCoverAltRequiredError =>
  Object.assign(new BlogCoverAltRequiredError(), {
    message: `A cover image needs alt text: set coverImageAlt or clear coverImageUrl.`,
  });

const blogSlugConflictError = (slug: string): BlogSlugConflictError =>
  Object.assign(new BlogSlugConflictError(), {
    message: `A blog post with the slug "${slug}" already exists.`,
    slug,
  });

const blogPostStaleWriteError = (
  currentUpdatedAt: Date,
): BlogPostStaleWriteError =>
  Object.assign(new BlogPostStaleWriteError(), {
    currentUpdatedAt,
    message: `The blog post changed since it was read; reload it and retry.`,
  });

/** An unknown author or tag slug; `operation` names the caller for the invariant message. */
const toReferenceNotFound = (
  operation: string,
  result: BlogWriteNotFound,
): BlogReferenceNotFoundError => {
  switch (result.entity) {
    case BLOG_WRITE_ENTITY.AUTHOR:
      return Object.assign(new BlogReferenceNotFoundError(), {
        entity: BLOG_REFERENCE_ENTITY.AUTHOR,
        key: result.key,
        message: `Blog author "${result.key}" was not found.`,
      });
    case BLOG_WRITE_ENTITY.TAG:
      return Object.assign(new BlogReferenceNotFoundError(), {
        entity: BLOG_REFERENCE_ENTITY.TAG,
        key: result.key,
        message: `Blog tag "${result.key}" was not found.`,
      });
    case BLOG_WRITE_ENTITY.POST:
      throw unexpected(operation, result);
  }
};

const toPostNotFound = (
  operation: string,
  result: BlogWriteNotFound,
): BlogPostNotFoundError => {
  if (result.entity !== BLOG_WRITE_ENTITY.POST) {
    throw unexpected(operation, result);
  }
  return blogPostNotFoundError(result.key);
};

/** A missing post, or a missing author / tag. */
const toAnyNotFound = (
  operation: string,
  result: BlogWriteNotFound,
): BlogPostNotFoundError | BlogReferenceNotFoundError =>
  result.entity === BLOG_WRITE_ENTITY.POST
    ? toPostNotFound(operation, result)
    : toReferenceNotFound(operation, result);

/** `createBlogPost`: slug conflict, missing cover alt, unknown author. */
export const toCreateBlogPostOutcome = (
  result: BlogPostWriteResult,
): CreateBlogPostOutcome => {
  switch (result.kind) {
    case BLOG_WRITE_RESULT_KIND.OK:
      return toBlogPostAdminObject(result.value);
    case BLOG_WRITE_RESULT_KIND.SLUG_CONFLICT:
      return blogSlugConflictError(result.slug);
    case BLOG_WRITE_RESULT_KIND.COVER_ALT_REQUIRED:
      return blogCoverAltRequiredError();
    case BLOG_WRITE_RESULT_KIND.NOT_FOUND:
      return toReferenceNotFound('createBlogPost', result);
    case BLOG_WRITE_RESULT_KIND.STALE_WRITE:
      throw unexpected('createBlogPost', result);
  }
};

/** `updateBlogPost`: every failure the repository can report for an update. */
export const toUpdateBlogPostOutcome = (
  result: BlogPostWriteResult,
): UpdateBlogPostOutcome => {
  switch (result.kind) {
    case BLOG_WRITE_RESULT_KIND.OK:
      return toBlogPostAdminObject(result.value);
    case BLOG_WRITE_RESULT_KIND.SLUG_CONFLICT:
      return blogSlugConflictError(result.slug);
    case BLOG_WRITE_RESULT_KIND.COVER_ALT_REQUIRED:
      return blogCoverAltRequiredError();
    case BLOG_WRITE_RESULT_KIND.NOT_FOUND:
      return toAnyNotFound('updateBlogPost', result);
    case BLOG_WRITE_RESULT_KIND.STALE_WRITE:
      return blogPostStaleWriteError(result.currentUpdatedAt);
  }
};

/**
 * `publishBlogPost`, `unpublishBlogPost`, `archiveBlogPost`: only a missing post can fail
 * (these change neither slug, cover nor author and carry no stale-write check).
 */
export const toBlogPostTransitionOutcome = (
  operation: string,
  result: BlogPostWriteResult,
): BlogPostTransitionOutcome => {
  switch (result.kind) {
    case BLOG_WRITE_RESULT_KIND.OK:
      return toBlogPostAdminObject(result.value);
    case BLOG_WRITE_RESULT_KIND.NOT_FOUND:
      return toPostNotFound(operation, result);
    case BLOG_WRITE_RESULT_KIND.COVER_ALT_REQUIRED:
    case BLOG_WRITE_RESULT_KIND.SLUG_CONFLICT:
    case BLOG_WRITE_RESULT_KIND.STALE_WRITE:
      throw unexpected(operation, result);
  }
};

/** `setBlogPostTags`: a missing post or an unknown tag slug. */
export const toSetBlogPostTagsOutcome = (
  result: BlogPostWriteResult,
): SetBlogPostTagsOutcome => {
  switch (result.kind) {
    case BLOG_WRITE_RESULT_KIND.OK:
      return toBlogPostAdminObject(result.value);
    case BLOG_WRITE_RESULT_KIND.NOT_FOUND:
      return toAnyNotFound('setBlogPostTags', result);
    case BLOG_WRITE_RESULT_KIND.COVER_ALT_REQUIRED:
    case BLOG_WRITE_RESULT_KIND.SLUG_CONFLICT:
    case BLOG_WRITE_RESULT_KIND.STALE_WRITE:
      throw unexpected('setBlogPostTags', result);
  }
};
