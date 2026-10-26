// @vitest-environment node
import { createTestRouterContext } from '@openthrottle/react-router-testing';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import type { Route } from '@/app/routes/+types/blog._index';
import { PERMISSIONS } from '~/global/config/permissions';

vi.mock('@openthrottle/react-router-graphql', () => ({
  executeGraphqlWithAuth: vi.fn(),
}));

vi.mock('~/global/utils/utils.permissions.server', () => ({
  requirePermission: vi.fn(),
}));

const { executeGraphqlWithAuth } =
  await import('@openthrottle/react-router-graphql');
const { requirePermission } =
  await import('~/global/utils/utils.permissions.server');
const { BlogPostState, GetBlogAdminPostsDocument } =
  await import('~/__generated__/graphql');
const { loader } = await import('../blog._index');

const mockExecute = vi.mocked(executeGraphqlWithAuth);
const mockRequirePermission = vi.mocked(requirePermission);

const buildArgs = (search = ''): Route.LoaderArgs => {
  const request = new Request(`http://localhost/blog${search}`);

  return {
    context: createTestRouterContext(),
    params: {},
    pattern: '/blog',
    request,
    url: new URL(request.url),
  };
};

describe('routes/blog._index loader', () => {
  beforeEach(() => {
    mockExecute.mockReset();
    mockRequirePermission.mockReset();
    mockRequirePermission.mockResolvedValue(undefined);
    mockExecute.mockResolvedValue({
      blogAdminPosts: { endCursor: 'c1', hasNextPage: true, items: [] },
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

  test('defaults to the first page of Drafts', async () => {
    await loader(buildArgs());

    expect(mockExecute).toHaveBeenCalledWith(
      expect.any(Request),
      GetBlogAdminPostsDocument,
      {
        after: null,
        first: 20,
        search: null,
        state: [BlogPostState.Draft],
      },
    );
  });

  test('maps the tab, search and cursor params onto the query', async () => {
    const data = await loader(buildArgs('?state=scheduled&q=launch&after=abc'));

    expect(mockExecute).toHaveBeenCalledWith(
      expect.any(Request),
      GetBlogAdminPostsDocument,
      {
        after: 'abc',
        first: 20,
        search: 'launch',
        state: [BlogPostState.Scheduled],
      },
    );
    expect(data).toMatchObject({
      after: 'abc',
      endCursor: 'c1',
      hasNextPage: true,
      search: 'launch',
      state: BlogPostState.Scheduled,
    });
  });
});
