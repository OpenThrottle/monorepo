import type { BlogCoverAltRequiredError } from '../blog-cover-alt-required-error.object.ts';
import type { BlogPostAdminObject } from '../blog-post-admin.object.ts';
import type { BlogPostNotFoundError } from '../blog-post-not-found-error.object.ts';
import type { BlogPostPublishPermissionRequiredError } from '../blog-post-publish-permission-required-error.object.ts';
import type { BlogPostStaleWriteError } from '../blog-post-stale-write-error.object.ts';
import type { BlogReferenceNotFoundError } from '../blog-reference-not-found-error.object.ts';
import type { BlogSlugConflictError } from '../blog-slug-conflict-error.object.ts';
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
