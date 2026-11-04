// @vitest-environment node
import { createTestRouterContext } from '@openthrottle/react-router-testing';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import type { Route } from '@/app/routes/+types/blog.$postId';
import { PERMISSIONS } from '~/global/config/permissions';

vi.mock('@openthrottle/react-router-graphql', () => ({
  executeGraphqlWithAuth: vi.fn(),
}));

vi.mock('~/global/utils/utils.permissions.server', () => ({
  fetchMyPermissions: vi.fn(),
  requirePermission: vi.fn(),
}));

const { executeGraphqlWithAuth } =
  await import('@openthrottle/react-router-graphql');
const { fetchMyPermissions, requirePermission } =
  await import('~/global/utils/utils.permissions.server');
const { GetBlogPostEditorDocument } = await import('~/__generated__/graphql');
const { MOCK_BLOG_AUTHORS, MOCK_BLOG_TAGS, MOCK_EDITOR_DRAFT } =
  await import('~/routing/blog/data/mock.blog-posts');
const { action, loader, shouldRevalidate } = await import('../blog.$postId');

const mockExecute = vi.mocked(executeGraphqlWithAuth);
const mockPermissions = vi.mocked(fetchMyPermissions);
const mockRequirePermission = vi.mocked(requirePermission);

const buildArgs = (): Route.LoaderArgs => {
  const request = new Request('http://localhost/blog/post-1');

  return {
    context: createTestRouterContext(),
    params: { postId: 'post-1' },
    pattern: '/blog/:postId',
    request,
    url: new URL(request.url),
  };
};

const revalidateArgs = (
  overrides: Partial<Parameters<typeof shouldRevalidate>[0]>,
): Parameters<typeof shouldRevalidate>[0] => {
  const url = new URL('http://localhost/blog/post-1');

  return {
    currentParams: { postId: 'post-1' },
    currentUrl: url,
    defaultShouldRevalidate: true,
    nextParams: { postId: 'post-1' },
    nextUrl: url,
    ...overrides,
  };
};

describe('routes/blog.$postId loader', () => {
  beforeEach(() => {
    mockExecute.mockReset();
    mockPermissions.mockReset();
    mockRequirePermission.mockReset();
    mockRequirePermission.mockResolvedValue(undefined);
    mockPermissions.mockResolvedValue(['blog:draft']);
    mockExecute.mockResolvedValue({
      blogAdminAuthors: MOCK_BLOG_AUTHORS,
      blogAdminPost: {
        ...MOCK_EDITOR_DRAFT,
        __typename: 'BlogPostAdminObject',
      },
      blogAdminTags: MOCK_BLOG_TAGS,
    });
  });

  test('requires blog:draft before querying', async () => {
    const forbidden = new Response('Not Found', { status: 404 });

    mockRequirePermission.mockRejectedValue(forbidden);

    await expect(loader(buildArgs())).rejects.toBe(forbidden);
    expect(mockRequirePermission).toHaveBeenCalledWith(
      expect.any(Request),
      PERMISSIONS.BLOG_DRAFT,
    );
    expect(mockExecute).not.toHaveBeenCalled();
  });

  test('returns the post, authors, tags and whether the caller has blog:write', async () => {
    const data = await loader(buildArgs());

    expect(mockExecute).toHaveBeenCalledWith(
      expect.any(Request),
      GetBlogPostEditorDocument,
      { id: 'post-1' },
    );
    expect(data).toMatchObject({
      authors: MOCK_BLOG_AUTHORS,
      canWrite: false,
      post: { id: 'post-1' },
      tags: MOCK_BLOG_TAGS,
    });

    mockPermissions.mockResolvedValue(['blog:draft', 'blog:write']);

    expect((await loader(buildArgs())).canWrite).toBe(true);
  });

  test('BlogPostNotFoundError becomes a 404', async () => {
    mockExecute.mockResolvedValue({
      blogAdminAuthors: [],
      blogAdminPost: { __typename: 'BlogPostNotFoundError', message: 'gone' },
      blogAdminTags: [],
    });

    await expect(loader(buildArgs())).rejects.toMatchObject({ status: 404 });
  });

  test('the action also requires blog:draft', async () => {
    const forbidden = new Response('Not Found', { status: 404 });

    mockRequirePermission.mockRejectedValue(forbidden);

    await expect(action(buildArgs())).rejects.toBe(forbidden);
  });
});

describe('routes/blog.$postId shouldRevalidate', () => {
  test('re-reads the post after a save that wrote it', () => {
    expect(
      shouldRevalidate(
        revalidateArgs({
          actionResult: { outcome: 'saved' },
          formMethod: 'POST',
        }),
      ),
    ).toBe(true);
  });

  test.each([
    { outcome: 'archived' },
    { outcome: 'unpublished' },
    { outcome: 'published', publishedAt: null, state: 'LIVE' },
  ])('re-reads the post after the lifecycle action %o', (actionResult) => {
    expect(
      shouldRevalidate(revalidateArgs({ actionResult, formMethod: 'POST' })),
    ).toBe(true);
  });

  test('keeps the loaded post after a lifecycle action that wrote nothing', () => {
    expect(
      shouldRevalidate(
        revalidateArgs({
          actionResult: { message: 'm', outcome: 'lifecycleNotFound' },
          formMethod: 'POST',
        }),
      ),
    ).toBe(false);
  });

  test('keeps the loaded post after a save that wrote nothing', () => {
    expect(
      shouldRevalidate(
        revalidateArgs({
          actionResult: { message: 'm', outcome: 'staleWrite' },
          formMethod: 'POST',
        }),
      ),
    ).toBe(false);
  });

  test('ignores other routes’ actions', () => {
    expect(
      shouldRevalidate(
        revalidateArgs({ actionResult: { ok: true }, formMethod: 'POST' }),
      ),
    ).toBe(false);
  });

  test('honours an explicit revalidation (Reload)', () => {
    expect(shouldRevalidate(revalidateArgs({}))).toBe(true);
  });
});
