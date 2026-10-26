// @vitest-environment node
import { beforeEach, describe, expect, test, vi } from 'vitest';

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
  UnpublishBlogPostEditorDocument,
} = await import('~/__generated__/graphql');
const { runBlogPostLifecycleAction } = await import('../lifecycle');

const mockExecute = vi.mocked(executeGraphqlWithAuth);
const mockRequirePermission = vi.mocked(requirePermission);

const request = new Request('http://localhost/blog/post-1', { method: 'POST' });
const FUTURE = '2099-06-15T17:30:00.000Z';
const POST = { __typename: 'BlogPostAdminObject', id: 'post-1' };
const NOT_FOUND = { __typename: 'BlogPostNotFoundError', message: 'gone' };

describe('routing/blog/actions/lifecycle', () => {
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

    const result = await runBlogPostLifecycleAction(request, 'post-1', {
      intent: 'publish',
      publishedAt: null,
    });

    expect(result).toEqual({
      outcome: 'published',
      publishedAt: '2026-10-26T09:00:00.000Z',
      state: BlogPostState.Live,
    });
    expect(mockExecute).toHaveBeenCalledWith(
      request,
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

    const result = await runBlogPostLifecycleAction(request, 'post-1', {
      intent: 'publish',
      publishedAt: FUTURE,
    });

    expect(result).toMatchObject({
      outcome: 'published',
      state: BlogPostState.Scheduled,
    });
    expect(mockExecute).toHaveBeenCalledWith(
      request,
      PublishBlogPostEditorDocument,
      { input: { id: 'post-1', publishedAt: FUTURE } },
    );
  });

  test('unpublish and archive call their own mutations', async () => {
    mockExecute.mockResolvedValueOnce({ unpublishBlogPost: POST });
    mockExecute.mockResolvedValueOnce({ archiveBlogPost: POST });

    expect(
      await runBlogPostLifecycleAction(request, 'post-1', {
        intent: 'unpublish',
      }),
    ).toEqual({ outcome: 'unpublished' });
    expect(
      await runBlogPostLifecycleAction(request, 'post-1', {
        intent: 'archive',
      }),
    ).toEqual({ outcome: 'archived' });
    expect(mockExecute).toHaveBeenNthCalledWith(
      1,
      request,
      UnpublishBlogPostEditorDocument,
      { id: 'post-1' },
    );
    expect(mockExecute).toHaveBeenNthCalledWith(
      2,
      request,
      ArchiveBlogPostEditorDocument,
      { id: 'post-1' },
    );
  });

  test('the not-found union branch is returned, not thrown', async () => {
    mockExecute.mockResolvedValueOnce({ archiveBlogPost: NOT_FOUND });

    expect(
      await runBlogPostLifecycleAction(request, 'post-1', {
        intent: 'archive',
      }),
    ).toEqual({ message: 'gone', outcome: 'lifecycleNotFound' });
  });

  test('blog:write is required before anything else runs', async () => {
    mockRequirePermission.mockRejectedValueOnce(
      new Response('Not Found', { status: 404 }),
    );

    await expect(
      runBlogPostLifecycleAction(request, 'post-1', { intent: 'archive' }),
    ).rejects.toBeInstanceOf(Response);
    expect(mockRequirePermission).toHaveBeenCalledWith(request, 'blog:write');
    expect(mockExecute).not.toHaveBeenCalled();
  });

  test('a malformed body is an error outcome and calls nothing', async () => {
    const result = await runBlogPostLifecycleAction(request, 'post-1', {
      intent: 'publish',
      publishedAt: 'tomorrow',
    });

    expect(result.outcome).toBe('lifecycleError');
    expect(mockExecute).not.toHaveBeenCalled();
  });

  test('a GraphQL error becomes an error outcome; auth errors still throw', async () => {
    mockExecute.mockRejectedValueOnce(new Error('boom'));

    expect(
      await runBlogPostLifecycleAction(request, 'post-1', {
        intent: 'unpublish',
      }),
    ).toEqual({ message: 'boom', outcome: 'lifecycleError' });

    const authError = new GraphqlAuthError('Unauthorized', 401);

    mockExecute.mockRejectedValueOnce(authError);

    await expect(
      runBlogPostLifecycleAction(request, 'post-1', { intent: 'unpublish' }),
    ).rejects.toBe(authError);
  });
});
