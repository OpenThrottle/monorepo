/**
 * @description Permission-guarded write API for the marketing-site blog. A SEPARATE class from
 * the public `BlogResolver` on purpose: that class carries a class-level `@Public()` that
 * bypasses authentication, which must never cover a mutation. Here the class-level
 * `@UseGuards(GqlPermissionsGuard)` plus a per-mutation `@Permissions(PERMISSIONS.BLOG_WRITE)`
 * apply, and — because the class is NOT `@Public()` — the global auth guard rejects
 * unauthenticated calls before the permission guard runs. `blog:write` is held by `admin` only
 * (migration 132). All write logic lives in the repository services; this resolver maps inputs
 * and results.
 */

import { UseGuards } from '@nestjs/common';
import { Args, ID, Mutation, Resolver } from '@nestjs/graphql';
import { PERMISSIONS, Permissions } from '@openthrottle/nestjs-rbac';
import {
  BlogAuthorsService,
  BlogPostsService,
  BlogTagsService,
} from '@openthrottle/nestjs-repositories';

import { GqlPermissionsGuard } from '../../guards/gql-permissions.guard.ts';
import {
  CreateBlogPostInput,
  PublishBlogPostInput,
  SetBlogPostTagsInput,
  UpdateBlogPostInput,
  UpsertBlogAuthorInput,
  UpsertBlogTagInput,
} from './blog-admin.input.ts';
import { BlogAuthorObject } from './blog-author.object.ts';
import { BlogPostAdminObject } from './blog-post-admin.object.ts';
import { BlogPostMutationResult } from './blog-post-mutation-result.object.ts';
import type { BlogSlugConflictError } from './blog-slug-conflict-error.object.ts';
import { BlogTagObject } from './blog-tag.object.ts';
import {
  toBlogPostMutationResult,
  toBlogPostOrThrow,
} from './blog-write-outcome.ts';
import { toBlogAuthorObject, toBlogTagObject } from './to-blog-post-object.ts';
import { toBlogPostPatch } from './to-blog-post-patch.ts';

@Resolver()
@UseGuards(GqlPermissionsGuard)
export class BlogAdminResolver {
  constructor(
    private readonly blogAuthorsService: BlogAuthorsService,
    private readonly blogPostsService: BlogPostsService,
    private readonly blogTagsService: BlogTagsService,
  ) {}

  @Mutation(() => BlogPostMutationResult, {
    description: `Create a blog post as a DRAFT. Returns BlogSlugConflictError when the slug is taken.`,
  })
  @Permissions(PERMISSIONS.BLOG_WRITE)
  async createBlogPost(
    @Args('input', { type: () => CreateBlogPostInput })
    input: CreateBlogPostInput,
  ): Promise<BlogPostAdminObject | BlogSlugConflictError> {
    return toBlogPostMutationResult(
      await this.blogPostsService.createPost(input),
    );
  }

  @Mutation(() => BlogPostMutationResult, {
    description: `Partially update a blog post. Returns BlogSlugConflictError when re-slugging onto a slug that is taken.`,
  })
  @Permissions(PERMISSIONS.BLOG_WRITE)
  async updateBlogPost(
    @Args('input', { type: () => UpdateBlogPostInput })
    input: UpdateBlogPostInput,
  ): Promise<BlogPostAdminObject | BlogSlugConflictError> {
    return toBlogPostMutationResult(
      await this.blogPostsService.updatePost(input.id, toBlogPostPatch(input)),
    );
  }

  @Mutation(() => BlogPostAdminObject, {
    description: `Publish a blog post: sets status PUBLISHED and publishedAt. Without publishedAt the post goes live now; a future publishedAt schedules it.`,
  })
  @Permissions(PERMISSIONS.BLOG_WRITE)
  async publishBlogPost(
    @Args('input', { type: () => PublishBlogPostInput })
    input: PublishBlogPostInput,
  ): Promise<BlogPostAdminObject> {
    return toBlogPostOrThrow(
      await this.blogPostsService.publishPost(input.id, input.publishedAt),
    );
  }

  @Mutation(() => BlogPostAdminObject, {
    description: `Return a blog post to DRAFT and clear its publishedAt. It stops being publicly visible immediately.`,
  })
  @Permissions(PERMISSIONS.BLOG_WRITE)
  async unpublishBlogPost(
    @Args('id', { type: () => ID }) id: string,
  ): Promise<BlogPostAdminObject> {
    return toBlogPostOrThrow(await this.blogPostsService.unpublishPost(id));
  }

  @Mutation(() => BlogPostAdminObject, {
    description: `Archive a blog post. It stops being publicly visible; publishedAt is kept.`,
  })
  @Permissions(PERMISSIONS.BLOG_WRITE)
  async archiveBlogPost(
    @Args('id', { type: () => ID }) id: string,
  ): Promise<BlogPostAdminObject> {
    return toBlogPostOrThrow(await this.blogPostsService.archivePost(id));
  }

  @Mutation(() => BlogPostAdminObject, {
    description: `Replace the full set of tags on a blog post by tag slug.`,
  })
  @Permissions(PERMISSIONS.BLOG_WRITE)
  async setBlogPostTags(
    @Args('input', { type: () => SetBlogPostTagsInput })
    input: SetBlogPostTagsInput,
  ): Promise<BlogPostAdminObject> {
    return toBlogPostOrThrow(
      await this.blogPostsService.setPostTags(input.postId, input.tagSlugs),
    );
  }

  @Mutation(() => BlogAuthorObject, {
    description: `Create the blog author with this slug, or replace its fields if it exists.`,
  })
  @Permissions(PERMISSIONS.BLOG_WRITE)
  async upsertBlogAuthor(
    @Args('input', { type: () => UpsertBlogAuthorInput })
    input: UpsertBlogAuthorInput,
  ): Promise<BlogAuthorObject> {
    return toBlogAuthorObject(
      await this.blogAuthorsService.upsertAuthor(input),
    );
  }

  @Mutation(() => BlogTagObject, {
    description: `Create the blog tag with this slug, or replace its fields if it exists.`,
  })
  @Permissions(PERMISSIONS.BLOG_WRITE)
  async upsertBlogTag(
    @Args('input', { type: () => UpsertBlogTagInput })
    input: UpsertBlogTagInput,
  ): Promise<BlogTagObject> {
    return toBlogTagObject(await this.blogTagsService.upsertTag(input));
  }
}
