import { createTestRouterContext } from '@openthrottle/react-router-testing';
import type { RenderResult } from '@testing-library/react';
import { render } from '@testing-library/react';
import * as React from 'react';
import { createRoutesStub, data } from 'react-router';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import type { Route } from '@/app/routes/+types/blog._index';
import { BlogIndexDocument } from '~/__generated__/graphql';
import { BLOG_COPY } from '~/routing/blog/data/data.copy';
import { MOCK_BLOG_POST_SUMMARY } from '~/routing/blog/testing/mock.blog-posts';

const assertBlogEnabled = vi.fn();
const fetchPublicGraphql = vi.fn();

vi.mock('~/global/utils/blog-enabled', () => ({
  assertBlogEnabled,
  isBlogEnabled: () => false,
}));
vi.mock('~/services/graphql.server', () => ({ fetchPublicGraphql }));

const { default: Component, loader } = await import('../blog._index');

const buildLoaderArgs = (search = ''): Route.LoaderArgs => {
  const url = new URL(`http://localhost/blog${search}`);

  return {
    context: createTestRouterContext(),
    params: {},
    pattern: '/blog',
    request: new Request(url),
    url,
  };
};

const renderRoute = (loaderData: Awaited<ReturnType<typeof loader>>) => {
  const RoutesStub = createRoutesStub([
    { Component, loader: () => loaderData, path: '/blog' },
  ]);

  return render(<RoutesStub initialEntries={['/blog']} />);
};

describe('routes/blog._index.tsx', () => {
  beforeEach(() => {
    assertBlogEnabled.mockReset();
    fetchPublicGraphql.mockReset();
  });

  describe('loader', () => {
    test('requests the first page with the page size and no cursor', async () => {
      fetchPublicGraphql.mockResolvedValue({
        blogPosts: {
          endCursor: 'cursor-1',
          hasNextPage: true,
          items: [MOCK_BLOG_POST_SUMMARY],
        },
      });

      const result = await loader(buildLoaderArgs());

      expect(fetchPublicGraphql).toHaveBeenCalledWith(BlogIndexDocument, {
        after: null,
        first: 9,
      });
      expect(result.after).toBeNull();
      expect(result.page.items).toEqual([MOCK_BLOG_POST_SUMMARY]);
      expect(result.page.endCursor).toBe('cursor-1');
    });

    test('404s without calling the API while the blog is switched off', async () => {
      assertBlogEnabled.mockImplementation(() => {
        throw data(null, { status: 404 });
      });

      await expect(loader(buildLoaderArgs())).rejects.toMatchObject({
        init: { status: 404 },
      });
      expect(fetchPublicGraphql).not.toHaveBeenCalled();
    });

    test('passes ?after= through as the cursor', async () => {
      fetchPublicGraphql.mockResolvedValue({
        blogPosts: { endCursor: null, hasNextPage: false, items: [] },
      });

      const result = await loader(buildLoaderArgs('?after=abc'));

      expect(fetchPublicGraphql).toHaveBeenCalledWith(BlogIndexDocument, {
        after: 'abc',
        first: 9,
      });
      expect(result.after).toBe('abc');
    });

    test('redirects a rejected cursor to the first page', async () => {
      fetchPublicGraphql.mockRejectedValue(
        new Error('GraphQL errors: Invalid pagination cursor.'),
      );

      const thrown = await loader(buildLoaderArgs('?after=garbage')).catch(
        (error: unknown) => error,
      );

      expect(thrown).toBeInstanceOf(Response);
      expect(thrown).toMatchObject({ status: 302 });
      expect(thrown instanceof Response && thrown.headers.get('Location')).toBe(
        '/blog',
      );
    });

    test('rethrows other API failures', async () => {
      fetchPublicGraphql.mockRejectedValue(new Error('connect ECONNREFUSED'));

      await expect(loader(buildLoaderArgs())).rejects.toThrow('ECONNREFUSED');
    });
  });

  describe('component', () => {
    let component: RenderResult;

    test('renders the heading, the posts and an Older link when there is a next page', async () => {
      component = renderRoute({
        after: null,
        page: {
          endCursor: 'cursor-1',
          hasNextPage: true,
          items: [MOCK_BLOG_POST_SUMMARY],
        },
      });

      expect(
        await component.findByRole('heading', {
          level: 1,
          name: BLOG_COPY.routes.index.heading,
        }),
      ).toBeInTheDocument();
      expect(component.getByTestId('BlogList')).toBeInTheDocument();
      expect(
        component.getByRole('link', { name: BLOG_COPY.pagination.older }),
      ).toHaveAttribute('href', '/blog?after=cursor-1');
      expect(
        component.queryByRole('link', { name: BLOG_COPY.pagination.newer }),
      ).not.toBeInTheDocument();
    });

    test('renders the empty state for an empty list', async () => {
      component = renderRoute({
        after: null,
        page: { endCursor: null, hasNextPage: false, items: [] },
      });

      expect(
        await component.findByText(BLOG_COPY.emptyState.all.title),
      ).toBeInTheDocument();
      expect(component.queryByTestId('BlogPagination')).not.toBeInTheDocument();
    });

    test('offers a Newer link on later pages', async () => {
      component = renderRoute({
        after: 'cursor-1',
        page: {
          endCursor: null,
          hasNextPage: false,
          items: [MOCK_BLOG_POST_SUMMARY],
        },
      });

      expect(
        await component.findByRole('link', {
          name: BLOG_COPY.pagination.newer,
        }),
      ).toHaveAttribute('href', '/blog');
    });
  });
});
