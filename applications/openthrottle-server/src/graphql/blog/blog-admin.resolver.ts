/**
 * @description Permission-guarded authoring API for the marketing-site blog (mutations and
 * admin queries). A SEPARATE class from the public `BlogResolver` on purpose: that class carries
 * a class-level `@Public()` that bypasses authentication, which must never cover a mutation.
 * Here the class-level `@UseGuards(GqlPermissionsGuard)` plus a per-operation `@Permissions(...)`
 * apply, and — because the class is NOT `@Public()` — the global auth guard rejects
 * unauthenticated calls before the permission guard runs.
 *
 * Two permissions split the surface (migrations 132, 133): `blog:draft` (admin + mcp) covers
 * the admin reads and creating / editing drafts; `blog:write` (admin only) covers publish,
 * unpublish, archive and the author / tag upserts. **Rule B:** editing a post that is no longer
 * a DRAFT (`updateBlogPost`, `setBlogPostTags`) also needs `blog:write`; a `blog:draft`-only
 * caller gets `BlogPostPublishPermissionRequiredError` and nothing is written. That depends on
 * the post's status, so it cannot be a static `@Permissions()` and is checked here, against the
 * same lookup the guard uses. All write logic lives in the repository services; this resolver
 * maps inputs and results.
 */

import { BadRequestException, UseGuards } from '@nestjs/common';
import { Args, ID, Int, Mutation, Query, Resolver } from '@nestjs/graphql';
import type { AuthPrincipal } from '@openthrottle/nestjs-auth';
import { CurrentUser } from '@openthrottle/nestjs-auth';
import { PERMISSIONS, Permissions } from '@openthrottle/nestjs-rbac';
import type {
  BlogPostState,
  FindAdminBlogPostInput,
} from '@openthrottle/nestjs-repositories';
import {
  BLOG_POST_STATUS,
  BlogAuthorsService,
  BlogPostsService,
  BlogTagsService,
  RolesService,
  ServiceAccountsService,
  UsersService,
} from '@openthrottle/nestjs-repositories';

import { GqlPermissionsGuard } from '../../guards/gql-permissions.guard.ts';
import {
  getEditorNameForPrincipal,
  getPermissionsForPrincipal,
} from '../../guards/principal-access.ts';
import {
  CreateBlogPostInput,
  PublishBlogPostInput,
  SetBlogPostTagsInput,
  UpdateBlogPostInput,
  UpsertBlogAuthorInput,
  UpsertBlogTagInput,
} from './blog-admin.input.ts';
import { BlogAuthorObject } from './blog-author.object.ts';
import {
  BlogAdminPostListResult,
  BlogPostAdminObject,
} from './blog-post-admin.object.ts';
import type { BlogPostNotFoundError } from './blog-post-not-found-error.object.ts';
import {
  ArchiveBlogPostResult,
  BlogAdminPostResult,
  CreateBlogPostResult,
  PublishBlogPostResult,
  SetBlogPostTagsResult,
  UnpublishBlogPostResult,
  UpdateBlogPostResult,
} from './blog-post-results.object.ts';
import { BlogPostStateEnum } from './blog-post-state.enum.ts';
import { BlogTagObject } from './blog-tag.object.ts';
import type {
  BlogPostTransitionOutcome,
  CreateBlogPostOutcome,
  SetBlogPostTagsOutcome,
  UpdateBlogPostOutcome,
} from './blog-write-outcome.ts';
import {
  blogPostNotFoundError,
  blogPostPublishPermissionRequiredError,
  toBlogPostTransitionOutcome,
  toCreateBlogPostOutcome,
  toSetBlogPostTagsOutcome,
  toUpdateBlogPostOutcome,
} from './blog-write-outcome.ts';
import { toBlogPostAdminObject } from './to-blog-post-admin-object.ts';
import { toBlogAuthorObject, toBlogTagObject } from './to-blog-post-object.ts';
import { toBlogPostPatch } from './to-blog-post-patch.ts';

const DEFAULT_PAGE_SIZE = 10;

/** `blogAdminPost`'s id-or-slug argument pair as a repository lookup plus the key to report. */
const toAdminPostLookup = (
  id: string | null | undefined,
  slug: string | null | undefined,
): { readonly input: FindAdminBlogPostInput; readonly key: string } => {
  if (id != null && slug == null) return { input: { id }, key: id };
  if (slug != null && id == null) return { input: { slug }, key: slug };
  throw new BadRequestException(
    'Provide exactly one of id or slug to look a blog post up.',
  );
};

