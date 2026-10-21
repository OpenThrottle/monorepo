import { createTestRouterContext } from '@openthrottle/react-router-testing';
import { render } from '@testing-library/react';
import * as React from 'react';
import { createRoutesStub, data } from 'react-router';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import type { Route } from '@/app/routes/+types/blog.tags.$tagSlug';
import { BlogTagDocument } from '~/__generated__/graphql';
import { BLOG_COPY } from '~/routing/blog/data/data.copy';
import {
  MOCK_BLOG_POST_SUMMARY,
  MOCK_BLOG_TAG,
} from '~/routing/blog/testing/mock.blog-posts';

const assertBlogEnabled = vi.fn();
const fetchPublicGraphql = vi.fn();

vi.mock('~/global/utils/blog-enabled', () => ({
  assertBlogEnabled,
  isBlogEnabled: () => false,
}));
vi.mock('~/services/graphql.server', () => ({ fetchPublicGraphql }));

const {
  default: Component,
  ErrorBoundary,
  loader,
} = await import('../blog.tags.$tagSlug');

const buildLoaderArgs = (tagSlug: string, search = ''): Route.LoaderArgs => {
  const url = new URL(`http://localhost/blog/tags/${tagSlug}${search}`);

  return {
    context: createTestRouterContext(),
    params: { tagSlug },
    pattern: '/blog/tags/:tagSlug',
    request: new Request(url),
    url,
  };
};

const postsPage = {
  endCursor: 'cursor-1',
  hasNextPage: true,
  items: [MOCK_BLOG_POST_SUMMARY],
};

describe('routes/blog.tags.$tagSlug.tsx', () => {
  beforeEach(() => {
    assertBlogEnabled.mockReset();
    fetchPublicGraphql.mockReset();
  });

  describe('loader', () => {
    test('returns the tag and its first page of posts', async () => {
      fetchPublicGraphql.mockResolvedValue({
        blogPosts: postsPage,
        blogTags: [
          { description: null, name: 'Other', slug: 'other' },
          MOCK_BLOG_TAG,
        ],
      });

      const result = await loader(buildLoaderArgs('agents'));

      expect(fetchPublicGraphql).toHaveBeenCalledWith(BlogTagDocument, {
        after: null,
        first: 9,
        tagSlug: 'agents',
      });
      expect(result.tag).toEqual(MOCK_BLOG_TAG);
      expect(result.page).toEqual(postsPage);
    });

    test('passes ?after= through as the cursor', async () => {
      fetchPublicGraphql.mockResolvedValue({
        blogPosts: { endCursor: null, hasNextPage: false, items: [] },
        blogTags: [MOCK_BLOG_TAG],
      });

      const result = await loader(buildLoaderArgs('agents', '?after=abc'));

      expect(fetchPublicGraphql).toHaveBeenCalledWith(BlogTagDocument, {
        after: 'abc',
        first: 9,
        tagSlug: 'agents',
      });
      expect(result.after).toBe('abc');
    });

    test('404s without calling the API while the blog is switched off', async () => {
      assertBlogEnabled.mockImplementation(() => {
        throw data(null, { status: 404 });
      });

      await expect(loader(buildLoaderArgs('agents'))).rejects.toMatchObject({
        init: { status: 404 },
      });
      expect(fetchPublicGraphql).not.toHaveBeenCalled();
    });

    test('throws a 404 when the tag is not among the visible tags', async () => {
      fetchPublicGraphql.mockResolvedValue({
        blogPosts: { endCursor: null, hasNextPage: false, items: [] },
        blogTags: [MOCK_BLOG_TAG],
      });

      await expect(
        loader(buildLoaderArgs('release-notes')),
      ).rejects.toMatchObject({
        init: { status: 404 },
      });
    });

    test('redirects a rejected cursor to the first page of the tag', async () => {
      fetchPublicGraphql.mockRejectedValue(
        new Error('GraphQL errors: Invalid pagination cursor.'),
      );

      const thrown = await loader(buildLoaderArgs('agents', '?after=x')).catch(
        (error: unknown) => error,
      );

      expect(thrown).toMatchObject({ status: 302 });
      expect(thrown instanceof Response && thrown.headers.get('Location')).toBe(
        '/blog/tags/agents',
      );
    });
  });

  describe('component', () => {
    test('renders the tag heading, posts and pagination rooted at the tag path', async () => {
      const RoutesStub = createRoutesStub([
        {
          Component,
          loader: () => ({ after: null, page: postsPage, tag: MOCK_BLOG_TAG }),
          path: '/blog/tags/:tagSlug',
        },
      ]);
      const component = render(
        <RoutesStub initialEntries={['/blog/tags/agents']} />,
      );

      expect(
        await component.findByRole('heading', {
          level: 1,
          name: 'Posts tagged Agents',
        }),
      ).toBeInTheDocument();
      expect(component.getByText('Writing about agents.')).toBeInTheDocument();
      expect(component.getByTestId('BlogList')).toBeInTheDocument();
      expect(
        component.getByRole('link', { name: BLOG_COPY.pagination.older }),
      ).toHaveAttribute('href', '/blog/tags/agents?after=cursor-1');
    });

    test('renders the tag empty state when a visible tag has no posts on the page', async () => {
      const RoutesStub = createRoutesStub([
        {
          Component,
          loader: () => ({
            after: null,
            page: { endCursor: null, hasNextPage: false, items: [] },
            tag: MOCK_BLOG_TAG,
          }),
          path: '/blog/tags/:tagSlug',
        },
      ]);
      const component = render(
        <RoutesStub initialEntries={['/blog/tags/agents']} />,
      );

      expect(
        await component.findByText(BLOG_COPY.emptyState.tag.title),
      ).toBeInTheDocument();
    });

    test('renders the not-found boundary for an unknown tag', async () => {
      fetchPublicGraphql.mockResolvedValue({
        blogPosts: { endCursor: null, hasNextPage: false, items: [] },
        blogTags: [],
      });

      const RoutesStub = createRoutesStub([
        {
          Component,
          ErrorBoundary,
          loader: () => loader(buildLoaderArgs('nope')),
          path: '/blog/tags/:tagSlug',
        },
      ]);
      const component = render(
        <RoutesStub initialEntries={['/blog/tags/nope']} />,
      );

      expect(
        await component.findByText(BLOG_COPY.emptyState.notFound.title),
      ).toBeInTheDocument();
    });
  });
});
