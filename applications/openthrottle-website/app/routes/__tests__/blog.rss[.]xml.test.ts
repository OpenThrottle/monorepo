import { createTestRouterContext } from '@openthrottle/react-router-testing';
import { data } from 'react-router';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import type { Route } from '@/app/routes/+types/blog.rss[.]xml';
import { BlogFeedDocument } from '~/__generated__/graphql';

const assertBlogEnabled = vi.fn();
const fetchPublicGraphql = vi.fn();

vi.mock('~/global/utils/blog-enabled', () => ({ assertBlogEnabled }));
vi.mock('~/services/graphql.server', () => ({ fetchPublicGraphql }));

const { loader } = await import('../blog.rss[.]xml');

const loaderArgs: Route.LoaderArgs = {
  context: createTestRouterContext(),
  params: {},
  pattern: '/blog/rss.xml',
  request: new Request('http://localhost/blog/rss.xml'),
  url: new URL('http://localhost/blog/rss.xml'),
};

const feedPost = (slug: string, title: string) => ({
  author: { displayName: 'Ada Lovelace' },
  excerpt: `${title} excerpt`,
  publishedAt: '2026-03-04T10:00:00.000Z',
  seoDescription: null,
  slug,
  tags: [{ name: 'Agents' }],
  title,
  updatedAt: '2026-03-06T10:00:00.000Z',
});

describe('routes/blog.rss[.]xml.tsx', () => {
  beforeEach(() => {
    assertBlogEnabled.mockReset();
    fetchPublicGraphql.mockReset();
  });

  test('serves RSS 2.0 with only the posts the server returned', async () => {
    fetchPublicGraphql.mockResolvedValue({
      blogPosts: {
        items: [feedPost('visible-one', 'One'), feedPost('visible-two', 'Two')],
      },
    });

    const response = await loader(loaderArgs);
    const xml = await response.text();
    const document = new DOMParser().parseFromString(xml, 'application/xml');

    expect(fetchPublicGraphql).toHaveBeenCalledWith(BlogFeedDocument, {
      first: 20,
    });
    expect(response.headers.get('Content-Type')).toBe(
      'application/rss+xml; charset=utf-8',
    );
    expect(document.querySelector('parsererror')).toBeNull();
    expect(document.documentElement.getAttribute('version')).toBe('2.0');
    expect(
      [...document.querySelectorAll('item > title')].map(
        (title) => title.textContent,
      ),
    ).toEqual(['One', 'Two']);
    // Visibility is the server's job: nothing the API did not return appears.
    expect(xml).not.toContain('a-draft');
  });

  test('404s without calling the API while the blog is off', async () => {
    assertBlogEnabled.mockImplementation(() => {
      throw data(null, { status: 404 });
    });

    await expect(loader(loaderArgs)).rejects.toMatchObject({
      init: { status: 404 },
    });
    expect(fetchPublicGraphql).not.toHaveBeenCalled();
  });

  test('lets an API failure reach the error boundary', async () => {
    fetchPublicGraphql.mockRejectedValue(new Error('connect ECONNREFUSED'));

    await expect(loader(loaderArgs)).rejects.toThrow('ECONNREFUSED');
  });
});
