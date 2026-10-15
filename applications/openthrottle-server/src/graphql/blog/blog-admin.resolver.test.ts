/**
 * @description Tests for BlogAdminResolver: authorization (unauthenticated and under-privileged
 * calls are rejected by the REAL guards driven off the resolver's REAL metadata; admin passes),
 * result mapping (typed slug conflict, not-found, admin object), and service delegation.
 */

import { createMock } from '@golevelup/ts-vitest';
import type { ExecutionContext } from '@nestjs/common';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import {
  AUTH_PRINCIPAL_KIND_USER,
  IS_PUBLIC_KEY,
} from '@openthrottle/nestjs-auth';
import { LoggerService } from '@openthrottle/nestjs-modules';
import {
  PERMISSIONS,
  PERMISSIONS_KEY,
  ROLE_PERMISSIONS,
  ROLES,
} from '@openthrottle/nestjs-rbac';
import {
  type BlogAuthor,
  blogAuthorsFactory,
  BlogAuthorsService,
  type BlogPost,
  blogPostsFactory,
  BlogPostsService,
  type BlogTag,
  blogTagsFactory,
  BlogTagsService,
  RolesService,
} from '@openthrottle/nestjs-repositories';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { GlobalClsAuthHook } from '../../auth/global-cls-auth-hook.service.ts';
import { ServiceAccountAuthService } from '../../auth/service-account-auth.service.ts';
import { GlobalAuthGuard } from '../../guards/global-auth.guard.ts';
import { GqlJwtAuthGuard } from '../../guards/gql-jwt-auth.guard.ts';
import { GqlPermissionsGuard } from '../../guards/gql-permissions.guard.ts';
import { BlogResolver } from './blog.resolver.ts';
import { BlogAdminResolver } from './blog-admin.resolver.ts';
import { BlogPostAdminObject } from './blog-post-admin.object.ts';
import { resolveBlogPostMutationType } from './blog-post-mutation-result.object.ts';
import { BlogSlugConflictError } from './blog-slug-conflict-error.object.ts';

const MUTATIONS = [
  'createBlogPost',
  'updateBlogPost',
  'publishBlogPost',
  'unpublishBlogPost',
  'archiveBlogPost',
  'setBlogPostTags',
  'upsertBlogAuthor',
  'upsertBlogTag',
] as const;

const author: BlogAuthor = { ...blogAuthorsFactory.build({ slug: 'ada' }) };
const tag: BlogTag = { ...blogTagsFactory.build({ slug: 'ops' }), posts: [] };
const post: BlogPost = {
  ...blogPostsFactory.build({
    publishedAt: null,
    slug: 'hello-world',
    status: 'DRAFT',
  }),
  author,
  tags: [tag],
};

const userId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

