// @vitest-environment node
import { createTestRouterContext } from '@openthrottle/react-router-testing';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import type { Route } from '@/app/routes/+types/blog.$postId';
import type { BlogPostSaveRequest } from '~/routing/blog/types';

vi.mock('@openthrottle/react-router-graphql', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@openthrottle/react-router-graphql')>();

  return { ...actual, executeGraphqlWithAuth: vi.fn() };
});

vi.mock('~/global/utils/utils.permissions.server', () => ({
  fetchMyPermissions: vi.fn(),
  requirePermission: vi.fn(),
}));

const { executeGraphqlWithAuth, GraphqlAuthError } =
  await import('@openthrottle/react-router-graphql');
const { requirePermission } =
  await import('~/global/utils/utils.permissions.server');
const {
  ArchiveBlogPostEditorDocument,
  BlogPostState,
  PublishBlogPostEditorDocument,
  SetBlogPostEditorTagsDocument,
  UnpublishBlogPostEditorDocument,
  UpdateBlogPostEditorDocument,
} = await import('~/__generated__/graphql');
const { runBlogPostEditorAction } = await import('../postId');

const mockExecute = vi.mocked(executeGraphqlWithAuth);
const mockRequirePermission = vi.mocked(requirePermission);

const UPDATED_AT = '2026-10-20T15:30:00.000Z';
const FUTURE = '2099-06-15T17:30:00.000Z';
const POST = { __typename: 'BlogPostAdminObject', id: 'post-1' };
const NOT_FOUND = { __typename: 'BlogPostNotFoundError', message: 'gone' };

const buildArgs = (body: unknown): Route.ActionArgs => {
  const request = new Request('http://localhost/blog/post-1', {
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
    method: 'POST',
  });

  return {
    context: createTestRouterContext(),
    params: { postId: 'post-1' },
    pattern: '/blog/:postId',
    request,
    url: new URL(request.url),
  };
};

const saveRequest = (
  overrides: Partial<BlogPostSaveRequest> = {},
): BlogPostSaveRequest => ({
  changes: { title: 'New title' },
  expectedUpdatedAt: UPDATED_AT,
  intent: 'save',
  tagSlugs: null,
  ...overrides,
});

const updateResolves = (updateBlogPost: unknown): void => {
  mockExecute.mockResolvedValueOnce({ updateBlogPost });
};

