import { createTestRouterContext } from '@openthrottle/react-router-testing';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import type { Route } from '@/app/routes/+types/sitemap[.]xml';

// The URL/dedup/lastmod/absolute-canonical behavior lives in (and is tested
// with) buildSitemapXml in @openthrottle/react-router-utils, and the cursor
// walk in blog-feeds.server. Here we verify the route's own responsibility:
// the one blog switch, assembling static + blog entries, and the degraded
// cache lifetime.
const isBlogEnabled = vi.fn();
const loadBlogSitemapEntries = vi.fn();

vi.mock('~/global/utils/blog-enabled', () => ({ isBlogEnabled }));
vi.mock('~/routing/blog/utils/blog-feeds.server', () => ({
  loadBlogSitemapEntries,
}));

const { loader } = await import('../sitemap[.]xml');

const loaderArgs: Route.LoaderArgs = {
  context: createTestRouterContext(),
  params: {},
  pattern: '/sitemap.xml',
  request: new Request('http://localhost/sitemap.xml'),
  url: new URL('http://localhost/sitemap.xml'),
};

const readLocs = async (response: Response): Promise<string[]> =>
  [...(await response.text()).matchAll(/<loc>([^<]+)<\/loc>/g)].map(
    (match) => new URL(match[1] ?? '').pathname,
  );

describe('routes/sitemap[.]xml.tsx', () => {
  beforeEach(() => {
    isBlogEnabled.mockReset();
    loadBlogSitemapEntries.mockReset();
  });

  test('serves only the live static page paths while the blog is off', async () => {
    isBlogEnabled.mockReturnValue(false);

    const response = await loader(loaderArgs);
    const paths = await readLocs(response);

    expect(response.headers.get('Content-Type')).toBe('application/xml');
    expect(paths).toContain('/');
    expect(paths.some((path) => path.startsWith('/blog'))).toBe(false);
    expect(loadBlogSitemapEntries).not.toHaveBeenCalled();

    // Routes removed during the pre-launch trim must not linger in the sitemap.
    expect(paths).not.toContain('/docs');
    expect(paths).not.toContain('/demos/layout');
    expect(paths).not.toContain('/faq');
  });

  test('adds the blog index, posts (with lastmod) and tags when the blog is on', async () => {
    isBlogEnabled.mockReturnValue(true);
    loadBlogSitemapEntries.mockResolvedValue({
      degraded: false,
      entries: [
        { path: '/blog' },
        { lastmod: '2026-03-06T10:00:00.000Z', path: '/blog/hello' },
        { path: '/blog/tags/agents' },
      ],
    });

    const response = await loader(loaderArgs);
    const xml = await response.clone().text();

    expect(await readLocs(response)).toEqual([
      '/',
      '/blog',
      '/blog/hello',
      '/blog/tags/agents',
    ]);
    expect(xml).toContain('<lastmod>2026-03-06T10:00:00.000Z</lastmod>');
    expect(xml.match(/<lastmod>/g)).toHaveLength(1);
    expect(response.headers.get('Cache-Control')).toBe('public, max-age=3600');
  });

  test('still renders static paths plus /blog with a short cache when the API failed', async () => {
    isBlogEnabled.mockReturnValue(true);
    loadBlogSitemapEntries.mockResolvedValue({
      degraded: true,
      entries: [{ path: '/blog' }],
    });

    const response = await loader(loaderArgs);

    expect(await readLocs(response)).toEqual(['/', '/blog']);
    expect(response.headers.get('Cache-Control')).toBe('public, max-age=60');
  });
});