@Resolver()
@UseGuards(GqlPermissionsGuard)
export class BlogAdminResolver {
  constructor(
    private readonly blogAuthorsService: BlogAuthorsService,
    private readonly blogPostsService: BlogPostsService,
    private readonly blogTagsService: BlogTagsService,
    private readonly rolesService: RolesService,
    private readonly serviceAccountsService: ServiceAccountsService,
    private readonly usersService: UsersService,
  ) {}

  @Query(() => BlogAdminPostListResult, {
    description: `Every blog post in any state, most recently edited first, with cursor pagination. Optionally filtered to one or more derived states and to a case-insensitive title / slug search.`,
  })
  @Permissions(PERMISSIONS.BLOG_DRAFT)
  async blogAdminPosts(
    @Args('state', { nullable: true, type: () => [BlogPostStateEnum] })
    state: readonly BlogPostState[] | null | undefined,
    @Args('first', { defaultValue: DEFAULT_PAGE_SIZE, type: () => Int })
    first: number,
    @Args('after', { nullable: true, type: () => String })
    after: string | null | undefined,
    @Args('search', { nullable: true, type: () => String })
    search: string | null | undefined,
  ): Promise<BlogAdminPostListResult> {
    const page = await this.blogPostsService.findAdminPosts({
      after,
      first,
      search,
      states: state,
    });

    return {
      endCursor: page.endCursor,
      hasNextPage: page.hasNextPage,
      items: page.items.map(toBlogPostAdminObject),
    };
  }

  @Query(() => BlogAdminPostResult, {
    description: `One blog post in any state, by id or by slug (exactly one of the two is required, otherwise the query is rejected). BlogPostNotFoundError when no such post exists.`,
  })
  @Permissions(PERMISSIONS.BLOG_DRAFT)
  async blogAdminPost(
    @Args('id', { nullable: true, type: () => ID })
    id: string | null | undefined,
    @Args('slug', { nullable: true, type: () => String })
    slug: string | null | undefined,
  ): Promise<BlogPostAdminObject | BlogPostNotFoundError> {
    const lookup = toAdminPostLookup(id, slug);
    const post = await this.blogPostsService.findAdminPost(lookup.input);

    return post == null
      ? blogPostNotFoundError(lookup.key)
      : toBlogPostAdminObject(post);
  }

  @Query(() => [BlogTagObject], {
    description: `Every blog tag (including tags no live post carries yet), ordered by name.`,
  })
  @Permissions(PERMISSIONS.BLOG_DRAFT)
  async blogAdminTags(): Promise<BlogTagObject[]> {
    const tags = await this.blogTagsService.findAllTags();

    return tags.map(toBlogTagObject);
  }

  @Query(() => [BlogAuthorObject], {
    description: `Every blog author, ordered by display name.`,
  })
  @Permissions(PERMISSIONS.BLOG_DRAFT)
  async blogAdminAuthors(): Promise<BlogAuthorObject[]> {
    const authors = await this.blogAuthorsService.findAllAuthors();

    return authors.map(toBlogAuthorObject);
  }

  @Mutation(() => CreateBlogPostResult, {
    description: `Create a blog post as a DRAFT. Returns BlogSlugConflictError when the slug is taken, BlogCoverAltRequiredError when a cover image has no alt text, and BlogReferenceNotFoundError for an unknown authorSlug.`,
  })
  @Permissions(PERMISSIONS.BLOG_DRAFT)
  async createBlogPost(
    @Args('input', { type: () => CreateBlogPostInput })
    input: CreateBlogPostInput,
    @CurrentUser() principal: AuthPrincipal | undefined,
  ): Promise<CreateBlogPostOutcome> {
    return toCreateBlogPostOutcome(
      await this.blogPostsService.createPost(
        input,
        await this.editorName(principal),
      ),
    );
  }

  @Mutation(() => UpdateBlogPostResult, {
    description: `Partially update a blog post. A caller holding only blog:draft may edit DRAFT posts; for any other post it gets BlogPostPublishPermissionRequiredError. Also returns BlogPostNotFoundError, BlogSlugConflictError, BlogCoverAltRequiredError, BlogReferenceNotFoundError (unknown authorSlug) and, when expectedUpdatedAt no longer matches, BlogPostStaleWriteError.`,
  })
  @Permissions(PERMISSIONS.BLOG_DRAFT)
  async updateBlogPost(
    @Args('input', { type: () => UpdateBlogPostInput })
    input: UpdateBlogPostInput,
    @CurrentUser() principal: AuthPrincipal | undefined,
  ): Promise<UpdateBlogPostOutcome> {
    if (await this.needsBlogWriteToEdit(input.id, principal)) {
      return blogPostPublishPermissionRequiredError();
    }

    return toUpdateBlogPostOutcome(
      await this.blogPostsService.updatePost(
        input.id,
        toBlogPostPatch(input),
        await this.editorName(principal),
        input.expectedUpdatedAt,
      ),
    );
  }