describe('routing/blog/actions/postId', () => {
  beforeEach(() => {
    mockExecute.mockReset();
    mockRequirePermission.mockReset();
  });

  test('a lifecycle intent demands blog:write, then runs the lifecycle action', async () => {
    mockExecute.mockResolvedValueOnce({
      archiveBlogPost: { __typename: 'BlogPostAdminObject', id: 'post-1' },
    });

    const result = await runBlogPostEditorAction(
      buildArgs({ intent: 'archive' }),
    );

    expect(result).toEqual({ outcome: 'archived' });
    expect(mockRequirePermission).toHaveBeenCalledWith(
      expect.any(Request),
      'blog:write',
    );
    expect(mockExecute).toHaveBeenCalledWith(
      expect.any(Request),
      ArchiveBlogPostEditorDocument,
      { id: 'post-1' },
    );
  });

  test('a save intent never asks for blog:write', async () => {
    updateResolves({ __typename: 'BlogPostAdminObject', id: 'post-1' });

    await runBlogPostEditorAction(buildArgs(saveRequest()));

    expect(mockRequirePermission).not.toHaveBeenCalled();
  });

  test('save sends the changes with expectedUpdatedAt', async () => {
    updateResolves({ __typename: 'BlogPostAdminObject', id: 'post-1' });

    const result = await runBlogPostEditorAction(buildArgs(saveRequest()));

    expect(result).toEqual({ outcome: 'saved' });
    expect(mockExecute).toHaveBeenCalledTimes(1);
    expect(mockExecute).toHaveBeenCalledWith(
      expect.any(Request),
      UpdateBlogPostEditorDocument,
      {
        input: {
          expectedUpdatedAt: UPDATED_AT,
          id: 'post-1',
          title: 'New title',
        },
      },
    );
  });

  test('overwrite resends the same changes without expectedUpdatedAt', async () => {
    updateResolves({ __typename: 'BlogPostAdminObject', id: 'post-1' });

    await runBlogPostEditorAction(
      buildArgs(saveRequest({ intent: 'overwrite' })),
    );

    expect(mockExecute).toHaveBeenCalledWith(
      expect.any(Request),
      UpdateBlogPostEditorDocument,
      { input: { id: 'post-1', title: 'New title' } },
    );
  });

  test('a stale write is returned, not thrown, and tags are left alone', async () => {
    updateResolves({
      __typename: 'BlogPostStaleWriteError',
      currentUpdatedAt: '2026-10-25T00:00:00.000Z',
      message: 'changed',
    });

    const result = await runBlogPostEditorAction(
      buildArgs(saveRequest({ tagSlugs: ['releases'] })),
    );

    expect(result).toEqual({
      currentUpdatedAt: '2026-10-25T00:00:00.000Z',
      message: 'changed',
      outcome: 'staleWrite',
    });
    expect(mockExecute).toHaveBeenCalledTimes(1);
  });

  test('replaces the tag set after the fields when the tags changed', async () => {
    updateResolves({ __typename: 'BlogPostAdminObject', id: 'post-1' });
    mockExecute.mockResolvedValueOnce({
      setBlogPostTags: { __typename: 'BlogPostAdminObject', id: 'post-1' },
    });

    const result = await runBlogPostEditorAction(
      buildArgs(saveRequest({ tagSlugs: ['releases'] })),
    );

    expect(result).toEqual({ outcome: 'saved' });
    expect(mockExecute).toHaveBeenLastCalledWith(
      expect.any(Request),
      SetBlogPostEditorTagsDocument,
      { input: { postId: 'post-1', tagSlugs: ['releases'] } },
    );
  });

  test('a rejected tag set after a written update is tagsNotSaved', async () => {
    updateResolves({ __typename: 'BlogPostAdminObject', id: 'post-1' });
    mockExecute.mockResolvedValueOnce({
      setBlogPostTags: {
        __typename: 'BlogReferenceNotFoundError',
        entity: 'TAG',
        key: 'gone',
        message: 'Unknown tag "gone".',
      },
    });

    const result = await runBlogPostEditorAction(
      buildArgs(saveRequest({ tagSlugs: ['gone'] })),
    );

    expect(result).toEqual({
      message: 'Unknown tag "gone".',
      outcome: 'tagsNotSaved',
    });
  });

  test.each([
    [
      { __typename: 'BlogSlugConflictError', message: 'm', slug: 'taken' },
      { message: 'm', outcome: 'slugConflict', slug: 'taken' },
    ],
    [
      { __typename: 'BlogCoverAltRequiredError', message: 'm' },
      { message: 'm', outcome: 'coverAltRequired' },
    ],
    [
      { __typename: 'BlogPostPublishPermissionRequiredError', message: 'm' },
      { message: 'm', outcome: 'publishPermissionRequired' },
    ],
    [
      { __typename: 'BlogPostNotFoundError', message: 'm' },
      { message: 'm', outcome: 'notFound' },
    ],
  ])('maps %o onto its outcome', async (union, expected) => {
    updateResolves(union);

    expect(await runBlogPostEditorAction(buildArgs(saveRequest()))).toEqual(
      expected,
    );
  });

  test('a malformed body is an error outcome and calls nothing', async () => {
    const result = await runBlogPostEditorAction(
      buildArgs({ intent: 'bogus' }),
    );

    expect(result.outcome).toBe('error');
    expect(mockExecute).not.toHaveBeenCalled();
  });

  test('a GraphQL error becomes an error outcome; auth errors still throw', async () => {
    mockExecute.mockRejectedValueOnce(new Error('slug "Bad" is invalid'));

    expect(await runBlogPostEditorAction(buildArgs(saveRequest()))).toEqual({
      message: 'slug "Bad" is invalid',
      outcome: 'error',
    });

    const authError = new GraphqlAuthError('Unauthorized', 401);

    mockExecute.mockRejectedValueOnce(authError);

    await expect(
      runBlogPostEditorAction(buildArgs(saveRequest())),
    ).rejects.toBe(authError);
  });
});

