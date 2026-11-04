/**
 * @description Tests for BlogAdminResolver: authorization (unauthenticated and under-privileged
 * calls are rejected by the REAL guards driven off the resolver's REAL metadata; the `mcp` role
 * gets the draft operations only; admin passes everything), rule B (editing a non-DRAFT post
 * needs blog:write), every union branch of every operation, the admin queries, and caller
 * identity passed to the repositories as `last_edited_by`.
 */

import { createMock } from '@golevelup/ts-vitest';
import type { ExecutionContext } from '@nestjs/common';
import {
  BadRequestException,
  ForbiddenException,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import type { AuthPrincipal } from '@openthrottle/nestjs-auth';
import {
  AUTH_PRINCIPAL_KIND_SERVICE_ACCOUNT,
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
  BlogAuthorsService,
  type BlogPost,
  BlogPostsService,
  type BlogTag,
  BlogTagsService,
  RolesService,
  type ServiceAccount,
  ServiceAccountsService,
  UsersService,
} from '@openthrottle/nestjs-repositories';
import {
  blogAuthorsFactory,
  blogPostsFactory,
  blogTagsFactory,
  usersFactory,
} from '@openthrottle/nestjs-repositories/testing';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { GlobalClsAuthHook } from '../../auth/global-cls-auth-hook.service.ts';
import { ServiceAccountAuthService } from '../../auth/service-account-auth.service.ts';
import { GlobalAuthGuard } from '../../guards/global-auth.guard.ts';
import { GqlJwtAuthGuard } from '../../guards/gql-jwt-auth.guard.ts';
import { GqlPermissionsGuard } from '../../guards/gql-permissions.guard.ts';
import { BlogResolver } from './blog.resolver.ts';
import { BlogAdminResolver } from './blog-admin.resolver.ts';
import { BlogCoverAltRequiredError } from './blog-cover-alt-required-error.object.ts';
import { BlogPostAdminObject } from './blog-post-admin.object.ts';
import { BlogPostNotFoundError } from './blog-post-not-found-error.object.ts';
import { BlogPostPublishPermissionRequiredError } from './blog-post-publish-permission-required-error.object.ts';
import { resolveBlogPostResultType } from './blog-post-results.object.ts';
import { BlogPostStaleWriteError } from './blog-post-stale-write-error.object.ts';
import { BlogReferenceNotFoundError } from './blog-reference-not-found-error.object.ts';
import { BlogSlugConflictError } from './blog-slug-conflict-error.object.ts';

const DRAFT_OPERATIONS = [
  'blogAdminAuthors',
  'blogAdminPost',
  'blogAdminPosts',
  'blogAdminTags',
  'createBlogPost',
  'setBlogPostTags',
  'updateBlogPost',
] as const;

const WRITE_OPERATIONS = [
  'archiveBlogPost',
  'publishBlogPost',
  'unpublishBlogPost',
  'upsertBlogAuthor',
  'upsertBlogTag',
] as const;

const OPERATIONS = [...DRAFT_OPERATIONS, ...WRITE_OPERATIONS] as const;

const author: BlogAuthor = { ...blogAuthorsFactory.build({ slug: 'ada' }) };
const tag: BlogTag = { ...blogTagsFactory.build({ slug: 'ops' }), posts: [] };
const post: BlogPost = {
  ...blogPostsFactory.build({
    lastEditedBy: 'octocat',
    publishedAt: null,
    slug: 'hello-world',
    status: 'DRAFT',
  }),
  author,
  tags: [tag],
};

const userId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const serviceAccountId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

const userPrincipal: AuthPrincipal = {
  kind: AUTH_PRINCIPAL_KIND_USER,
  sub: userId,
};
const serviceAccountPrincipal: AuthPrincipal = {
  kind: AUTH_PRINCIPAL_KIND_SERVICE_ACCOUNT,
  sub: serviceAccountId,
};

const editor = {
  ...usersFactory.build({
    email: 'octo@example.com',
    githubUsername: 'octocat',
  }),
  roles: [],
};

const serviceAccount: ServiceAccount = {
  actingUserId: null,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  credentials: [],
  description: null,
  disabledAt: null,
  id: serviceAccountId,
  name: 'ot-mcp',
  roles: [],
};

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

const updateInput = {
  ...createInput,
  bodyMarkdown: undefined,
  expectedUpdatedAt: undefined,
  id: post.id,
  slug: undefined,
  title: 'Retitled',
};

describe('BlogAdminResolver', () => {
  const blogPostsService = createMock<BlogPostsService>();
  const blogAuthorsService = createMock<BlogAuthorsService>();
  const blogTagsService = createMock<BlogTagsService>();
  const rolesService = createMock<RolesService>();
  const usersService = createMock<UsersService>();
  const serviceAccountsService = createMock<ServiceAccountsService>();
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
        { provide: UsersService, useValue: usersService },
        { provide: ServiceAccountsService, useValue: serviceAccountsService },
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

    // Identity lookups default to a known editor; individual tests override.
    vi.mocked(usersService.findById).mockResolvedValue(editor);
    vi.mocked(serviceAccountsService.findById).mockResolvedValue(
      serviceAccount,
    );
  });

  describe('authorization', () => {
    /** The execution context the guards see for a call to `method` on the real resolver. */
    const contextFor = (
      method: (typeof OPERATIONS)[number],
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
      method: (typeof OPERATIONS)[number],
      req: { headers?: object; user?: unknown },
    ): Promise<void> => {
      const ctx = contextFor(method, req);
      if (!(await globalAuthGuard.canActivate(ctx))) {
        throw new UnauthorizedException('Global auth rejected');
      }
      await permissionsGuard.canActivate(ctx);
    };

    const asRole = (role: keyof typeof ROLE_PERMISSIONS): void => {
      vi.mocked(jwtAuthGuard.canActivate).mockResolvedValue(true);
      vi.mocked(rolesService.getPermissionsForUser).mockResolvedValue([
        ...ROLE_PERMISSIONS[role],
      ]);
    };

    const userRequest = { user: userPrincipal };

    test('the admin resolver is not @Public while the read resolver is', () => {
      expect(
        Reflect.getMetadata(IS_PUBLIC_KEY, BlogAdminResolver),
      ).toBeUndefined();
      expect(Reflect.getMetadata(IS_PUBLIC_KEY, BlogResolver)).toBe(true);
      for (const method of OPERATIONS) {
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

    test.each(DRAFT_OPERATIONS)('%s requires exactly blog:draft', (method) => {
      expect(
        Reflect.getMetadata(
          PERMISSIONS_KEY,
          BlogAdminResolver.prototype[method],
        ),
      ).toEqual([PERMISSIONS.BLOG_DRAFT]);
    });

    test.each(WRITE_OPERATIONS)('%s requires exactly blog:write', (method) => {
      expect(
        Reflect.getMetadata(
          PERMISSIONS_KEY,
          BlogAdminResolver.prototype[method],
        ),
      ).toEqual([PERMISSIONS.BLOG_WRITE]);
    });

    test.each(OPERATIONS)(
      '%s rejects an unauthenticated call before permissions are consulted',
      async (method) => {
        vi.mocked(jwtAuthGuard.canActivate).mockResolvedValue(false);

        await expect(runGuards(method, {})).rejects.toBeInstanceOf(
          UnauthorizedException,
        );
        expect(rolesService.getPermissionsForUser).not.toHaveBeenCalled();
      },
    );

    test.each(OPERATIONS)(
      '%s rejects an authenticated user holding neither blog permission (Forbidden)',
      async (method) => {
        // The `user` role: holds settings:write but no blog permission.
        asRole(ROLES.USER);

        await expect(runGuards(method, userRequest)).rejects.toBeInstanceOf(
          ForbiddenException,
        );
        await expect(runGuards(method, userRequest)).rejects.toThrow(
          /Missing permission: blog:(draft|write)/,
        );
      },
    );

    test.each(DRAFT_OPERATIONS)(
      '%s admits the mcp role (blog:draft)',
      async (method) => {
        asRole(ROLES.MCP);

        await expect(runGuards(method, userRequest)).resolves.toBeUndefined();
      },
    );

    test.each(WRITE_OPERATIONS)(
      '%s is FORBIDDEN for the mcp role (no blog:write)',
      async (method) => {
        asRole(ROLES.MCP);

        await expect(runGuards(method, userRequest)).rejects.toBeInstanceOf(
          ForbiddenException,
        );
        await expect(runGuards(method, userRequest)).rejects.toThrow(
          /Missing permission: blog:write/,
        );
      },
    );

    test.each(OPERATIONS)('%s admits an admin', async (method) => {
      asRole(ROLES.ADMIN);

      await expect(runGuards(method, userRequest)).resolves.toBeUndefined();
    });

    test('a service account principal is authorized through its own roles', async () => {
      vi.mocked(jwtAuthGuard.canActivate).mockResolvedValue(true);
      vi.mocked(rolesService.getPermissionsForServiceAccount).mockResolvedValue(
        [...ROLE_PERMISSIONS[ROLES.MCP]],
      );

      await expect(
        runGuards('createBlogPost', { user: serviceAccountPrincipal }),
      ).resolves.toBeUndefined();
      await expect(
        runGuards('publishBlogPost', { user: serviceAccountPrincipal }),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(rolesService.getPermissionsForUser).not.toHaveBeenCalled();
    });
  });

  describe('admin queries', () => {
    test('blogAdminPosts forwards state / cursor / search and maps items with state', async () => {
      vi.mocked(blogPostsService.findAdminPosts).mockResolvedValue({
        endCursor: 'cursor-1',
        hasNextPage: true,
        items: [post],
      });

      const result = await resolver.blogAdminPosts(
        ['DRAFT', 'SCHEDULED'],
        5,
        'cursor-0',
        'hello',
      );

      expect(blogPostsService.findAdminPosts).toHaveBeenCalledWith({
        after: 'cursor-0',
        first: 5,
        search: 'hello',
        states: ['DRAFT', 'SCHEDULED'],
      });
      expect(result).toMatchObject({
        endCursor: 'cursor-1',
        hasNextPage: true,
        items: [{ id: post.id, lastEditedBy: 'octocat', state: 'DRAFT' }],
      });
    });

    test('blogAdminPosts with no filters passes nulls through', async () => {
      vi.mocked(blogPostsService.findAdminPosts).mockResolvedValue({
        endCursor: null,
        hasNextPage: false,
        items: [],
      });

      const result = await resolver.blogAdminPosts(
        undefined,
        10,
        undefined,
        undefined,
      );

      expect(result).toEqual({
        endCursor: null,
        hasNextPage: false,
        items: [],
      });
    });

    describe('blogAdminPost', () => {
      test('by id returns the post with derived state', async () => {
        vi.mocked(blogPostsService.findAdminPost).mockResolvedValue({
          ...post,
          publishedAt: new Date('2000-01-01T00:00:00.000Z'),
          status: 'PUBLISHED',
        });

        const result = await resolver.blogAdminPost(post.id, undefined);

        expect(blogPostsService.findAdminPost).toHaveBeenCalledWith({
          id: post.id,
        });
        expect(result).toMatchObject({ state: 'LIVE', status: 'PUBLISHED' });
      });

      test('by slug looks the post up by slug', async () => {
        vi.mocked(blogPostsService.findAdminPost).mockResolvedValue(post);

        await resolver.blogAdminPost(null, 'hello-world');

        expect(blogPostsService.findAdminPost).toHaveBeenCalledWith({
          slug: 'hello-world',
        });
      });

      test('returns BlogPostNotFoundError for an unknown post', async () => {
        vi.mocked(blogPostsService.findAdminPost).mockResolvedValue(null);

        const result = await resolver.blogAdminPost(undefined, 'ghost');

        expect(result).toBeInstanceOf(BlogPostNotFoundError);
        expect(result).toMatchObject({
          message: expect.stringContaining('ghost'),
        });
      });

      test.each([
        ['neither id nor slug', undefined, undefined],
        ['both id and slug', 'some-id', 'some-slug'],
      ])(
        'rejects %s as a validation error, not a union member',
        async (_name, id, slug) => {
          await expect(resolver.blogAdminPost(id, slug)).rejects.toBeInstanceOf(
            BadRequestException,
          );
          expect(blogPostsService.findAdminPost).not.toHaveBeenCalled();
        },
      );
    });

    test('blogAdminTags and blogAdminAuthors map every row to the public objects', async () => {
      vi.mocked(blogTagsService.findAllTags).mockResolvedValue([tag]);
      vi.mocked(blogAuthorsService.findAllAuthors).mockResolvedValue([
        { ...author, userId: 'secret-user-id' },
      ]);

      expect(await resolver.blogAdminTags()).toEqual([
        { description: tag.description, name: tag.name, slug: 'ops' },
      ]);
      expect(await resolver.blogAdminAuthors()).toEqual([
        {
          avatarUrl: author.avatarUrl,
          bio: author.bio,
          displayName: author.displayName,
          slug: 'ada',
        },
      ]);
    });
  });

  describe('createBlogPost', () => {
    test('returns the saved post and stamps the user editor name', async () => {
      vi.mocked(blogPostsService.createPost).mockResolvedValue({
        kind: 'ok',
        value: post,
      });

      const result = await resolver.createBlogPost(createInput, userPrincipal);

      expect(usersService.findById).toHaveBeenCalledWith(userId);
      expect(blogPostsService.createPost).toHaveBeenCalledWith(
        createInput,
        'octocat',
      );
      expect(result).toMatchObject({
        author: { slug: 'ada' },
        id: post.id,
        publishedAt: null,
        slug: 'hello-world',
        state: 'DRAFT',
        status: 'DRAFT',
        tags: [{ slug: 'ops' }],
      });
    });

    test('stamps a service account by its name', async () => {
      vi.mocked(blogPostsService.createPost).mockResolvedValue({
        kind: 'ok',
        value: post,
      });

      await resolver.createBlogPost(createInput, serviceAccountPrincipal);

      expect(serviceAccountsService.findById).toHaveBeenCalledWith(
        serviceAccountId,
      );
      expect(usersService.findById).not.toHaveBeenCalled();
      expect(blogPostsService.createPost).toHaveBeenCalledWith(
        createInput,
        'ot-mcp',
      );
    });

    test('returns BlogSlugConflictError on a slug collision', async () => {
      vi.mocked(blogPostsService.createPost).mockResolvedValue({
        kind: 'slug-conflict',
        slug: 'hello-world',
      });

      const result = await resolver.createBlogPost(createInput, userPrincipal);

      expect(result).toBeInstanceOf(BlogSlugConflictError);
      expect(result).toMatchObject({
        message: expect.stringContaining('hello-world'),
        slug: 'hello-world',
      });
    });

    test('returns BlogCoverAltRequiredError when a cover has no alt text', async () => {
      vi.mocked(blogPostsService.createPost).mockResolvedValue({
        kind: 'cover-alt-required',
      });

      const result = await resolver.createBlogPost(createInput, userPrincipal);

      expect(result).toBeInstanceOf(BlogCoverAltRequiredError);
      expect(result).toMatchObject({
        message: expect.stringContaining('alt text'),
      });
    });

    test('returns BlogReferenceNotFoundError for an unknown author', async () => {
      vi.mocked(blogPostsService.createPost).mockResolvedValue({
        entity: 'author',
        key: 'ghost',
        kind: 'not-found',
      });

      const result = await resolver.createBlogPost(createInput, userPrincipal);

      expect(result).toBeInstanceOf(BlogReferenceNotFoundError);
      expect(result).toMatchObject({
        entity: 'AUTHOR',
        key: 'ghost',
        message: 'Blog author "ghost" was not found.',
      });
    });

    test.each([
      ['a post not-found', { entity: 'post', key: 'x', kind: 'not-found' }],
      ['a stale write', { currentUpdatedAt: new Date(), kind: 'stale-write' }],
    ] as const)(
      'treats %s as an invariant violation, not a union member',
      async (_name, result) => {
        vi.mocked(blogPostsService.createPost).mockResolvedValue(result);

        await expect(
          resolver.createBlogPost(createInput, userPrincipal),
        ).rejects.toBeInstanceOf(InternalServerErrorException);
      },
    );

    test('propagates validation errors (malformed slug is a GraphQL error)', async () => {
      vi.mocked(blogPostsService.createPost).mockRejectedValue(
        new BadRequestException('slug "Bad" is invalid'),
      );

      await expect(
        resolver.createBlogPost({ ...createInput, slug: 'Bad' }, userPrincipal),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('updateBlogPost', () => {
    beforeEach(() => {
      vi.mocked(blogPostsService.findStatusById).mockResolvedValue('DRAFT');
    });

    test('forwards the id separately from the patch, plus editor name and expectedUpdatedAt', async () => {
      vi.mocked(blogPostsService.updatePost).mockResolvedValue({
        kind: 'ok',
        value: post,
      });
      const expectedUpdatedAt = new Date('2026-01-02T03:04:05.000Z');

      const result = await resolver.updateBlogPost(
        { ...updateInput, excerpt: null, expectedUpdatedAt },
        userPrincipal,
      );

      expect(blogPostsService.updatePost).toHaveBeenCalledWith(
        post.id,
        expect.objectContaining({ excerpt: null, title: 'Retitled' }),
        'octocat',
        expectedUpdatedAt,
      );
      expect(result).toBeInstanceOf(Object);
      expect(result).toMatchObject({ id: post.id });
    });

    test('returns BlogSlugConflictError when re-slugging onto a taken slug', async () => {
      vi.mocked(blogPostsService.updatePost).mockResolvedValue({
        kind: 'slug-conflict',
        slug: 'taken',
      });

      const result = await resolver.updateBlogPost(
        { ...updateInput, slug: 'taken' },
        userPrincipal,
      );

      expect(result).toBeInstanceOf(BlogSlugConflictError);
    });

    test('returns BlogCoverAltRequiredError', async () => {
      vi.mocked(blogPostsService.updatePost).mockResolvedValue({
        kind: 'cover-alt-required',
      });

      expect(
        await resolver.updateBlogPost(updateInput, userPrincipal),
      ).toBeInstanceOf(BlogCoverAltRequiredError);
    });

    test('returns BlogPostStaleWriteError carrying currentUpdatedAt', async () => {
      const currentUpdatedAt = new Date('2026-05-06T07:08:09.000Z');
      vi.mocked(blogPostsService.updatePost).mockResolvedValue({
        currentUpdatedAt,
        kind: 'stale-write',
      });

      const result = await resolver.updateBlogPost(updateInput, userPrincipal);

      expect(result).toBeInstanceOf(BlogPostStaleWriteError);
      expect(result).toMatchObject({ currentUpdatedAt });
    });

    test('returns BlogPostNotFoundError for an unknown post', async () => {
      vi.mocked(blogPostsService.findStatusById).mockResolvedValue(null);
      vi.mocked(blogPostsService.updatePost).mockResolvedValue({
        entity: 'post',
        key: post.id,
        kind: 'not-found',
      });

      const result = await resolver.updateBlogPost(updateInput, userPrincipal);

      expect(result).toBeInstanceOf(BlogPostNotFoundError);
    });

    test('returns BlogReferenceNotFoundError for an unknown author', async () => {
      vi.mocked(blogPostsService.updatePost).mockResolvedValue({
        entity: 'author',
        key: 'ghost',
        kind: 'not-found',
      });

      const result = await resolver.updateBlogPost(
        { ...updateInput, authorSlug: 'ghost' },
        userPrincipal,
      );

      expect(result).toBeInstanceOf(BlogReferenceNotFoundError);
      expect(result).toMatchObject({ entity: 'AUTHOR', key: 'ghost' });
    });

    test.each(['slug', 'title', 'bodyMarkdown'] as const)(
      'rejects an explicit null %s',
      async (field) => {
        await expect(
          resolver.updateBlogPost(
            { ...updateInput, [field]: null },
            userPrincipal,
          ),
        ).rejects.toBeInstanceOf(BadRequestException);
        expect(blogPostsService.updatePost).not.toHaveBeenCalled();
      },
    );
  });

  describe('rule B: editing a non-DRAFT post needs blog:write', () => {
    const mcpPermissions = [...ROLE_PERMISSIONS[ROLES.MCP]];
    const adminPermissions = [...ROLE_PERMISSIONS[ROLES.ADMIN]];

    const setCaller = (permissions: string[]): void => {
      vi.mocked(rolesService.getPermissionsForServiceAccount).mockResolvedValue(
        permissions,
      );
      vi.mocked(blogPostsService.updatePost).mockResolvedValue({
        kind: 'ok',
        value: post,
      });
      vi.mocked(blogPostsService.setPostTags).mockResolvedValue({
        kind: 'ok',
        value: post,
      });
    };

    const OPERATION_CASES = [
      [
        'updateBlogPost',
        () => resolver.updateBlogPost(updateInput, serviceAccountPrincipal),
        'updatePost',
      ],
      [
        'setBlogPostTags',
        () =>
          resolver.setBlogPostTags(
            { postId: post.id, tagSlugs: ['ops'] },
            serviceAccountPrincipal,
          ),
        'setPostTags',
      ],
    ] as const;

    describe.each(OPERATION_CASES)('%s', (_name, run, writeMethod) => {
      test('mcp caller may edit a DRAFT without a permission lookup', async () => {
        setCaller(mcpPermissions);
        vi.mocked(blogPostsService.findStatusById).mockResolvedValue('DRAFT');

        const result = await run();

        expect(result).toBeInstanceOf(Object);
        expect(result).not.toBeInstanceOf(
          BlogPostPublishPermissionRequiredError,
        );
        expect(blogPostsService[writeMethod]).toHaveBeenCalledTimes(1);
        expect(
          rolesService.getPermissionsForServiceAccount,
        ).not.toHaveBeenCalled();
      });

      test.each(['PUBLISHED', 'ARCHIVED'] as const)(
        'mcp caller is rejected on a %s post and nothing is written',
        async (status) => {
          setCaller(mcpPermissions);
          vi.mocked(blogPostsService.findStatusById).mockResolvedValue(status);

          const result = await run();

          expect(result).toBeInstanceOf(BlogPostPublishPermissionRequiredError);
          expect(result).toMatchObject({
            message: expect.stringContaining('blog:write'),
          });
          expect(blogPostsService[writeMethod]).not.toHaveBeenCalled();
          expect(
            rolesService.getPermissionsForServiceAccount,
          ).toHaveBeenCalledWith(serviceAccountId);
        },
      );

      test.each(['DRAFT', 'PUBLISHED', 'ARCHIVED'] as const)(
        'admin caller may edit a %s post',
        async (status) => {
          setCaller(adminPermissions);
          vi.mocked(blogPostsService.findStatusById).mockResolvedValue(status);

          const result = await run();

          expect(result).not.toBeInstanceOf(
            BlogPostPublishPermissionRequiredError,
          );
          expect(blogPostsService[writeMethod]).toHaveBeenCalledTimes(1);
        },
      );

      test('an unknown post is left to the write to report as not found', async () => {
        setCaller(mcpPermissions);
        vi.mocked(blogPostsService.findStatusById).mockResolvedValue(null);
        vi.mocked(blogPostsService[writeMethod]).mockResolvedValue({
          entity: 'post',
          key: post.id,
          kind: 'not-found',
        });

        expect(await run()).toBeInstanceOf(BlogPostNotFoundError);
        expect(
          rolesService.getPermissionsForServiceAccount,
        ).not.toHaveBeenCalled();
      });
    });

    test('a user principal is looked up through the user roles', async () => {
      vi.mocked(blogPostsService.findStatusById).mockResolvedValue('PUBLISHED');
      vi.mocked(rolesService.getPermissionsForUser).mockResolvedValue(
        adminPermissions,
      );
      vi.mocked(blogPostsService.updatePost).mockResolvedValue({
        kind: 'ok',
        value: post,
      });

      await resolver.updateBlogPost(updateInput, userPrincipal);

      expect(rolesService.getPermissionsForUser).toHaveBeenCalledWith(userId);
      expect(blogPostsService.updatePost).toHaveBeenCalledTimes(1);
    });

    test('a missing principal cannot edit a non-DRAFT post', async () => {
      vi.mocked(blogPostsService.findStatusById).mockResolvedValue('PUBLISHED');

      const result = await resolver.updateBlogPost(updateInput, undefined);

      expect(result).toBeInstanceOf(BlogPostPublishPermissionRequiredError);
      expect(blogPostsService.updatePost).not.toHaveBeenCalled();
    });
  });

  describe('setBlogPostTags', () => {
    beforeEach(() => {
      vi.mocked(blogPostsService.findStatusById).mockResolvedValue('DRAFT');
    });

    test('delegates the slugs with the editor name', async () => {
      vi.mocked(blogPostsService.setPostTags).mockResolvedValue({
        kind: 'ok',
        value: post,
      });

      const result = await resolver.setBlogPostTags(
        { postId: post.id, tagSlugs: ['ops'] },
        userPrincipal,
      );

      expect(blogPostsService.setPostTags).toHaveBeenCalledWith(
        post.id,
        ['ops'],
        'octocat',
      );
      expect(result).toMatchObject({ id: post.id });
    });

    test('returns BlogPostNotFoundError for an unknown post', async () => {
      vi.mocked(blogPostsService.setPostTags).mockResolvedValue({
        entity: 'post',
        key: post.id,
        kind: 'not-found',
      });

      expect(
        await resolver.setBlogPostTags(
          { postId: post.id, tagSlugs: [] },
          userPrincipal,
        ),
      ).toBeInstanceOf(BlogPostNotFoundError);
    });

    test('returns BlogReferenceNotFoundError for an unknown tag slug', async () => {
      vi.mocked(blogPostsService.setPostTags).mockResolvedValue({
        entity: 'tag',
        key: 'ghost',
        kind: 'not-found',
      });

      const result = await resolver.setBlogPostTags(
        { postId: post.id, tagSlugs: ['ghost'] },
        userPrincipal,
      );

      expect(result).toBeInstanceOf(BlogReferenceNotFoundError);
      expect(result).toMatchObject({
        entity: 'TAG',
        key: 'ghost',
        message: 'Blog tag "ghost" was not found.',
      });
    });
  });

  describe('publish / unpublish / archive', () => {
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

      await resolver.publishBlogPost(
        { id: post.id, publishedAt: undefined },
        userPrincipal,
      );

      expect(blogPostsService.publishPost).toHaveBeenCalledWith(
        post.id,
        'octocat',
        undefined,
      );
    });

    test('publishBlogPost with a future publishedAt passes it through and exposes the schedule', async () => {
      vi.mocked(blogPostsService.publishPost).mockResolvedValue({
        kind: 'ok',
        value: published,
      });

      const result = await resolver.publishBlogPost(
        { id: post.id, publishedAt: published.publishedAt },
        userPrincipal,
      );

      expect(blogPostsService.publishPost).toHaveBeenCalledWith(
        post.id,
        'octocat',
        published.publishedAt,
      );
      expect(result).toMatchObject({
        publishedAt: published.publishedAt,
        state: 'SCHEDULED',
        status: 'PUBLISHED',
      });
    });

    test.each([
      [
        'publishBlogPost',
        () =>
          resolver.publishBlogPost(
            { id: 'x', publishedAt: null },
            userPrincipal,
          ),
        'publishPost',
      ],
      [
        'unpublishBlogPost',
        () => resolver.unpublishBlogPost('x', userPrincipal),
        'unpublishPost',
      ],
      [
        'archiveBlogPost',
        () => resolver.archiveBlogPost('x', userPrincipal),
        'archivePost',
      ],
    ] as const)(
      '%s returns BlogPostNotFoundError for an unknown post',
      async (_name, run, service) => {
        vi.mocked(blogPostsService[service]).mockResolvedValue({
          entity: 'post',
          key: 'x',
          kind: 'not-found',
        });

        const result = await run();

        expect(result).toBeInstanceOf(BlogPostNotFoundError);
        expect(result).toMatchObject({
          message: 'Blog post "x" was not found.',
        });
      },
    );

    test.each([
      ['a slug conflict', { kind: 'slug-conflict', slug: 's' }],
      ['a cover-alt failure', { kind: 'cover-alt-required' }],
      ['a stale write', { currentUpdatedAt: new Date(), kind: 'stale-write' }],
      [
        'an author not-found',
        { entity: 'author', key: 'a', kind: 'not-found' },
      ],
    ] as const)(
      'treat %s as an invariant violation (not in their unions)',
      async (_name, result) => {
        vi.mocked(blogPostsService.publishPost).mockResolvedValue(result);

        await expect(
          resolver.publishBlogPost(
            { id: 'x', publishedAt: undefined },
            userPrincipal,
          ),
        ).rejects.toBeInstanceOf(InternalServerErrorException);
      },
    );

    test('unpublishBlogPost and archiveBlogPost delegate by id with the editor name', async () => {
      vi.mocked(blogPostsService.unpublishPost).mockResolvedValue({
        kind: 'ok',
        value: post,
      });
      vi.mocked(blogPostsService.archivePost).mockResolvedValue({
        kind: 'ok',
        value: { ...post, status: 'ARCHIVED' },
      });

      await resolver.unpublishBlogPost(post.id, serviceAccountPrincipal);
      const archived = await resolver.archiveBlogPost(
        post.id,
        serviceAccountPrincipal,
      );

      expect(blogPostsService.unpublishPost).toHaveBeenCalledWith(
        post.id,
        'ot-mcp',
      );
      expect(blogPostsService.archivePost).toHaveBeenCalledWith(
        post.id,
        'ot-mcp',
      );
      expect(archived).toMatchObject({ state: 'ARCHIVED', status: 'ARCHIVED' });
    });
  });

  describe('caller identity', () => {
    test('a missing principal stamps null', async () => {
      vi.mocked(blogPostsService.createPost).mockResolvedValue({
        kind: 'ok',
        value: post,
      });

      await resolver.createBlogPost(createInput, undefined);

      expect(blogPostsService.createPost).toHaveBeenCalledWith(
        createInput,
        null,
      );
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

  describe('result union type resolution', () => {
    test.each([
      [BlogCoverAltRequiredError],
      [BlogPostNotFoundError],
      [BlogPostPublishPermissionRequiredError],
      [BlogPostStaleWriteError],
      [BlogReferenceNotFoundError],
      [BlogSlugConflictError],
    ] as const)('resolves a %o instance to its own type', (ErrorClass) => {
      expect(resolveBlogPostResultType(new ErrorClass())).toBe(ErrorClass);
    });

    test('resolves a mapped post to BlogPostAdminObject', () => {
      expect(
        resolveBlogPostResultType({ id: 'x', slug: 's', status: 'DRAFT' }),
      ).toBe(BlogPostAdminObject);
    });
  });
});
