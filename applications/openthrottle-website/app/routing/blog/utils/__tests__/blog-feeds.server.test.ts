import { beforeEach, describe, expect, test, vi } from 'vitest';

import {
  BlogFeedDocument,
  BlogSitemapPageDocument,
  BlogSitemapTagsDocument,
} from '~/__generated__/graphql';

const fetchPublicGraphql = vi.fn();
const loggerError = vi.fn();

vi.mock('~/services/graphql.server', () => ({ fetchPublicGraphql }));
vi.mock('@openthrottle/react-router-utils', async (importOriginal) => ({
  ...(await importOriginal<
    typeof import('@openthrottle/react-router-utils')
  >()),
  logger: { error: loggerError },
}));

const { loadBlogFeedPosts, loadBlogSitemapEntries } =
  await import('../blog-feeds.server');

const page = (config: {
  readonly endCursor: string | null;
  readonly hasNextPage: boolean;
  readonly slugs: readonly string[];
}) => ({
  blogPosts: {
    endCursor: config.endCursor,
    hasNextPage: config.hasNextPage,
    items: config.slugs.map((slug) => ({
      slug,
      // executeGraphql returns DateTime fields as Date objects.
      updatedAt: new Date('2026-03-06T10:00:00.000Z'),
    })),
  },
});

describe('blog-feeds.server', () => {
  beforeEach(() => {
    fetchPublicGraphql.mockReset();
    loggerError.mockReset();
  });

  describe('loadBlogFeedPosts', () => {
    test('requests the latest 20 posts in one call and returns the items', async () => {
      const items = [{ slug: 'a' }];
      fetchPublicGraphql.mockResolvedValue({ blogPosts: { items } });

      await expect(loadBlogFeedPosts()).resolves.toBe(items);
      expect(fetchPublicGraphql).toHaveBeenCalledTimes(1);
      expect(fetchPublicGraphql).toHaveBeenCalledWith(BlogFeedDocument, {
        first: 20,
      });
    });
  });

  describe('loadBlogSitemapEntries', () => {
    test('returns /blog, every post with lastmod, and every tag', async () => {
      fetchPublicGraphql.mockImplementation((document: unknown) =>
        document === BlogSitemapTagsDocument
          ? Promise.resolve({ blogTags: [{ slug: 'agents' }, { slug: 'git' }] })
          : Promise.resolve(
              page({ endCursor: 'c1', hasNextPage: false, slugs: ['a', 'b'] }),
            ),
      );

      await expect(loadBlogSitemapEntries()).resolves.toEqual({
        degraded: false,
        entries: [
          { path: '/blog' },
          { lastmod: '2026-03-06T10:00:00.000Z', path: '/blog/a' },
          { lastmod: '2026-03-06T10:00:00.000Z', path: '/blog/b' },
          { path: '/blog/tags/agents' },
          { path: '/blog/tags/git' },
        ],
      });
    });

    test('walks every page by cursor until hasNextPage is false', async () => {
      fetchPublicGraphql.mockImplementation(
        (document: unknown, variables: { after?: string | null }) => {
          if (document === BlogSitemapTagsDocument) {
            return Promise.resolve({ blogTags: [] });
          }

          if (variables.after === null) {
            return Promise.resolve(
              page({ endCursor: 'c1', hasNextPage: true, slugs: ['a'] }),
            );
          }

          return Promise.resolve(
            page({ endCursor: 'c2', hasNextPage: false, slugs: ['b'] }),
          );
        },
      );

      const { entries } = await loadBlogSitemapEntries();

      expect(entries.map((entry) => entry.path)).toEqual([
        '/blog',
        '/blog/a',
        '/blog/b',
      ]);
      expect(fetchPublicGraphql).toHaveBeenCalledWith(BlogSitemapPageDocument, {
        after: null,
        first: 200,
      });
      expect(fetchPublicGraphql).toHaveBeenCalledWith(BlogSitemapPageDocument, {
        after: 'c1',
        first: 200,
      });
    });

    test('stops at the page cap if the server never reports the last page', async () => {
      fetchPublicGraphql.mockImplementation((document: unknown) =>
        document === BlogSitemapTagsDocument
          ? Promise.resolve({ blogTags: [] })
          : Promise.resolve(
              page({ endCursor: 'again', hasNextPage: true, slugs: [] }),
            ),
      );

      await loadBlogSitemapEntries();

      // 50 post pages + 1 tags request.
      expect(fetchPublicGraphql).toHaveBeenCalledTimes(51);
    });

    test('degrades to /blog and logs when the API fails', async () => {
      fetchPublicGraphql.mockRejectedValue(new Error('connect ECONNREFUSED'));

      await expect(loadBlogSitemapEntries()).resolves.toEqual({
        degraded: true,
        entries: [{ path: '/blog' }],
      });
      expect(loggerError).toHaveBeenCalledTimes(1);
    });
  });
});