  @Mutation(() => PublishBlogPostResult, {
    description: `Publish a blog post: sets status PUBLISHED and publishedAt. Without publishedAt the post goes live now; a future publishedAt schedules it. Returns BlogPostNotFoundError for an unknown post.`,
  })
  @Permissions(PERMISSIONS.BLOG_WRITE)
  async publishBlogPost(
    @Args('input', { type: () => PublishBlogPostInput })
    input: PublishBlogPostInput,
    @CurrentUser() principal: AuthPrincipal | undefined,
  ): Promise<BlogPostTransitionOutcome> {
    return toBlogPostTransitionOutcome(
      'publishBlogPost',
      await this.blogPostsService.publishPost(
        input.id,
        await this.editorName(principal),
        input.publishedAt,
      ),
    );
  }

  @Mutation(() => UnpublishBlogPostResult, {
    description: `Return a blog post to DRAFT and clear its publishedAt. It stops being publicly visible immediately. Returns BlogPostNotFoundError for an unknown post.`,
  })
  @Permissions(PERMISSIONS.BLOG_WRITE)
  async unpublishBlogPost(
    @Args('id', { type: () => ID }) id: string,
    @CurrentUser() principal: AuthPrincipal | undefined,
  ): Promise<BlogPostTransitionOutcome> {
    return toBlogPostTransitionOutcome(
      'unpublishBlogPost',
      await this.blogPostsService.unpublishPost(
        id,
        await this.editorName(principal),
      ),
    );
  }

  @Mutation(() => ArchiveBlogPostResult, {
    description: `Archive a blog post. It stops being publicly visible; publishedAt is kept. Returns BlogPostNotFoundError for an unknown post.`,
  })
  @Permissions(PERMISSIONS.BLOG_WRITE)
  async archiveBlogPost(
    @Args('id', { type: () => ID }) id: string,
    @CurrentUser() principal: AuthPrincipal | undefined,
  ): Promise<BlogPostTransitionOutcome> {
    return toBlogPostTransitionOutcome(
      'archiveBlogPost',
      await this.blogPostsService.archivePost(
        id,
        await this.editorName(principal),
      ),
    );
  }

  @Mutation(() => SetBlogPostTagsResult, {
    description: `Replace the full set of tags on a blog post by tag slug. A caller holding only blog:draft may tag DRAFT posts; for any other post it gets BlogPostPublishPermissionRequiredError. Also returns BlogPostNotFoundError and BlogReferenceNotFoundError (unknown tag slug).`,
  })
  @Permissions(PERMISSIONS.BLOG_DRAFT)
  async setBlogPostTags(
    @Args('input', { type: () => SetBlogPostTagsInput })
    input: SetBlogPostTagsInput,
    @CurrentUser() principal: AuthPrincipal | undefined,
  ): Promise<SetBlogPostTagsOutcome> {
    if (await this.needsBlogWriteToEdit(input.postId, principal)) {
      return blogPostPublishPermissionRequiredError();
    }

    return toSetBlogPostTagsOutcome(
      await this.blogPostsService.setPostTags(
        input.postId,
        input.tagSlugs,
        await this.editorName(principal),
      ),
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

  /** Caller identity for `last_edited_by`; `null` only when there is no principal. */
  private async editorName(
    principal: AuthPrincipal | undefined,
  ): Promise<string | null> {
    return principal == null
      ? null
      : getEditorNameForPrincipal(
          {
            serviceAccountsService: this.serviceAccountsService,
            usersService: this.usersService,
          },
          principal,
        );
  }

  /**
   * Rule B: whether editing this post needs `blog:write` the caller lacks. A DRAFT is open to
   * every `blog:draft` holder; any other stored status is not. An unknown post returns false so
   * the write reports it as not found. The permission lookup is skipped for drafts.
   */
  private async needsBlogWriteToEdit(
    postId: string,
    principal: AuthPrincipal | undefined,
  ): Promise<boolean> {
    const status = await this.blogPostsService.findStatusById(postId);
    if (status == null || status === BLOG_POST_STATUS.DRAFT) return false;

    if (principal == null) return true;
    const permissions = await getPermissionsForPrincipal(
      this.rolesService,
      principal,
    );
    return !permissions.includes(PERMISSIONS.BLOG_WRITE);
  }
}
