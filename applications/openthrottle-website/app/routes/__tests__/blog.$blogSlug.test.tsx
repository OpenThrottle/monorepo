import { createTestRouterContext } from '@openthrottle/react-router-testing';
import { render } from '@testing-library/react';
import * as React from 'react';
import { createRoutesStub, data } from 'react-router';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import type { Route } from '@/app/routes/+types/blog.$blogSlug';
import { BlogPostDocument } from '~/__generated__/graphql';
import { BLOG_COPY } from '~/routing/blog/data/data.copy';
import { MOCK_BLOG_POST_DETAIL } from '~/routing/blog/testing/mock.blog-posts';

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
} = await import('../blog.$blogSlug');

const buildLoaderArgs = (slug: string): Route.LoaderArgs => {
  const url = new URL(`http://localhost/blog/${slug}`);

  return {
    context: createTestRouterContext(),
    params: { blogSlug: slug },
    pattern: '/blog/:blogSlug',
    request: new Request(url),
    url,
  };
};

describe('routes/blog.$blogSlug.tsx', () => {
  beforeEach(() => {
    assertBlogEnabled.mockReset();
    fetchPublicGraphql.mockReset();
  });

  describe('loader', () => {
    test('returns the post for a visible slug', async () => {
      fetchPublicGraphql.mockResolvedValue({ blogPost: MOCK_BLOG_POST_DETAIL });

      const result = await loader(buildLoaderArgs('plans-to-commits'));

      expect(fetchPublicGraphql).toHaveBeenCalledWith(BlogPostDocument, {
        slug: 'plans-to-commits',
      });
      expect(result.post).toEqual(MOCK_BLOG_POST_DETAIL);
    });

    test('404s without calling the API while the blog is switched off', async () => {
      assertBlogEnabled.mockImplementation(() => {
        throw data(null, { status: 404 });
      });

      await expect(
        loader(buildLoaderArgs('plans-to-commits')),
      ).rejects.toMatchObject({
        init: { status: 404 },
      });
      expect(fetchPublicGraphql).not.toHaveBeenCalled();
    });

    test('throws a 404 for an unknown or non-public slug', async () => {
      fetchPublicGraphql.mockResolvedValue({ blogPost: null });

      await expect(loader(buildLoaderArgs('a-draft'))).rejects.toMatchObject({
        init: { status: 404 },
      });
    });
  });

  describe('component', () => {
    test('renders the article inside the site chrome', async () => {
      const RoutesStub = createRoutesStub([
        {
          Component,
          loader: () => ({ post: MOCK_BLOG_POST_DETAIL }),
          path: '/blog/:blogSlug',
        },
      ]);
      const component = render(
        <RoutesStub initialEntries={['/blog/plans-to-commits']} />,
      );

      expect(
        await component.findByRole('heading', {
          level: 1,
          name: MOCK_BLOG_POST_DETAIL.title,
        }),
      ).toBeInTheDocument();
      expect(component.getByTestId('BlogDetails')).toBeInTheDocument();
      expect(component.getByTestId('GlobalFooter')).toBeInTheDocument();
    });

    test('renders the not-found boundary when the loader 404s', async () => {
      fetchPublicGraphql.mockResolvedValue({ blogPost: null });

      const RoutesStub = createRoutesStub([
        {
          Component,
          ErrorBoundary,
          loader: () => loader(buildLoaderArgs('a-draft')),
          path: '/blog/:blogSlug',
        },
      ]);
      const component = render(
        <RoutesStub initialEntries={['/blog/a-draft']} />,
      );

      expect(
        await component.findByText(BLOG_COPY.emptyState.notFound.title),
      ).toBeInTheDocument();
    });
  });
});