describe('routing/blog/actions/postId lifecycle intents', () => {
  beforeEach(() => {
    mockExecute.mockReset();
    mockRequirePermission.mockReset();
  });

  test('publish now sends a null publishedAt', async () => {
    mockExecute.mockResolvedValueOnce({
      publishBlogPost: {
        ...POST,
        publishedAt: '2026-10-26T09:00:00.000Z',
        state: BlogPostState.Live,
      },
    });

    const result = await runBlogPostEditorAction(
      buildArgs({
        intent: 'publish',
        publishedAt: null,
      }),
    );

    expect(result).toEqual({
      outcome: 'published',
      publishedAt: '2026-10-26T09:00:00.000Z',
      state: BlogPostState.Live,
    });
    expect(mockExecute).toHaveBeenCalledWith(
      expect.any(Request),
      PublishBlogPostEditorDocument,
      { input: { id: 'post-1', publishedAt: null } },
    );
  });

  test('schedule forwards the UTC timestamp', async () => {
    mockExecute.mockResolvedValueOnce({
      publishBlogPost: {
        ...POST,
        publishedAt: FUTURE,
        state: BlogPostState.Scheduled,
      },
    });

    const result = await runBlogPostEditorAction(
      buildArgs({
        intent: 'publish',
        publishedAt: FUTURE,
      }),
    );

    expect(result).toMatchObject({
      outcome: 'published',
      state: BlogPostState.Scheduled,
    });
    expect(mockExecute).toHaveBeenCalledWith(
      expect.any(Request),
      PublishBlogPostEditorDocument,
      { input: { id: 'post-1', publishedAt: FUTURE } },
    );
  });

  test('unpublish and archive call their own mutations', async () => {
    mockExecute.mockResolvedValueOnce({ unpublishBlogPost: POST });
    mockExecute.mockResolvedValueOnce({ archiveBlogPost: POST });

    expect(
      await runBlogPostEditorAction(
        buildArgs({
          intent: 'unpublish',
        }),
      ),
    ).toEqual({ outcome: 'unpublished' });
    expect(
      await runBlogPostEditorAction(
        buildArgs({
          intent: 'archive',
        }),
      ),
    ).toEqual({ outcome: 'archived' });
    expect(mockExecute).toHaveBeenNthCalledWith(
      1,
      expect.any(Request),
      UnpublishBlogPostEditorDocument,
      { id: 'post-1' },
    );
    expect(mockExecute).toHaveBeenNthCalledWith(
      2,
      expect.any(Request),
      ArchiveBlogPostEditorDocument,
      { id: 'post-1' },
    );
  });

  test('the not-found union branch is returned, not thrown', async () => {
    mockExecute.mockResolvedValueOnce({ archiveBlogPost: NOT_FOUND });

    expect(
      await runBlogPostEditorAction(
        buildArgs({
          intent: 'archive',
        }),
      ),
    ).toEqual({ message: 'gone', outcome: 'lifecycleNotFound' });
  });

  test('blog:write is required before anything else runs', async () => {
    mockRequirePermission.mockRejectedValueOnce(
      new Response('Not Found', { status: 404 }),
    );

    await expect(
      runBlogPostEditorAction(buildArgs({ intent: 'archive' })),
    ).rejects.toBeInstanceOf(Response);
    expect(mockRequirePermission).toHaveBeenCalledWith(
      expect.any(Request),
      'blog:write',
    );
    expect(mockExecute).not.toHaveBeenCalled();
  });

  test('a malformed body is an error outcome and calls nothing', async () => {
    const result = await runBlogPostEditorAction(
      buildArgs({
        intent: 'publish',
        publishedAt: 'tomorrow',
      }),
    );

    expect(result).toMatchObject({ outcome: 'lifecycleError' });
    expect(mockExecute).not.toHaveBeenCalled();
  });

  test('a GraphQL error becomes an error outcome; auth errors still throw', async () => {
    mockExecute.mockRejectedValueOnce(new Error('boom'));

    expect(
      await runBlogPostEditorAction(
        buildArgs({
          intent: 'unpublish',
        }),
      ),
    ).toEqual({ message: 'boom', outcome: 'lifecycleError' });

    const authError = new GraphqlAuthError('Unauthorized', 401);

    mockExecute.mockRejectedValueOnce(authError);

    await expect(
      runBlogPostEditorAction(buildArgs({ intent: 'unpublish' })),
    ).rejects.toBe(authError);
  });
});