describe('BlogAdminResolver', () => {
  const blogPostsService = createMock<BlogPostsService>();
  const blogAuthorsService = createMock<BlogAuthorsService>();
  const blogTagsService = createMock<BlogTagsService>();
  const rolesService = createMock<RolesService>();
  const jwtAuthGuard = createMock<GqlJwtAuthGuard>();

  let resolver: BlogAdminResolver;
  let globalAuthGuard: GlobalAuthGuard;
  let permissionsGuard: GqlPermissionsGuard;

  beforeEach(async () => {
    vi.resetAllMocks();

    const app = await Test.createTestingModule({
      providers: [
        BlogAdminResolver,
        GlobalAuthGuard,
        GqlPermissionsGuard,
        Reflector,
        { provide: BlogPostsService, useValue: blogPostsService },
        { provide: BlogAuthorsService, useValue: blogAuthorsService },
        { provide: BlogTagsService, useValue: blogTagsService },
        { provide: RolesService, useValue: rolesService },
        { provide: GqlJwtAuthGuard, useValue: jwtAuthGuard },
        {
          provide: GlobalClsAuthHook,
          useValue: createMock<GlobalClsAuthHook>(),
        },
        {
          provide: ServiceAccountAuthService,
          useValue: createMock<ServiceAccountAuthService>({
            isServiceAccountAuthorization: vi.fn().mockReturnValue(false),
          }),
        },
        { provide: LoggerService, useValue: createMock<LoggerService>() },
      ],
    }).compile();

    resolver = app.get(BlogAdminResolver);
    globalAuthGuard = app.get(GlobalAuthGuard);
    permissionsGuard = app.get(GqlPermissionsGuard);
  });

  describe('authorization', () => {
    /** The execution context the guards see for a call to `method` on the real resolver. */
    const contextFor = (
      method: (typeof MUTATIONS)[number],
      req: { headers?: object; user?: unknown },
    ): ExecutionContext =>
      createMock<ExecutionContext>({
        getClass: vi.fn().mockReturnValue(BlogAdminResolver),
        getHandler: vi
          .fn()
          .mockReturnValue(BlogAdminResolver.prototype[method]),
        getType: vi.fn().mockReturnValue('http'),
        switchToHttp: vi.fn().mockReturnValue({ getRequest: () => req }),
      });

    /** What the app's `APP_GUARD` + the resolver's `@UseGuards` do, in order. */
    const runGuards = async (
      method: (typeof MUTATIONS)[number],
      req: { headers?: object; user?: unknown },
    ): Promise<void> => {
      const ctx = contextFor(method, req);
      if (!(await globalAuthGuard.canActivate(ctx))) {
        throw new UnauthorizedException('Global auth rejected');
      }
      await permissionsGuard.canActivate(ctx);
    };

    test('the admin resolver is not @Public while the read resolver is', () => {
      expect(
        Reflect.getMetadata(IS_PUBLIC_KEY, BlogAdminResolver),
      ).toBeUndefined();
      expect(Reflect.getMetadata(IS_PUBLIC_KEY, BlogResolver)).toBe(true);
      for (const method of MUTATIONS) {
        expect(
          Reflect.getMetadata(
            IS_PUBLIC_KEY,
            BlogAdminResolver.prototype[method],
          ),
        ).toBeUndefined();
      }
    });

    test('class-level @UseGuards(GqlPermissionsGuard) is applied', () => {
      expect(Reflect.getMetadata(GUARDS_METADATA, BlogAdminResolver)).toEqual([
        GqlPermissionsGuard,
      ]);
    });

    test.each(MUTATIONS)('%s requires exactly blog:write', (method) => {
      expect(
        Reflect.getMetadata(
          PERMISSIONS_KEY,
          BlogAdminResolver.prototype[method],
        ),
      ).toEqual([PERMISSIONS.BLOG_WRITE]);
    });

    test.each(MUTATIONS)(
      '%s rejects an unauthenticated call before permissions are consulted',
      async (method) => {
        vi.mocked(jwtAuthGuard.canActivate).mockResolvedValue(false);

        await expect(runGuards(method, {})).rejects.toBeInstanceOf(
          UnauthorizedException,
        );
        expect(rolesService.getPermissionsForUser).not.toHaveBeenCalled();
      },
    );

    test.each(MUTATIONS)(
      '%s rejects an authenticated user without blog:write (Forbidden)',
      async (method) => {
        vi.mocked(jwtAuthGuard.canActivate).mockResolvedValue(true);
        // The `user` role: holds settings:write but not blog:write.
        vi.mocked(rolesService.getPermissionsForUser).mockResolvedValue([
          ...ROLE_PERMISSIONS[ROLES.USER],
        ]);
        const req = {
          user: { kind: AUTH_PRINCIPAL_KIND_USER, sub: userId },
        };

        await expect(runGuards(method, req)).rejects.toBeInstanceOf(
          ForbiddenException,
        );
        await expect(runGuards(method, req)).rejects.toThrow(
          /Missing permission: blog:write/,
        );
      },
    );

    test.each(MUTATIONS)(
      '%s rejects a service account with only plans permissions',
      async (method) => {
        vi.mocked(jwtAuthGuard.canActivate).mockResolvedValue(true);
        vi.mocked(rolesService.getPermissionsForUser).mockResolvedValue([
          ...ROLE_PERMISSIONS[ROLES.MCP],
        ]);
        const req = { user: { kind: AUTH_PRINCIPAL_KIND_USER, sub: userId } };

        await expect(runGuards(method, req)).rejects.toBeInstanceOf(
          ForbiddenException,
        );
      },
    );

    test.each(MUTATIONS)(
      '%s admits an admin holding blog:write',
      async (method) => {
        vi.mocked(jwtAuthGuard.canActivate).mockResolvedValue(true);
        vi.mocked(rolesService.getPermissionsForUser).mockResolvedValue([
          ...ROLE_PERMISSIONS[ROLES.ADMIN],
        ]);
        const req = { user: { kind: AUTH_PRINCIPAL_KIND_USER, sub: userId } };

        await expect(runGuards(method, req)).resolves.toBeUndefined();
      },
    );
  });

  describe('createBlogPost / updateBlogPost', () => {
    const createInput = {
      authorSlug: undefined,
      bodyMarkdown: '# Hi',
      coverImageAlt: undefined,
      coverImageUrl: undefined,
      excerpt: undefined,
      seoDescription: undefined,
      seoTitle: undefined,
      slug: 'hello-world',
      title: 'Hello',
    };

    test('createBlogPost maps a saved post to the admin object with status', async () => {
      vi.mocked(blogPostsService.createPost).mockResolvedValue({
        kind: 'ok',
        value: post,
      });

      const result = await resolver.createBlogPost(createInput);

      expect(blogPostsService.createPost).toHaveBeenCalledWith(createInput);
      expect(result).toMatchObject({
        author: { slug: 'ada' },
        id: post.id,
        publishedAt: null,
        slug: 'hello-world',
        status: 'DRAFT',
        tags: [{ slug: 'ops' }],
      });
    });

    test('createBlogPost returns a typed BlogSlugConflictError on a slug collision', async () => {
      vi.mocked(blogPostsService.createPost).mockResolvedValue({
        kind: 'slug-conflict',
        slug: 'hello-world',
      });

      const result = await resolver.createBlogPost(createInput);

      expect(result).toBeInstanceOf(BlogSlugConflictError);
      expect(result).toMatchObject({
        message: expect.stringContaining('hello-world'),
        slug: 'hello-world',
      });
    });

    test('createBlogPost surfaces a missing author as NotFoundException', async () => {
      vi.mocked(blogPostsService.createPost).mockResolvedValue({
        entity: 'author',
        key: 'ghost',
        kind: 'not-found',
      });

      await expect(resolver.createBlogPost(createInput)).rejects.toThrow(
        new NotFoundException('Blog author "ghost" was not found.'),
      );
    });

    test('createBlogPost propagates validation errors (malformed slug is a GraphQL error)', async () => {
      vi.mocked(blogPostsService.createPost).mockRejectedValue(
        new BadRequestException('slug "Bad" is invalid'),
      );

      await expect(
        resolver.createBlogPost({ ...createInput, slug: 'Bad' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    test('updateBlogPost forwards the id separately from the patch', async () => {
      vi.mocked(blogPostsService.updatePost).mockResolvedValue({
        kind: 'ok',
        value: post,
      });

      await resolver.updateBlogPost({
        ...createInput,
        bodyMarkdown: undefined,
        excerpt: null,
        id: post.id,
        slug: undefined,
        title: 'Retitled',
      });

      expect(blogPostsService.updatePost).toHaveBeenCalledWith(
        post.id,
        expect.objectContaining({ excerpt: null, title: 'Retitled' }),
      );
    });

    test('updateBlogPost returns BlogSlugConflictError when re-slugging onto a taken slug', async () => {
      vi.mocked(blogPostsService.updatePost).mockResolvedValue({
        kind: 'slug-conflict',
        slug: 'taken',
      });

      const result = await resolver.updateBlogPost({
        ...createInput,
        id: post.id,
        slug: 'taken',
      });

      expect(result).toBeInstanceOf(BlogSlugConflictError);
    });

    test.each(['slug', 'title', 'bodyMarkdown'] as const)(
      'updateBlogPost rejects an explicit null %s',
      async (field) => {
        await expect(
          resolver.updateBlogPost({
            ...createInput,
            [field]: null,
            id: post.id,
          }),
        ).rejects.toThrow(BadRequestException);
        expect(blogPostsService.updatePost).not.toHaveBeenCalled();
      },
    );

    test('updateBlogPost surfaces an unknown post as NotFoundException', async () => {
      vi.mocked(blogPostsService.updatePost).mockResolvedValue({
        entity: 'post',
        key: 'missing',
        kind: 'not-found',
      });

      await expect(
        resolver.updateBlogPost({ ...createInput, id: 'missing' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('publish / unpublish / archive / tags', () => {
    const published: BlogPost = {
      ...post,
      publishedAt: new Date('2026-12-25T09:00:00.000Z'),
      status: 'PUBLISHED',
    };

    test('publishBlogPost without publishedAt delegates with no date (service stamps now)', async () => {
      vi.mocked(blogPostsService.publishPost).mockResolvedValue({
        kind: 'ok',
        value: published,
      });

      await resolver.publishBlogPost({ id: post.id, publishedAt: undefined });

      expect(blogPostsService.publishPost).toHaveBeenCalledWith(
        post.id,
        undefined,
      );
    });

    test('publishBlogPost with a future publishedAt passes it through and exposes the schedule', async () => {
      vi.mocked(blogPostsService.publishPost).mockResolvedValue({
        kind: 'ok',
        value: published,
      });

      const result = await resolver.publishBlogPost({
        id: post.id,
        publishedAt: published.publishedAt,
      });

      expect(blogPostsService.publishPost).toHaveBeenCalledWith(
        post.id,
        published.publishedAt,
      );
      expect(result).toMatchObject({
        publishedAt: published.publishedAt,
        status: 'PUBLISHED',
      });
    });

    test.each([
      [
        'publishBlogPost',
        () => resolver.publishBlogPost({ id: 'x', publishedAt: null }),
        'publishPost',
      ],
      [
        'unpublishBlogPost',
        () => resolver.unpublishBlogPost('x'),
        'unpublishPost',
      ],
      ['archiveBlogPost', () => resolver.archiveBlogPost('x'), 'archivePost'],
      [
        'setBlogPostTags',
        () => resolver.setBlogPostTags({ postId: 'x', tagSlugs: [] }),
        'setPostTags',
      ],
    ] as const)(
      '%s surfaces an unknown post as NotFoundException',
      async (_name, run, service) => {
        vi.mocked(blogPostsService[service]).mockResolvedValue({
          entity: 'post',
          key: 'x',
          kind: 'not-found',
        });

        await expect(run()).rejects.toBeInstanceOf(NotFoundException);
      },
    );

    test('unpublishBlogPost and archiveBlogPost delegate by id', async () => {
      vi.mocked(blogPostsService.unpublishPost).mockResolvedValue({
        kind: 'ok',
        value: post,
      });
      vi.mocked(blogPostsService.archivePost).mockResolvedValue({
        kind: 'ok',
        value: { ...post, status: 'ARCHIVED' },
      });

      await resolver.unpublishBlogPost(post.id);
      const archived = await resolver.archiveBlogPost(post.id);

      expect(blogPostsService.unpublishPost).toHaveBeenCalledWith(post.id);
      expect(blogPostsService.archivePost).toHaveBeenCalledWith(post.id);
      expect(archived).toMatchObject({ status: 'ARCHIVED' });
    });

    test('setBlogPostTags delegates the slugs and surfaces a missing tag as NotFoundException', async () => {
      vi.mocked(blogPostsService.setPostTags).mockResolvedValueOnce({
        kind: 'ok',
        value: post,
      });
      await resolver.setBlogPostTags({ postId: post.id, tagSlugs: ['ops'] });
      expect(blogPostsService.setPostTags).toHaveBeenCalledWith(post.id, [
        'ops',
      ]);

      vi.mocked(blogPostsService.setPostTags).mockResolvedValueOnce({
        entity: 'tag',
        key: 'ghost',
        kind: 'not-found',
      });
      await expect(
        resolver.setBlogPostTags({ postId: post.id, tagSlugs: ['ghost'] }),
      ).rejects.toThrow('Blog tag "ghost" was not found.');
    });
  });

  describe('upsertBlogAuthor / upsertBlogTag', () => {
    test('upsertBlogAuthor delegates and never exposes id or userId', async () => {
      vi.mocked(blogAuthorsService.upsertAuthor).mockResolvedValue({
        ...author,
        userId: 'secret-user-id',
      });

      const result = await resolver.upsertBlogAuthor({
        avatarUrl: undefined,
        bio: undefined,
        displayName: 'Ada',
        slug: 'ada',
      });

      expect(blogAuthorsService.upsertAuthor).toHaveBeenCalledTimes(1);
      expect(result).toEqual({
        avatarUrl: author.avatarUrl,
        bio: author.bio,
        displayName: author.displayName,
        slug: 'ada',
      });
    });

    test('upsertBlogTag delegates and maps the tag', async () => {
      vi.mocked(blogTagsService.upsertTag).mockResolvedValue(tag);

      const result = await resolver.upsertBlogTag({
        description: undefined,
        name: 'Ops',
        slug: 'ops',
      });

      expect(blogTagsService.upsertTag).toHaveBeenCalledWith({
        description: undefined,
        name: 'Ops',
        slug: 'ops',
      });
      expect(result).toEqual({
        description: tag.description,
        name: tag.name,
        slug: 'ops',
      });
    });
  });

  describe('BlogPostMutationResult union', () => {
    const resolveType = resolveBlogPostMutationType;

    test('resolves the error object to BlogSlugConflictError', () => {
      expect(
        resolveType(
          Object.assign(new BlogSlugConflictError(), {
            message: 'm',
            slug: 's',
          }),
        ),
      ).toBe(BlogSlugConflictError);
    });

    test('resolves a mapped post to BlogPostAdminObject', () => {
      expect(resolveType({ id: 'x', slug: 's', status: 'DRAFT' })).toBe(
        BlogPostAdminObject,
      );
    });
  });
});
